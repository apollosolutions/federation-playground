---
name: federation-playground-support-tickets
description: >-
  Reproduce Apollo Federation composition and query planning from support tickets
  using the Federation Composition Playground API/MCP. Use when analyzing tickets
  about federation composition errors, query planner behavior, or when the customer
  attaches a playground export JSON; when drafting replies with reproduction steps
  for customers or internal support.
---

# Federation Playground · Support Ticket Reproduction

Use the **Federation Composition Playground** to reproduce customer issues without running a full router/subgraph stack.

**Production:** https://federation-playground.fly.dev/

## MCP (preferred when configured)

Streamable HTTP MCP — no local checkout required:

```json
{
  "mcpServers": {
    "federation-playground": {
      "url": "https://federation-playground.fly.dev/mcp"
    }
  }
}
```

For Cursor hosts that only support `command`-based MCP, document REST fallback (below) or stdio from this repo’s backend (`npm run mcp:stdio -w backend` after build).

### MCP tools

| Tool | When to use |
|------|-------------|
| `import_and_analyze` | **Start here** if the ticket has a full UI export JSON. Pass the export as a **string** (`JSON.stringify` if you have an object). |
| `compose_and_plan` | One round-trip: compose + query plan. Prefer over separate `compose` + `query_plan`. |
| `compose` | Composition only. |
| `query_plan` | After a successful compose, if you already have `supergraphSdl` and only need a new operation planned. |
| `list_federation_versions` | Verify a pinned `@apollo/composition` version exists. |

**MCP resources:** `federation-pattern://list` and `federation-pattern://{id}` for the error-pattern knowledge base (same data as `GET /api/federation-patterns`).

## REST (no MCP)

- Base URL: `https://federation-playground.fly.dev`
- `POST /api/import?compose=true` — body = playground export JSON (object)
- `POST /api/compose-and-plan` — subgraphs + optional `operation` / `operationName`
- `GET /api/federation-patterns` / `GET /api/federation-patterns/{id}` — pattern KB
- `GET /mcp/tools` — JSON manifest of MCP tools (discovery without JSON-RPC)
- OpenAPI: `GET /api/openapi.json`

## Customer export format (v1.0)

Exports come from the playground **Export** button. Shape:

- `version`: `"1.0"`
- `federationVersion`: e.g. `"2"` (latest stable 2.x) or pinned semver
- `subgraphs`: `[{ name, url?, schema }]`
- `operation`: GraphQL document string (may be empty)

## Workflow for ticket analysis

1. Extract export JSON from the ticket (attachment or pasted).
2. Run **`import_and_analyze`** (MCP) or **`POST /api/import?compose=true`** with the JSON body.
3. **If composition succeeds:** report `hints`, `supergraphSdl` snippet if useful, and **`formattedPlan`** / `queryPlan` when an operation was present. Compare to the customer’s described runtime behavior.
4. **If composition fails:**
   - Read `errors[].code` and `errors[].docsUrl`.
   - Use **`agentDiagnostics[]`** (`pattern`, `summary`, `suggestion`) when present.
   - Fetch full pattern detail: MCP resource `federation-pattern://{pattern}` or **`GET /api/federation-patterns/{pattern}`**. If unavailable, rely on `agentDiagnostics` only.
5. Iterate with **`compose_and_plan`** after minimal schema edits to confirm a fix.
6. **Reply template:** short diagnosis, federation version used (from response `federationVersion` / `metadata.compositionVersion`), link to https://federation-playground.fly.dev/, and either the original export or a redacted minimal subgraph set + operation so others can re-import.

## Agent pitfalls (from API docs)

- **Federation version:** `"2"` = latest stable 2.x; bare semver like `2.13.3` works (no `=` required).
- **Query root:** server may inject a dummy `Query` field if no subgraph defines `Query`; minimal reproductions need not add fake queries unless testing that path.
- **`import_and_analyze`:** argument is a **JSON string**, not a nested JSON object.

## Files and artifacts to cite back

- Playground export JSON (or minimal equivalent subgraphs + operation).
- Resolved **`federationVersion`** and **`metadata.compositionVersion`** from API responses.
- On failure: **`errors`**, **`agentDiagnostics`**, and optional pattern **`body`** markdown from the patterns API.
