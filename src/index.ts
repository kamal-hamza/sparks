/**
 * Main entry point - exports all public APIs
 */

// Core parser
export {
  parseMarkdown,
  parseMultiple,
  buildBacklinks,
  filterNotes,
  getPublishedNotes,
  sortNotes,
  extractTableOfContents,
  computeContentStats,
} from './parser';

// Frontmatter utilities
export {
  parseFrontmatter,
  normalizeTags,
  normalizeDate,
  normalizeBoolean,
  validateFrontmatter,
  mergeFrontmatter,
  getFrontmatterField,
  shouldPublish,
  serializeFrontmatter,
  updateFrontmatter,
} from './frontmatter';

// Path and link utilities
export {
  filePathToSlug,
  normalizeWikilink,
  extractWikilinks,
  extractMarkdownLinks,
  determineLinkType,
  parseAllLinks,
  extractLinkSlugs,
  headingToSlug,
  validateSlug,
  resolveRelativePath,
  calculateReadingTime,
  generateExcerpt,
  countWords,
  getFileExtension,
  isMarkdownFile,
  normalizePath,
} from './utils';

// Plugins
export {
  headingAnchorPlugin,
  wikilinkPlugin,
  calloutPlugin,
  codeHighlightPlugin,
  tagExtractorPlugin,
  readingTimePlugin,
  linkValidatorPlugin,
  mdxComponentPlugin,
  defaultPlugins,
  createPlugin,
} from './plugins';

// Types
export type {
  FrontmatterData,
  LinkType,
  LinkInfo,
  ContentStats,
  ParseWarning,
  NoteContent,
  TocEntry,
  RemarkPlugin,
  RehypePlugin,
  PluginConfig,
  FullStackPlugin,
  ParserOptions,
  ParseResult,
  GraphData,
  ParserConfig,
  PluginContext,
  MaybePromise,
} from './types';

export {
  isPluginConfig,
  isInternalLink,
  isExternalLink,
  LinkType as LinkTypeEnum,
} from './types';