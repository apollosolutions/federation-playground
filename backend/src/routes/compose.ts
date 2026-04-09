import type { Request, Response } from "express";
import { Router } from "express";
import { composeSubgraphs, type SubgraphInput } from "../services/composition.js";
import { ensureComposition, resolveVersion } from "../services/compositionManager.js";
import { fetchCompositionVersions } from "./federationVersions.js";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
    const body = req.body as {
        federationVersion?: string;
        subgraphs?: SubgraphInput[];
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
            errors: [
                {
                    message: `Failed to load @apollo/composition@${exactVersion}: ${e instanceof Error ? e.message : String(e)}`,
                },
            ],
        });
        return;
    }

    const result = await composeSubgraphs(body.subgraphs, composeServicesFn);
    res.status(result.success ? 200 : 422).json({
        ...result,
        federationVersion: exactVersion,
    });
});

export default router;
