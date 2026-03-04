/**
 * Plugin System Tests
 * Tests for the built-in plugins (heading anchors, wikilinks, callouts, code highlighting)
 */

import { describe, test, expect } from 'bun:test';
import { visit } from 'unist-util-visit';
import type { Element } from 'hast';

import {
  headingAnchorPlugin,
  wikilinkPlugin,
  calloutPlugin,
  codeHighlightPlugin,
  defaultPlugins,
  SyntaxHighlightingPlugin,
} from './index';
import { parseMarkdown } from '../core/parser';

/**
 * Helper to get all elements of a specific type from AST
 */
function getElements(ast: any, tagName: string): Element[] {
  const elements: Element[] = [];
  visit(ast, 'element', (node: Element) => {
    if (node.tagName === tagName) {
      elements.push(node);
    }
  });
  return elements;
}

/**
 * Helper to find element by property
 */
function findElement(ast: any, predicate: (node: Element) => boolean): Element | undefined {
  let found: Element | undefined;
  visit(ast, 'element', (node: Element) => {
    if (predicate(node)) {
      found = node;
      return false; // stop traversal
    }
  });
  return found;
}

/**
 * Helper to check if element has class
 */
function hasClass(element: Element, className: string): boolean {
  const classes = element.properties?.className;
  if (Array.isArray(classes)) {
    return classes.includes(className);
  }
  return classes === className;
}

describe('headingAnchorPlugin', () => {
  test('adds id to h1 headings', async () => {
    const content = '# Hello World';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [headingAnchorPlugin],
    });

    const h1 = getElements(note.contentAst, 'h1')[0];
    expect(h1).toBeDefined();
    expect(h1?.properties?.id).toBe('hello-world');
  });

  test('adds id to h2 headings', async () => {
    const content = '## Getting Started';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [headingAnchorPlugin],
    });

    const h2 = getElements(note.contentAst, 'h2')[0];
    expect(h2).toBeDefined();
    expect(h2?.properties?.id).toBe('getting-started');
  });

  test('handles special characters in headings', async () => {
    const content = '## Hello, World! (2024)';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [headingAnchorPlugin],
    });

    const h2 = getElements(note.contentAst, 'h2')[0];
    expect(h2?.properties?.id).toBe('hello-world-2024');
  });

  test('handles unicode in headings', async () => {
    const content = '## Café ☕';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [headingAnchorPlugin],
    });

    const h2 = getElements(note.contentAst, 'h2')[0];
    expect(h2?.properties?.id).toBeDefined();
    expect(typeof h2?.properties?.id).toBe('string');
  });

  test('handles multiple headings', async () => {
    const content = '# Title\n\n## Section 1\n\n### Subsection\n\n## Section 2';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [headingAnchorPlugin],
    });

    const h1 = getElements(note.contentAst, 'h1')[0];
    const h2s = getElements(note.contentAst, 'h2');
    const h3 = getElements(note.contentAst, 'h3')[0];

    expect(h1?.properties?.id).toBe('title');
    expect(h2s.length).toBe(2);
    expect(h2s[0]?.properties?.id).toBe('section-1');
    expect(h2s[1]?.properties?.id).toBe('section-2');
    expect(h3?.properties?.id).toBe('subsection');
  });
});

describe('wikilinkPlugin', () => {
  test('converts simple wikilink to anchor tag', async () => {
    const content = 'Link to [[Note]].';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [wikilinkPlugin],
    });

    const link = getElements(note.contentAst, 'a')[0];
    expect(link).toBeDefined();
    expect(link?.properties?.href).toBe('/note');
    expect(hasClass(link!, 'wikilink')).toBe(true);
  });

  test('converts wikilink with alias', async () => {
    const content = 'Link to [[Original Note|Display Text]].';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [wikilinkPlugin],
    });

    const link = getElements(note.contentAst, 'a')[0];
    expect(link).toBeDefined();
    expect(link?.properties?.href).toBe('/original-note');

    // Check that display text is in children
    const textNode = link?.children.find((c: any) => c.type === 'text') as any;
    expect(textNode?.value).toBe('Display Text');
  });

  test('converts wikilink with path', async () => {
    const content = 'Link to [[folder/subfolder/note]].';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [wikilinkPlugin],
    });

    const link = getElements(note.contentAst, 'a')[0];
    expect(link).toBeDefined();
    expect(link?.properties?.href).toBe('/folder/subfolder/note');
  });

  test('converts wikilink with anchor', async () => {
    const content = 'Link to [[Note#section]].';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [wikilinkPlugin],
    });

    const link = getElements(note.contentAst, 'a')[0];
    expect(link).toBeDefined();
    expect(link?.properties?.href).toBe('/note#section');
  });

  test('handles embedded wikilinks', async () => {
    const content = 'Embed: ![[image.png]]';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [wikilinkPlugin],
    });

    const embed = getElements(note.contentAst, 'span').find(el =>
      hasClass(el, 'embed')
    );
    expect(embed).toBeDefined();
  });

  test('handles multiple wikilinks in one paragraph', async () => {
    const content = 'Links: [[Note1]], [[Note2]], and [[Note3]].';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [wikilinkPlugin],
    });

    const links = getElements(note.contentAst, 'a');
    expect(links.length).toBeGreaterThanOrEqual(3);
  });
});

