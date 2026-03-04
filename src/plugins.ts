/**
 * Plugin System and Example Plugins
 * Demonstrates how to create custom plugins for the parser
 */

import { visit } from 'unist-util-visit';
import type { Element } from 'hast';
import type { FullStackPlugin, NoteContent } from './types';
import { headingToSlug } from './utils';

/**
 * Plugin that adds IDs to all headings for anchor linking
 */
export const headingAnchorPlugin: FullStackPlugin = {
  name: 'heading-anchor',
  description: 'Adds ID attributes to all headings for anchor linking',
  
  rehypePlugins: [
    function rehypeHeadingAnchor() {
      return (tree: any) => {
        visit(tree, 'element', (node: Element) => {
          const match = node.tagName.match(/^h([1-6])$/);
          if (!match) return;
          
          // Extract text content
          let text = '';
          visit(node, 'text', (textNode: any) => {
            text += textNode.value;
          });
          
          // Generate slug and add as ID
          const slug = headingToSlug(text);
          if (!node.properties) {
            node.properties = {};
          }
          node.properties.id = slug;
        });
      };
    },
  ],
};

/**
 * Plugin that converts wikilinks to standard HTML links
 * [[Note]] -> <a href="/note">Note</a>
 * [[Note|Alias]] -> <a href="/note">Alias</a>
 */
export const wikilinkPlugin: FullStackPlugin = {
  name: 'wikilink',
  description: 'Converts Obsidian wikilinks to HTML links',
  
  remarkPlugins: [
    function remarkWikilink() {
      return (tree: any, file: any) => {
        visit(tree, 'text', (node: any, index: number | undefined, parent: any) => {
          if (!node.value || !parent || index === undefined) return;
          
          const text = node.value;
          const wikilinkRegex = /!?\[\[([^\]]+)\]\]/g;
          
          if (!wikilinkRegex.test(text)) return;
          
          // Split text by wikilinks and create new nodes
          const newNodes: any[] = [];
          let lastIndex = 0;
          
          text.replace(wikilinkRegex, (match: string, content: string, offset: number) => {
            // Add text before wikilink
            if (offset > lastIndex) {
              newNodes.push({
                type: 'text',
                value: text.slice(lastIndex, offset),
              });
            }
            
            // Check if it's an embed
            const isEmbed = match.startsWith('![[');
            
            // Parse wikilink
            let target = content;
            let displayText = content;
            
            // Handle alias: [[target|display]]
            if (content.includes('|')) {
              const parts = content.split('|');
              target = parts[0]?.trim() || '';
              displayText = parts[1]?.trim() || target;
            }
            
            // Handle anchor: [[target#anchor]]
            let anchor = '';
            if (target.includes('#')) {
              const parts = target.split('#');
              target = parts[0]?.trim() || '';
              anchor = parts[1]?.trim() || '';
            }
            
            // Convert to slug format
            const slug = target
              .toLowerCase()
              .replace(/[\s_]+/g, '-')
              .replace(/[^\w\-\/]/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-+|-+$/g, '');
            
            // Build URL with optional anchor
            const url = anchor ? `/${slug}#${anchor}` : `/${slug}`;
            
            // Create link or embed node
            if (isEmbed) {
              // Create embed span for images, videos, etc.
              newNodes.push({
                type: 'html',
                value: `<span class="embed" data-src="${url}">${displayText}</span>`,
              });
            } else {
              // Create link node
              newNodes.push({
                type: 'link',
                url,
                title: null,
                children: [
                  {
                    type: 'text',
                    value: displayText,
                  },
                ],
                data: {
                  hProperties: {
                    className: ['wikilink'],
                  },
                },
              });
            }
            
            lastIndex = offset + match.length;
            return match;
          });
          
          // Add remaining text
          if (lastIndex < text.length) {
            newNodes.push({
              type: 'text',
              value: text.slice(lastIndex),
            });
          }
          
          // Replace the text node with new nodes
          if (newNodes.length > 0 && index !== null) {
            parent.children.splice(index, 1, ...newNodes);
          }
        });
      };
    },
  ],
};

