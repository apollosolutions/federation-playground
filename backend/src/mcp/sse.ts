/**
 * MCP server HTTP/Streamable HTTP transport middleware for Express.
 * Mounted at /mcp in the main Express app.
 *
 * Supports both stateless and stateful (session-based) MCP connections.
 * Uses the Streamable HTTP transport from MCP SDK 1.x which is the
 * recommended transport for HTTP servers.
 */
import { randomUUID } from "node:crypto";
import type { Router } from "express";
import { Router as createRouter } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./server.js";

const MCP_TOOLS = [
    {
        name: "compose",
        title: "Compose federated subgraph schemas",
        description:
            "Compose federated subgraph schemas into a supergraph. Returns supergraphSdl on success, " +
            "or errors with federation error codes and documentation links on failure.",
        inputSchema: {
            type: "object",
            required: ["subgraphs"],
            properties: {
                federationVersion: {
                    type: "string",
                    description: 'Version specifier: "2" for latest stable, "=X.Y.Z" to pin exact',
                },
                subgraphs: {
                    type: "array",
                    items: {
                        type: "object",
                        required: ["name", "schema"],
                        properties: {
                            name: { type: "string" },
                            url: { type: "string" },
                            schema: { type: "string" },
                        },
                    },
                },
            },
        },
    },
    {
        name: "query_plan",
        title: "Generate a query plan for a GraphQL operation",
        description:
            "Generate a query plan for a GraphQL operation against a composed supergraph. " +
            "Requires supergraphSdl from a prior successful compose call.",
        inputSchema: {
            type: "object",
            required: ["supergraphSdl", "operation"],
            properties: {
                supergraphSdl: { type: "string" },
                operation: { type: "string" },
                operationName: { type: "string" },
            },
        },
    },
    {
        name: "compose_and_plan",
        title: "Compose subgraphs and generate a query plan in one step",
        description:
            "Compose federated subgraph schemas and generate a query plan in one step. " +
            "Most common tool for investigating federation issues. " +
            "If composition fails, queryPlanResult is null.",
        inputSchema: {
            type: "object",
            required: ["subgraphs"],
            properties: {
                federationVersion: { type: "string" },
                subgraphs: { type: "array", items: { type: "object" } },
                operation: { type: "string", description: "Optional; if omitted only composition runs" },
                operationName: { type: "string" },
            },
        },
    },
    {
        name: "import_and_analyze",
        title: "Import a Federation Playground export and analyze it",
        description:
            "Import a Federation Playground export JSON (from a support ticket) and automatically " +
            "compose the subgraphs and generate a query plan if an operation is present. " +
            "Fastest way to reproduce a customer-reported federation issue.",
        inputSchema: {
            type: "object",
            required: ["exportJson"],
            properties: {
                exportJson: {
                    type: "string",
                    description: "JSON string of the Federation Playground export (version 1.0 format)",
                },
            },
        },
    },
    {
        name: "list_federation_versions",
        title: "List available federation composition versions",
        description:
            "List available @apollo/composition versions from npm. " +
            "Use to check if a specific version exists before requesting composition with that version.",
        inputSchema: { type: "object", properties: {} },
    },
];

export function createMcpRouter(): Router {
    const router = createRouter();

    router.get("/tools", (_req, res) => {
        res.json({ tools: MCP_TOOLS });
    });

    // Each POST to /mcp creates a fresh stateless transport connection.
    // Agents that need persistent sessions should use stdio mode instead.
    router.post("/", async (req, res) => {
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
        });

        res.on("close", () => {
            void transport.close();
        });

        try {
            const server = createMcpServer();
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
        } catch (err) {
            if (!res.headersSent) {
                res.status(500).json({
                    jsonrpc: "2.0",
                    error: { code: -32603, message: err instanceof Error ? err.message : String(err) },
                    id: null,
                });
            }
        }
    });

    // SSE endpoint for clients that prefer streaming GET connections
    router.get("/", async (req, res) => {
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined, // stateless
        });

        res.on("close", () => {
            void transport.close();
        });

        try {
            const server = createMcpServer();
            await server.connect(transport);
            await transport.handleRequest(req, res);
        } catch (err) {
            if (!res.headersSent) {
                res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
            }
        }
    });

    return router;
}
