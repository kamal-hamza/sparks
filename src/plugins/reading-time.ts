import type { FullStackPlugin, NoteContent } from '../core/types';

/**
 * Plugin that adds reading time to frontmatter
 */
export const readingTimePlugin: FullStackPlugin = {
    name: 'reading-time',
    description: 'Calculates and adds reading time to note metadata',

    transform: {
        afterParse: async (note: NoteContent) => {
            // Reading time is already calculated in stats, just add to frontmatter
            if (!note.frontmatter.readingTime) {
                note.frontmatter.readingTime = note.stats.readingTime;
            }
            return note;
        },
    }
};
