/**
 * Utility functions for slug generation, path handling, and link normalization
 */

import path from 'path';
import type { LinkInfo, LinkType } from '../core/types';

/**
 * Converts a file path to a URL-safe slug
 * 
 * Examples:
 * - "content/Programming Languages/JavaScript/JS Fundamentals.md" -> "programming-languages/javascript/js-fundamentals"
 * - "content/index.md" -> "index"
 * - "content/Dart.md" -> "dart"
 * - "content/Web Development/React/index.md" -> "web-development/react"
 * 
 * @param filePath The file path relative to content directory
 * @param contentDir The content directory base path
 * @returns URL-safe slug
 */
export function filePathToSlug(filePath: string, contentDir: string = 'content'): string {
  // Remove content directory prefix
  let slug = filePath;
  if (slug.startsWith(contentDir)) {
    slug = slug.slice(contentDir.length);
  }
  
  // Remove leading/trailing slashes
  slug = slug.replace(/^\/+|\/+$/g, '');
  
  // Remove .md extension
  slug = slug.replace(/\.md$/, '');
  
  // Handle index files (remove /index)
  slug = slug.replace(/\/index$/, '');
  
  // Handle root index file
  if (slug === 'index') {
    return 'index';
  }
  
  // Convert to lowercase
  slug = slug.toLowerCase();
  
  // Replace spaces and special characters with hyphens
  slug = slug
    .replace(/[\s_]+/g, '-') // spaces and underscores to hyphens
    .replace(/[^\w\-\/]/g, '-') // special chars to hyphens
    .replace(/-+/g, '-') // multiple hyphens to single
    .replace(/^-+|-+$/g, ''); // trim hyphens
  
  return slug;
}

/**
 * Normalizes a wikilink to a slug
 * 
 * Examples:
 * - "[[Flutter]]" -> "flutter"
 * - "[[Web Development/React]]" -> "web-development/react"
 * - "[[Computer Networking/index|Computer Networking]]" -> "computer-networking"
 * - "[[note#heading]]" -> "note" (anchor handled separately)
 * 
 * @param wikilink The wikilink text (with or without brackets)
 * @returns Normalized slug and anchor
 */
export function normalizeWikilink(wikilink: string): { slug: string; anchor?: string; displayText?: string } {
  // Remove [[ and ]] if present
  let link = wikilink.replace(/^\[\[|\]\]$/g, '').trim();
  
  // Extract display text (alias) if present: [[target|display]]
  let displayText: string | undefined;
  if (link.includes('|')) {
    const parts = link.split('|');
    link = parts[0]?.trim() || '';
    displayText = parts[1]?.trim();
  }
  
  // Extract anchor if present: [[target#anchor]]
  let anchor: string | undefined;
  if (link.includes('#')) {
    const parts = link.split('#');
    link = parts[0]?.trim() || '';
    anchor = parts[1]?.trim();
  }
  
  // Remove /index suffix
  link = link.replace(/\/index$/, '');
  
  // Convert to slug format
  const slug = link
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w\-\/]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return { slug, anchor, displayText };
}

/**
 * Extracts wikilinks from markdown text
 * Handles various formats:
 * - [[Note]]
 * - [[Folder/Note]]
 * - [[Note|Alias]]
 * - [[Note#Heading]]
 * - ![[Embed]]
 * 
 * @param content The markdown content
 * @returns Array of wikilink matches with position info
 */
export function extractWikilinks(content: string): Array<{
  raw: string;
  match: string;
  isEmbed: boolean;
  line: number;
  column: number;
}> {
  const wikilinks: Array<{
    raw: string;
    match: string;
    isEmbed: boolean;
    line: number;
    column: number;
  }> = [];
  
  // Regular expression to match wikilinks and embeds
  // Matches: [[something]] or ![[something]]
  const wikilinkRegex = /(!?\[\[([^\]]+)\]\])/g;
  
  const lines = content.split('\n');
  
  lines.forEach((line, lineIndex) => {
    let match;
    while ((match = wikilinkRegex.exec(line)) !== null) {
      if (match[1] && match[2]) {
        wikilinks.push({
          raw: match[1],
          match: match[2],
          isEmbed: match[1].startsWith('!'),
          line: lineIndex + 1,
          column: match.index + 1,
        });
      }
    }
  });
  
  return wikilinks;
}

/**
 * Extracts markdown links from text
 * Matches: [text](url)
 * 
 * @param content The markdown content
 * @returns Array of markdown links with position info
 */
export function extractMarkdownLinks(content: string): Array<{
  raw: string;
  text: string;
  url: string;
  line: number;
  column: number;
}> {
  const links: Array<{
    raw: string;
    text: string;
    url: string;
    line: number;
    column: number;
  }> = [];
  
  // Regular expression to match markdown links
  // Matches: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  const lines = content.split('\n');
  
  lines.forEach((line, lineIndex) => {
    let match;
    while ((match = linkRegex.exec(line)) !== null) {
      if (match[0] && match[1] && match[2]) {
        links.push({
          raw: match[0],
          text: match[1],
          url: match[2],
          line: lineIndex + 1,
          column: match.index + 1,
        });
      }
    }
  });
  
  return links;
}

/**
 * Determines the type of a link
 * 
 * @param url The link URL or target
 * @returns The link type
 */
