/**
 * Tests for frontmatter.ts - Frontmatter parsing and normalization
 */

import { describe, test, expect } from 'bun:test';
import {
  parseFrontmatter,
  normalizeTags,
  normalizeDate,
  normalizeBoolean,
  validateFrontmatter,
  mergeFrontmatter,
  getFrontmatterField,
  shouldPublish,
  serializeFrontmatter,
  updateFrontmatter,
} from './frontmatter';

describe('parseFrontmatter', () => {
  test('parses valid frontmatter', () => {
    const content = '---\ntitle: Test\ndate: 2024-01-15\n---\n\nContent';
    const result = parseFrontmatter(content);
    expect(result.data.title).toBe('Test');
    expect(result.content.trim()).toBe('Content');
    expect(result.warnings).toHaveLength(0);
  });

  test('handles missing frontmatter', () => {
    const content = '# Just content\n\nNo frontmatter here.';
    const result = parseFrontmatter(content);
    expect(result.data).toEqual({});
    expect(result.content).toBe(content);
  });

  test('handles empty frontmatter', () => {
    const content = '---\n---\n\nContent';
    const result = parseFrontmatter(content);
    expect(result.data).toEqual({});
    expect(result.warnings.some(w => w.type === 'missing-frontmatter')).toBe(true);
  });

  test('handles invalid YAML', () => {
    const content = '---\ntitle: Test\ninvalid yaml:\n  - item\n  broken\n---\n\nContent';
    const result = parseFrontmatter(content);
    expect(result.warnings.some(w => w.type === 'invalid-yaml')).toBe(true);
  });

  test('normalizes tags from string', () => {
    const content = '---\ntags: tag1, tag2, tag3\n---\n\nContent';
    const result = parseFrontmatter(content);
    expect(Array.isArray(result.data.tags)).toBe(true);
    expect(result.data.tags).toHaveLength(3);
  });

  test('normalizes tags from array', () => {
    const content = '---\ntags:\n  - tag1\n  - tag2\n---\n\nContent';
    const result = parseFrontmatter(content);
    expect(result.data.tags).toEqual(['tag1', 'tag2']);
  });

  test('normalizes boolean publish field', () => {
    const content = '---\npublish: true\n---\n\nContent';
    const result = parseFrontmatter(content);
    expect(result.data.publish).toBe(true);
  });

  test('normalizes boolean draft field', () => {
    const content = '---\ndraft: false\n---\n\nContent';
    const result = parseFrontmatter(content);
    expect(result.data.draft).toBe(false);
  });

  test('normalizes date field', () => {
    const content = '---\ndate: 2024-01-15\n---\n\nContent';
    const result = parseFrontmatter(content);
    expect(typeof result.data.date).toBe('string');
    expect(result.data.date).toContain('2024');
  });

  test('warns on invalid date', () => {
    const content = '---\ndate: invalid-date\n---\n\nContent';
    const result = parseFrontmatter(content);
    expect(result.warnings.some(w => w.message.includes('Invalid date'))).toBe(true);
  });

  test('preserves custom frontmatter fields', () => {
    const content = '---\ntitle: Test\ncustom_field: custom value\nanother: 123\n---\n\nContent';
    const result = parseFrontmatter(content);
    expect(result.data.custom_field).toBe('custom value');
    expect(result.data.another).toBe(123);
  });
});

describe('normalizeTags', () => {
  test('normalizes string to array', () => {
    expect(normalizeTags('tag1')).toEqual(['tag1']);
  });

  test('normalizes comma-separated string', () => {
    expect(normalizeTags('tag1, tag2, tag3')).toEqual(['tag1', 'tag2', 'tag3']);
  });

  test('normalizes array', () => {
    expect(normalizeTags(['tag1', 'tag2'])).toEqual(['tag1', 'tag2']);
  });

  test('filters null and undefined from array', () => {
    expect(normalizeTags(['tag1', null, 'tag2', undefined])).toEqual(['tag1', 'tag2']);
  });

  test('converts non-string array items to strings', () => {
    expect(normalizeTags(['tag1', 123, true])).toEqual(['tag1', '123', 'true']);
  });

  test('handles empty string', () => {
    expect(normalizeTags('')).toEqual([]);
  });

  test('handles null', () => {
    expect(normalizeTags(null)).toEqual([]);
  });

  test('handles undefined', () => {
    expect(normalizeTags(undefined)).toEqual([]);
  });

  test('trims whitespace', () => {
    expect(normalizeTags('  tag1  ,  tag2  ')).toEqual(['tag1', 'tag2']);
  });
});

