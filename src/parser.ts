/**
 * Core Parser Engine - Phase 3
 * The heart of the tool: converts raw Markdown to structured JSON
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkFrontmatter from 'remark-frontmatter';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import { visit } from 'unist-util-visit';
import type { Root as MdastRoot } from 'mdast';
import type { Root as HastRoot, Element } from 'hast';
import type { VFile } from 'vfile';

import {
  type NoteContent,
  type ParserOptions,
  type FullStackPlugin,
  type LinkInfo,
  type ContentStats,
  type ParseWarning,
  type TocEntry,
  isPluginConfig,
} from './types';
import { parseFrontmatter, shouldPublish } from './frontmatter';
import {
  filePathToSlug,
  parseAllLinks,
  extractLinkSlugs,
  generateExcerpt,
  countWords,
  calculateReadingTime,
  headingToSlug,
  validateSlug,
} from './utils';

/**
 * Parses a markdown file into structured NoteContent
 * This is the main entry point for the parser
 * 
 * @param content Raw markdown content
 * @param filePath File path relative to content directory
 * @param options Parser options
 * @returns Parsed NoteContent
 */
export async function parseMarkdown(
  content: string,
  filePath: string,
  options: ParserOptions = {}
): Promise<NoteContent> {
  const startTime = Date.now();
  const warnings: ParseWarning[] = [];
  
  // Default options
  const opts: Required<ParserOptions> = {
    basePath: options.basePath || 'content',
    extractToc: options.extractToc ?? true,
    generateExcerpt: options.generateExcerpt ?? true,
    excerptLength: options.excerptLength ?? 200,
    computeStats: options.computeStats ?? true,
    validateLinks: options.validateLinks ?? false,
    availableSlugs: options.availableSlugs || new Set(),
    strict: options.strict ?? false,
    slugify: options.slugify || ((fp) => filePathToSlug(fp, opts.basePath)),
    plugins: options.plugins || [],
  };
  
  // Generate slug
  const slug = opts.slugify(filePath);
  
  // Initialize partial note for plugins
  const note: Partial<NoteContent> = {
    slug,
    filePath,
    warnings,
  };
  
  try {
    // Run beforeParse hooks
    let processedContent = content;
    for (const plugin of opts.plugins) {
      if (plugin.beforeParse) {
        processedContent = await plugin.beforeParse(processedContent, filePath);
      }
    }
    
    // Step 1: Parse frontmatter
    const frontmatterResult = parseFrontmatter(processedContent);
    warnings.push(...frontmatterResult.warnings);
    note.frontmatter = frontmatterResult.data;
    
    // Step 2: Extract links from raw markdown (before processing)
    const linkDetails = parseAllLinks(frontmatterResult.content);
    const links = extractLinkSlugs(linkDetails);
    note.linkDetails = linkDetails;
    note.links = links;
    
    // Step 3: Validate links if requested
    if (opts.validateLinks && opts.availableSlugs.size > 0) {
      for (const link of linkDetails) {
        if (
          link.type === 'wikilink' ||
          link.type === 'wikilink_path' ||
          link.type === 'wikilink_alias'
        ) {
          if (!validateSlug(link.target, opts.availableSlugs)) {
            warnings.push({
              type: 'broken-link',
              message: `Link to "${link.target}" not found`,
              line: link.line,
              column: link.column,
              severity: 'warning',
            });
          }
        }
      }
    }
    
    // Step 4: Build unified processor pipeline
    let processor: any = unified()
      .use(remarkParse) // Parse markdown to mdast
      .use(remarkGfm) // GitHub Flavored Markdown
      .use(remarkMath) // Math support
      .use(remarkFrontmatter); // Parse frontmatter nodes
    
    // Step 5: Apply remark plugins from user plugins
    for (const plugin of opts.plugins) {
      if (plugin.remarkPlugins) {
        for (const remarkPlugin of plugin.remarkPlugins) {
          if (isPluginConfig(remarkPlugin)) {
            processor = processor.use(remarkPlugin.plugin as any, remarkPlugin.options);
          } else {
            processor = processor.use(remarkPlugin as any);
          }
        }
      }
    }
    
    // Step 6: Convert to HTML AST (mdast -> hast)
    processor = processor.use(remarkRehype, {
      allowDangerousHtml: true, // Preserve HTML in markdown
    });
    
    // Step 7: Process raw HTML nodes
    processor = processor.use(rehypeRaw);
    
    // Step 8: Apply rehype plugins from user plugins
    for (const plugin of opts.plugins) {
      if (plugin.rehypePlugins) {
        for (const rehypePlugin of plugin.rehypePlugins) {
          if (isPluginConfig(rehypePlugin)) {
            processor = processor.use(rehypePlugin.plugin as any, rehypePlugin.options);
          } else {
            processor = processor.use(rehypePlugin as any);
          }
        }
      }
    }
    
    // Step 9: Parse and transform the content
    // First parse markdown to MDAST
    const mdast = processor.parse(frontmatterResult.content);
    // Then run transformations to get HAST
    const contentAst = (await processor.run(mdast)) as HastRoot;
    note.contentAst = contentAst;
    
    // Step 10: Extract table of contents
    if (opts.extractToc) {
      note.tableOfContents = extractTableOfContents(contentAst);
    }
    
    // Step 11: Generate excerpt
    if (opts.generateExcerpt) {
      note.excerpt = generateExcerpt(frontmatterResult.content, opts.excerptLength);
    }
    
    // Step 12: Compute content statistics
    if (opts.computeStats) {
      note.stats = computeContentStats(contentAst, frontmatterResult.content);
    } else {
      note.stats = {
        words: 0,
        characters: 0,
        codeBlocks: 0,
        headings: 0,
        images: 0,
        links: 0,
        readingTime: 0,
      };
    }
    
    // Step 13: Run plugin extractData hooks
    for (const plugin of opts.plugins) {
      if (plugin.extractData) {
        await plugin.extractData(contentAst, note);
      }
    }
    
    // Step 14: Finalize note content
    const finalNote: NoteContent = {
      slug: note.slug!,
      filePath: note.filePath!,
      frontmatter: note.frontmatter!,
      contentAst: note.contentAst!,
      links: note.links!,
      linkDetails: note.linkDetails!,
      excerpt: note.excerpt,
      stats: note.stats!,
      warnings: note.warnings!,
      tableOfContents: note.tableOfContents,
      // Preserve any custom properties added by plugins
      ...Object.keys(note).reduce((acc, key) => {
        if (!['slug', 'filePath', 'frontmatter', 'contentAst', 'links', 'linkDetails', 
              'excerpt', 'stats', 'warnings', 'tableOfContents'].includes(key)) {
          acc[key] = (note as any)[key];
        }
        return acc;
      }, {} as any),
    };
    
    // Step 15: Run afterParse hooks
    let processedNote = finalNote;
    for (const plugin of opts.plugins) {
      if (plugin.afterParse) {
        processedNote = await plugin.afterParse(processedNote);
      }
    }
    
    return processedNote;
    
  } catch (error) {
    // Handle parsing errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    warnings.push({
      type: 'other',
      message: `Failed to parse markdown: ${errorMessage}`,
      severity: 'error',
    });
    
    if (opts.strict) {
      throw error;
    }
    
    // Return minimal valid note on error
    return {
      slug,
      filePath,
      frontmatter: note.frontmatter || {},
      contentAst: { type: 'root', children: [] },
      links: [],
      linkDetails: [],
      stats: {
        words: 0,
        characters: 0,
        codeBlocks: 0,
        headings: 0,
        images: 0,
        links: 0,
        readingTime: 0,
      },
      warnings,
    };
  }
}

