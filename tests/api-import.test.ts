/**
 * Tests for the server-side import validation and auto-compose logic.
 */
import { composeServices } from "@apollo/composition";
import { describe, expect, it } from "vitest";
import { composeSubgraphs } from "../backend/src/services/composition";
import type { ComposeServicesFn } from "../backend/src/services/compositionManager";
import type { PlaygroundExportV1 } from "../backend/src/types";

// Replicate the server-side validation logic directly (no HTTP layer needed)
function validateExport(body: unknown): { ok: true; data: PlaygroundExportV1 } | { ok: false; message: string } {
    if (!body || typeof body !== "object") {
        return { ok: false, message: "Request body must be a JSON object" };
    }
    const o = body as Record<string, unknown>;
    if (o.version !== "1.0") {
        return { ok: false, message: `Unsupported export version: ${String(o.version)}. Expected "1.0"` };
    }
    if (!Array.isArray(o.subgraphs)) {
        return { ok: false, message: "Invalid export: subgraphs must be an array" };
    }
    for (let i = 0; i < o.subgraphs.length; i++) {
        const s = o.subgraphs[i] as Record<string, unknown>;
        if (!s || typeof s.name !== "string" || typeof s.schema !== "string") {
            return { ok: false, message: `Subgraph at index ${i} must have name (string) and schema (string)` };
        }
    }
    return { ok: true, data: o as unknown as PlaygroundExportV1 };
}

const composeServicesFn = composeServices as unknown as ComposeServicesFn;

const FED_LINK =
    'extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])';

const VALID_EXPORT: PlaygroundExportV1 = {
    version: "1.0",
    exportNote: "test",
    exportedAt: new Date().toISOString(),
    federationVersion: "=2.13.3",
    subgraphs: [
        {
            name: "products",
            url: "http://products/graphql",
            schema: `${FED_LINK}\ntype Query { products: [Product!]! }\ntype Product @key(fields: "id") { id: ID! name: String! }`,
        },
    ],
    operation: "query { products { id name } }",
};

describe("import validation", () => {
    it("accepts a valid v1.0 export", () => {
        const result = validateExport(VALID_EXPORT);
        expect(result.ok).toBe(true);
    });

    it("rejects non-1.0 version", () => {
        const result = validateExport({ ...VALID_EXPORT, version: "2.0" });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.message).toContain("Unsupported export version");
    });

    it("rejects missing subgraphs array", () => {
        const result = validateExport({ version: "1.0", subgraphs: null, operation: "" });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.message).toContain("subgraphs must be an array");
    });

    it("rejects subgraph missing name", () => {
        const bad = { version: "1.0", subgraphs: [{ schema: "type Query { x: String }" }], operation: "" };
        const result = validateExport(bad);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.message).toContain("name (string)");
    });

    it("rejects non-object body", () => {
        expect(validateExport(null).ok).toBe(false);
        expect(validateExport("string").ok).toBe(false);
        expect(validateExport(42).ok).toBe(false);
    });

    it("auto-compose path: valid export composes successfully", async () => {
        // Simulate ?compose=true path
        const validation = validateExport(VALID_EXPORT);
        expect(validation.ok).toBe(true);
        if (!validation.ok) return;

        const { data } = validation;
        const subgraphs = data.subgraphs.map((s) => ({
            name: s.name,
            url: s.url ?? `http://${s.name}/graphql`,
            schema: s.schema,
        }));

        const composeResult = await composeSubgraphs(subgraphs, composeServicesFn);
        expect(composeResult.success).toBe(true);
        if (composeResult.success) {
            expect(composeResult.supergraphSdl).toContain("@join__graph");
        }
    });

    it("auto-compose path: bad schemas return compose errors with codes", async () => {
        const badExport: PlaygroundExportV1 = {
            version: "1.0",
            federationVersion: "=2.13.3",
            operation: "",
            subgraphs: [
                {
                    name: "a",
                    schema: `${FED_LINK}\ntype Query { x: Product }\ntype Product @key(fields: "id") { id: ID! value: String! }`,
                },
                {
                    name: "b",
                    schema: `${FED_LINK}\ntype Product @key(fields: "id") { id: ID! value: Int! }`,
                },
            ],
        };

        const validation = validateExport(badExport);
        expect(validation.ok).toBe(true);
        if (!validation.ok) return;

        const subgraphs = validation.data.subgraphs.map((s) => ({
            name: s.name,
            url: `http://${s.name}/graphql`,
            schema: s.schema,
        }));

        const composeResult = await composeSubgraphs(subgraphs, composeServicesFn);
        expect(composeResult.success).toBe(false);
        if (!composeResult.success) {
            expect(composeResult.errors.length).toBeGreaterThan(0);
            const withCode = composeResult.errors.filter((e) => e.code);
            expect(withCode.length).toBeGreaterThan(0);
            expect(withCode[0].docsUrl).toContain("apollographql.com");
        }
    });
});
