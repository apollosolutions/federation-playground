import type { Request, Response } from "express";
import { Router } from "express";
import { composeSubgraphs, type SubgraphInput } from "../services/composition.js";

const router = Router();

router.post("/", (req: Request, res: Response) => {
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

    const result = composeSubgraphs(body.subgraphs);
    res.status(result.success ? 200 : 422).json({
        ...result,
        federationVersion: body.federationVersion,
    });
});

export default router;