/**
 * Extracts table of contents from HTML AST
 * Builds a hierarchical structure of headings
 * 
 * @param ast The HTML AST
 * @returns Table of contents entries
 */
export function extractTableOfContents(ast: HastRoot): TocEntry[] {
  const toc: TocEntry[] = [];
  const stack: { entry: TocEntry; depth: number }[] = [];
  
  visit(ast, 'element', (node: Element) => {
    // Check if it's a heading (h1-h6)
    const match = node.tagName.match(/^h([1-6])$/);
    if (!match) return;
    
    const depth = parseInt(match[1]!, 10);
    
    // Extract text content from heading
    const text = extractTextFromNode(node);
    if (!text) return;
    
    // Generate anchor slug
    const anchorSlug = headingToSlug(text);
    
    const entry: TocEntry = {
      depth,
      text,
      slug: anchorSlug,
      children: [],
    };
    
    // Find parent in stack
    while (stack.length > 0 && stack[stack.length - 1]!.depth >= depth) {
      stack.pop();
    }
    
    if (stack.length === 0) {
      // Top-level heading
      toc.push(entry);
    } else {
      // Nested heading
      const parent = stack[stack.length - 1]!.entry;
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(entry);
    }
    
    stack.push({ entry, depth });
  });
  
  return toc;
}

/**
 * Extracts plain text from an AST node
 * 
 * @param node The AST node
 * @returns Plain text content
 */
function extractTextFromNode(node: any): string {
  let text = '';
  
  if (node.type === 'text') {
    return node.value || '';
  }
  
  if (node.children) {
    for (const child of node.children) {
      text += extractTextFromNode(child);
    }
  }
  
  return text;
}

