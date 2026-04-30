import { Router } from "express";
import { getAllPatterns, getPattern } from "../knowledge/index.js";

const router = Router();

router.get("/", (_req, res) => {
    const patterns = getAllPatterns().map(({ id, codes, summary, suggestion, affectedVersions, docsUrl }) => ({
        id,
        codes,
        summary,
        suggestion,
        ...(affectedVersions ? { affectedVersions } : {}),
        ...(docsUrl ? { docsUrl } : {}),
    }));
    res.json({ patterns });
});

router.get("/:id", (req, res) => {
    const pattern = getPattern(req.params.id.toUpperCase());
    if (!pattern) {
        res.status(404).json({ error: `Pattern "${req.params.id}" not found` });
        return;
    }
    res.json(pattern);
});

export default router;
