import { visit } from 'unist-util-visit';
import type { Element } from 'hast';
import type { FullStackPlugin, PluginConfig } from '../core/types';

/**
 * Transforms excalidraw links/embeds into interactive <sparks-excalidraw> canvas components
 */
function rehypeExcalidraw() {
    return (tree: any) => {
        visit(tree, 'element', (node: Element) => {
            // Case 1: Standard markdown images `![drawing](my-drawing.excalidraw)`
            if (node.tagName === 'img' && node.properties?.src) {
                const src = String(node.properties.src);
                if (src.endsWith('.excalidraw') || src.endsWith('.excalidraw.md') || src.endsWith('.excalidraw.json')) {
                    node.tagName = 'sparks-excalidraw';
                }
            }

            // Case 2: Handled by Embed/Wikilink plugins, e.g. `<sparks-embed data-source="...-excalidraw">`
            if (node.tagName === 'sparks-embed' && node.properties && node.properties['data-source']) {
                const source = String(node.properties['data-source']);
                if (source.endsWith('-excalidraw') || source.endsWith('-excalidraw-md')) {
                    node.tagName = 'sparks-excalidraw';
                    node.properties.src = source;
                    delete node.properties['data-source'];
                }
            }

            // Case 3: Standard anchor links
            if (node.tagName === 'a' && node.properties?.href) {
                const href = String(node.properties.href);
                if (href.endsWith('.excalidraw') || href.endsWith('.excalidraw.md') || href.endsWith('.excalidraw.json')) {
                    node.tagName = 'sparks-excalidraw';
                    node.properties.src = href;
                    delete node.properties.href;
                }
            }
        });
    };
}

/**
 * Excalidraw / Canvas Support
 * Detects links/embeds pointing to Excalidraw files
 * and outputs a semantic tag for frontend to render a pan/zoomable interactive canvas.
 */
export const ExcalidrawPlugin = (): FullStackPlugin => {
    return {
        name: 'excalidraw',
        description: 'Renders Excalidraw notes as interactive canvas elements',
        rehypePlugins: [
            { plugin: rehypeExcalidraw } as PluginConfig,
        ],
    };
};
