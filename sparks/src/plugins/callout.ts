import { visit } from 'unist-util-visit';
import type { FullStackPlugin } from '../core/types';

/**
 * Plugin that processes callout blocks (Obsidian-style)
 * > [!info] Title
 * > Content
 */
export const calloutPlugin: FullStackPlugin = {
    name: 'callout',
    description: 'Processes Obsidian-style callout blocks',

    transform: {
        remarkPlugins: [
            function remarkCallout() {
                return (tree: any) => {
                    visit(tree, 'blockquote', (node: any) => {
                        // Check if this is a callout
                        const firstChild = node.children[0];
                        if (!firstChild || firstChild.type !== 'paragraph') return;

                        const firstText = firstChild.children[0];
                        if (!firstText || firstText.type !== 'text') return;

                        const match = firstText.value.match(/^\[!(\w+)\](?:\s+(.+))?/);
                        if (!match) return;

                        const [fullMatch, type, title] = match;

                        // Remove callout syntax from text
                        firstText.value = firstText.value.slice(fullMatch.length).trim();
                        if (!firstText.value) {
                            firstChild.children.shift();
                        }

                        // Convert blockquote to HTML div via html node
                        node.type = 'html';

                        // Build HTML content
                        const calloutType = type?.toLowerCase() || 'info';
                        const calloutTitle = title || type || 'Info';

                        // Extract content from children
                        let content = '';
                        for (const child of node.children) {
                            if (child.type === 'paragraph') {
                                for (const textNode of child.children) {
                                    if (textNode.type === 'text') {
                                        content += textNode.value;
                                    }
                                }
                            }
                        }

                        node.value = `<sparks-callout type="${calloutType}" title="${calloutTitle}"><p>${content}</p></sparks-callout>`;
                        delete node.children;
                    });
                };
            },
        ],
    }
};
