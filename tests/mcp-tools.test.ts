/**
 * In-process MCP server tests using InMemoryTransport + Client.
 * Tests that each tool is correctly registered and returns structured results.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it, beforeAll } from "vitest";
import { createMcpServer } from "../backend/src/mcp/server";

const FED_LINK =
    'extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])';

const PRODUCTS_SCHEMA = `${FED_LINK}
type Query { products: [Product!]! }
type Product @key(fields: "id") { id: ID! name: String! }`;

const REVIEWS_SCHEMA = `${FED_LINK}
type Query { reviews: [Review!]! }
type Review { id: ID! product: Product! }
type Product @key(fields: "id") { id: ID! reviews: [Review!]! }`;

const OPERATION = "query { products { id name reviews { id } } }";

let client: Client;

beforeAll(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: "test-client", version: "1.0" });

    const server = createMcpServer();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
});

describe("MCP tools list", () => {
    it("lists all 5 tools with descriptions", async () => {
        const { tools } = await client.listTools();
        const names = tools.map((t) => t.name);
        expect(names).toContain("compose");
        expect(names).toContain("query_plan");
        expect(names).toContain("compose_and_plan");
        expect(names).toContain("import_and_analyze");
        expect(names).toContain("list_federation_versions");
        expect(tools.length).toBeGreaterThanOrEqual(5);

        for (const tool of tools) {
            expect(tool.description?.length).toBeGreaterThan(10);
            expect(tool.inputSchema).toBeDefined();
        }
    });
});

describe("compose tool", () => {
    it("composes valid subgraphs successfully", async () => {
        const result = await client.callTool({
            name: "compose",
            arguments: {
                // Pin to the installed version so no npm install is triggered
                federationVersion: "=2.13.3",
                subgraphs: [
                    { name: "products", schema: PRODUCTS_SCHEMA },
                    { name: "reviews", schema: REVIEWS_SCHEMA },
                ],
            },
        });

        expect(result.isError).toBeFalsy();
        const text = (result.content as Array<{ type: string; text: string }>)[0].text;
        const data = JSON.parse(text) as Record<string, unknown>;
        expect(data.success).toBe(true);
        expect(typeof data.supergraphSdl).toBe("string");
        const metadata = data.metadata as Record<string, unknown>;
        expect(metadata?.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("returns isError true and error codes on composition failure", async () => {
        const result = await client.callTool({
            name: "compose",
            arguments: {
                federationVersion: "=2.13.3",
                subgraphs: [
                    {
                        name: "a",
                        schema: `${FED_LINK}\ntype Query { x: Foo }\ntype Foo @key(fields: "id") { id: ID! val: String! }`,
                    },
                    {
                        name: "b",
                        schema: `${FED_LINK}\ntype Foo @key(fields: "id") { id: ID! val: Int! }`,
                    },
                ],
            },
        });

        expect(result.isError).toBe(true);
        const text = (result.content as Array<{ type: string; text: string }>)[0].text;
        const data = JSON.parse(text) as { success: boolean; errors: Array<{ code?: string; docsUrl?: string }> };
        expect(data.success).toBe(false);
        const coded = data.errors.filter((e) => e.code);
        expect(coded.length).toBeGreaterThan(0);
        expect(coded[0].docsUrl).toContain("apollographql.com");
    });
});

describe("query_plan tool", () => {
    it("generates a query plan from supergraphSdl + operation", async () => {
        // First compose to get the supergraphSdl
        const composeResult = await client.callTool({
            name: "compose",
            arguments: {
                subgraphs: [
                    { name: "products", schema: PRODUCTS_SCHEMA },
                    { name: "reviews", schema: REVIEWS_SCHEMA },
                ],
            },
        });

        const composeText = (composeResult.content as Array<{ type: string; text: string }>)[0].text;
        const composeData = JSON.parse(composeText) as { supergraphSdl: string };

        const planResult = await client.callTool({
            name: "query_plan",
            arguments: {
                supergraphSdl: composeData.supergraphSdl,
                operation: OPERATION,
            },
        });

        expect(planResult.isError).toBeFalsy();
        const planText = (planResult.content as Array<{ type: string; text: string }>)[0].text;
        const planData = JSON.parse(planText) as { success: boolean; formattedPlan: string };
        expect(planData.success).toBe(true);
        expect(planData.formattedPlan).toContain("QueryPlan");
    });
});

describe("compose_and_plan tool", () => {
    it("composes and plans in one call", async () => {
        const result = await client.callTool({
            name: "compose_and_plan",
            arguments: {
                federationVersion: "=2.13.3",
                subgraphs: [
                    { name: "products", schema: PRODUCTS_SCHEMA },
                    { name: "reviews", schema: REVIEWS_SCHEMA },
                ],
                operation: OPERATION,
            },
        });

        expect(result.isError).toBeFalsy();
        const text = (result.content as Array<{ type: string; text: string }>)[0].text;
        const data = JSON.parse(text) as {
            composeResult: { success: boolean };
            queryPlanResult: { success: boolean; formattedPlan: string } | null;
        };
        expect(data.composeResult.success).toBe(true);
        expect(data.queryPlanResult).not.toBeNull();
        expect(data.queryPlanResult?.success).toBe(true);
        expect(data.queryPlanResult?.formattedPlan).toContain("QueryPlan");
    });

    it("returns null queryPlanResult when composition fails", async () => {
        const result = await client.callTool({
            name: "compose_and_plan",
            arguments: {
                federationVersion: "=2.13.3",
                subgraphs: [
                    {
                        name: "a",
                        schema: `${FED_LINK}\ntype Query { x: T }\ntype T @key(fields: "id") { id: ID! v: String! }`,
                    },
                    {
                        name: "b",
                        schema: `${FED_LINK}\ntype T @key(fields: "id") { id: ID! v: Int! }`,
                    },
                ],
                operation: "query { x { id } }",
            },
        });

        expect(result.isError).toBe(true);
        const text = (result.content as Array<{ type: string; text: string }>)[0].text;
        const data = JSON.parse(text) as { composeResult: { success: boolean }; queryPlanResult: null };
        expect(data.composeResult.success).toBe(false);
        expect(data.queryPlanResult).toBeNull();
    });

    it("returns only compose result when no operation provided", async () => {
        const result = await client.callTool({
            name: "compose_and_plan",
            arguments: {
                federationVersion: "=2.13.3",
                subgraphs: [{ name: "products", schema: PRODUCTS_SCHEMA }],
            },
        });

        expect(result.isError).toBeFalsy();
        const text = (result.content as Array<{ type: string; text: string }>)[0].text;
        const data = JSON.parse(text) as { composeResult: { success: boolean }; queryPlanResult: null };
        expect(data.composeResult.success).toBe(true);
        expect(data.queryPlanResult).toBeNull();
    });
});

describe("import_and_analyze tool", () => {
    it("imports a valid export JSON string and analyzes it", async () => {
        const exportJson = JSON.stringify({
            version: "1.0",
            federationVersion: "=2.13.3",
            subgraphs: [
                { name: "products", url: "http://products/graphql", schema: PRODUCTS_SCHEMA },
                { name: "reviews", url: "http://reviews/graphql", schema: REVIEWS_SCHEMA },
            ],
            operation: OPERATION,
        });

        const result = await client.callTool({
            name: "import_and_analyze",
            arguments: { exportJson },
        });

        expect(result.isError).toBeFalsy();
        const text = (result.content as Array<{ type: string; text: string }>)[0].text;
        const data = JSON.parse(text) as {
            valid: boolean;
            composeResult: { success: boolean };
            queryPlanResult: { success: boolean } | null;
        };
        expect(data.valid).toBe(true);
        expect(data.composeResult.success).toBe(true);
        expect(data.queryPlanResult?.success).toBe(true);
    });

    it("returns isError true for invalid JSON", async () => {
        const result = await client.callTool({
            name: "import_and_analyze",
            arguments: { exportJson: "not json" },
        });
        expect(result.isError).toBe(true);
        const text = (result.content as Array<{ type: string; text: string }>)[0].text;
        const data = JSON.parse(text) as { errors: Array<{ message: string }> };
        expect(data.errors[0].message).toContain("not valid JSON");
    });

    it("returns isError true for wrong version", async () => {
        const result = await client.callTool({
            name: "import_and_analyze",
            arguments: {
                exportJson: JSON.stringify({ version: "2.0", subgraphs: [], operation: "" }),
            },
        });
        expect(result.isError).toBe(true);
    });
});

describe("list_federation_versions tool", () => {
    it("returns a list of versions including the installed version", async () => {
        const result = await client.callTool({
            name: "list_federation_versions",
            arguments: {},
        });

        expect(result.isError).toBeFalsy();
        const text = (result.content as Array<{ type: string; text: string }>)[0].text;
        const data = JSON.parse(text) as { versions: string[]; installedVersion: string };
        expect(Array.isArray(data.versions)).toBe(true);
        expect(data.versions.length).toBeGreaterThan(0);
        expect(typeof data.installedVersion).toBe("string");
        expect(data.installedVersion).toMatch(/^\d+\.\d+\.\d+/);
    });
});
