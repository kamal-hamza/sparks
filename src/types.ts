/**
 * Core Types and Interfaces for Markdown Parser
 * Phase 2: Comprehensive type definitions with edge case handling
 */

import type { Root as MdastRoot } from 'mdast';
import type { Root as HastRoot } from 'hast';
import type { VFile } from 'vfile';
import type { Plugin as UnifiedPlugin, Processor } from 'unified';

/**
 * Frontmatter can contain various types of data
 * We support all common YAML types and handle edge cases
 */
export interface FrontmatterData {
  // Common fields
  title?: string;
  date?: string | Date;
  publish?: boolean;
  draft?: boolean;
  tags?: string | string[];
  
  // Allow any additional fields
  [key: string]: unknown;
}

/**
 * Represents different types of links found in markdown
 */
export enum LinkType {
  /** Standard markdown link: [text](url) */
  MARKDOWN = 'markdown',
  /** Wikilink: [[note]] or [[note|alias]] */
  WIKILINK = 'wikilink',
  /** Wikilink with path: [[folder/note]] */
  WIKILINK_PATH = 'wikilink_path',
  /** Wikilink with alias: [[note|display text]] */
  WIKILINK_ALIAS = 'wikilink_alias',
  /** Embed: ![[note]] */
  EMBED = 'embed',
  /** External link: [text](https://...) */
  EXTERNAL = 'external',
  /** Anchor link: [text](#heading) */
  ANCHOR = 'anchor',
}

/**
 * Detailed information about a link
 */
export interface LinkInfo {
  /** The type of link */
  type: LinkType;
  /** The target slug or URL */
  target: string;
  /** Display text (if different from target) */
  displayText?: string;
  /** Original raw text from the markdown */
  raw: string;
  /** Line number where the link appears */
  line?: number;
  /** Column number where the link appears */
  column?: number;
  /** Whether this is an embed (![[note]]) */
  isEmbed: boolean;
  /** For wikilinks with headings: [[note#heading]] */
  anchor?: string;
}

/**
 * Statistics about the note content
 */
export interface ContentStats {
  /** Word count */
  words: number;
  /** Character count (excluding whitespace) */
  characters: number;
  /** Number of code blocks */
  codeBlocks: number;
  /** Number of headings */
  headings: number;
  /** Number of images */
  images: number;
  /** Number of links */
  links: number;
  /** Reading time estimate (minutes) */
  readingTime: number;
}

/**
 * Warning or error encountered during parsing
 */
export interface ParseWarning {
  /** Type of warning */
  type: 'missing-frontmatter' | 'invalid-yaml' | 'broken-link' | 'invalid-wikilink' | 'empty-content' | 'other';
  /** Human-readable message */
  message: string;
  /** Line number if applicable */
  line?: number;
  /** Column number if applicable */
  column?: number;
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
}

/**
 * The final structured representation of a note
 * This is what gets consumed by the Next.js frontend
 */
export interface NoteContent {
  /** URL-safe slug (e.g., "programming-languages/javascript/js-fundamentals") */
  slug: string;
  
  /** Original file path relative to content directory */
  filePath: string;
  
  /** Parsed frontmatter data */
  frontmatter: FrontmatterData;
  
  /** The parsed HTML Abstract Syntax Tree (hast) */
  contentAst: HastRoot;
  
  /** Array of slugs this note links to (for building graph) */
  links: string[];
  
  /** Detailed link information */
  linkDetails: LinkInfo[];
  
  /** Array of slugs that link to this note (backlinks) - populated later */
  backlinks?: string[];
  
  /** Plain text excerpt (first N characters) */
  excerpt?: string;
  
  /** Content statistics */
  stats: ContentStats;
  
  /** Any warnings encountered during parsing */
  warnings: ParseWarning[];
  
  /** Table of contents extracted from headings */
  tableOfContents?: TocEntry[];
  
  /** When the note was last modified */
  lastModified?: Date;
  
  /** When the note was created */
  created?: Date;
}

/**
 * Table of contents entry
 */
export interface TocEntry {
  /** Heading level (1-6) */
  depth: number;
  /** Heading text */
  text: string;
  /** Anchor slug for linking */
  slug: string;
  /** Child headings */
  children?: TocEntry[];
}

/**
 * Remark plugin type (operates on Markdown AST)
 */
export type RemarkPlugin = UnifiedPlugin<any[], MdastRoot>;

/**
 * Rehype plugin type (operates on HTML AST)
 */
export type RehypePlugin = UnifiedPlugin<any[], HastRoot>;

/**
 * Configuration for a plugin with options
 */
