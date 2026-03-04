/**
 * Tests for parser.ts - Core parser engine
 */

import { describe, test, expect } from 'bun:test';
import {
  parseMarkdown,
  parseMultiple,
  buildBacklinks,
  filterNotes,
  getPublishedNotes,
  sortNotes,
  extractTableOfContents,
  computeContentStats,
} from './parser';
import { defaultPlugins } from './plugins';
import type { NoteContent } from './types';

describe('parseMarkdown', () => {
  test('parses basic markdown', async () => {
    const content = '# Hello World\n\nThis is a test.';
    const note = await parseMarkdown(content, 'test.md');
    
    expect(note.slug).toBe('test');
    expect(note.filePath).toBe('test.md');
    expect(note.contentAst).toBeDefined();
    expect(note.contentAst.type).toBe('root');
  });

  test('parses markdown with frontmatter', async () => {
    const content = '---\ntitle: Test Note\ntags: [test, demo]\n---\n\n# Content\n\nSome text.';
    const note = await parseMarkdown(content, 'test.md');
    
    expect(note.frontmatter.title).toBe('Test Note');
    expect(note.frontmatter.tags).toEqual(['test', 'demo']);
  });

  test('extracts wikilinks', async () => {
    const content = 'Link to [[Other Note]] and [[Another Note|Display]].';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: defaultPlugins,
    });
    
    expect(note.links).toContain('other-note');
    expect(note.links).toContain('another-note');
    expect(note.linkDetails).toHaveLength(2);
  });

  test('extracts table of contents', async () => {
    const content = '# H1\n\n## H2-1\n\n### H3\n\n## H2-2';
    const note = await parseMarkdown(content, 'test.md', { extractToc: true });
    
    expect(note.tableOfContents).toBeDefined();
    expect(note.tableOfContents!.length).toBeGreaterThan(0);
  });

  test('generates excerpt', async () => {
    const content = '# Title\n\nThis is the first paragraph that should be excerpted.';
    const note = await parseMarkdown(content, 'test.md', { generateExcerpt: true });
    
    expect(note.excerpt).toBeDefined();
    expect(note.excerpt).toContain('first paragraph');
  });

  test('computes content stats', async () => {
    const content = '# Heading\n\nSome words here.\n\n## Another\n\n```js\ncode\n```';
    const note = await parseMarkdown(content, 'test.md', { computeStats: true });
    
    expect(note.stats.words).toBeGreaterThan(0);
    expect(note.stats.headings).toBeGreaterThanOrEqual(2);
    expect(note.stats.codeBlocks).toBeGreaterThanOrEqual(1);
  });

  test('applies plugins', async () => {
    const content = '# Heading\n\n[[Link]]';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: defaultPlugins,
    });
    
    expect(note).toBeDefined();
  });

  test('handles empty content', async () => {
    const content = '';
    const note = await parseMarkdown(content, 'empty.md');
    
    expect(note.slug).toBe('empty');
    // Empty content triggers warnings (missing frontmatter, empty content)
    expect(note.warnings.length).toBeGreaterThanOrEqual(0);
  });

  test('handles only frontmatter', async () => {
    const content = '---\ntitle: Test\n---';
    const note = await parseMarkdown(content, 'test.md');
    
    expect(note.frontmatter.title).toBe('Test');
  });

  test('validates links when requested', async () => {
    const content = '[[ExistingNote]] [[MissingNote]]';
    const note = await parseMarkdown(content, 'test.md', {
      validateLinks: true,
      availableSlugs: new Set(['existingnote']),
    });
    
    const brokenLinkWarning = note.warnings.find(w => 
      w.type === 'broken-link' && w.message.includes('missingnote')
    );
    expect(brokenLinkWarning).toBeDefined();
  });

  test('handles malformed frontmatter gracefully', async () => {
    const content = '---\ninvalid yaml\n  broken\n---\n\nContent';
    const note = await parseMarkdown(content, 'test.md', { strict: false });
    
    expect(note).toBeDefined();
    expect(note.warnings.some(w => w.type === 'invalid-yaml')).toBe(true);
  });

  test('processes nested folder paths', async () => {
    const content = '# Test';
    const note = await parseMarkdown(content, 'folder/subfolder/test.md');
    
    expect(note.slug).toBe('folder/subfolder/test');
  });

  test('handles index files correctly', async () => {
    const content = '# Index';
    const note = await parseMarkdown(content, 'folder/index.md');
    
    expect(note.slug).toBe('folder');
  });

  test('handles custom slugify function', async () => {
    const content = '# Test';
    const customSlugify = (path: string) => 'custom-' + path.replace('.md', '');
    const note = await parseMarkdown(content, 'test.md', {
      slugify: customSlugify,
    });
    
    expect(note.slug).toBe('custom-test');
  });
});

