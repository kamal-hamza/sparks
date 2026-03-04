import { visit } from 'unist-util-visit';
import type { Element } from 'hast';
import type { FullStackPlugin, PluginConfig } from '../core/types';
import remarkGfm from 'remark-gfm';

/**
 * Transforms standard remark-gfm footnotes into semantic <sparks-footnote-ref> 
 * and identifies definitions, allowing the frontend to attach hover popovers easily.
 */
function rehypeFootnotes() {
    return (tree: any) => {
        visit(tree, 'element', (node: Element) => {
            // Find footnote references (usually an <a> tag inside a <sup>)
            if (node.properties && node.properties['data-footnote-ref'] !== undefined) {
                node.tagName = 'sparks-footnote-ref';
                // The id/href are preserved for functionality
            }

            // Find the main footnotes section container at the bottom
            if (node.tagName === 'section' && node.properties && node.properties['data-footnotes'] !== undefined) {
                node.tagName = 'sparks-footnotes-group';
            }

            // Find individual footnote definitions
            // remark-gfm typically gives them IDs like "user-content-fn-1"
            if (node.tagName === 'li' && node.properties?.id && String(node.properties.id).includes('fn-')) {
                const classes = Array.isArray(node.properties.className) ? node.properties.className : [];
                node.properties.className = [...classes, 'sparks-footnote-def'];
            }
        });
    };
}

/**
 * Footnotes and Academic Citations
 * Integrates remark-gfm for parsing and transforms the output
 * to support advanced frontend behaviors like hover popovers.
 */
export const FootnotesPlugin = (): FullStackPlugin => {
    return {
        name: 'footnotes',
        description: 'Provides academic footnotes with hover popover support',
        transform: {
            remarkPlugins: [
                { plugin: remarkGfm } as PluginConfig,
            ],
            rehypePlugins: [
                { plugin: rehypeFootnotes } as PluginConfig,
            ],
        }
    };
};
