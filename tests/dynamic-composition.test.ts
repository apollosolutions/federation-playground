/**
 * Integration test: verifies dynamic composition actually runs composeServices
 * using the built-in (pinned) version of @apollo/composition.
 */
import { describe, expect, it } from "vitest";
import { composeSubgraphs } from "../backend/src/services/composition";
import { ensureComposition } from "../backend/src/services/compositionManager";

const FED_LINK =
    'extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])';

const PRODUCTS = {
    name: "products",
    url: "http://products:4000/graphql",
    schema: `${FED_LINK}

type Query {
  products: [Product!]!
}

type Product @key(fields: "id") {
  id: ID!
  name: String!
}
`,
};

const REVIEWS = {
    name: "reviews",
    url: "http://reviews:4001/graphql",
    schema: `${FED_LINK}

type Query {
  reviews: [Review!]!
}

type Review {
  id: ID!
  product: Product!
}

type Product @key(fields: "id") {
  id: ID!
  reviews: [Review!]!
}
`,
};

describe("dynamic composition with pinned version", () => {
    it("composes successfully using ensureComposition for the installed version", async () => {
        const composeServicesFn = await ensureComposition("2.13.3");
        const result = await composeSubgraphs(
            [PRODUCTS, REVIEWS],
            composeServicesFn,
        );
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.supergraphSdl).toContain("@join__graph");
            expect(result.supergraphSdl).toContain("Product");
        }
    });

    it("returns the same function on repeated calls (memory cache)", async () => {
        const fn1 = await ensureComposition("2.13.3");
        const fn2 = await ensureComposition("2.13.3");
        expect(fn1).toBe(fn2);
    });
});