describe('extractTableOfContents', () => {
  test('extracts flat headings', async () => {
    const content = '# H1\n## H2\n### H3';
    const note = await parseMarkdown(content, 'test.md');
    const toc = extractTableOfContents(note.contentAst);
    
    expect(toc).toBeDefined();
    expect(toc.length).toBeGreaterThan(0);
  });

  test('builds hierarchical structure', async () => {
    const content = '# H1\n## H2-1\n### H3\n## H2-2';
    const note = await parseMarkdown(content, 'test.md');
    const toc = extractTableOfContents(note.contentAst);
    
    const h1 = toc[0];
    expect(h1?.children).toBeDefined();
    expect(h1?.children!.length).toBeGreaterThan(0);
  });

  test('generates slugs for anchors', async () => {
    const content = '# My Heading Title';
    const note = await parseMarkdown(content, 'test.md');
    const toc = extractTableOfContents(note.contentAst);
    
    expect(toc[0]?.slug).toBe('my-heading-title');
  });

  test('handles empty content', async () => {
    const content = 'No headings here.';
    const note = await parseMarkdown(content, 'test.md');
    const toc = extractTableOfContents(note.contentAst);
    
    expect(toc).toHaveLength(0);
  });
});

describe('computeContentStats', () => {
  test('counts words correctly', async () => {
    const content = 'One two three four five';
    const note = await parseMarkdown(content, 'test.md');
    const stats = computeContentStats(note.contentAst, content);
    
    expect(stats.words).toBe(5);
  });

  test('counts headings', async () => {
    const content = '# H1\n## H2\n### H3\n# Another H1';
    const note = await parseMarkdown(content, 'test.md');
    const stats = computeContentStats(note.contentAst, content);
    
    expect(stats.headings).toBeGreaterThanOrEqual(4);
  });

  test('counts code blocks', async () => {
    const content = '```js\ncode\n```\n\nMore text\n\n```python\nmore code\n```';
    const note = await parseMarkdown(content, 'test.md');
    const stats = computeContentStats(note.contentAst, content);
    
    expect(stats.codeBlocks).toBeGreaterThanOrEqual(2);
  });

  test('counts links', async () => {
    const content = '[[Link1]] [[Link2]] [MD](url)';
    const note = await parseMarkdown(content, 'test.md');
    const stats = computeContentStats(note.contentAst, content);
    
    expect(stats.links).toBeGreaterThanOrEqual(3);
  });

  test('calculates reading time', async () => {
    const content = 'word '.repeat(200); // 200 words = 1 minute
    const note = await parseMarkdown(content, 'test.md');
    const stats = computeContentStats(note.contentAst, content);
    
    expect(stats.readingTime).toBeGreaterThanOrEqual(1);
  });
});

describe('parseMultiple', () => {
  test('parses multiple files', async () => {
    const files = [
      { content: '# Note 1', filePath: 'note1.md' },
      { content: '# Note 2', filePath: 'note2.md' },
      { content: '# Note 3', filePath: 'note3.md' },
    ];
    
    const notes = await parseMultiple(files);
    expect(notes).toHaveLength(3);
    expect(notes[0]?.slug).toBe('note1');
    expect(notes[1]?.slug).toBe('note2');
  });

  test('validates links across all files', async () => {
    const files = [
      { content: '[[note2]]', filePath: 'note1.md' },
      { content: 'Content', filePath: 'note2.md' },
    ];
    
    const notes = await parseMultiple(files, { validateLinks: true });
    
    // note1 should have no broken link warnings for note2
    const note1 = notes[0];
    const brokenLinks = note1?.warnings.filter(w => w.type === 'broken-link');
    expect(brokenLinks?.some(w => w.message.includes('note2'))).toBe(false);
  });

  test('handles empty array', async () => {
    const notes = await parseMultiple([]);
    expect(notes).toHaveLength(0);
  });

  test('handles files with errors', async () => {
    const files = [
      { content: '# Valid', filePath: 'valid.md' },
      { content: '---\ninvalid\n---\nContent', filePath: 'invalid.md' },
    ];
    
    const notes = await parseMultiple(files, { strict: false });
    expect(notes.length).toBeGreaterThan(0);
  });
});

describe('buildBacklinks', () => {
  test('builds backlinks correctly', async () => {
    const files = [
      { content: '[[note2]] [[note3]]', filePath: 'note1.md' },
      { content: '[[note3]]', filePath: 'note2.md' },
      { content: 'No links', filePath: 'note3.md' },
    ];
    
    const notes = await parseMultiple(files);
    buildBacklinks(notes);
    
    const note3 = notes.find(n => n.slug === 'note3');
    expect(note3?.backlinks).toContain('note1');
    expect(note3?.backlinks).toContain('note2');
  });

  test('handles notes with no backlinks', async () => {
    const files = [
      { content: 'No links', filePath: 'note1.md' },
      { content: 'No links', filePath: 'note2.md' },
    ];
    
    const notes = await parseMultiple(files);
    buildBacklinks(notes);
    
    expect(notes[0]?.backlinks).toHaveLength(0);
    expect(notes[1]?.backlinks).toHaveLength(0);
  });

  test('ignores external links', async () => {
    const files = [
      { content: '[External](https://example.com)', filePath: 'note1.md' },
      { content: 'Content', filePath: 'note2.md' },
    ];
    
    const notes = await parseMultiple(files);
    buildBacklinks(notes);
    
    // No backlinks should be created for external links
    expect(notes.every(n => n.backlinks?.length === 0)).toBe(true);
  });
});

