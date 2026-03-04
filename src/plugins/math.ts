import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { FullStackPlugin } from '../core/types';

/**
 * Plugin that provides Math and LaTeX rendering
 * Converts $math$ and $$math$$ into HTML spanning elements
 */
export const mathPlugin: FullStackPlugin = {
    name: 'math',
    description: 'Renders LaTeX equations using KaTeX',

    // Parse $math$ and $$math$$ blocks into the AST
    remarkPlugins: [
        { plugin: remarkMath }
    ],

    // Transform math AST nodes into HTML spans with class="katex"
    rehypePlugins: [
        { plugin: rehypeKatex }
    ]
};
