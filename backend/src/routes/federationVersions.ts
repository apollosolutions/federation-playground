import type { Request, Response } from "express";
import { Router } from "express";

const router = Router();

const CACHE_TTL_MS = 60 * 60 * 1000;
let cache: { versions: string[]; fetchedAt: number } | null = null;

export async function fetchCompositionVersions(): Promise<string[]> {
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
        return cache.versions;
    }
    const res = await fetch("https://registry.npmjs.org/@apollo%2Fcomposition", {
        headers: { Accept: "application/vnd.npm.install-v1+json" },
    });
    if (!res.ok) throw new Error(`npm registry returned ${res.status}`);
    const data = (await res.json()) as { versions: Record<string, unknown> };
    const versions = Object.keys(data.versions);
    cache = { versions, fetchedAt: Date.now() };
    return versions;
}

router.get("/", async (_req: Request, res: Response) => {
    try {
        const versions = await fetchCompositionVersions();
        res.json({ versions });
    } catch (e) {
        res.status(502).json({
            error: `Failed to fetch versions from npm registry: ${e instanceof Error ? e.message : String(e)}`,
        });
    }
});

export default router;
