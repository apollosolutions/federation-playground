import type { Request, Response } from "express";
import { Router } from "express";
import { generateQueryPlan } from "../services/queryPlanner.js";

const router = Router();

router.post("/", (req: Request, res: Response) => {
    const body = req.body as {
        supergraphSdl?: string;
        operation?: string;
        operationName?: string | null;
    };

    if (typeof body.supergraphSdl !== "string" || !body.supergraphSdl.trim()) {
        res.status(400).json({
            success: false,
            errors: [{ message: "supergraphSdl is required" }],
        });
        return;
    }

    if (typeof body.operation !== "string" || !body.operation.trim()) {
        res.status(400).json({
            success: false,
            errors: [{ message: "operation is required" }],
        });
        return;
    }

    const result = generateQueryPlan(
        body.supergraphSdl,
        body.operation,
        body.operationName,
    );

    res.status(result.success ? 200 : 422).json(result);
});

export default router;
