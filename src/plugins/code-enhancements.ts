import { visit } from 'unist-util-visit';
import type { Element, Root } from 'hast';
import type { FullStackPlugin, PluginConfig } from '../core/types';

/**
 * Groups consecutive code blocks into a <sparks-code-group> component
 * which can handle rendering tabs and copy-to-clipboard buttons.
 */
function rehypeCodeEnhancements() {
    return (tree: Root) => {
        visit(tree, (node: any) => {
            if (node.children && Array.isArray(node.children)) {
                const newChildren: any[] = [];
                let i = 0;

                while (i < node.children.length) {
                    const child = node.children[i];

                    // Identify a code block. 
                    // With rehype-pretty-code, it's <figure data-rehype-pretty-code-figure>
                    // Standard markdown is <pre>
                    const isCodeBlock = child.type === 'element' &&
                        (child.tagName === 'pre' ||
                            (child.tagName === 'figure' && child.properties && child.properties['data-rehype-pretty-code-figure'] !== undefined));

                    if (isCodeBlock) {
                        const group = [child];
                        let j = i + 1;

                        // Look for consecutive code blocks
                        while (j < node.children.length) {
                            const nextSibling = node.children[j];

                            // Skip empty text nodes between elements
                            if (nextSibling.type === 'text' && !nextSibling.value.trim()) {
                                group.push(nextSibling);
                                j++;
                                continue;
                            }

                            const isNextCodeBlock = nextSibling.type === 'element' &&
                                (nextSibling.tagName === 'pre' ||
                                    (nextSibling.tagName === 'figure' && nextSibling.properties && nextSibling.properties['data-rehype-pretty-code-figure'] !== undefined));

                            if (isNextCodeBlock) {
                                group.push(nextSibling);
                                j++;
                            } else {
                                break;
                            }
                        }

                        // Wrap the consecutive code blocks (even single ones get the wrapper for consistent UI like a Copy Button)
                        newChildren.push({
                            type: 'element',
                            tagName: 'sparks-code-group',
                            properties: {},
                            children: group,
                        });

                        i = j;
                    } else {
                        newChildren.push(child);
                        i++;
                    }
                }

                node.children = newChildren;
            }
        });
    };
}

/**
 * Code Block Enhancements
 * Groups consecutive code blocks with tab metadata into <sparks-code-group> components
 * for seamless integration of interactive tabs and copy buttons on the frontend.
 */
export const CodeEnhancementsPlugin = (): FullStackPlugin => {
    return {
        name: 'code-enhancements',
        description: 'Enhances code blocks with tabs and copy buttons capability',
        rehypePlugins: [
            { plugin: rehypeCodeEnhancements } as PluginConfig,
        ],
    };
};
