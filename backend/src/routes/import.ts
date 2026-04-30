import type { Request, Response } from "express";
import { Router } from "express";
import type { PlaygroundExportV1, SubgraphInput } from "../types.js";
import { composeSubgraphs } from "../services/composition.js";
import { ensureComposition, resolveVersion } from "../services/compositionManager.js";
import { fetchCompositionVersions } from "./federationVersions.js";
import { makeMetadata } from "../services/metadata.js";

const router = Router();

function validateExport(body: unknown): { ok: true; data: PlaygroundExportV1 } | { ok: false; message: string } {
    if (!body || typeof body !== "object") {
        return { ok: false, message: "Request body must be a JSON object" };
    }
    const o = body as Record<string, unknown>;
    if (o.version !== "1.0") {
        return { ok: false, message: `Unsupported export version: ${String(o.version)}. Expected "1.0"` };
    }
    if (!Array.isArray(o.subgraphs)) {
        return { ok: false, message: "Invalid export: subgraphs must be an array" };
    }
    for (let i = 0; i < o.subgraphs.length; i++) {
        const s = o.subgraphs[i] as Record<string, unknown>;
        if (!s || typeof s.name !== "string" || typeof s.schema !== "string") {
            return { ok: false, message: `Subgraph at index ${i} must have name (string) and schema (string)` };
        }
    }
    return { ok: true, data: o as unknown as PlaygroundExportV1 };
}

router.post("/", async (req: Request, res: Response) => {
    const startMs = performance.now();
    const validation = validateExport(req.body);

    if (!validation.ok) {
        res.status(400).json({ valid: false, errors: [{ message: validation.message }] });
        return;
    }

    const { data } = validation;
    const federationVersion =
        typeof data.federationVersion === "string" ? data.federationVersion : "2";
    const operation = typeof data.operation === "string" ? data.operation : "";
    const subgraphs: SubgraphInput[] = data.subgraphs.map((s) => ({
        name: s.name,
        url: typeof s.url === "string" ? s.url : `http://${s.name}/graphql`,
        schema: s.schema,
    }));

    const autoCompose = req.query["compose"] === "true";

    if (!autoCompose) {
        res.json({
            valid: true,
            federationVersion,
            subgraphs,
            operation,
        });
        return;
    }

    // Auto-compose
    let exactVersion: string;
    try {
        const availableVersions = await fetchCompositionVersions();
        exactVersion = resolveVersion(federationVersion, availableVersions);
    } catch (e) {
        res.status(400).json({
            valid: false,
            errors: [{ message: e instanceof Error ? e.message : String(e) }],
        });
        return;
    }

    let composeServicesFn;
    try {
        composeServicesFn = await ensureComposition(exactVersion);
    } catch (e) {
        res.status(502).json({
            valid: false,
            errors: [{ message: `Failed to load @apollo/composition@${exactVersion}: ${e instanceof Error ? e.message : String(e)}` }],
        });
        return;
    }

    const composeResult = await composeSubgraphs(subgraphs, composeServicesFn);
    const metadata = makeMetadata(startMs);

    res.status(composeResult.success ? 200 : 422).json({
        valid: true,
        federationVersion: exactVersion,
        subgraphs,
        operation,
        composeResult: { ...composeResult, metadata },
    });
});

export default router;
