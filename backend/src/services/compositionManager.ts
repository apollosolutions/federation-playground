import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { DocumentNode } from "graphql";

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = resolve(__dirname, "../../../.cache/composition");

type CompositionResult = {
    supergraphSdl: string;
    errors?: readonly unknown[];
    hints?: readonly unknown[];
};

type ServiceDefinition = {
    name: string;
    typeDefs: DocumentNode;
    url?: string;
};

export type ComposeServicesFn = (
    services: ServiceDefinition[],
) => CompositionResult;

const esmRequire = createRequire(import.meta.url);
const compositionPkgPath = esmRequire.resolve("@apollo/composition/package.json");
const INSTALLED_VERSION: string = JSON.parse(
    readFileSync(compositionPkgPath, "utf-8"),
).version as string;

const loaded = new Map<string, ComposeServicesFn>();
const installing = new Map<string, Promise<void>>();

/**
 * Resolves a UI federation version string to an exact semver version.
 *   "=2.9.0"  -> "2.9.0"   (pinned exact)
 *   "2.9.0"   -> "2.9.0"   (bare semver, treated as pinned)
 *   "2"       -> latest stable 2.x from availableVersions
 */
export function resolveVersion(
    input: string,
    availableVersions: string[],
): string {
    const v = input.trim();

    if (v.startsWith("=")) {
        const exact = v.slice(1);
        if (!availableVersions.includes(exact)) {
            throw new Error(
                `@apollo/composition@${exact} does not exist on npm`,
            );
        }
        return exact;
    }

    if (v === "2") {
        const stable = availableVersions.filter(
            (ver) => ver.startsWith("2.") && !ver.includes("-"),
        );
        if (stable.length === 0) {
            throw new Error("No stable 2.x versions found on npm");
        }
        return stable[stable.length - 1];
    }

    if (/^\d+\.\d+\.\d+/.test(v)) {
        const base = v.replace(/-.*$/, "").replace(/^(\d+\.\d+\.\d+).*/, "$1");
        if (availableVersions.includes(v)) return v;
        if (v !== base && availableVersions.includes(base)) return base;
        throw new Error(
            `@apollo/composition@${v} does not exist on npm. Use "=X.Y.Z" for exact or "2" for latest.`,
        );
    }

    throw new Error(
        `Invalid federation version "${v}". Use "2" for latest, "X.Y.Z", or "=X.Y.Z" for an exact version.`,
    );
}

function compositionModulePath(version: string): string {
    return join(
        CACHE_DIR,
        version,
        "node_modules",
        "@apollo",
        "composition",
        "dist",
        "index.js",
    );
}

async function installComposition(version: string): Promise<void> {
    const versionDir = join(CACHE_DIR, version);
    mkdirSync(versionDir, { recursive: true });

    writeFileSync(
        join(versionDir, "package.json"),
        JSON.stringify(
            {
                name: `composition-cache-${version}`,
                private: true,
                dependencies: {
                    "@apollo/composition": version,
                    graphql: "^16.5.0",
                },
            },
            null,
            2,
        ),
    );

    console.log(`Installing @apollo/composition@${version}...`);
    try {
        await execFileAsync("npm", ["install", "--no-package-lock", "--ignore-scripts"], {
            cwd: versionDir,
            timeout: 120_000,
        });
    } catch (err) {
        throw new Error(
            `Failed to install @apollo/composition@${version}: ${err instanceof Error ? err.message : String(err)}`,
        );
    }
    console.log(`Installed @apollo/composition@${version}`);
}

/**
 * Returns a `composeServices` function for the requested exact version.
 * Uses the built-in package for the pinned version, otherwise installs
 * on demand into `.cache/composition/<version>/` and dynamically imports.
 */
export async function ensureComposition(
    version: string,
): Promise<ComposeServicesFn> {
    const cached = loaded.get(version);
    if (cached) return cached;

    if (version === INSTALLED_VERSION) {
        const mod = await import("@apollo/composition");
        const fn = mod.composeServices as ComposeServicesFn;
        loaded.set(version, fn);
        return fn;
    }

    const modPath = compositionModulePath(version);

    if (!existsSync(modPath)) {
        let pending = installing.get(version);
        if (!pending) {
            pending = installComposition(version);
            installing.set(version, pending);
        }
        try {
            await pending;
        } finally {
            installing.delete(version);
        }
    }

    const mod = await import(pathToFileURL(modPath).href);
    const fn = mod.composeServices as ComposeServicesFn;
    loaded.set(version, fn);
    return fn;
}
