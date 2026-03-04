import { promises as fs } from 'node:fs';
import * as path from 'node:path';

export interface VaultFiles {
  markdown: string[];
  assets: string[];
}

const ASSET_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.pdf', '.mp4', '.webm', '.mp3', '.wav', '.ogg']);

/**
 * Recursively find all markdown and asset files in a directory
 * @param dir Directory to search
 * @returns Object with arrays of absolute file paths to markdown and asset files
 */
export async function findVaultFiles(dir: string): Promise<VaultFiles> {
  const result: VaultFiles = { markdown: [], assets: [] };

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
        } else if (entry.isFile()) {
          if (entry.name.endsWith('.md')) {
            result.markdown.push(fullPath);
          } else {
            const ext = path.extname(entry.name).toLowerCase();
            if (ASSET_EXTENSIONS.has(ext)) {
              result.assets.push(fullPath);
            }
          }
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
  return result;
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

/**
 * Get file statistics (useful for caching based on mtimeMs)
 * @param filePath Path to the file
 */
export async function getFileStats(filePath: string) {
  return await fs.stat(filePath);
}

/**
 * Copy an asset file, creating destination directory if needed
 * @param sourcePath Source file path
 * @param destPath Destination file path
 */
export async function copyAssetFile(sourcePath: string, destPath: string): Promise<void> {
  const dir = path.dirname(destPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.copyFile(sourcePath, destPath);
}
