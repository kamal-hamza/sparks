/**
 * Tests for utils.ts - Path handling and link utilities
 */

import { describe, test, expect } from 'bun:test';
import {
  filePathToSlug,
  normalizeWikilink,
  extractWikilinks,
  extractMarkdownLinks,
  determineLinkType,
  parseAllLinks,
  extractLinkSlugs,
  headingToSlug,
  validateSlug,
  resolveRelativePath,
  calculateReadingTime,
  generateExcerpt,
  countWords,
  getFileExtension,
  isMarkdownFile,
  normalizePath,
} from './utils';
import { LinkType } from './types';

describe('filePathToSlug', () => {
  test('converts basic file path to slug', () => {
    const slug = filePathToSlug('content/Dart.md');
    expect(slug).toBe('dart');
  });

  test('converts nested path to slug', () => {
    const slug = filePathToSlug('content/Programming Languages/JavaScript/JS Fundamentals.md');
    expect(slug).toBe('programming-languages/javascript/js-fundamentals');
  });

  test('handles index files', () => {
    const slug = filePathToSlug('content/Web Development/index.md');
    expect(slug).toBe('web-development');
  });

  test('handles root index file', () => {
    const slug = filePathToSlug('content/index.md');
    expect(slug).toBe('index');
  });

  test('handles special characters', () => {
    const slug = filePathToSlug('content/Test & Demo_File (2024).md');
    expect(slug).toBe('test-demo-file-2024');
  });

  test('handles multiple spaces', () => {
    const slug = filePathToSlug('content/Multiple   Spaces   Here.md');
    expect(slug).toBe('multiple-spaces-here');
  });

  test('handles leading/trailing slashes', () => {
    const slug = filePathToSlug('content/Test.md');
    expect(slug).toBe('test');
  });

  test('handles custom base path', () => {
    const slug = filePathToSlug('notes/Test.md', 'notes');
    expect(slug).toBe('test');
  });
});

describe('normalizeWikilink', () => {
  test('normalizes basic wikilink', () => {
    const { slug } = normalizeWikilink('[[Flutter]]');
    expect(slug).toBe('flutter');
  });

  test('normalizes wikilink with path', () => {
    const { slug } = normalizeWikilink('[[Web Development/React]]');
    expect(slug).toBe('web-development/react');
  });

  test('normalizes wikilink with alias', () => {
    const { slug, displayText } = normalizeWikilink('[[Computer Networking/index|Computer Networking]]');
    expect(slug).toBe('computer-networking');
    expect(displayText).toBe('Computer Networking');
  });

  test('normalizes wikilink with anchor', () => {
    const { slug, anchor } = normalizeWikilink('[[Dart#syntax]]');
    expect(slug).toBe('dart');
    expect(anchor).toBe('syntax');
  });

  test('normalizes wikilink with both anchor and alias', () => {
    const { slug, anchor, displayText } = normalizeWikilink('[[Note#section|Display Text]]');
    expect(slug).toBe('note');
    expect(anchor).toBe('section');
    expect(displayText).toBe('Display Text');
  });

  test('removes index suffix', () => {
    const { slug } = normalizeWikilink('[[Folder/index]]');
    expect(slug).toBe('folder');
  });

  test('handles wikilink without brackets', () => {
    const { slug } = normalizeWikilink('Flutter');
    expect(slug).toBe('flutter');
  });

  test('handles empty wikilink', () => {
    const { slug } = normalizeWikilink('[[]]');
    expect(slug).toBe('');
  });
});

describe('extractWikilinks', () => {
  test('extracts basic wikilinks', () => {
    const content = 'This is [[Flutter]] and [[Dart]] text.';
    const links = extractWikilinks(content);
    expect(links).toHaveLength(2);
    expect(links[0]?.match).toBe('Flutter');
    expect(links[1]?.match).toBe('Dart');
  });

  test('extracts wikilinks with aliases', () => {
    const content = '[[Note|Display Text]]';
    const links = extractWikilinks(content);
    expect(links).toHaveLength(1);
    expect(links[0]?.match).toBe('Note|Display Text');
  });

  test('extracts embeds', () => {
    const content = 'Image: ![[image.png]]';
    const links = extractWikilinks(content);
    expect(links).toHaveLength(1);
    expect(links[0]?.isEmbed).toBe(true);
  });

  test('tracks line and column numbers', () => {
    const content = 'Line 1\n[[Link]] on line 2';
    const links = extractWikilinks(content);
    expect(links[0]?.line).toBe(2);
    expect(links[0]?.column).toBeGreaterThan(0);
  });

  test('handles multiple links on same line', () => {
    const content = '[[Link1]] and [[Link2]] and [[Link3]]';
    const links = extractWikilinks(content);
    expect(links).toHaveLength(3);
  });

  test('ignores incomplete wikilinks', () => {
    const content = '[[Incomplete and [[ another';
    const links = extractWikilinks(content);
    expect(links).toHaveLength(0);
  });
});