export function determineLinkType(url: string, isEmbed: boolean = false): LinkType {
  if (isEmbed) {
    return 'embed' as LinkType;
  }
  
  // Check for external links
  if (/^https?:\/\//.test(url) || /^mailto:/.test(url) || /^tel:/.test(url)) {
    return 'external' as LinkType;
  }
  
  // Check for anchor links
  if (url.startsWith('#')) {
    return 'anchor' as LinkType;
  }
  
  // Otherwise it's an internal markdown link
  return 'markdown' as LinkType;
}

/**
 * Parses all links from markdown content
 * Combines wikilinks and markdown links into LinkInfo objects
 * 
 * @param content The markdown content
 * @returns Array of LinkInfo objects
 */
export function parseAllLinks(content: string): LinkInfo[] {
  const linkInfos: LinkInfo[] = [];
  
  // Extract wikilinks
  const wikilinks = extractWikilinks(content);
  for (const wikilink of wikilinks) {
    const { slug, anchor, displayText } = normalizeWikilink(wikilink.match);
    
    let type: LinkType = 'wikilink' as LinkType;
    if (wikilink.isEmbed) {
      type = 'embed' as LinkType;
    } else if (displayText) {
      type = 'wikilink_alias' as LinkType;
    } else if (slug.includes('/')) {
      type = 'wikilink_path' as LinkType;
    }
    
    linkInfos.push({
      type,
      target: slug,
      displayText,
      raw: wikilink.raw,
      line: wikilink.line,
      column: wikilink.column,
      isEmbed: wikilink.isEmbed,
      anchor,
    });
  }
  
  // Extract markdown links
  const mdLinks = extractMarkdownLinks(content);
  for (const mdLink of mdLinks) {
    const type = determineLinkType(mdLink.url);
    
    linkInfos.push({
      type,
      target: mdLink.url,
      displayText: mdLink.text,
      raw: mdLink.raw,
      line: mdLink.line,
      column: mdLink.column,
      isEmbed: false,
    });
  }
  
  return linkInfos;
}

/**
 * Extracts unique slugs from link information
 * Only includes internal links (wikilinks and relative markdown links)
 * 
 * @param linkInfos Array of LinkInfo objects
 * @returns Array of unique slugs
 */
export function extractLinkSlugs(linkInfos: LinkInfo[]): string[] {
  const slugs = new Set<string>();
  
  for (const link of linkInfos) {
    // Only include internal links
    if (
      link.type === 'wikilink' as LinkType ||
      link.type === 'wikilink_path' as LinkType ||
      link.type === 'wikilink_alias' as LinkType ||
      link.type === 'embed' as LinkType
    ) {
      slugs.add(link.target);
    }
  }
  
  return Array.from(slugs);
}

/**
 * Generates a heading slug for anchor links
 * 
 * @param heading The heading text
 * @returns URL-safe slug
 */
export function headingToSlug(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Validates a slug against available slugs
 * 
 * @param slug The slug to validate
 * @param availableSlugs Set of all available slugs
 * @returns Whether the slug exists
 */
export function validateSlug(slug: string, availableSlugs: Set<string>): boolean {
  return availableSlugs.has(slug);
}

/**
 * Resolves a relative path to an absolute slug
 * Handles paths like "../other-note" or "./sibling-note"
 * 
 * @param relativePath The relative path
 * @param currentSlug The current note's slug
 * @returns Resolved absolute slug
 */
export function resolveRelativePath(relativePath: string, currentSlug: string): string {
  // Get the directory of the current slug
  const currentDir = path.dirname(currentSlug);
  
  // Resolve the path
  const resolved = path.join(currentDir, relativePath);
  
  // Normalize the result
  return resolved
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\.md$/, '');
}

/**
 * Calculates reading time based on word count
 * Assumes average reading speed of 200 words per minute
 * 
 * @param wordCount The number of words
 * @returns Reading time in minutes (rounded up)
 */
export function calculateReadingTime(wordCount: number): number {
  const wordsPerMinute = 200;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Extracts plain text from HTML AST for excerpt generation
 * 
 * @param content The markdown or HTML content
 * @param maxLength Maximum length of excerpt
 * @returns Plain text excerpt
 */
export function generateExcerpt(content: string, maxLength: number = 200): string {
  // Remove frontmatter
  let text = content.replace(/^---\n[\s\S]*?\n---\n/, '');
  
  // Remove markdown syntax
  text = text
    .replace(/#{1,6}\s/g, '') // Remove heading markers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
    .replace(/!\[\[([^\]]+)\]\]/g, '') // Remove embeds
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, '$2') // Remove wikilinks, keep alias or target
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`([^`]+)`/g, '$1') // Remove inline code
    .replace(/^\s*[-*+]\s/gm, '') // Remove list markers
    .replace(/^\s*\d+\.\s/gm, '') // Remove ordered list markers
    .replace(/>\s/g, '') // Remove blockquote markers
    .trim();
  
  // Truncate to max length
  if (text.length > maxLength) {
    text = text.slice(0, maxLength).trim() + '...';
  }
  
  return text;
}

/**
 * Counts words in text
 * 
 * @param text The text to count
 * @returns Word count
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Gets file extension
 * 
 * @param filePath The file path
 * @returns File extension without dot
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath).slice(1);
}

/**
 * Checks if a file is a markdown file
 * 
 * @param filePath The file path
 * @returns Whether the file is markdown
 */
export function isMarkdownFile(filePath: string): boolean {
  const ext = getFileExtension(filePath);
  return ext === 'md' || ext === 'markdown' || ext === 'mdx';
}

/**
 * Normalizes path separators to forward slashes
 * 
 * @param filePath The file path
 * @returns Normalized path
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}
