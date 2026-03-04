/**
 * Plugin System and Example Plugins
 * Demonstrates how to create custom plugins for the parser
 */

import { visit } from 'unist-util-visit';
import type { Element } from 'hast';
import rehypePrettyCode, { type Options as CodeOptions } from 'rehype-pretty-code';
import type { FullStackPlugin, NoteContent, PluginConfig } from '../core/types';
import { headingToSlug } from '../util/utils';
export { mathPlugin } from './math';
export { mermaidPlugin } from './mermaid';
export { CitationPlugin } from './citation';

// Power User Plugins
import { DirectivePlugin } from './directive';
import { PseudocodePlugin } from './pseudocode';
import { EmbedPlugin } from './embed';
import { CheckboxPlugin } from './checkbox';
import { ExcalidrawPlugin } from './excalidraw';
import { CodeEnhancementsPlugin } from './code-enhancements';
import { FootnotesPlugin } from './footnotes';

export {
  DirectivePlugin,
  PseudocodePlugin,
  EmbedPlugin,
  CheckboxPlugin,
  ExcalidrawPlugin,
  CodeEnhancementsPlugin,
  FootnotesPlugin,
};

// Standard Plugins
import { headingAnchorPlugin } from './heading-anchor';
import { wikilinkPlugin } from './wikilink';
import { calloutPlugin } from './callout';
import { codeHighlightPlugin } from './code-highlight';
import { tagExtractorPlugin } from './tag-extractor';
import { readingTimePlugin } from './reading-time';
import { linkValidatorPlugin } from './link-validator';
import { SyntaxHighlightingPlugin, type SyntaxOptions } from './syntax-highlighting';

export {
  headingAnchorPlugin,
  wikilinkPlugin,
  calloutPlugin,
  codeHighlightPlugin,
  tagExtractorPlugin,
  readingTimePlugin,
  linkValidatorPlugin,
  SyntaxHighlightingPlugin,
  type SyntaxOptions,
};


/**
 * Default plugin set with common functionality
 */
export const defaultPlugins: FullStackPlugin[] = [
  headingAnchorPlugin,
  wikilinkPlugin,
  calloutPlugin,
  codeHighlightPlugin,
];

/**
 * Power-user plugin set with advanced functionalities
 */
export const powerUserPlugins = (): FullStackPlugin[] => [
  DirectivePlugin(),
  PseudocodePlugin(),
  EmbedPlugin(),
  CheckboxPlugin(),
  ExcalidrawPlugin(),
  CodeEnhancementsPlugin(),
  FootnotesPlugin(),
];

/**
 * Creates a custom plugin easily
 */
export function createPlugin(config: FullStackPlugin): FullStackPlugin {
  return config;
}