describe('extractMarkdownLinks', () => {
  test('extracts basic markdown links', () => {
    const content = '[Google](https://google.com)';
    const links = extractMarkdownLinks(content);
    expect(links).toHaveLength(1);
    expect(links[0]?.text).toBe('Google');
    expect(links[0]?.url).toBe('https://google.com');
  });

  test('extracts multiple links', () => {
    const content = '[Link1](url1) and [Link2](url2)';
    const links = extractMarkdownLinks(content);
    expect(links).toHaveLength(2);
  });

  test('tracks line and column numbers', () => {
    const content = 'Line 1\n[Link](url) on line 2';
    const links = extractMarkdownLinks(content);
    expect(links[0]?.line).toBe(2);
  });

  test('handles relative links', () => {
    const content = '[File](./file.md)';
    const links = extractMarkdownLinks(content);
    expect(links[0]?.url).toBe('./file.md');
  });

  test('handles anchor links', () => {
    const content = '[Section](#section)';
    const links = extractMarkdownLinks(content);
    expect(links[0]?.url).toBe('#section');
  });
});

describe('determineLinkType', () => {
  test('identifies external links', () => {
    expect(determineLinkType('https://google.com')).toBe(LinkType.EXTERNAL);
    expect(determineLinkType('http://example.com')).toBe(LinkType.EXTERNAL);
    expect(determineLinkType('mailto:test@example.com')).toBe(LinkType.EXTERNAL);
  });

  test('identifies anchor links', () => {
    expect(determineLinkType('#section')).toBe(LinkType.ANCHOR);
  });

  test('identifies markdown links', () => {
    expect(determineLinkType('./file.md')).toBe(LinkType.MARKDOWN);
    expect(determineLinkType('/absolute/path')).toBe(LinkType.MARKDOWN);
  });

  test('identifies embeds', () => {
    expect(determineLinkType('image.png', true)).toBe(LinkType.EMBED);
  });
});

describe('parseAllLinks', () => {
  test('extracts both wikilinks and markdown links', () => {
    const content = '[[Wikilink]] and [Markdown](url)';
    const links = parseAllLinks(content);
    expect(links).toHaveLength(2);
  });

  test('categorizes link types correctly', () => {
    const content = '[[Note]] [External](https://google.com) [Anchor](#section)';
    const links = parseAllLinks(content);
    expect(links[0]?.type).toBe(LinkType.WIKILINK);
    expect(links[1]?.type).toBe(LinkType.EXTERNAL);
    expect(links[2]?.type).toBe(LinkType.ANCHOR);
  });

  test('handles complex wikilinks', () => {
    const content = '[[Folder/Note#section|Display]]';
    const links = parseAllLinks(content);
    expect(links[0]?.type).toBe(LinkType.WIKILINK_ALIAS);
    expect(links[0]?.target).toBe('folder/note');
    expect(links[0]?.anchor).toBe('section');
    expect(links[0]?.displayText).toBe('Display');
  });
});

describe('extractLinkSlugs', () => {
  test('extracts only internal link slugs', () => {
    const links = parseAllLinks('[[Note1]] [External](https://example.com) [[Note2]]');
    const slugs = extractLinkSlugs(links);
    expect(slugs).toHaveLength(2);
    expect(slugs).toContain('note1');
    expect(slugs).toContain('note2');
  });

  test('returns unique slugs', () => {
    const links = parseAllLinks('[[Note]] [[Note]] [[Note]]');
    const slugs = extractLinkSlugs(links);
    expect(slugs).toHaveLength(1);
  });
});

describe('headingToSlug', () => {
  test('converts heading to slug', () => {
    expect(headingToSlug('My Heading')).toBe('my-heading');
  });

  test('handles special characters', () => {
    expect(headingToSlug('Test & Demo (2024)')).toBe('test-demo-2024');
  });

  test('handles multiple spaces', () => {
    expect(headingToSlug('Multiple   Spaces')).toBe('multiple-spaces');
  });

  test('handles unicode characters', () => {
    expect(headingToSlug('Café')).toBe('caf');
  });
});

