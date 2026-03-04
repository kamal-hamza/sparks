import { expect, test, describe, spyOn } from "bun:test";
import { resolvePlugins } from "./pluginResolver";
import type { FullStackPlugin } from "./types";
import { writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import * as cp from "child_process";

// Mock execSync globally for this file to avoid triggering actual npm/bun package installations
spyOn(cp, "execSync").mockImplementation((): any => Buffer.from("mocked output"));

describe("Declarative Plugin Resolver", () => {
    test("resolves an already instantiated plugin object", async () => {
        const fake: FullStackPlugin = { name: "fake-plugin-instantiated" };
        const resolved = await resolvePlugins([fake]);
        expect(resolved).toEqual([fake]);
    });

    test("resolves a local plugin from a string path", async () => {
        const testPluginPath = join(process.cwd(), "test-local-plugin.ts");
        await writeFile(testPluginPath, `
            export default function Factory(options: any) {
                return { name: "test-local", config: options };
            }
        `);

        try {
            const resolved = await resolvePlugins(["./test-local-plugin.ts"]);
            expect(resolved).toHaveLength(1);
            expect(resolved[0]!.name).toBe("test-local");
            expect(resolved[0]!.config).toBeUndefined();
        } finally {
            await unlink(testPluginPath).catch(() => { });
        }
    });

    test("resolves a local plugin from a tuple with options", async () => {
        const testPluginPath = join(process.cwd(), "test-tuple-plugin.ts");
        await writeFile(testPluginPath, `
            export default function Factory(options: any) {
                return { name: "test-tuple", config: options };
            }
        `);

        try {
            const resolved = await resolvePlugins([
                ["./test-tuple-plugin.ts", { theme: "dark", icons: true }]
            ]);
            expect(resolved).toHaveLength(1);
            expect(resolved[0]!.name).toBe("test-tuple");
            expect(resolved[0]!.config).toEqual({ theme: "dark", icons: true });
        } finally {
            await unlink(testPluginPath).catch(() => { });
        }
    });

    test("attempts to auto-install missing packages", async () => {
        // Reset call count wrapper
        const mockExec = spyOn(cp, "execSync");
        mockExec.mockClear();

        const resolved = await resolvePlugins(["some-non-existent-package-for-test"]);

        // Ensure execSync was invoked for auto-installation
        expect(mockExec).toHaveBeenCalled();

        // Since it's truly not installed, the subsequent import fails and is caught safely, resolving to empty list
        expect(resolved).toHaveLength(0);
    });
});
