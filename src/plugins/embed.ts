import { visit } from 'unist-util-visit';
import type { FullStackPlugin, PluginConfig } from '../core/types';

/**
 * Plugin that converts wikilinks to standard HTML links and embeds to <sparks-embed> tags
 * [[Note]] -> <a href="/note">Note</a>
 * ![[Note]] -> <sparks-embed data-source="/note"></sparks-embed>
 */
export const EmbedPlugin = (): FullStackPlugin => {
    return {
        name: 'embed-transclusion',
        description: 'Handles Obsidian wikilinks and note transclusion (embeds)',

        transform: {
            remarkPlugins: [
                function remarkWikilinkAndEmbed() {
                    return (tree: any, file: any) => {
                        visit(tree, 'text', (node: any, index: number | undefined, parent: any) => {
                            if (!node.value || !parent || index === undefined) return;

                            const text = node.value;
                            const wikilinkRegex = /!?\[\[([^\]]+)\]\]/g;

                            if (!wikilinkRegex.test(text)) return;

                            // Split text by wikilinks and create new nodes
                            const newNodes: any[] = [];
                            let lastIndex = 0;

                            text.replace(wikilinkRegex, (match: string, content: string, offset: number) => {
                                // Add text before wikilink
                                if (offset > lastIndex) {
                                    newNodes.push({
                                        type: 'text',
                                        value: text.slice(lastIndex, offset),
                                    });
                                }

                                // Check if it's an embed
                                const isEmbed = match.startsWith('![[');

                                // Parse wikilink
                                let target = content;
                                let displayText = content;

                                // Handle alias: [[target|display]]
                                if (content.includes('|')) {
                                    const parts = content.split('|');
                                    target = parts[0]?.trim() || '';
                                    displayText = parts[1]?.trim() || target;
                                }

                                // Handle anchor: [[target#anchor]]
                                let anchor = '';
                                if (target.includes('#')) {
                                    const parts = target.split('#');
                                    target = parts[0]?.trim() || '';
                                    anchor = parts[1]?.trim() || '';
                                }

                                // Convert to slug format
                                const slug = target
                                    .toLowerCase()
                                    .replace(/[\s_]+/g, '-')
                                    .replace(/[^\w\-\/]/g, '-')
                                    .replace(/-+/g, '-')
                                    .replace(/^-+|-+$/g, '');

                                // Build URL with optional anchor
                                const url = anchor ? `/${slug}#${anchor}` : `/${slug}`;

                                // Create link or embed node
                                if (isEmbed) {
                                    // If it's an excalidraw embed, it will be handled by the Excalidraw plugin via hName match later,
                                    // or we can output a generic embed that the frontend resolves.
                                    // Output a custom tag for our frontend
                                    newNodes.push({
                                        type: 'html',
                                        value: `<sparks-embed data-source="${url}">${displayText}</sparks-embed>`,
                                    });
                                } else {
                                    // Create link node
                                    newNodes.push({
                                        type: 'link',
                                        url,
                                        title: null,
                                        children: [
                                            {
                                                type: 'text',
                                                value: displayText,
                                            },
                                        ],
                                        data: {
                                            hProperties: {
                                                className: ['wikilink'],
                                            },
                                        },
                                    });
                                }

                                lastIndex = offset + match.length;
                                return match;
                            });

                            // Add remaining text
                            if (lastIndex < text.length) {
                                newNodes.push({
                                    type: 'text',
                                    value: text.slice(lastIndex),
                                });
                            }

                            // Replace the text node with new nodes
                            if (newNodes.length > 0 && index !== null) {
                                parent.children.splice(index, 1, ...newNodes);
                            }
                        });
                    };
                },
            ],
        }
    };
};
