import rehypePrettyCode, { type Options as CodeOptions } from 'rehype-pretty-code';
import type { FullStackPlugin, PluginConfig } from '../core/types';

/**
 * Advanced syntax highlighting combining Shiki + unified ecosystem
 */
export interface SyntaxOptions {
    theme?: CodeOptions['theme'];
    keepBackground?: boolean;
}

const defaultSyntaxOptions: SyntaxOptions = {
    theme: {
        light: 'github-light',
        dark: 'github-dark',
    },
    keepBackground: false, // Recommended: disable default backgrounds to allow custom CSS styling
};

export const SyntaxHighlightingPlugin = (userOpts?: Partial<SyntaxOptions>): FullStackPlugin => {
    const opts: CodeOptions = { ...defaultSyntaxOptions, ...userOpts };

    return {
        name: 'syntax-highlighting',
        description: 'VS Code quality syntax highlighting via Shiki & rehype-pretty-code',
        rehypePlugins: [
            { plugin: rehypePrettyCode, options: opts } as PluginConfig<CodeOptions>
        ]
    };
};