describe('calloutPlugin', () => {
  test('converts info callout to div', async () => {
    const content = '> [!info]\n> This is important.';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [calloutPlugin],
    });

    const callout = findElement(note.contentAst, el =>
      el.tagName === 'div' && hasClass(el, 'callout')
    );
    expect(callout).toBeDefined();
    expect(hasClass(callout!, 'callout-info')).toBe(true);
  });

  test('converts warning callout', async () => {
    const content = '> [!warning]\n> Be careful!';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [calloutPlugin],
    });

    const callout = findElement(note.contentAst, el =>
      el.tagName === 'div' && hasClass(el, 'callout-warning')
    );
    expect(callout).toBeDefined();
  });

  test('converts note callout', async () => {
    const content = '> [!note]\n> Take note of this.';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [calloutPlugin],
    });

    const callout = findElement(note.contentAst, el =>
      el.tagName === 'div' && hasClass(el, 'callout-note')
    );
    expect(callout).toBeDefined();
  });

  test('converts tip callout', async () => {
    const content = '> [!tip]\n> Here is a tip.';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [calloutPlugin],
    });

    const callout = findElement(note.contentAst, el =>
      el.tagName === 'div' && hasClass(el, 'callout-tip')
    );
    expect(callout).toBeDefined();
  });

  test('handles callout with title', async () => {
    const content = '> [!info] Custom Title\n> Content here.';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [calloutPlugin],
    });

    const callout = findElement(note.contentAst, el =>
      el.tagName === 'div' && hasClass(el, 'callout')
    );
    expect(callout).toBeDefined();
  });

  test('preserves regular blockquotes', async () => {
    const content = '> This is a regular quote.\n> No callout syntax.';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [calloutPlugin],
    });

    const blockquote = getElements(note.contentAst, 'blockquote')[0];
    expect(blockquote).toBeDefined();
  });
});

describe('codeHighlightPlugin', () => {
  test('adds language class to code blocks', async () => {
    const content = '```javascript\nconst x = 1;\n```';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [codeHighlightPlugin],
    });

    const code = getElements(note.contentAst, 'code')[0];
    expect(code).toBeDefined();
    expect(hasClass(code!, 'language-javascript')).toBe(true);
  });

  test('handles typescript code blocks', async () => {
    const content = '```typescript\ntype Foo = string;\n```';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [codeHighlightPlugin],
    });

    const code = getElements(note.contentAst, 'code')[0];
    expect(hasClass(code!, 'language-typescript')).toBe(true);
  });

  test('handles python code blocks', async () => {
    const content = '```python\ndef hello():\n    pass\n```';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [codeHighlightPlugin],
    });

    const code = getElements(note.contentAst, 'code')[0];
    expect(hasClass(code!, 'language-python')).toBe(true);
  });

  test('handles code blocks without language', async () => {
    const content = '```\nplain code\n```';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [codeHighlightPlugin],
    });

    const code = getElements(note.contentAst, 'code')[0];
    expect(code).toBeDefined();
  });

  test('handles inline code', async () => {
    const content = 'Inline `code` here.';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [codeHighlightPlugin],
    });

    const code = getElements(note.contentAst, 'code')[0];
    expect(code).toBeDefined();
  });
});