/**
 * Computes statistics about the content
 * 
 * @param ast The HTML AST
 * @param rawContent The raw markdown content
 * @returns Content statistics
 */
export function computeContentStats(ast: HastRoot, rawContent: string): ContentStats {
  let headings = 0;
  let codeBlocks = 0;
  let images = 0;
  
  // Count elements in AST
  visit(ast, 'element', (node: Element) => {
    if (/^h[1-6]$/.test(node.tagName)) {
      headings++;
    } else if (node.tagName === 'pre' || node.tagName === 'code') {
      // Count code blocks (pre tags, not inline code)
      if (node.tagName === 'pre') {
        codeBlocks++;
      }
    } else if (node.tagName === 'img') {
      images++;
    }
  });
  
  // Extract plain text for word count
  const plainText = extractTextFromNode(ast);
  const words = countWords(plainText);
  const characters = plainText.replace(/\s/g, '').length;
  const readingTime = calculateReadingTime(words);
  
  // Count links (from raw content to catch wikilinks)
  const linkMatches = rawContent.match(/(\[\[.*?\]\]|\[.*?\]\(.*?\))/g);
  const links = linkMatches ? linkMatches.length : 0;
  
  return {
    words,
    characters,
    codeBlocks,
    headings,
    images,
    links,
    readingTime,
  };
}

/**
 * Parses multiple markdown files
 * 
 * @param files Array of { content, filePath } objects
 * @param options Parser options
 * @returns Array of parsed notes
 */
export async function parseMultiple(
  files: Array<{ content: string; filePath: string }>,
  options: ParserOptions = {}
): Promise<NoteContent[]> {
  const notes: NoteContent[] = [];
  
  // First pass: collect all slugs for link validation
  if (options.validateLinks && !options.availableSlugs) {
    const slugify = options.slugify || ((fp) => filePathToSlug(fp, options.basePath || 'content'));
    options.availableSlugs = new Set(files.map(f => slugify(f.filePath)));
  }
  
  // Parse all files in parallel
  const results = await Promise.allSettled(
    files.map(file => parseMarkdown(file.content, file.filePath, options))
  );
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      notes.push(result.value);
    }
  }
  
  return notes;
}

/**
 * Builds backlinks for all notes
 * Mutates the notes array to add backlinks
 * 
 * @param notes Array of parsed notes
 */
export function buildBacklinks(notes: NoteContent[]): void {
  // Create a map of slug -> note for quick lookup
  const noteMap = new Map<string, NoteContent>();
  for (const note of notes) {
    noteMap.set(note.slug, note);
  }
  
  // Initialize backlinks arrays
  for (const note of notes) {
    note.backlinks = [];
  }
  
  // Build backlinks
  for (const note of notes) {
    for (const linkedSlug of note.links) {
      const linkedNote = noteMap.get(linkedSlug);
      if (linkedNote && linkedNote.backlinks) {
        linkedNote.backlinks.push(note.slug);
      }
    }
  }
}

/**
 * Filters notes based on frontmatter criteria
 * 
 * @param notes Array of notes
 * @param filter Filter function
 * @returns Filtered notes
 */
export function filterNotes(
  notes: NoteContent[],
  filter: (note: NoteContent) => boolean
): NoteContent[] {
  return notes.filter(filter);
}

/**
 * Gets only published notes
 * 
 * @param notes Array of notes
 * @returns Published notes
 */
export function getPublishedNotes(notes: NoteContent[]): NoteContent[] {
  return filterNotes(notes, note => shouldPublish(note.frontmatter));
}

/**
 * Sorts notes by a given criteria
 * 
 * @param notes Array of notes
 * @param sortBy Sort criteria
 * @returns Sorted notes
 */
export function sortNotes(
  notes: NoteContent[],
  sortBy: 'date' | 'title' | 'slug' | ((a: NoteContent, b: NoteContent) => number)
): NoteContent[] {
  if (typeof sortBy === 'function') {
    return [...notes].sort(sortBy);
  }
  
  return [...notes].sort((a, b) => {
    switch (sortBy) {
      case 'date': {
        const dateA = a.frontmatter.date ? new Date(a.frontmatter.date as string).getTime() : 0;
        const dateB = b.frontmatter.date ? new Date(b.frontmatter.date as string).getTime() : 0;
        return dateB - dateA; // Newest first
      }
      case 'title': {
        const titleA = (a.frontmatter.title as string) || a.slug;
        const titleB = (b.frontmatter.title as string) || b.slug;
        return titleA.localeCompare(titleB);
      }
      case 'slug':
        return a.slug.localeCompare(b.slug);
      default:
        return 0;
    }
  });
}
