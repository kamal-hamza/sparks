import { visit } from 'unist-util-visit';
import type { Element, Text } from 'hast';
import type { FullStackPlugin } from '../core/types';

/**
 * Plugin that processes mermaid diagrams codeblocks
 * Converts ```mermaid ... ``` into <sparks-mermaid chart="..."> tags
 */
export const mermaidPlugin: FullStackPlugin = {
    name: 'mermaid',
    description: 'Converts mermaid code blocks into custom HTML tags',

    transform: {
        rehypePlugins: [
            function rehypeMermaid() {
                return (tree: any) => {
                    visit(tree, 'element', (node: Element, index: number | undefined, parent: Element | undefined) => {
                        if (node.tagName !== 'code' || !parent || parent.tagName !== 'pre') return;

                        // Check if it's a mermaid code block
                        if (node.properties && node.properties.className) {
                            const classNames = node.properties.className as string[];
                            if (classNames.includes('language-mermaid')) {
                                // Extract the raw mermaid code
                                const textNode = node.children[0] as Text;
                                if (textNode && textNode.type === 'text') {
                                    const chartData = textNode.value;

                                    // Replace the <pre> parent with our custom tag
                                    parent.tagName = 'sparks-mermaid';

                                    // Clear out the children, setting just properties
                                    parent.children = [];
                                    parent.properties = {
                                        chart: chartData
                                    };
                                }
                            }
                        }
                    });
                };
            },
        ],
    }
};