/**
 * Plugin that processes callout blocks (Obsidian-style)
 * > [!info] Title
 * > Content
 */
export const calloutPlugin: FullStackPlugin = {
  name: 'callout',
  description: 'Processes Obsidian-style callout blocks',
  
  remarkPlugins: [
    function remarkCallout() {
      return (tree: any) => {
        visit(tree, 'blockquote', (node: any) => {
          // Check if this is a callout
          const firstChild = node.children[0];
          if (!firstChild || firstChild.type !== 'paragraph') return;
          
          const firstText = firstChild.children[0];
          if (!firstText || firstText.type !== 'text') return;
          
          const match = firstText.value.match(/^\[!(\w+)\](?:\s+(.+))?/);
          if (!match) return;
          
          const [fullMatch, type, title] = match;
          
          // Remove callout syntax from text
          firstText.value = firstText.value.slice(fullMatch.length).trim();
          if (!firstText.value) {
            firstChild.children.shift();
          }
          
          // Convert blockquote to HTML div via html node
          node.type = 'html';
          
          // Build HTML content
          const calloutClass = `callout callout-${type?.toLowerCase() || 'info'}`;
          const calloutTitle = title || type || 'Info';
          
          // Extract content from children
          let content = '';
          for (const child of node.children) {
            if (child.type === 'paragraph') {
              for (const textNode of child.children) {
                if (textNode.type === 'text') {
                  content += textNode.value;
                }
              }
            }
          }
          
          node.value = `<div class="${calloutClass}" data-callout-type="${type?.toLowerCase() || 'info'}" data-callout-title="${calloutTitle}"><p>${content}</p></div>`;
          delete node.children;
        });
      };
    },
  ],
};

/**
 * Plugin that adds syntax highlighting classes to code blocks
 */
export const codeHighlightPlugin: FullStackPlugin = {
  name: 'code-highlight',
  description: 'Adds language classes to code blocks for syntax highlighting',
  
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
};

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

/**
 * Plugin that adds reading time to frontmatter
 */
export const readingTimePlugin: FullStackPlugin = {
  name: 'reading-time',
  description: 'Calculates and adds reading time to note metadata',
  
  afterParse: async (note: NoteContent) => {
    // Reading time is already calculated in stats, just add to frontmatter
    if (!note.frontmatter.readingTime) {
      note.frontmatter.readingTime = note.stats.readingTime;
    }
    return note;
  },
};

/**
 * Plugin that validates and fixes relative links
 */
export const linkValidatorPlugin: FullStackPlugin = {
  name: 'link-validator',
  description: 'Validates links and warns about broken ones',
  
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
};

/**
 * Plugin that converts MDX components to proper HTML
 */
export const mdxComponentPlugin: FullStackPlugin = {
  name: 'mdx-component',
  description: 'Processes MDX component syntax in code blocks',
  
  rehypePlugins: [
    function rehypeMdxComponent() {
      return (tree: any) => {
        visit(tree, 'element', (node: Element) => {
          if (node.tagName !== 'code') return;
          
          // Check for MDX syntax: ```mdx\n<Component />\n```
          const text = node.children[0];
          if (!text || text.type !== 'text') return;
          
          const value = (text as any).value;
          if (!value || !value.includes('<') || !value.includes('/>')) return;
          
          // Mark this as an MDX component
          if (!node.properties) {
            node.properties = {};
          }
          node.properties['data-mdx'] = 'true';
        });
      };
    },
  ],
};

/**
 * Default plugin set with common functionality
 */
export const defaultPlugins: FullStackPlugin[] = [
  headingAnchorPlugin,
  wikilinkPlugin,
  calloutPlugin,
  codeHighlightPlugin,
];

/**
 * Creates a custom plugin easily
 */
export function createPlugin(config: FullStackPlugin): FullStackPlugin {
  return config;
}