describe('normalizeDate', () => {
  test('normalizes ISO date string', () => {
    const result = normalizeDate('2024-01-15');
    expect(result).toBeDefined();
    expect(result).toContain('2024');
  });

  test('normalizes Date object', () => {
    const date = new Date('2024-01-15');
    const result = normalizeDate(date);
    expect(result).toBeDefined();
    expect(result).toContain('2024');
  });

  test('normalizes timestamp', () => {
    const timestamp = new Date('2024-01-15').getTime();
    const result = normalizeDate(timestamp);
    expect(result).toBeDefined();
  });

  test('returns undefined for invalid string', () => {
    expect(normalizeDate('invalid')).toBeUndefined();
  });

  test('returns undefined for NaN', () => {
    expect(normalizeDate(NaN)).toBeUndefined();
  });

  test('returns undefined for invalid Date', () => {
    expect(normalizeDate(new Date('invalid'))).toBeUndefined();
  });

  test('returns ISO string format', () => {
    const result = normalizeDate('2024-01-15');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('normalizeBoolean', () => {
  test('normalizes true', () => {
    expect(normalizeBoolean(true)).toBe(true);
  });

  test('normalizes false', () => {
    expect(normalizeBoolean(false)).toBe(false);
  });

  test('normalizes "true" string', () => {
    expect(normalizeBoolean('true')).toBe(true);
    expect(normalizeBoolean('True')).toBe(true);
    expect(normalizeBoolean('TRUE')).toBe(true);
  });

  test('normalizes "false" string', () => {
    expect(normalizeBoolean('false')).toBe(false);
  });

  test('normalizes "yes"', () => {
    expect(normalizeBoolean('yes')).toBe(true);
    expect(normalizeBoolean('Yes')).toBe(true);
  });

  test('normalizes "no"', () => {
    expect(normalizeBoolean('no')).toBe(false);
  });

  test('normalizes "1" and "0"', () => {
    expect(normalizeBoolean('1')).toBe(true);
    expect(normalizeBoolean('0')).toBe(false);
  });

  test('normalizes numbers', () => {
    expect(normalizeBoolean(1)).toBe(true);
    expect(normalizeBoolean(0)).toBe(false);
    expect(normalizeBoolean(123)).toBe(true);
  });

  test('normalizes null and undefined', () => {
    expect(normalizeBoolean(null)).toBe(false);
    expect(normalizeBoolean(undefined)).toBe(false);
  });
});

describe('validateFrontmatter', () => {
  test('validates required fields present', () => {
    const data = { title: 'Test', tags: ['tag1'] };
    const warnings = validateFrontmatter(data, ['title']);
    expect(warnings).toHaveLength(0);
  });

  test('warns on missing required field', () => {
    const data = { tags: ['tag1'] };
    const warnings = validateFrontmatter(data, ['title']);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toContain('title');
  });

  test('warns on non-string title', () => {
    const data = { title: 123 as any };
    const warnings = validateFrontmatter(data);
    expect(warnings.some(w => w.message.includes('string'))).toBe(true);
  });

  test('warns on empty title', () => {
    const data = { title: '   ' };
    const warnings = validateFrontmatter(data);
    expect(warnings.some(w => w.message.includes('empty'))).toBe(true);
  });

  test('warns on invalid tags type', () => {
    const data = { tags: 123 as any };
    const warnings = validateFrontmatter(data);
    expect(warnings.some(w => w.message.includes('Tags'))).toBe(true);
  });
});

describe('mergeFrontmatter', () => {
  test('merges frontmatter with defaults', () => {
    const data = { title: 'Test' };
    const defaults = { publish: true, draft: false };
    const merged = mergeFrontmatter(data, defaults);
    expect(merged.title).toBe('Test');
    expect(merged.publish).toBe(true);
  });

  test('data overrides defaults', () => {
    const data = { title: 'Test', publish: false };
    const defaults = { publish: true };
    const merged = mergeFrontmatter(data, defaults);
    expect(merged.publish).toBe(false);
  });

  test('handles empty data', () => {
    const defaults = { publish: true };
    const merged = mergeFrontmatter({}, defaults);
    expect(merged.publish).toBe(true);
  });
});

describe('getFrontmatterField', () => {
  test('gets existing field', () => {
    const data = { title: 'Test', count: 5 };
    expect(getFrontmatterField(data, 'title', 'default')).toBe('Test');
    expect(getFrontmatterField(data, 'count', 0)).toBe(5);
  });

  test('returns default for missing field', () => {
    const data = { title: 'Test' };
    expect(getFrontmatterField(data, 'missing', 'default')).toBe('default');
  });

  test('returns default for null', () => {
    const data = { field: null };
    expect(getFrontmatterField(data, 'field', 'default')).toBe('default');
  });

  test('returns default for undefined', () => {
    const data = { field: undefined };
    expect(getFrontmatterField(data, 'field', 'default')).toBe('default');
  });
});

describe('shouldPublish', () => {
  test('publishes when publish is true', () => {
    expect(shouldPublish({ publish: true })).toBe(true);
  });

  test('does not publish when publish is false', () => {
    expect(shouldPublish({ publish: false })).toBe(false);
  });

  test('publishes when draft is false', () => {
    expect(shouldPublish({ draft: false })).toBe(true);
  });

  test('does not publish when draft is true', () => {
    expect(shouldPublish({ draft: true })).toBe(false);
  });

  test('publish takes precedence over draft', () => {
    expect(shouldPublish({ publish: true, draft: true })).toBe(true);
    expect(shouldPublish({ publish: false, draft: false })).toBe(false);
  });

  test('publishes by default', () => {
    expect(shouldPublish({})).toBe(true);
  });

  test('handles string values', () => {
    expect(shouldPublish({ publish: 'true' as any })).toBe(true);
    expect(shouldPublish({ publish: 'false' as any })).toBe(false);
  });
});

describe('serializeFrontmatter', () => {
  test('serializes frontmatter to YAML', () => {
    const data = { title: 'Test', tags: ['tag1', 'tag2'] };
    const yaml = serializeFrontmatter(data);
    expect(yaml).toContain('---');
    expect(yaml).toContain('title: Test');
  });

  test('serializes empty frontmatter', () => {
    const yaml = serializeFrontmatter({});
    expect(yaml.length).toBeGreaterThan(0);
  });
});

describe('updateFrontmatter', () => {
  test('updates existing frontmatter', () => {
    const content = '---\ntitle: Old\n---\n\nContent';
    const updated = updateFrontmatter(content, { title: 'New' });
    expect(updated).toContain('title: New');
    expect(updated).toContain('Content');
  });

  test('adds new fields', () => {
    const content = '---\ntitle: Test\n---\n\nContent';
    const updated = updateFrontmatter(content, { tags: ['tag1'] });
    expect(updated).toContain('title: Test');
    expect(updated).toContain('tags');
  });

  test('handles content without frontmatter', () => {
    const content = 'Just content';
    const updated = updateFrontmatter(content, { title: 'Test' });
    expect(updated).toContain('---');
    expect(updated).toContain('title: Test');
    expect(updated).toContain('Just content');
  });

  test('preserves content', () => {
    const content = '---\ntitle: Test\n---\n\n# Heading\n\nParagraph';
    const updated = updateFrontmatter(content, { draft: true });
    expect(updated).toContain('# Heading');
    expect(updated).toContain('Paragraph');
  });
});
