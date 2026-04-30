import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import composeRouter from "./routes/compose.js";
import composeAndPlanRouter from "./routes/composeAndPlan.js";
import docsRouter from "./routes/docs.js";
import federationVersionsRouter from "./routes/federationVersions.js";
import importRouter from "./routes/import.js";
import queryPlanRouter from "./routes/queryPlan.js";
import { createMcpRouter } from "./mcp/sse.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use("/api/compose", composeRouter);
app.use("/api/compose-and-plan", composeAndPlanRouter);
app.use("/api/federation-versions", federationVersionsRouter);
app.use("/api/import", importRouter);
app.use("/api/query-plan", queryPlanRouter);
app.use("/api", docsRouter);
app.use("/mcp", createMcpRouter());

const staticDir = path.join(__dirname, "..", "public");
app.use(express.static(staticDir));

app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
        next();
        return;
    }
    const indexPath = path.join(staticDir, "index.html");
    res.sendFile(indexPath, (err) => {
        if (err) next();
    });
});

app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
});

app.listen(port, () => {
    console.log(`Federation playground API listening on http://localhost:${port}`);
});
