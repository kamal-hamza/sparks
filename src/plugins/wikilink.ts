import { visit } from 'unist-util-visit';
import type { FullStackPlugin } from '../core/types';

/**
 * Plugin that converts wikilinks to standard HTML links
 * [[Note]] -> <a href="/note">Note</a>
 * [[Note|Alias]] -> <a href="/note">Alias</a>
 */
export const wikilinkPlugin: FullStackPlugin = {
    name: 'wikilink',
    description: 'Converts Obsidian wikilinks to HTML links',

    transform: {
        remarkPlugins: [
            function remarkWikilink() {
                return (tree: any, file: any) => {
                    const assetBaseUrl = file?.data?.parserOpts?.assetBaseUrl || '/api/assets';
                    const assetExtensions = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'pdf', 'mp4', 'webm', 'mp3', 'wav', 'ogg']);

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

                            // Check if target is an asset 
                            const extMatch = target.match(/\.([a-z0-9]+)$/i);
                            const ext = extMatch ? extMatch[1].toLowerCase() : '';
                            const isAsset = assetExtensions.has(ext);

                            if (isAsset) {
                                // For assets, we don't slugify. We directly link to them via assetBaseUrl
                                const assetUrl = `${assetBaseUrl.replace(/\/$/, '')}/${target}`;

                                if (isEmbed) {
                                    // if it's an image
                                    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
                                        newNodes.push({
                                            type: 'html',
                                            value: `<img src="${assetUrl}" alt="${displayText}" class="asset-embed" />`,
                                        });
                                    } else {
                                        // fallback for pdf, mp4, etc.
                                        newNodes.push({
                                            type: 'html',
                                            value: `<a href="${assetUrl}" class="asset-link document" target="_blank">${displayText}</a>`,
                                        });
                                    }
                                } else {
                                    // regular link to asset
                                    newNodes.push({
                                        type: 'html',
                                        value: `<a href="${assetUrl}" class="asset-link" target="_blank">${displayText}</a>`,
                                    });
                                }
                            } else {
                                // Normal wikilink processing
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
                                    // Create embed span for images, videos, etc.
                                    newNodes.push({
                                        type: 'html',
                                        value: `<span class="embed" data-src="${url}">${displayText}</span>`,
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
