import { visit } from 'unist-util-visit';
import remarkDirective from 'remark-directive';
import type { FullStackPlugin, PluginConfig } from '../core/types';

/**
 * Transforms remark-directive nodes into custom HTML elements
 * e.g., ::youtube{v="123"} -> <sparks-youtube v="123"></sparks-youtube>
 */
function remarkDirectiveHtml() {
  return (tree: any) => {
    visit(tree, (node: any) => {
      if (
        node.type === 'textDirective' ||
        node.type === 'leafDirective' ||
        node.type === 'containerDirective'
      ) {
        if (!node.data) {
          node.data = {};
        }

        node.data.hName = `sparks-${node.name}`;
        node.data.hProperties = { ...(node.attributes || {}) };
      }
    });
  };
}

/**
 * Framework-Agnostic MDX via Directives
 * Parses generic container and text directives like ::youtube and :::gallery
 * and converts them to standard HTML tags (e.g. <sparks-youtube>)
 */
export const DirectivePlugin = (): FullStackPlugin => {
  return {
    name: 'directive',
    description: 'Parses Markdown directives and transforms them into agnostic HTML tags',
    transform: {
      remarkPlugins: [
        { plugin: remarkDirective } as PluginConfig,
        { plugin: remarkDirectiveHtml } as PluginConfig,
      ],
    }
  };
};
