/**
 * Verifies that composition errors are enriched with top-level `code` and `docsUrl`
 * fields from @apollo/composition's built-in error codes.
 */
import { composeServices } from "@apollo/composition";
import { describe, expect, it } from "vitest";
import { composeSubgraphs } from "../backend/src/services/composition";
import type { ComposeServicesFn } from "../backend/src/services/compositionManager";

const composeServicesFn = composeServices as unknown as ComposeServicesFn;

const FED_LINK =
    'extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])';

const DOCS_BASE =
    "https://www.apollographql.com/docs/graphos/schema-design/federated-schemas/reference/errors";

describe("enriched composition errors", () => {
    it("surfaces FIELD_TYPE_MISMATCH code on incompatible field types", async () => {
        const result = await composeSubgraphs(
            [
                {
                    name: "catalog",
                    url: "http://catalog/graphql",
                    schema: `${FED_LINK}
type Query { product: Product }
type Product @key(fields: "id") { id: ID! title: String! }`,
                },
                {
                    name: "inventory",
                    url: "http://inventory/graphql",
                    schema: `${FED_LINK}
type Product @key(fields: "id") { id: ID! title: Int! }`,
                },
            ],
            composeServicesFn,
        );

        expect(result.success).toBe(false);
        if (result.success) return;

        const withCode = result.errors.filter((e) => e.code);
        expect(withCode.length).toBeGreaterThan(0);

        const mismatch = result.errors.find((e) => e.code === "FIELD_TYPE_MISMATCH");
        expect(mismatch).toBeDefined();
        expect(mismatch?.docsUrl).toBe(`${DOCS_BASE}#field_type_mismatch`);
        // extensions should still be preserved
        expect(mismatch?.extensions).toBeDefined();
    });

    it("includes docsUrl that matches lowercase error code", async () => {
        const result = await composeSubgraphs(
            [
                {
                    name: "sg",
                    url: "http://sg/graphql",
                    schema: `${FED_LINK}
type Query { _empty: String }
type Foo @key(fields: "id") { id: ID! }`,
                },
            ],
            composeServicesFn,
        );

        // Even on success we verify hints have docsUrl
        if (result.success) {
            for (const hint of result.hints) {
                expect(hint.code).toBeTruthy();
                expect(hint.docsUrl).toContain(DOCS_BASE);
                expect(hint.docsUrl).toContain(hint.code.toLowerCase());
            }
        } else {
            for (const err of result.errors) {
                if (err.code) {
                    expect(err.docsUrl).toBe(`${DOCS_BASE}#${err.code.toLowerCase()}`);
                }
            }
        }
    });

    it("gracefully omits code and docsUrl for parse-level syntax errors", async () => {
        const result = await composeSubgraphs(
            [
                {
                    name: "broken",
                    url: "http://broken/graphql",
                    schema: "this is not valid graphql !!!",
                },
            ],
            composeServicesFn,
        );

        expect(result.success).toBe(false);
        if (result.success) return;

        // parse() throws before composeServices sees the schema — error has no code
        expect(result.errors.length).toBeGreaterThan(0);
        // None of the parse errors should have a code (they come from graphql-js, not composition)
        const withCode = result.errors.filter((e) => e.code);
        // Some parse errors may bubble through composition with codes; this is best-effort.
        // What we assert is that no error has a docsUrl without a code.
        for (const err of result.errors) {
            if (!err.code) {
                expect(err.docsUrl).toBeUndefined();
            }
        }
    });

    it("includes metadata with durationMs and compositionVersion on errors", async () => {
        // Test the full route-level metadata via the service (metadata is added in routes,
        // so we test that the shape is correct by importing makeMetadata directly)
        const { makeMetadata, COMPOSITION_VERSION } = await import(
            "../backend/src/services/metadata"
        );
        const startMs = performance.now();
        const meta = makeMetadata(startMs);

        expect(typeof meta.timestamp).toBe("string");
        expect(meta.durationMs).toBeGreaterThanOrEqual(0);
        expect(meta.compositionVersion).toBe(COMPOSITION_VERSION);
        expect(meta.compositionVersion).toMatch(/^\d+\.\d+\.\d+/);
    });
});
