import { visit } from 'unist-util-visit';
import type { Element } from 'hast';
import type { FullStackPlugin, NoteContent } from '../core/types';

/**
 * Plugin that validates and fixes relative links
 */
export const linkValidatorPlugin: FullStackPlugin = {
    name: 'link-validator',
    description: 'Validates links and warns about broken ones',

    transform: {
        extractData: async (ast: any, note: Partial<NoteContent>) => {
            const brokenLinks: string[] = [];

            visit(ast, 'element', (node: Element) => {
                if (node.tagName === 'a') {
                    const href = node.properties?.href as string;
                    if (href && !href.startsWith('http') && !href.startsWith('#')) {
                        // Internal link - would need to validate against available notes
                        // This is just an example
                    }
                }
            });
        },
    }
};