describe('defaultPlugins integration', () => {
  test('all default plugins work together', async () => {
    const content = `# Title

Link to [[Other Note]] and [[Another|Alias]].

## Code Section

\`\`\`javascript
const x = 1;
\`\`\`

> [!info]
> Important information here.

More text with [[Third Note#section]].`;

    const note = await parseMarkdown(content, 'test.md', {
      plugins: defaultPlugins,
      extractToc: true,
      generateExcerpt: true,
      computeStats: true,
    });

    // Check that parsing succeeded
    expect(note.contentAst).toBeDefined();
    expect(note.contentAst.children.length).toBeGreaterThan(0);

    // Check wikilinks extracted
    expect(note.links.length).toBeGreaterThan(0);
    expect(note.linkDetails.length).toBeGreaterThan(0);

    // Check TOC extracted
    expect(note.tableOfContents).toBeDefined();
    expect(note.tableOfContents!.length).toBeGreaterThan(0);

    // Check stats computed
    expect(note.stats.words).toBeGreaterThan(0);
    expect(note.stats.headings).toBeGreaterThan(0);
    expect(note.stats.codeBlocks).toBeGreaterThan(0);

    // Check excerpt generated
    expect(note.excerpt).toBeDefined();
    expect(note.excerpt!.length).toBeGreaterThan(0);
  });

  test('plugins preserve markdown structure', async () => {
    const content = `# Main

## Sub 1

Text [[link]].

## Sub 2

More text.`;

    const note = await parseMarkdown(content, 'test.md', {
      plugins: defaultPlugins,
    });

    const h1s = getElements(note.contentAst, 'h1');
    const h2s = getElements(note.contentAst, 'h2');

    expect(h1s.length).toBe(1);
    expect(h2s.length).toBe(2);
  });

  test('heading anchors work with all plugins', async () => {
    const content = '# Test Heading\n\nContent [[link]].';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: defaultPlugins,
    });

    const h1 = getElements(note.contentAst, 'h1')[0];
    expect(h1?.properties?.id).toBe('test-heading');
  });

  test('wikilinks work with all plugins', async () => {
    const content = '# Title\n\n[[Note]] link.';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: defaultPlugins,
    });

    const links = getElements(note.contentAst, 'a');
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]?.properties?.href).toBe('/note');
  });

  test('callouts work with all plugins', async () => {
    const content = '# Title\n\n> [!info]\n> Info here.';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: defaultPlugins,
    });

    const callout = findElement(note.contentAst, el =>
      el.tagName === 'div' && hasClass(el, 'callout')
    );
    expect(callout).toBeDefined();
  });

  test('code highlighting works with all plugins', async () => {
    const content = '# Title\n\n```js\ncode\n```';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: defaultPlugins,
    });

    const code = getElements(note.contentAst, 'code')[0];
    expect(hasClass(code!, 'language-js')).toBe(true);
  });
});

describe('custom plugin integration', () => {
  test('custom beforeParse hook modifies content', async () => {
    const customPlugin = {
      name: 'test-preprocessor',
      beforeParse: async (content: string) => {
        return content.replace(/CUSTOM/g, 'Replaced');
      },
    };

    const note = await parseMarkdown('Text with CUSTOM keyword.', 'test.md', {
      plugins: [customPlugin],
      generateExcerpt: true,
    });

    // Check that content was modified before parsing
    expect(note.excerpt).toContain('Replaced');
    expect(note.excerpt).not.toContain('CUSTOM');
  });

  test('custom extractData hook adds metadata', async () => {
    const customPlugin = {
      name: 'test-metadata',
      extractData: async (ast: any, note: any) => {
        note.customField = 'custom-value';
      },
    };

    const note = await parseMarkdown('# Test', 'test.md', {
      plugins: [customPlugin],
    }) as any;

    expect(note.customField).toBe('custom-value');
  });

  test('multiple custom plugins work together', async () => {
    const plugin1 = {
      name: 'plugin1',
      beforeParse: async (content: string) => {
        return content.replace(/AAA/g, 'BBB');
      },
    };

    const plugin2 = {
      name: 'plugin2',
      beforeParse: async (content: string) => {
        return content.replace(/BBB/g, 'CCC');
      },
    };

    const note = await parseMarkdown('Text AAA here.', 'test.md', {
      plugins: [plugin1, plugin2],
      generateExcerpt: true,
    });

    // Both transforms should apply in order
    expect(note.excerpt).toContain('CCC');
    expect(note.excerpt).not.toContain('AAA');
    expect(note.excerpt).not.toContain('BBB');
  });
});

describe('SyntaxHighlightingPlugin', () => {
  test('adds syntax highlighting via rehype-pretty-code', async () => {
    const content = '```typescript\nconst x: number = 1;\n```';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [SyntaxHighlightingPlugin()],
    });

    const figure = findElement(note.contentAst, el =>
      el.tagName === 'figure' && 'data-rehype-pretty-code-figure' in (el.properties || {})
    );
    expect(figure).toBeDefined();

    const pre = findElement(note.contentAst, el => el.tagName === 'pre');
    expect(pre).toBeDefined();

    // Check that there are generated spans for tokens
    const span = findElement(note.contentAst, el => el.tagName === 'span' && 'data-line' in (el.properties || {}));
    expect(span).toBeDefined();
  });

  test('applies custom options', async () => {
    const content = '```python\ndef foo(): pass\n```';
    const note = await parseMarkdown(content, 'test.md', {
      plugins: [SyntaxHighlightingPlugin({ theme: 'dracula' })],
    });

    const figure = findElement(note.contentAst, el =>
      el.tagName === 'figure' && 'data-rehype-pretty-code-figure' in (el.properties || {})
    );
    expect(figure).toBeDefined();
  });
});
