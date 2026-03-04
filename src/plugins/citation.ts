import remarkCite from '@benrbray/remark-cite';
import rehypeCitation from 'rehype-citation';
import type { FullStackPlugin, PluginConfig } from '../core/types';

export interface CitationOptions {
    bibliography?: string | string[];
    csl?: string;
    lang?: string;
    suppressBibliography?: boolean;
}

/**
 * Plugin that processes academic citations ([@smith2023]) and generates bibliographies
 */
export const CitationPlugin = (userOpts?: Partial<CitationOptions>): FullStackPlugin => {
    // We use rehype-citation for the heavy lifting of formatting citations and appending the bibliography.
    // remark-cite is used just to parse the citation syntax into standard mdast nodes that rehype-citation expects or can tolerate if needed,
    // though rehype-citation often handles its own remark parsing. However, having both ensures full compatibility.

    const options = userOpts || {};

    return {
        name: 'citation',
        description: 'Processes academic citations and generates a bibliography',

        remarkPlugins: [
            { plugin: remarkCite }
        ],

        rehypePlugins: [
            { plugin: rehypeCitation, options } as PluginConfig<any>
        ]
    };
};
