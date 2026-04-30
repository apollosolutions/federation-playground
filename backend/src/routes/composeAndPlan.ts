import type { Request, Response } from "express";
import { Router } from "express";
import type { SubgraphInput } from "../types.js";
import { composeSubgraphs } from "../services/composition.js";
import { ensureComposition, resolveVersion } from "../services/compositionManager.js";
import { generateQueryPlan } from "../services/queryPlanner.js";
import { fetchCompositionVersions } from "./federationVersions.js";
import { makeMetadata } from "../services/metadata.js";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
    const startMs = performance.now();
    const body = req.body as {
        federationVersion?: string;
        subgraphs?: SubgraphInput[];
        operation?: string;
        operationName?: string | null;
    };

    if (!body.subgraphs || !Array.isArray(body.subgraphs)) {
        res.status(400).json({
            success: false,
            errors: [{ message: "Request body must include a subgraphs array" }],
        });
        return;
    }

    for (const sg of body.subgraphs) {
        if (!sg?.name || typeof sg.schema !== "string") {
            res.status(400).json({
                success: false,
                errors: [{ message: "Each subgraph must have name and schema (string)" }],
            });
            return;
        }
        if (sg.url === undefined || sg.url === null) {
            sg.url = `http://${sg.name}/graphql`;
        }
    }

    let exactVersion: string;
    try {
        const availableVersions = await fetchCompositionVersions();
        exactVersion = resolveVersion(body.federationVersion ?? "2", availableVersions);
    } catch (e) {
        res.status(400).json({
            success: false,
            errors: [{ message: e instanceof Error ? e.message : String(e) }],
        });
        return;
    }

    let composeServicesFn;
    try {
        composeServicesFn = await ensureComposition(exactVersion);
    } catch (e) {
        res.status(502).json({
            success: false,
            errors: [{ message: `Failed to load @apollo/composition@${exactVersion}: ${e instanceof Error ? e.message : String(e)}` }],
        });
        return;
    }

    const composeResult = await composeSubgraphs(body.subgraphs, composeServicesFn);

    if (!composeResult.success) {
        res.status(422).json({
            federationVersion: exactVersion,
            composeResult,
            queryPlanResult: null,
            metadata: makeMetadata(startMs),
        });
        return;
    }

    // Only attempt query planning if operation is provided
    const operation = typeof body.operation === "string" ? body.operation.trim() : "";
    const queryPlanResult = operation
        ? generateQueryPlan(composeResult.supergraphSdl, operation, body.operationName)
        : null;

    const metadata = makeMetadata(startMs);

    res.status(queryPlanResult && !queryPlanResult.success ? 422 : 200).json({
        federationVersion: exactVersion,
        composeResult,
        queryPlanResult,
        metadata,
    });
});

export default router;
