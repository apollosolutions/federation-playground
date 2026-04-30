import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";
import { composeSubgraphs } from "../services/composition.js";
import { ensureComposition, resolveVersion } from "../services/compositionManager.js";
import { generateQueryPlan } from "../services/queryPlanner.js";
import { fetchCompositionVersions } from "../routes/federationVersions.js";
import { makeMetadata, COMPOSITION_VERSION } from "../services/metadata.js";
import type { PlaygroundExportV1, SubgraphInput } from "../types.js";

const SubgraphSchema = z.object({
    name: z.string().describe("Subgraph name (must be unique)"),
    url: z.string().optional().describe("Routing URL (defaults to http://<name>/graphql)"),
    schema: z.string().describe("Full GraphQL SDL including federation @link directive"),
});

const FederationVersionSchema = z
    .string()
    .optional()
    .describe('Version specifier: "2" for latest stable, "=X.Y.Z" to pin exact (e.g. "=2.13.3")');

async function resolveCompositionVersion(federationVersion?: string) {
    const versions = await fetchCompositionVersions();
    return resolveVersion(federationVersion ?? "2", versions);
}

export function createMcpServer(): McpServer {
    const server = new McpServer(
        { name: "federation-playground", version: "1.0.0" },
        {
            instructions: `Federation Playground MCP server for Apollo Federation support investigations.

Use these tools to analyze federated GraphQL schemas, reproduce composition errors, and inspect query plans.

Typical workflow:
1. import_and_analyze — load a customer export JSON from a support ticket
2. compose_and_plan — check both composition and query planning in one call
3. Modify schemas and re-compose to iterate on fixes

Error codes in composition errors map to:
https://www.apollographql.com/docs/graphos/schema-design/federated-schemas/reference/errors`,
        },
    );

    // Tool: compose
    server.registerTool(
        "compose",
        {
            title: "Compose federated subgraph schemas",
            description:
                "Compose federated subgraph schemas into a supergraph. Returns supergraphSdl on success, " +
                "or errors with federation error codes and documentation links on failure. " +
                "Error codes: https://www.apollographql.com/docs/graphos/schema-design/federated-schemas/reference/errors",
            inputSchema: {
                federationVersion: FederationVersionSchema,
                subgraphs: z.array(SubgraphSchema).min(1).describe("Subgraph schemas to compose"),
            },
        },
        async ({ federationVersion, subgraphs }) => {
            const startMs = performance.now();
            const normalized = subgraphs.map((sg) => ({
                ...sg,
                url: sg.url ?? `http://${sg.name}/graphql`,
            })) as SubgraphInput[];

            let exactVersion: string;
            try {
                exactVersion = await resolveCompositionVersion(federationVersion);
            } catch (e) {
                return errorResult({ errors: [{ message: e instanceof Error ? e.message : String(e) }] });
            }

            const composeServicesFn = await ensureComposition(exactVersion);
            const result = await composeSubgraphs(normalized, composeServicesFn);
            const metadata = makeMetadata(startMs);
            return toResult({ ...result, federationVersion: exactVersion, metadata }, result.success);
        },
    );

    // Tool: query_plan
    server.registerTool(
        "query_plan",
        {
            title: "Generate a query plan for a GraphQL operation",
            description:
                "Generate a query plan for a GraphQL operation against a composed supergraph. " +
                "Requires supergraphSdl from a prior successful compose call. " +
                "Use compose_and_plan to do both in one call.",
            inputSchema: {
                supergraphSdl: z.string().describe("Composed supergraph SDL from a prior compose result"),
                operation: z.string().describe("GraphQL operation document to plan"),
                operationName: z
                    .string()
                    .optional()
                    .describe("Operation name (for documents with multiple operations)"),
            },
        },
        ({ supergraphSdl, operation, operationName }) => {
            const startMs = performance.now();
            const result = generateQueryPlan(supergraphSdl, operation, operationName);
            const metadata = makeMetadata(startMs);
            return toResult({ ...result, metadata }, result.success);
        },
    );

    // Tool: compose_and_plan
    server.registerTool(
        "compose_and_plan",
        {
            title: "Compose subgraphs and generate a query plan in one step",
            description:
                "Compose federated subgraph schemas and generate a query plan in one step. " +
                "Most common tool for investigating federation issues. " +
                "If composition fails, queryPlanResult is null. If no operation is provided, only composition runs.",
            inputSchema: {
                federationVersion: FederationVersionSchema,
                subgraphs: z.array(SubgraphSchema).min(1),
                operation: z
                    .string()
                    .optional()
                    .describe("GraphQL operation to plan (optional; if omitted, only composition runs)"),
                operationName: z.string().optional(),
            },
        },
        async ({ federationVersion, subgraphs, operation, operationName }) => {
            const startMs = performance.now();
            const normalized = subgraphs.map((sg) => ({
                ...sg,
                url: sg.url ?? `http://${sg.name}/graphql`,
            })) as SubgraphInput[];

            let exactVersion: string;
            try {
                exactVersion = await resolveCompositionVersion(federationVersion);
            } catch (e) {
                return errorResult({ errors: [{ message: e instanceof Error ? e.message : String(e) }] });
            }

            const composeServicesFn = await ensureComposition(exactVersion);
            const composeResult = await composeSubgraphs(normalized, composeServicesFn);

            if (!composeResult.success) {
                return toResult(
                    { federationVersion: exactVersion, composeResult, queryPlanResult: null, metadata: makeMetadata(startMs) },
                    false,
                );
            }

            const op = typeof operation === "string" ? operation.trim() : "";
            const queryPlanResult = op
                ? generateQueryPlan(composeResult.supergraphSdl, op, operationName)
                : null;

            const metadata = makeMetadata(startMs);
            const ok = queryPlanResult == null || queryPlanResult.success;
            return toResult({ federationVersion: exactVersion, composeResult, queryPlanResult, metadata }, ok);
        },
    );

    // Tool: import_and_analyze
    server.registerTool(
        "import_and_analyze",
        {
            title: "Import a Federation Playground export and analyze it",
            description:
                "Import a Federation Playground export JSON (from a support ticket) and automatically " +
                "compose the subgraphs and generate a query plan if an operation is present. " +
                "This is the fastest way to reproduce a customer-reported federation issue. " +
                "Pass the raw JSON string of the export file.",
            inputSchema: {
                exportJson: z
                    .string()
                    .describe("JSON string of the Federation Playground export (version 1.0 format)"),
            },
        },
        async ({ exportJson }) => {
            const startMs = performance.now();

            let parsed: unknown;
            try {
                parsed = JSON.parse(exportJson) as unknown;
            } catch {
                return errorResult({ errors: [{ message: "exportJson is not valid JSON" }] });
            }

            const o = parsed as Record<string, unknown>;
            if (o.version !== "1.0" || !Array.isArray(o.subgraphs)) {
                return errorResult({
                    errors: [{ message: 'Invalid export: version must be "1.0" and subgraphs must be an array' }],
                });
            }

            const data = parsed as PlaygroundExportV1;
            const federationVersion = typeof data.federationVersion === "string" ? data.federationVersion : "2";
            const operation = typeof data.operation === "string" ? data.operation : "";
            const subgraphs: SubgraphInput[] = data.subgraphs.map((s) => ({
                name: s.name,
                url: typeof s.url === "string" ? s.url : `http://${s.name}/graphql`,
                schema: s.schema,
            }));

            let exactVersion: string;
            try {
                exactVersion = await resolveCompositionVersion(federationVersion);
            } catch (e) {
                return errorResult({ errors: [{ message: e instanceof Error ? e.message : String(e) }] });
            }

            const composeServicesFn = await ensureComposition(exactVersion);
            const composeResult = await composeSubgraphs(subgraphs, composeServicesFn);

            const queryPlanResult =
                composeResult.success && operation.trim()
                    ? generateQueryPlan(composeResult.supergraphSdl, operation)
                    : null;

            const metadata = makeMetadata(startMs);
            const ok =
                composeResult.success &&
                (queryPlanResult == null || queryPlanResult.success);

            return toResult(
                { valid: true, federationVersion: exactVersion, subgraphs, operation, composeResult, queryPlanResult, metadata },
                ok,
            );
        },
    );

    // Tool: list_federation_versions
    server.registerTool(
        "list_federation_versions",
        {
            title: "List available federation composition versions",
            description:
                "List available @apollo/composition versions from npm. " +
                "Use to check if a specific version exists before requesting composition with that version. " +
                'Pass versions as "=X.Y.Z" in compose requests (e.g. "=2.9.0").',
            inputSchema: {},
        },
        async () => {
            const startMs = performance.now();
            try {
                const versions = await fetchCompositionVersions();
                const metadata = makeMetadata(startMs);
                return toResult({ versions, installedVersion: COMPOSITION_VERSION, metadata }, true);
            } catch (e) {
                return errorResult({ error: e instanceof Error ? e.message : String(e) });
            }
        },
    );

    return server;
}

function toResult(data: unknown, success: boolean) {
    return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        isError: !success,
    };
}

function errorResult(data: unknown) {
    return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        isError: true,
    };
}
