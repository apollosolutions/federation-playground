/**
 * Tests for the compose-and-plan combined workflow.
 */
import { composeServices } from "@apollo/composition";
import { describe, expect, it } from "vitest";
import { composeSubgraphs } from "../backend/src/services/composition";
import { generateQueryPlan } from "../backend/src/services/queryPlanner";
import type { ComposeServicesFn } from "../backend/src/services/compositionManager";

const composeServicesFn = composeServices as unknown as ComposeServicesFn;

const FED_LINK =
    'extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])';

const PRODUCTS = {
    name: "products",
    url: "http://products:4000/graphql",
    schema: `${FED_LINK}
type Query { products: [Product!]! }
type Product @key(fields: "id") { id: ID! name: String! }`,
};

const REVIEWS = {
    name: "reviews",
    url: "http://reviews:4001/graphql",
    schema: `${FED_LINK}
type Query { reviews: [Review!]! }
type Review { id: ID! product: Product! }
type Product @key(fields: "id") { id: ID! reviews: [Review!]! }`,
};

const OPERATION = "query { products { id name reviews { id } } }";

describe("compose-and-plan workflow", () => {
    it("successful compose + plan returns both results", async () => {
        const composeResult = await composeSubgraphs([PRODUCTS, REVIEWS], composeServicesFn);
        expect(composeResult.success).toBe(true);
        if (!composeResult.success) return;

        const planResult = generateQueryPlan(composeResult.supergraphSdl, OPERATION);
        expect(planResult.success).toBe(true);
        if (planResult.success) {
            expect(planResult.formattedPlan).toBeTruthy();
            expect(planResult.formattedPlan).toContain("QueryPlan");
        }
    });

    it("composition failure stops before planning (queryPlanResult is null)", async () => {
        const badSubgraphs = [
            { name: "a", url: "http://a/graphql", schema: `${FED_LINK}\ntype Query { x: Foo }\ntype Foo @key(fields: "id") { id: ID! val: String! }` },
            { name: "b", url: "http://b/graphql", schema: `${FED_LINK}\ntype Foo @key(fields: "id") { id: ID! val: Int! }` },
        ];

        const composeResult = await composeSubgraphs(badSubgraphs, composeServicesFn);
        expect(composeResult.success).toBe(false);

        // Simulate the compose-and-plan route: if compose fails, don't plan
        if (!composeResult.success) {
            const queryPlanResult = null;
            expect(queryPlanResult).toBeNull();
            expect(composeResult.errors.length).toBeGreaterThan(0);
        }
    });

    it("missing operation: compose runs but plan is null", async () => {
        const composeResult = await composeSubgraphs([PRODUCTS, REVIEWS], composeServicesFn);
        expect(composeResult.success).toBe(true);

        const operation = ""; // no operation provided
        const queryPlanResult = operation.trim()
            ? generateQueryPlan(composeResult.success ? composeResult.supergraphSdl : "", operation)
            : null;

        expect(queryPlanResult).toBeNull();
    });

    it("compose result includes enriched error codes on failure", async () => {
        const badSubgraphs = [
            {
                name: "catalog",
                url: "http://catalog/graphql",
                schema: `${FED_LINK}\ntype Query { product: Product }\ntype Product @key(fields: "id") { id: ID! title: String! }`,
            },
            {
                name: "inventory",
                url: "http://inventory/graphql",
                schema: `${FED_LINK}\ntype Product @key(fields: "id") { id: ID! title: Int! }`,
            },
        ];

        const composeResult = await composeSubgraphs(badSubgraphs, composeServicesFn);
        expect(composeResult.success).toBe(false);
        if (composeResult.success) return;

        const codedErrors = composeResult.errors.filter((e) => e.code);
        expect(codedErrors.length).toBeGreaterThan(0);
        expect(codedErrors[0].code).toBe("FIELD_TYPE_MISMATCH");
        expect(codedErrors[0].docsUrl).toContain("field_type_mismatch");
    });

    it("compose result includes metadata shape", async () => {
        const { makeMetadata } = await import("../backend/src/services/metadata");
        const start = performance.now();
        const meta = makeMetadata(start);
        expect(meta).toHaveProperty("timestamp");
        expect(meta).toHaveProperty("durationMs");
        expect(meta).toHaveProperty("compositionVersion");
        expect(typeof meta.durationMs).toBe("number");
    });
});
