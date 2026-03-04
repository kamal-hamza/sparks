import { visit } from 'unist-util-visit';
import type { Element } from 'hast';
import type { FullStackPlugin } from '../core/types';

/**
 * Plugin that adds syntax highlighting classes to code blocks
 */
export const codeHighlightPlugin: FullStackPlugin = {
    name: 'code-highlight',
    description: 'Adds language classes to code blocks for syntax highlighting',

    transform: {
        rehypePlugins: [
            function rehypeCodeHighlight() {
                return (tree: any) => {
                    visit(tree, 'element', (node: Element) => {
                        if (node.tagName !== 'code') return;

                        // Check if this is inside a pre tag (code block, not inline)
                        const parent = node;

                        // Get language from className
                        if (node.properties && node.properties.className) {
                            const classNames = node.properties.className as string[];
                            const langClass = classNames.find((cls: string) => cls.startsWith('language-'));

                            if (langClass) {
                                const lang = langClass.replace('language-', '');
                                node.properties['data-language'] = lang;
                            }
                        }
                    });
                };
            },
        ],
    }
};
