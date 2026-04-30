import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const specPath = join(__dirname, "../openapi.yaml");
const specYaml = readFileSync(specPath, "utf-8");
const specJson = yaml.load(specYaml) as object;

const REDOC_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Federation Playground API Docs</title>
  <style>body { margin: 0; }</style>
</head>
<body>
  <redoc spec-url="/api/openapi.json"
         hide-download-button
         expand-responses="200,422"
         theme='{"colors":{"primary":{"main":"#3b82f6"}},"typography":{"fontFamily":"ui-sans-serif,system-ui,sans-serif"}}'
  ></redoc>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>`;

const router = Router();

router.get("/docs", (_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(REDOC_HTML);
});

router.get("/openapi.yaml", (_req, res) => {
    res.setHeader("Content-Type", "application/yaml");
    res.send(specYaml);
});

router.get("/openapi.json", (_req, res) => {
    res.json(specJson);
});

export default router;
