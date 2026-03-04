/**
 * Frontmatter parsing with comprehensive edge case handling
 */

import matter from 'gray-matter';
import type { FrontmatterData, ParseWarning } from './types';

/**
 * Result of frontmatter parsing
 */
export interface FrontmatterParseResult {
  /** Parsed frontmatter data */
  data: FrontmatterData;
  /** Content without frontmatter */
  content: string;
  /** Any warnings encountered */
  warnings: ParseWarning[];
  /** Original frontmatter string */
  excerpt?: string;
}

/**
 * Parses frontmatter from markdown content with comprehensive error handling
 * 
 * Handles edge cases:
 * - Missing frontmatter
 * - Invalid YAML
 * - Various tag formats (string, array, comma-separated)
 * - Date parsing
 * - Empty frontmatter
 * - Malformed frontmatter
 * 
 * @param content The markdown content
 * @returns Parsed frontmatter result
 */
export function parseFrontmatter(content: string): FrontmatterParseResult {
  const warnings: ParseWarning[] = [];
  let data: FrontmatterData = {};
  let cleanContent = content;
  let excerpt: string | undefined;
  
  try {
    const result = matter(content);
    data = result.data as FrontmatterData;
    cleanContent = result.content;
    excerpt = result.excerpt;
    
    // Normalize tags
    if (data.tags) {
      data.tags = normalizeTags(data.tags);
    }
    
    // Normalize date
    if (data.date) {
      const normalized = normalizeDate(data.date);
      if (normalized) {
        data.date = normalized;
      } else {
        warnings.push({
          type: 'invalid-yaml',
          message: `Invalid date format: ${data.date}`,
          severity: 'warning',
        });
      }
    }
    
    // Normalize boolean fields
    if ('publish' in data) {
      data.publish = normalizeBoolean(data.publish);
    }
    if ('draft' in data) {
      data.draft = normalizeBoolean(data.draft);
    }
    
    // Warn about empty frontmatter
    if (Object.keys(data).length === 0) {
      warnings.push({
        type: 'missing-frontmatter',
        message: 'Frontmatter is empty',
        severity: 'info',
      });
    }
    
  } catch (error) {
    // Frontmatter parsing failed
    warnings.push({
      type: 'invalid-yaml',
      message: `Failed to parse frontmatter: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'error',
    });
    
    // Try to extract content after frontmatter anyway
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (frontmatterMatch && frontmatterMatch[2]) {
      cleanContent = frontmatterMatch[2];
    }
  }
  
  return {
    data,
    content: cleanContent,
    warnings,
    excerpt,
  };
}

/**
 * Normalizes tags into a string array
 * Handles various formats:
 * - String: "tag1" -> ["tag1"]
 * - Comma-separated: "tag1, tag2" -> ["tag1", "tag2"]
 * - Array: ["tag1", "tag2"] -> ["tag1", "tag2"]
 * - Mixed types in array -> filters and converts to strings
 * 
 * @param tags Tags in any format
 * @returns Normalized array of tag strings
 */
export function normalizeTags(tags: unknown): string[] {
  if (typeof tags === 'string') {
    // Split by comma and trim
    return tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }
  
  if (Array.isArray(tags)) {
    return tags
      .filter(tag => tag != null) // Remove null/undefined
      .map(tag => String(tag).trim()) // Convert to string and trim
      .filter(tag => tag.length > 0); // Remove empty strings
  }
  
  // Unexpected type, convert to string and wrap in array
  if (tags != null) {
    return [String(tags)];
  }
  
  return [];
}

/**
 * Normalizes date values
 * Accepts:
 * - ISO date strings: "2024-01-15"
 * - Date objects
 * - Timestamps
 * 
 * @param date Date in any format
 * @returns ISO date string or undefined if invalid
 */
export function normalizeDate(date: unknown): string | undefined {
  // Already a valid ISO string
  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    return undefined;
  }
  
  // Date object
  if (date instanceof Date) {
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    return undefined;
  }
  
  // Timestamp
  if (typeof date === 'number') {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    return undefined;
  }
  
  return undefined;
}

/**
 * Normalizes boolean values
 * Accepts various truthy/falsy representations:
 * - true/false
 * - "true"/"false"
 * - "yes"/"no"
 * - 1/0
 * - "1"/"0"
 * 
 * @param value Value to normalize
 * @returns Boolean value
 */
export function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === 'yes' || lower === '1';
  }
  
  if (typeof value === 'number') {
    return value !== 0;
  }
  
  return Boolean(value);
}

/**
 * Validates frontmatter data
 * Checks for required fields and valid values
 * 
 * @param data Frontmatter data
 * @param requiredFields Fields that must be present
 * @returns Validation warnings
 */
export function validateFrontmatter(
  data: FrontmatterData,
  requiredFields: string[] = []
): ParseWarning[] {
  const warnings: ParseWarning[] = [];
  
  // Check required fields
  for (const field of requiredFields) {
    if (!(field in data) || data[field] == null) {
      warnings.push({
        type: 'missing-frontmatter',
        message: `Required field "${field}" is missing`,
        severity: 'error',
      });
    }
  }
  
  // Validate title if present
  if ('title' in data) {
    if (typeof data.title !== 'string') {
      warnings.push({
        type: 'invalid-yaml',
        message: 'Title must be a string',
        severity: 'warning',
      });
    } else if (data.title.trim().length === 0) {
      warnings.push({
        type: 'invalid-yaml',
        message: 'Title is empty',
        severity: 'warning',
      });
    }
  }
  
  // Validate tags if present
  if ('tags' in data && !Array.isArray(data.tags) && typeof data.tags !== 'string') {
    warnings.push({
      type: 'invalid-yaml',
      message: 'Tags must be an array or string',
      severity: 'warning',
    });
  }
  
  return warnings;
}

/**
 * Merges default frontmatter with parsed data
 * 
 * @param data Parsed frontmatter
 * @param defaults Default values
 * @returns Merged frontmatter
 */
export function mergeFrontmatter(
  data: FrontmatterData,
  defaults: Partial<FrontmatterData>
): FrontmatterData {
  return {
    ...defaults,
    ...data,
  };
}

/**
 * Extracts a specific field from frontmatter with type safety
 * 
 * @param data Frontmatter data
 * @param field Field name
 * @param defaultValue Default value if field is missing
 * @returns Field value or default
 */
export function getFrontmatterField<T>(
  data: FrontmatterData,
  field: string,
  defaultValue: T
): T {
  const value = data[field];
  if (value === undefined || value === null) {
    return defaultValue;
  }
  return value as T;
}

/**
 * Checks if a note should be published based on frontmatter
 * Considers both "publish" and "draft" fields
 * 
 * @param data Frontmatter data
 * @returns Whether the note should be published
 */
export function shouldPublish(data: FrontmatterData): boolean {
  // If publish is explicitly set, use that
  if ('publish' in data) {
    return normalizeBoolean(data.publish);
  }
  
  // If draft is set, invert it (draft: true means don't publish)
  if ('draft' in data) {
    return !normalizeBoolean(data.draft);
  }
  
  // Default to publishing
  return true;
}

/**
 * Serializes frontmatter back to YAML string
 * Useful for updating notes programmatically
 * 
 * @param data Frontmatter data
 * @returns YAML string
 */
export function serializeFrontmatter(data: FrontmatterData): string {
  const yaml = matter.stringify('', data);
  return yaml;
}

/**
 * Updates frontmatter in markdown content
 * 
 * @param content Original markdown content
 * @param updates Fields to update
 * @returns Updated markdown content
 */
export function updateFrontmatter(
  content: string,
  updates: Partial<FrontmatterData>
): string {
  const parsed = matter(content);
  const updatedData = {
    ...parsed.data,
    ...updates,
  };
  return matter.stringify(parsed.content, updatedData);
}