export interface PluginConfig<TOptions = any> {
  /** The plugin function */
  plugin: RemarkPlugin | RehypePlugin;
  /** Options to pass to the plugin */
  options?: TOptions;
}

/**
 * Full-stack plugin interface that can modify both Markdown and HTML
 * This is the isomorphic plugin system we discussed
 */
export interface FullStackPlugin {
  /** Unique identifier for the plugin */
  name: string;
  
  /** Description of what the plugin does */
  description?: string;
  
  /**
   * Remark plugins to apply (operates on Markdown AST)
   * Applied before conversion to HTML
   */
  remarkPlugins?: (RemarkPlugin | PluginConfig<any>)[];
  
  /**
   * Rehype plugins to apply (operates on HTML AST)
   * Applied after conversion to HTML
   */
  rehypePlugins?: (RehypePlugin | PluginConfig<any>)[];
  
  /**
   * Hook called before parsing starts
   * Can be used to preprocess the raw markdown
   */
  beforeParse?: (content: string, filePath: string) => string | Promise<string>;
  
  /**
   * Hook called after parsing completes
   * Can be used to postprocess the NoteContent
   */
  afterParse?: (note: NoteContent) => NoteContent | Promise<NoteContent>;
  
  /**
   * Hook for extracting custom data from the AST
   * Called during the parse process
   */
  extractData?: (ast: HastRoot, note: Partial<NoteContent>) => void | Promise<void>;
  
  /**
   * Configuration for the plugin
   */
  config?: Record<string, any>;
}

/**
 * Options for the parser
 */
export interface ParserOptions {
  /** Base path for resolving relative links */
  basePath?: string;
  
  /** Whether to extract table of contents */
  extractToc?: boolean;
  
  /** Whether to generate excerpts */
  generateExcerpt?: boolean;
  
  /** Excerpt length in characters */
  excerptLength?: number;
  
  /** Whether to compute content statistics */
  computeStats?: boolean;
  
  /** Whether to validate links */
  validateLinks?: boolean;
  
  /** Available note slugs for link validation */
  availableSlugs?: Set<string>;
  
  /** Whether to throw on errors or collect warnings */
  strict?: boolean;
  
  /** Custom slug generation function */
  slugify?: (filePath: string) => string;
  
  /** Plugins to apply */
  plugins?: FullStackPlugin[];
}

/**
 * Result of parsing a collection of notes
 */
export interface ParseResult {
  /** Successfully parsed notes */
  notes: NoteContent[];
  
  /** Files that failed to parse */
  errors: Array<{
    filePath: string;
    error: Error;
  }>;
  
  /** Total processing time in milliseconds */
  duration: number;
  
  /** Graph data for visualization */
  graph?: GraphData;
}

/**
 * Graph data for network visualization
 */
export interface GraphData {
  /** Nodes (notes) */
  nodes: Array<{
    id: string;
    label: string;
    metadata?: FrontmatterData;
  }>;
  
  /** Edges (links between notes) */
  edges: Array<{
    source: string;
    target: string;
    type: LinkType;
  }>;
}

/**
 * Configuration for the entire parser system
 */
export interface ParserConfig {
  /** Content directory path */
  contentDir: string;
  
  /** Output directory for generated JSON */
  outputDir?: string;
  
  /** Parser options */
  options: ParserOptions;
  
  /** Whether to watch for file changes */
  watch?: boolean;
  
  /** File patterns to include (glob) */
  include?: string[];
  
  /** File patterns to exclude (glob) */
  exclude?: string[];
}

/**
 * Context passed to plugins during processing
 */
export interface PluginContext {
  /** The file being processed */
  file: VFile;
  
  /** The unified processor */
  processor: Processor;
  
  /** Parser options */
  options: ParserOptions;
  
  /** Current note being built */
  note: Partial<NoteContent>;
}

/**
 * Utility type for async or sync return values
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * Type guard to check if a value is a PluginConfig
 */
export function isPluginConfig(value: any): value is PluginConfig {
  return value && typeof value === 'object' && 'plugin' in value;
}

/**
 * Type guard to check if a link is internal (wikilink or relative markdown link)
 */
export function isInternalLink(link: LinkInfo): boolean {
  return link.type === LinkType.WIKILINK ||
         link.type === LinkType.WIKILINK_PATH ||
         link.type === LinkType.WIKILINK_ALIAS ||
         link.type === LinkType.EMBED;
}

/**
 * Type guard to check if a link is external
 */
export function isExternalLink(link: LinkInfo): boolean {
  return link.type === LinkType.EXTERNAL;
}
