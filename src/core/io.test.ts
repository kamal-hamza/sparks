import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { findMarkdownFiles, readFile, writeFile, prepareOutputDirectory } from './io';

describe('IO Engine', () => {
    const testDir = path.join(process.cwd(), '.test-io-tmp');

    beforeAll(async () => {
        // Setup test directory structure
        await fs.mkdir(testDir, { recursive: true });

        // Create some markdown files
        await fs.writeFile(path.join(testDir, 'file1.md'), '# File 1');

        await fs.mkdir(path.join(testDir, 'subdir'));
        await fs.writeFile(path.join(testDir, 'subdir', 'file2.md'), '# File 2');

        // Create some ignored files
        await fs.writeFile(path.join(testDir, 'not-markdown.txt'), 'text');

        // Create hidden directory
        await fs.mkdir(path.join(testDir, '.hidden'));
        await fs.writeFile(path.join(testDir, '.hidden', 'file3.md'), '# Hidden');
    });

    afterAll(async () => {
        // Cleanup
        await fs.rm(testDir, { recursive: true, force: true });
    });

    it('should find only markdown files, ignoring hidden directories', async () => {
        const files = await findMarkdownFiles(testDir);
        expect(files.length).toBe(2);

        const fileNames = files.map(f => path.basename(f));
        expect(fileNames).toContain('file1.md');
        expect(fileNames).toContain('file2.md');
        expect(fileNames).not.toContain('file3.md');
        expect(fileNames).not.toContain('not-markdown.txt');
    });

    it('should read file content correctly', async () => {
        const content = await readFile(path.join(testDir, 'file1.md'));
        expect(content).toBe('# File 1');
    });

    it('should write file recursively', async () => {
        const outPath = path.join(testDir, 'output', 'nested', 'out.txt');
        await writeFile(outPath, 'success');

        const content = await fs.readFile(outPath, 'utf-8');
        expect(content).toBe('success');
    });

    it('should prepare output directory without erroring if it exists', async () => {
        const outDir = path.join(testDir, 'prepared-dir');
        await prepareOutputDirectory(outDir);
        await prepareOutputDirectory(outDir); // Should not throw EEXIST

        const stat = await fs.stat(outDir);
        expect(stat.isDirectory()).toBe(true);
    });
});