describe('validateSlug', () => {
  test('validates existing slug', () => {
    const slugs = new Set(['note1', 'note2']);
    expect(validateSlug('note1', slugs)).toBe(true);
  });

  test('invalidates missing slug', () => {
    const slugs = new Set(['note1', 'note2']);
    expect(validateSlug('note3', slugs)).toBe(false);
  });
});

describe('resolveRelativePath', () => {
  test('resolves relative path', () => {
    const resolved = resolveRelativePath('./sibling', 'folder/current');
    expect(resolved).toBe('folder/sibling');
  });

  test('resolves parent path', () => {
    const resolved = resolveRelativePath('../parent', 'folder/current');
    expect(resolved).toBe('parent');
  });

  test('handles .md extension', () => {
    const resolved = resolveRelativePath('./file.md', 'folder/current');
    expect(resolved).toBe('folder/file');
  });
});

describe('calculateReadingTime', () => {
  test('calculates reading time', () => {
    expect(calculateReadingTime(200)).toBe(1); // 200 words per minute
    expect(calculateReadingTime(400)).toBe(2);
    expect(calculateReadingTime(100)).toBe(1); // Rounds up
  });

  test('handles zero words', () => {
    expect(calculateReadingTime(0)).toBe(0);
  });
});

describe('generateExcerpt', () => {
  test('generates excerpt from markdown', () => {
    const content = '---\ntitle: Test\n---\n\n# Heading\n\nThis is the content.';
    const excerpt = generateExcerpt(content, 50);
    expect(excerpt).not.toContain('---');
    expect(excerpt).not.toContain('# Heading');
    expect(excerpt).toContain('content');
  });

  test('removes wikilinks', () => {
    const content = 'Text with [[Link]] inside.';
    const excerpt = generateExcerpt(content);
    expect(excerpt).not.toContain('[[');
  });

  test('removes markdown formatting', () => {
    const content = '**Bold** and *italic* and `code`';
    const excerpt = generateExcerpt(content);
    expect(excerpt).toBe('Bold and italic and code');
  });

  test('truncates to max length', () => {
    const content = 'A'.repeat(300);
    const excerpt = generateExcerpt(content, 100);
    expect(excerpt.length).toBeLessThanOrEqual(104); // 100 + '...'
  });

  test('removes code blocks', () => {
    const content = 'Text\n```js\ncode\n```\nMore text';
    const excerpt = generateExcerpt(content);
    expect(excerpt).not.toContain('```');
    expect(excerpt).not.toContain('code');
  });
});

describe('countWords', () => {
  test('counts words correctly', () => {
    expect(countWords('one two three')).toBe(3);
    expect(countWords('single')).toBe(1);
    expect(countWords('')).toBe(0);
  });

  test('handles multiple spaces', () => {
    expect(countWords('word1    word2   word3')).toBe(3);
  });

  test('handles newlines', () => {
    expect(countWords('line1\nline2\nline3')).toBe(3);
  });
});

describe('getFileExtension', () => {
  test('gets file extension', () => {
    expect(getFileExtension('file.md')).toBe('md');
    expect(getFileExtension('file.txt')).toBe('txt');
    expect(getFileExtension('path/to/file.markdown')).toBe('markdown');
  });

  test('handles files without extension', () => {
    expect(getFileExtension('file')).toBe('');
  });

  test('handles multiple dots', () => {
    expect(getFileExtension('file.test.md')).toBe('md');
  });
});

describe('isMarkdownFile', () => {
  test('identifies markdown files', () => {
    expect(isMarkdownFile('file.md')).toBe(true);
    expect(isMarkdownFile('file.markdown')).toBe(true);
    expect(isMarkdownFile('file.mdx')).toBe(true);
  });

  test('rejects non-markdown files', () => {
    expect(isMarkdownFile('file.txt')).toBe(false);
    expect(isMarkdownFile('file.pdf')).toBe(false);
  });
});

describe('normalizePath', () => {
  test('normalizes Windows paths', () => {
    expect(normalizePath('folder\\file.md')).toBe('folder/file.md');
  });

  test('handles Unix paths', () => {
    expect(normalizePath('folder/file.md')).toBe('folder/file.md');
  });

  test('handles mixed separators', () => {
    expect(normalizePath('folder\\subfolder/file.md')).toBe('folder/subfolder/file.md');
  });
});
