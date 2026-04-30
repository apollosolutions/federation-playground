# Federation Composition Playground

A small full-stack web app for editing federated subgraph schemas, running Apollo Federation composition, inspecting the composed supergraph SDL, and generating query plans for operations against that supergraph. Use **Export** to share a single JSON file with support so they can **Import** the same subgraphs, federation version label, and operation to reproduce composition or query-plan issues locally.

**The code in this repository is experimental and has been provided for reference purposes only.** Community feedback is welcome but this project may not be supported in the same way that repositories in the official [Apollo GraphQL GitHub organization](https://github.com/apollographql) are. If you need help you can file an issue on this repository, [contact Apollo](https://www.apollographql.com/contact-sales) to talk to an expert, or create a ticket directly in Apollo Studio.

Optional: add a UI screenshot at `docs/playground-screenshot.png` and reference it here for README polish.

## Features

- Tabbed **subgraph** editors (name, routing URL, GraphQL schema) with a default products + reviews example
- **Federation version** free-text field with optional datalist hints (same strings you would use in `supergraph.yaml` / Rover; stored in exports; see limitations below)
- **Compose** calls `@apollo/composition` and shows supergraph SDL, composition errors, or hints
- **Query plan** runs `@apollo/query-planner` against the last successful supergraph and the editable operation
- **Import / Export** of playground state as JSON for bug reports and support handoff
- Draggable split panes for layout

## Installation

Requirements: Node.js 20+ (22 recommended) and npm.

```bash
npm install
```

## Testing

```bash
npm test
```

Includes a regression that builds an intentionally incompatible pair of subgraphs, serializes them through the same **export → import** JSON path the UI uses, and asserts **composition still fails** before and after the round-trip (useful for support repros).

## Usage

### Development

Runs the API on [http://localhost:4000](http://localhost:4000) and the Vite dev server on [http://localhost:5173](http://localhost:5173) with `/api` proxied to the backend.

```bash
npm run dev
```

Open the UI at `http://localhost:5173`.

### Production (local)

Builds the frontend into `backend/public` and compiles the server.

```bash
npm run build
npm start
```

Then open [http://localhost:4000](http://localhost:4000).

### Docker

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000).

## API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/compose` | Body: `{ federationVersion?, subgraphs: [{ name, url, schema }] }` |
| `POST` | `/api/query-plan` | Body: `{ supergraphSdl, operation, operationName? }` |
| `POST` | `/api/compose-and-plan` | Body: `{ federationVersion?, subgraphs, operation?, operationName? }` — compose + plan in one call |
| `POST` | `/api/import` | Body: export JSON (v1.0); add `?compose=true` to auto-compose |
| `GET` | `/api/federation-versions` | Lists available `@apollo/composition` versions from npm |
| `GET` | `/api/federation-patterns` | Lists known federation error patterns from the knowledge base |
| `GET` | `/api/federation-patterns/:id` | Full detail for a pattern (markdown body, examples, fix guidance) |
| `GET` | `/api/openapi.json` | OpenAPI 3.1 spec (JSON) |
| `GET` | `/api/openapi.yaml` | OpenAPI 3.1 spec (YAML) |
| `GET` | `/health` | Liveness |

All responses include a `metadata` field: `{ timestamp, durationMs, compositionVersion }`. Composition errors include a `code` field (e.g. `FIELD_TYPE_MISMATCH`) and a `docsUrl` linking to the [federation error reference](https://www.apollographql.com/docs/graphos/schema-design/federated-schemas/reference/errors). When errors match a known pattern, the response also includes `agentDiagnostics[]` — see the [Federation error patterns](#federation-error-patterns) section below.

## Federation error patterns

Known federation composition and query planning error patterns are documented in `backend/src/knowledge/patterns/`. Each pattern is a markdown file with YAML frontmatter (`id`, `codes`, `summary`, `suggestion`) and a free-form body for root cause analysis, reproduction schemas, and version notes.

**To add a new pattern:** drop a `.md` file in `backend/src/knowledge/patterns/` with the required frontmatter. No code changes needed — the server loads patterns at startup automatically.

Patterns are accessible at:
- `GET /api/federation-patterns` — list all (id, summary, suggestion)
- `GET /api/federation-patterns/:id` — full detail with markdown body
- MCP resource `federation-pattern://list` — all summaries
- MCP resource `federation-pattern://{id}` — full detail

When composition fails and errors match a known pattern, the response includes `agentDiagnostics[]`:

```json
{
  "success": false,
  "errors": [...],
  "agentDiagnostics": [
    {
      "pattern": "EXTERNAL_KEY_WITH_REQUIRES",
      "summary": "A subgraph marks its @key field as @external AND uses @requires...",
      "suggestion": "Remove @external from the @key field..."
    }
  ]
}
```

Fetch `GET /api/federation-patterns/{pattern}` for the full entry with examples.

## Agent API

The playground is designed to be used programmatically by AI agents investigating federation support tickets.

### Typical agent workflow

```
Agent reads support ticket with attached export JSON
  -> POST /api/import?compose=true          (load + compose in one call)
  -> Inspect errors[].code and agentDiagnostics[].pattern for diagnosis
  -> GET /api/federation-patterns/{pattern} (full fix guidance + examples)
  -> POST /api/compose-and-plan             (iterate with modified schemas + operation)
  -> Compare query plans across schema variations
  -> Report findings back to ticket
```

### Import from a support ticket

```bash
curl -X POST http://localhost:4000/api/import?compose=true \
  -H "Content-Type: application/json" \
  -d @customer-export.json
```

### Compose and plan in one call

```bash
curl -X POST http://localhost:4000/api/compose-and-plan \
  -H "Content-Type: application/json" \
  -d '{
    "subgraphs": [
      { "name": "products", "schema": "..." },
      { "name": "reviews", "schema": "..." }
    ],
    "operation": "query { products { id reviews { id } } }"
  }'
```

## MCP Server

The playground exposes an [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server so AI agents can use it as a tool without writing HTTP client code.

### Tools

| Tool | Description |
|------|-------------|
| `compose` | Compose subgraph schemas. Returns supergraphSdl or errors with error codes + `agentDiagnostics`. |
| `query_plan` | Generate a query plan from supergraphSdl + operation. |
| `compose_and_plan` | Compose + plan in one step. Most common tool for investigations. |
| `import_and_analyze` | Import a Playground export JSON string, compose, and plan automatically. |
| `list_federation_versions` | List available `@apollo/composition` versions from npm. |

### Resources

| Resource URI | Description |
|-------------|-------------|
| `federation-pattern://list` | All known federation error pattern summaries (JSON) |
| `federation-pattern://{id}` | Full pattern detail with markdown body, examples, and fix guidance |

### stdio mode (local agents — Cursor, Claude Desktop)

After building (`npm run build`):

```bash
npm run mcp:stdio -w backend
```

For development (no build needed):

```bash
npm run mcp:stdio:dev -w backend
```

#### Cursor configuration

Add to `.cursor/mcp.json` in your project (or `~/.cursor/mcp.json` globally):

```json
{
  "mcpServers": {
    "federation-playground": {
      "command": "node",
      "args": ["backend/dist/mcp/stdio.js"],
      "cwd": "/path/to/federation-playground"
    }
  }
}
```

#### Claude Desktop configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "federation-playground": {
      "command": "node",
      "args": ["/path/to/federation-playground/backend/dist/mcp/stdio.js"]
    }
  }
}
```

### HTTP/Streamable HTTP mode (remote agents)

When the playground server is running (`npm run dev` or `npm start`), agents can connect via HTTP at:

```
POST http://localhost:4000/mcp
GET  http://localhost:4000/mcp
```

This uses the [MCP Streamable HTTP transport](https://modelcontextprotocol.io/docs/concepts/transports).

## Export file format

Version `1.0` JSON includes `federationVersion`, `subgraphs` (name, url, schema), and `operation`. This matches what you need to reproduce issues outside the UI (for example with [Rover `supergraph compose`](https://www.apollographql.com/docs/rover/commands/supergraphs#composing-a-supergraph-schema) once you map subgraphs to files or config).

## Known limitations

- **Federation version in the UI** is included in exports for documentation; **composition and query planning use the `@apollo/composition` / `@apollo/query-planner` versions pinned in** [backend/package.json](backend/package.json), not multiple historical composition binaries like Rover’s `--federation-version`.
- **`@apollo/query-planner` is an internal-style API** and may change between releases; this app pins versions accordingly.
- **Apollo Federation 2 composition** is subject to the [Elastic License v2](https://www.apollographql.com/docs/resources/elastic-license-v2-faq/) for the Apollo composition and query planner packages.

## Notes

- Local supergraph development with the router is documented in [Rover `dev`](https://www.apollographql.com/docs/rover/commands/dev).
- For inspiration on performance-oriented router testing, see community examples such as [router-performance-test](https://github.com/apollosolutions/router-performance-test) (repository availability may vary).
