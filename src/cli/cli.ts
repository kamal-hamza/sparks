#!/usr/bin/env bun
import { parseArgs } from 'node:util';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { processVault } from '../core/builder';
import { resolvePlugins } from '../core/pluginResolver';
import type { SparksConfig, FullStackPlugin } from '../core/types';

export function parseCliArgs(args: string[]) {
    const options = {
        vault: { type: 'string', short: 'v' },
        out: { type: 'string', short: 'o' },
        strict: { type: 'boolean', short: 's', default: false },
        help: { type: 'boolean', short: 'h', default: false },
    } as const;

    try {
        return parseArgs({
            args,
            options,
            allowPositionals: false,
        });
    } catch (err: any) {
        throw new Error(`Error parsing arguments: ${err.message}`);
    }
}

export async function run() {
    let parsed;
    try {
        // skip the first two args (node/bun path and script path)
        const args = process.argv.slice(2);
        parsed = parseCliArgs(args);
    } catch (err: any) {
        console.error(err.message);
        process.exit(1);
    }

    const { values } = parsed;

    if (values.help) {
        console.log(`
Usage: sparks [options]

Options:
  -v, --vault <path>    Path to your Obsidian vault directory
  -o, --out <path>      Path to output generated JSON API
  -s, --strict          Throw errors on parsing issues instead of warning
  -h, --help            Show this help message
    `);
        process.exit(0);
    }

    const cwd = process.cwd();
    let loadedConfig: SparksConfig | undefined;
    const configPath = path.resolve(cwd, 'sparks.config.ts');

    if (fs.existsSync(configPath)) {
        try {
            console.log(`[Config] Loading ${configPath}...`);
            const configModule = await import(configPath);
            loadedConfig = configModule.default || configModule;
        } catch (err: any) {
            console.warn(`[Warning] Failed to load config file: ${err.message}`);
        }
    }

    const { vaultPath, outputPath } = resolvePaths(values, loadedConfig, cwd);
    const strict = values.strict || loadedConfig?.strict || false;

    let activePlugins: FullStackPlugin[] | undefined;
    if (loadedConfig?.plugins && loadedConfig.plugins.length > 0) {
        try {
            activePlugins = await resolvePlugins(loadedConfig.plugins);
        } catch (err: any) {
            console.error(`[Error] Failed to resolve plugins: ${err.message}`);
            process.exit(1);
        }
    }

    try {
        await processVault({
            vaultPath,
            outputPath,
            strict,
            plugins: activePlugins,
        });
    } catch (err: any) {
        console.error('\\nFatal Error during processing:');
        console.error(err);
        process.exit(1);
    }
}

export function resolvePaths(values: any, config?: SparksConfig, cwd = process.cwd()) {
    const vaultDir = typeof values.vault === 'string' ? values.vault : (config?.vault || './content');
    const outDir = typeof values.out === 'string' ? values.out : (config?.outDir || './public/api/notes');

    return {
        vaultPath: path.resolve(cwd, vaultDir),
        outputPath: path.resolve(cwd, outDir)
    };
}

// Only run if this file is executed directly 
if (import.meta.main || import.meta.url === `file://${process.argv[1]}`) {
    run().catch((err) => {
        console.error('Unhandled Rejection:', err);
        process.exit(1);
    });
}
