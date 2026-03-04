import { visit } from 'unist-util-visit';
import type { FullStackPlugin, PluginConfig } from '../core/types';

/**
 * Transforms pseudo code blocks into HTML element <sparks-pseudocode>
 * e.g., ```pseudo \n code \n ``` -> <sparks-pseudocode> code </sparks-pseudocode>
 */
function remarkPseudocode() {
    return (tree: any) => {
        visit(tree, 'code', (node: any) => {
            if (node.lang === 'pseudo') {
                const data = node.data || (node.data = {});
                data.hName = 'sparks-pseudocode';
                // We ensure it gets rendered as raw text inside
                data.hChildren = [{ type: 'text', value: node.value }];
            }
        });
    };
}

/**
 * Pseudocode & Algorithms
 * Finds code blocks with `language-pseudo` and avoids standard syntax highlighting,
 * transforming them into a semantic tag for frontend KaTeX/pseudocode.js rendering.
 */
export const PseudocodePlugin = (): FullStackPlugin => {
    return {
        name: 'pseudocode',
        description: 'Transform pseudocode blocks to specific HTML elements',
        remarkPlugins: [
            { plugin: remarkPseudocode } as PluginConfig,
        ],
    };
};
