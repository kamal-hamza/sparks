import { describe, it, expect } from 'bun:test';
import { parseCliArgs } from './cli';

describe('CLI arguments parser', () => {
    it('should parse long flags correctly', () => {
        const args = ['--vault', '/path/to/vault', '--out', '/path/to/out', '--strict'];
        const parsed = parseCliArgs(args);

        expect(parsed.values.vault).toBe('/path/to/vault');
        expect(parsed.values.out).toBe('/path/to/out');
        expect(parsed.values.strict).toBe(true);
        expect(parsed.values.help).toBe(false);
    });

    it('should parse short flags correctly', () => {
        const args = ['-v', './vault', '-o', './api', '-h'];
        const parsed = parseCliArgs(args);

        expect(parsed.values.vault).toBe('./vault');
        expect(parsed.values.out).toBe('./api');
        expect(parsed.values.strict).toBe(false);
        expect(parsed.values.help).toBe(true);
    });

    it('should throw an error on unknown flags', () => {
        const args = ['--unknown'];
        expect(() => parseCliArgs(args)).toThrow('Error parsing arguments');
    });

    it('should throw an error on positionals', () => {
        const args = ['/path/to/vault'];
        expect(() => parseCliArgs(args)).toThrow('Error parsing arguments');
    });

    it('should return undefined for missing string arguments', () => {
        const args: string[] = [];
        const parsed = parseCliArgs(args);
        expect(parsed.values.vault).toBeUndefined();
        expect(parsed.values.out).toBeUndefined();
    });
});

import { resolvePaths } from './cli';
import * as path from 'node:path';

describe('CLI path resolution with defaults', () => {
    it('should use provided paths', () => {
        const cwd = '/test/dir';
        const values = { vault: './my-vault', out: './my-out' };
        const paths = resolvePaths(values, undefined, cwd);

        expect(paths.vaultPath).toBe(path.resolve(cwd, './my-vault'));
        expect(paths.outputPath).toBe(path.resolve(cwd, './my-out'));
    });

    it('should fallback to defaults when properties are missing', () => {
        const cwd = '/test/dir';
        const values = {};
        const paths = resolvePaths(values, undefined, cwd);

        expect(paths.vaultPath).toBe(path.resolve(cwd, './content'));
        expect(paths.outputPath).toBe(path.resolve(cwd, './public/api/notes'));
    });

    it('should fallback to defaults when invalid types are provided', () => {
        const cwd = '/test/dir';
        const values = { vault: true, out: 123 };
        const paths = resolvePaths(values, undefined, cwd);

        expect(paths.vaultPath).toBe(path.resolve(cwd, './content'));
        expect(paths.outputPath).toBe(path.resolve(cwd, './public/api/notes'));
    });

    it('should use paths from config when provided', () => {
        const cwd = '/test/dir';
        const values = {};
        // Note: The config structure matches SparksConfig structure where output config is outDir
        const config = { vault: './config-vault', outDir: './config-out' };
        const paths = resolvePaths(values, config as any, cwd);

        expect(paths.vaultPath).toBe(path.resolve(cwd, './config-vault'));
        expect(paths.outputPath).toBe(path.resolve(cwd, './config-out'));
    });

    it('should prefer CLI arguments over config paths', () => {
        const cwd = '/test/dir';
        const values = { vault: './cli-vault', out: './cli-out' };
        const config = { vault: './config-vault', outDir: './config-out' };
        const paths = resolvePaths(values, config as any, cwd);

        expect(paths.vaultPath).toBe(path.resolve(cwd, './cli-vault'));
        expect(paths.outputPath).toBe(path.resolve(cwd, './cli-out'));
    });
});
