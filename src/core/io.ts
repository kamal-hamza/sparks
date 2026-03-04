import { promises as fs } from 'node:fs';
import * as path from 'node:path';

/**
 * Recursively find all markdown files in a directory
 * @param dir Directory to search
 * @returns Array of absolute file paths to markdown files
 */
export async function findMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  async function search(currentDir: string) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        // Skip hidden directories (like .git, .obsidian)
        if (entry.isDirectory() && entry.name.startsWith('.')) {
          continue;
        }
        
        if (entry.isDirectory()) {
          await search(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new Error(`Directory not found: ${dir}`);
      }
      throw err;
    }
  }
  
  await search(dir);
  return files;
}

/**
 * Read a file's content
 * @param filePath Path to the file
 * @returns File content as string
 */
export async function readFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8');
}

/**
 * Write data to a file, ensuring the parent directory exists
 * @param filePath Path to the file to write
 * @param data Data to write
 */
export async function writeFile(filePath: string, data: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, data, 'utf-8');
}

/**
 * Prepares an output directory by ensuring it exists
 * @param dir Directory path
 */
export async function prepareOutputDirectory(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err: any) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
}
