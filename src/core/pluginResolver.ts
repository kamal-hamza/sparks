import { execSync } from 'child_process';
import path from 'path';
import type { FullStackPlugin, PluginDeclaration } from './types';

/**
 * Resolves declarative plugins into instantiated FullStackPlugin objects.
 * Missing plugins (identified by string/tuple declarations) are automatically installed.
 */
export async function resolvePlugins(declarations: PluginDeclaration[]): Promise<FullStackPlugin[]> {
    const resolvedPlugins: FullStackPlugin[] = [];
    const packagesToInstall: string[] = [];

    // Step 1: Scan declarations and determine what needs to be installed
    for (const decl of declarations) {
        if (typeof decl === 'string' || Array.isArray(decl)) {
            const pluginPath = Array.isArray(decl) ? decl[0] : decl;

            // If it's not a local file path (doesn't start with ./ or / or ..)
            if (!pluginPath.startsWith('.') && !pluginPath.startsWith('/')) {
                try {
                    // Try to resolve it from the current working directory
                    require.resolve(pluginPath, { paths: [process.cwd()] });
                } catch (e) {
                    // If it fails, mark it for auto-installation
                    if (!packagesToInstall.includes(pluginPath)) {
                        packagesToInstall.push(pluginPath);
                    }
                }
            }
        }
    }

    // Step 2: Auto-Install missing plugins
    if (packagesToInstall.length > 0) {
        console.log(`\n📦 Sparks found new plugins. Installing: ${packagesToInstall.join(', ')}...`);
        try {
            // Determine package manager - checking if bun is available/currently running
            // Bun sets process.isBun but using a safe fallback
            const isBun = typeof process.versions !== 'undefined' && (process.versions as any).bun;
            const cmd = isBun ? 'bun add' : 'npm install';

            execSync(`${cmd} ${packagesToInstall.join(' ')}`, {
                cwd: process.cwd(),
                stdio: 'inherit' // Shows the installation progress in the terminal
            });
            console.log(`✨ Plugins installed successfully!\n`);
        } catch (err) {
            console.error(`❌ Failed to install plugins.`, err);
            process.exit(1);
        }
    }

    // Step 3: Load and instantiate the plugins
    for (const decl of declarations) {
        if (typeof decl === 'object' && !Array.isArray(decl)) {
            // It's already an instantiated plugin object
            resolvedPlugins.push(decl);
            continue;
        }

        const pluginPath = Array.isArray(decl) ? decl[0] : decl;
        const pluginOptions = Array.isArray(decl) ? decl[1] : undefined;

        // Resolve absolute path for local files, or just use package name
        // For ES modules, absolute paths on Windows might need file:/// prefix or similar
        // We'll use absolute paths for local resolution and strings for node_modules.
        let importPath = pluginPath;
        if (pluginPath.startsWith('.')) {
            importPath = path.resolve(process.cwd(), pluginPath);
        } else if (pluginPath.startsWith('/')) {
            importPath = pluginPath;
        }

        try {
            const module = await import(importPath);

            // Assume the default export is a factory function that takes options
            const firstKey = Object.keys(module)[0] as keyof typeof module;
            const pluginFactory = module.default || (firstKey ? module[firstKey] : undefined);

            if (typeof pluginFactory !== 'function') {
                console.warn(`⚠️ Plugin ${pluginPath} did not export a valid factory function.`);
                continue;
            }

            resolvedPlugins.push(await pluginFactory(pluginOptions));
        } catch (err) {
            console.error(`❌ Failed to load plugin: ${pluginPath}`, err);
        }
    }

    return resolvedPlugins;
}
