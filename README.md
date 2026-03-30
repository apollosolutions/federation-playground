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
| `GET` | `/health` | Liveness |

## Export file format

Version `1.0` JSON includes `federationVersion`, `subgraphs` (name, url, schema), and `operation`. This matches what you need to reproduce issues outside the UI (for example with [Rover `supergraph compose`](https://www.apollographql.com/docs/rover/commands/supergraphs#composing-a-supergraph-schema) once you map subgraphs to files or config).

## Known limitations

- **Federation version in the UI** is included in exports for documentation; **composition and query planning use the `@apollo/composition` / `@apollo/query-planner` versions pinned in** [backend/package.json](backend/package.json), not multiple historical composition binaries like Rover’s `--federation-version`.
- **`@apollo/query-planner` is an internal-style API** and may change between releases; this app pins versions accordingly.
- **Apollo Federation 2 composition** is subject to the [Elastic License v2](https://www.apollographql.com/docs/resources/elastic-license-v2-faq/) for the Apollo composition and query planner packages.

## Notes

- Local supergraph development with the router is documented in [Rover `dev`](https://www.apollographql.com/docs/rover/commands/dev).
- For inspiration on performance-oriented router testing, see community examples such as [router-performance-test](https://github.com/apollosolutions/router-performance-test) (repository availability may vary).
