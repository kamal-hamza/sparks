import type { FullStackPlugin } from '../core/types';

/**
 * Plugin that extracts tags from content and adds them to frontmatter
 */
export const tagExtractorPlugin: FullStackPlugin = {
    name: 'tag-extractor',
    description: 'Extracts #tags from content and adds to frontmatter',

    beforeParse: async (content: string, filePath: string) => {
        // Extract tags from content
        const tagMatches = content.match(/#[\w-]+/g);
        if (!tagMatches) return content;

        const tags = tagMatches.map(tag => tag.slice(1)); // Remove #

        // Check if frontmatter exists
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
        if (!frontmatterMatch) {
            // Add frontmatter with tags
            return `---\ntags: [${tags.map(t => `"${t}"`).join(', ')}]\n---\n\n${content}`;
        }

        // Frontmatter exists, check if tags are already there
        const frontmatter = frontmatterMatch[1] || '';
        if (frontmatter.includes('tags:')) {
            return content; // Tags already in frontmatter
        }

        // Add tags to existing frontmatter
        const newFrontmatter = frontmatter + `\ntags: [${tags.map(t => `"${t}"`).join(', ')}]`;
        return content.replace(/^---\n[\s\S]*?\n---\n/, `---\n${newFrontmatter}\n---\n`);
    },
};
