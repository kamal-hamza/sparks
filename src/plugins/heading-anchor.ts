import { visit } from 'unist-util-visit';
import type { Element } from 'hast';
import type { FullStackPlugin } from '../core/types';
import { headingToSlug } from '../util/utils';

/**
 * Plugin that adds IDs to all headings for anchor linking
 */
export const headingAnchorPlugin: FullStackPlugin = {
    name: 'heading-anchor',
    description: 'Adds ID attributes to all headings for anchor linking',

    rehypePlugins: [
        function rehypeHeadingAnchor() {
            return (tree: any) => {
                visit(tree, 'element', (node: Element) => {
                    const match = node.tagName.match(/^h([1-6])$/);
                    if (!match) return;

                    // Extract text content
                    let text = '';
                    visit(node, 'text', (textNode: any) => {
                        text += textNode.value;
                    });

                    // Generate slug and add as ID
                    const slug = headingToSlug(text);
                    if (!node.properties) {
                        node.properties = {};
                    }
                    node.properties.id = slug;
                });
            };
        },
    ],
};
