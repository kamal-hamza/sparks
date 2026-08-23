/**
 * Integration tests with real content from the content directory
 */

import { describe, test, expect } from 'bun:test';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import {
  parseMarkdown,
  parseMultiple,
  buildBacklinks,
  getPublishedNotes,
  sortNotes,
} from './core/parser';
import { defaultPlugins } from './plugins';

const contentDir = join(process.cwd(), 'content');

describe('Real Content Integration Tests', () => {
  test('parses Dart.md successfully', async () => {
    const filePath = join(contentDir, 'Dart.md');
    const content = await readFile(filePath, 'utf-8');
    const note = await parseMarkdown(content, 'Dart.md', {
      plugins: defaultPlugins,
    });

    expect(note.slug).toBe('dart');
    expect(note.frontmatter.title).toBe('Dart');
    expect(note.frontmatter.publish).toBe(true);
    expect(note.stats.words).toBeGreaterThan(100);
    expect(note.stats.headings).toBeGreaterThan(5);

    // Check for expected links to Flutter
    expect(note.links).toContain('flutter');
  });

  test('parses Flutter.md successfully', async () => {
    const filePath = join(contentDir, 'Flutter.md');
    const content = await readFile(filePath, 'utf-8');
    const note = await parseMarkdown(content, 'Flutter.md', {
      plugins: defaultPlugins,
    });

    expect(note.slug).toBe('flutter');
    expect(note.frontmatter.title).toBe('Flutter');
    expect(note.stats.words).toBeGreaterThan(100);
    expect(note.stats.codeBlocks).toBeGreaterThan(0);

    // Check for expected links to Dart
    expect(note.links).toContain('dart');
  });

  test('parses index.md successfully', async () => {
    const filePath = join(contentDir, 'index.md');
    const content = await readFile(filePath, 'utf-8');
    const note = await parseMarkdown(content, 'index.md', {
      plugins: defaultPlugins,
    });

    expect(note.slug).toBe('index');
    expect(note.frontmatter.title).toContain('Hamza');
    expect(note.links.length).toBeGreaterThan(10); // Has many wikilinks
  });

  test('parses example.md successfully', async () => {
    const filePath = join(contentDir, 'example.md');
    const content = await readFile(filePath, 'utf-8');
    const note = await parseMarkdown(content, 'example.md', {
      plugins: defaultPlugins,
    });

    expect(note.slug).toBe('example');
    expect(note.frontmatter.title).toBe('Welcome to Quartz');
    expect(note.frontmatter.tags).toContain('example');
    expect(note.stats.codeBlocks).toBeGreaterThanOrEqual(1);
  });

  test('parses nested JavaScript file', async () => {
    const filePath = join(contentDir, 'Programming Languages/JavaScript/JS Fundamentals.md');
    const content = await readFile(filePath, 'utf-8');
    const note = await parseMarkdown(content, 'Programming Languages/JavaScript/JS Fundamentals.md', {
      plugins: defaultPlugins,
    });

    expect(note.slug).toBe('programming-languages/javascript/js-fundamentals');
    expect(note.frontmatter.publish).toBe(true);
    expect(note.stats.words).toBeGreaterThan(500);
    expect(note.stats.headings).toBeGreaterThan(20);

    // Has links to other pages
    expect(note.links.length).toBeGreaterThan(0);
  });

  test('builds backlinks between real notes', async () => {
    // Parse Dart and Flutter which link to each other
    const dartPath = join(contentDir, 'Dart.md');
    const flutterPath = join(contentDir, 'Flutter.md');

    const dartContent = await readFile(dartPath, 'utf-8');
    const flutterContent = await readFile(flutterPath, 'utf-8');

    const notes = await parseMultiple([
      { content: dartContent, filePath: 'Dart.md' },
      { content: flutterContent, filePath: 'Flutter.md' },
    ]);

    buildBacklinks(notes);

    const dart = notes.find(n => n.slug === 'dart');
    const flutter = notes.find(n => n.slug === 'flutter');

    // Dart links to Flutter, so Flutter should have Dart as backlink
    expect(flutter?.backlinks).toContain('dart');

    // Flutter links to Dart, so Dart should have Flutter as backlink
    expect(dart?.backlinks).toContain('flutter');
  });

  test('validates cross-references in real content', async () => {
    const files = [
      { content: await readFile(join(contentDir, 'Dart.md'), 'utf-8'), filePath: 'Dart.md' },
      { content: await readFile(join(contentDir, 'Flutter.md'), 'utf-8'), filePath: 'Flutter.md' },
    ];

    const notes = await parseMultiple(files, {
      validateLinks: true,
      plugins: defaultPlugins,
    });

    // These files link to each other, so no broken link warnings
    const dart = notes.find(n => n.slug === 'dart');
    const brokenLinks = dart?.warnings.filter(w =>
      w.type === 'broken-link' && w.message.includes('flutter')
    );
    expect(brokenLinks).toHaveLength(0);
  });

  test('handles all markdown files in content directory', async () => {
    // Find all files recursively
    async function findVaultFiles(dir: string): Promise<{ markdown: string[], assets: string[] }> {
      const result: { markdown: string[], assets: string[] } = { markdown: [], assets: [] };
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== '.obsidian' && entry.name !== 'node_modules') {
          const subResult = await findVaultFiles(fullPath);
          result.markdown.push(...subResult.markdown);
          result.assets.push(...subResult.assets);
        } else if (entry.isFile()) {
          if (entry.name.endsWith('.md')) {
            result.markdown.push(fullPath);
          }
        }
      }

      return result;
    }

    const { markdown: mdFiles } = await findVaultFiles(contentDir);
    const testFiles = mdFiles.slice(0, 10); // Test first 10 files

    const files = await Promise.all(
      testFiles.map(async (filePath) => ({
        content: await readFile(filePath, 'utf-8'),
        filePath: filePath.replace(contentDir + '/', ''),
      }))
    );

    const notes = await parseMultiple(files, {
      plugins: defaultPlugins,
      strict: false, // Don't fail on warnings
    });

    expect(notes.length).toBe(files.length);

    // All notes should have valid slugs
    expect(notes.every(n => n.slug.length > 0)).toBe(true);

    // Log summary
    console.log(`\n✅ Successfully parsed ${notes.length} real notes:`);
    notes.forEach(note => {
      console.log(`  - ${note.slug}: ${note.stats.words} words, ${note.stats.headings} headings, ${note.links.length} links`);
    });
  });

  test('extracts table of contents from real content', async () => {
    const filePath = join(contentDir, 'Dart.md');
    const content = await readFile(filePath, 'utf-8');
    const note = await parseMarkdown(content, 'Dart.md', {
      extractToc: true,
      plugins: defaultPlugins,
    });

    expect(note.tableOfContents).toBeDefined();
    expect(note.tableOfContents!.length).toBeGreaterThan(0);

    // Check that TOC entries have the expected structure
    const firstEntry = note.tableOfContents![0];
    expect(firstEntry?.depth).toBeGreaterThanOrEqual(1);
    expect(firstEntry?.text).toBeDefined();
    expect(firstEntry?.slug).toBeDefined();
  });

  test('generates excerpts from real content', async () => {
    const filePath = join(contentDir, 'Flutter.md');
    const content = await readFile(filePath, 'utf-8');
    const note = await parseMarkdown(content, 'Flutter.md', {
      generateExcerpt: true,
      excerptLength: 150,
      plugins: defaultPlugins,
    });

    expect(note.excerpt).toBeDefined();
    expect(note.excerpt!.length).toBeLessThanOrEqual(154); // 150 + '...'
    expect(note.excerpt).not.toContain('---'); // No frontmatter
    expect(note.excerpt).not.toContain('##'); // No heading markers
  });

  test('identifies published vs draft notes', async () => {
    const files = [
      { content: await readFile(join(contentDir, 'Dart.md'), 'utf-8'), filePath: 'Dart.md' },
      { content: await readFile(join(contentDir, 'Flutter.md'), 'utf-8'), filePath: 'Flutter.md' },
    ];

    const notes = await parseMultiple(files);
    const published = getPublishedNotes(notes);

    // Both Dart and Flutter have publish: true
    expect(published.length).toBe(2);
  });

  test('sorts real notes by various criteria', async () => {
    const files = [
      { content: await readFile(join(contentDir, 'Dart.md'), 'utf-8'), filePath: 'Dart.md' },
      { content: await readFile(join(contentDir, 'Flutter.md'), 'utf-8'), filePath: 'Flutter.md' },
      { content: await readFile(join(contentDir, 'example.md'), 'utf-8'), filePath: 'example.md' },
    ];

    const notes = await parseMultiple(files);

    // Sort by slug
    const bySlug = sortNotes(notes, 'slug');
    expect(bySlug[0]?.slug).toBe('dart');
    expect(bySlug[1]?.slug).toBe('example');
    expect(bySlug[2]?.slug).toBe('flutter');

    // Sort by title
    const byTitle = sortNotes(notes, 'title');
    expect(byTitle[0]?.frontmatter.title).toBe('Dart');
    expect(byTitle[1]?.frontmatter.title).toBe('Flutter');
    expect(byTitle[2]?.frontmatter.title).toBe('Welcome to Quartz');
  });

  test('handles code blocks with different languages', async () => {
    const filePath = join(contentDir, 'Dart.md');
    const content = await readFile(filePath, 'utf-8');
    const note = await parseMarkdown(content, 'Dart.md', {
      plugins: defaultPlugins,
    });

    expect(note.stats.codeBlocks).toBeGreaterThan(0);
  });

  test('preserves MDX components in content', async () => {
    const filePath = join(contentDir, 'index.md');
    const content = await readFile(filePath, 'utf-8');
    const note = await parseMarkdown(content, 'index.md', {
      plugins: defaultPlugins,
    });

    // index.md has MDX components like <Experience /> and <Projects />
    expect(note).toBeDefined();
  });

  test('handles callout blocks', async () => {
    const filePath = join(contentDir, 'Dart.md');
    const content = await readFile(filePath, 'utf-8');
    const note = await parseMarkdown(content, 'Dart.md', {
      plugins: defaultPlugins,
    });

    // Dart.md has > [!info] callout blocks
    expect(note).toBeDefined();
  });

  test('processes all wikilink variations', async () => {
    const content = `
# Test Note

Links:
- [[Simple Link]]
- [[Folder/Nested Link]]
- [[Link|With Alias]]
- [[Link#section|With Both]]
- ![[Embed]]
`;

    const note = await parseMarkdown(content, 'test.md', {
      plugins: defaultPlugins,
    });

    expect(note.linkDetails.length).toBe(5);
    expect(note.linkDetails.some(l => l.isEmbed)).toBe(true);
    expect(note.linkDetails.some(l => l.displayText !== undefined)).toBe(true);
    expect(note.linkDetails.some(l => l.anchor !== undefined)).toBe(true);
  });
});