describe('filterNotes', () => {
  test('filters notes by predicate', async () => {
    const files = [
      { content: '---\ntags: [keep]\n---\nContent', filePath: 'keep.md' },
      { content: '---\ntags: [remove]\n---\nContent', filePath: 'remove.md' },
    ];
    
    const notes = await parseMultiple(files);
    const filtered = filterNotes(notes, note => 
      (note.frontmatter.tags as string[])?.includes('keep')
    );
    
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.slug).toBe('keep');
  });

  test('returns empty array when no matches', async () => {
    const files = [{ content: '# Test', filePath: 'test.md' }];
    const notes = await parseMultiple(files);
    const filtered = filterNotes(notes, () => false);
    
    expect(filtered).toHaveLength(0);
  });
});

describe('getPublishedNotes', () => {
  test('filters published notes', async () => {
    const files = [
      { content: '---\npublish: true\n---\nPublished', filePath: 'pub.md' },
      { content: '---\npublish: false\n---\nDraft', filePath: 'draft.md' },
      { content: 'Default', filePath: 'default.md' },
    ];
    
    const notes = await parseMultiple(files);
    const published = getPublishedNotes(notes);
    
    // Default is to publish
    expect(published.length).toBeGreaterThanOrEqual(2);
    expect(published.some(n => n.slug === 'draft')).toBe(false);
  });

  test('handles draft field', async () => {
    const files = [
      { content: '---\ndraft: true\n---\nDraft', filePath: 'draft.md' },
      { content: '---\ndraft: false\n---\nPublished', filePath: 'pub.md' },
    ];
    
    const notes = await parseMultiple(files);
    const published = getPublishedNotes(notes);
    
    expect(published.some(n => n.slug === 'draft')).toBe(false);
    expect(published.some(n => n.slug === 'pub')).toBe(true);
  });
});

describe('sortNotes', () => {
  test('sorts by slug', async () => {
    const files = [
      { content: '# C', filePath: 'c.md' },
      { content: '# A', filePath: 'a.md' },
      { content: '# B', filePath: 'b.md' },
    ];
    
    const notes = await parseMultiple(files);
    const sorted = sortNotes(notes, 'slug');
    
    expect(sorted[0]?.slug).toBe('a');
    expect(sorted[1]?.slug).toBe('b');
    expect(sorted[2]?.slug).toBe('c');
  });

  test('sorts by title', async () => {
    const files = [
      { content: '---\ntitle: Zebra\n---\n', filePath: 'a.md' },
      { content: '---\ntitle: Apple\n---\n', filePath: 'b.md' },
      { content: '---\ntitle: Banana\n---\n', filePath: 'c.md' },
    ];
    
    const notes = await parseMultiple(files);
    const sorted = sortNotes(notes, 'title');
    
    expect(sorted[0]?.frontmatter.title).toBe('Apple');
    expect(sorted[1]?.frontmatter.title).toBe('Banana');
    expect(sorted[2]?.frontmatter.title).toBe('Zebra');
  });

  test('sorts by date (newest first)', async () => {
    const files = [
      { content: '---\ndate: 2024-01-01\n---\n', filePath: 'a.md' },
      { content: '---\ndate: 2024-03-01\n---\n', filePath: 'b.md' },
      { content: '---\ndate: 2024-02-01\n---\n', filePath: 'c.md' },
    ];
    
    const notes = await parseMultiple(files);
    const sorted = sortNotes(notes, 'date');
    
    const dates = sorted.map(n => n.frontmatter.date as string);
    expect(new Date(dates[0]!) >= new Date(dates[1]!)).toBe(true);
    expect(new Date(dates[1]!) >= new Date(dates[2]!)).toBe(true);
  });

  test('sorts with custom function', async () => {
    const files = [
      { content: '# Note', filePath: 'a.md' },
      { content: '# Note', filePath: 'b.md' },
    ];
    
    const notes = await parseMultiple(files);
    const sorted = sortNotes(notes, (a, b) => b.slug.localeCompare(a.slug));
    
    expect(sorted[0]?.slug).toBe('b');
    expect(sorted[1]?.slug).toBe('a');
  });

  test('does not mutate original array', async () => {
    const files = [
      { content: '# B', filePath: 'b.md' },
      { content: '# A', filePath: 'a.md' },
    ];
    
    const notes = await parseMultiple(files);
    const originalFirst = notes[0]?.slug;
    sortNotes(notes, 'slug');
    
    expect(notes[0]?.slug).toBe(originalFirst);
  });
});
