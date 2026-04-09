/**
 * Reproduces a support-style workflow: broken federated subgraphs → export JSON →
 * import JSON (new session) → composition still fails with the same class of errors.
 */
import { composeServices } from "@apollo/composition";
import { describe, expect, it } from "vitest";
import { composeSubgraphs } from "../backend/src/services/composition";
import type { ComposeServicesFn } from "../backend/src/services/compositionManager";
import {
    buildExportPayload,
    parseImportPayload,
} from "../frontend/src/utils/importExport";
import type { SubgraphState } from "../frontend/src/types";

const composeServicesFn = composeServices as unknown as ComposeServicesFn;

const FED_LINK =
    'extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])';

/** Same entity `Product` with incompatible `title` types across subgraphs — composition must fail. */
const BAD_SUBGRAPH_A: SubgraphState = {
    id: "00000000-0000-4000-8000-000000000001",
    name: "catalog",
    url: "http://catalog:4000/graphql",
    schema: `${FED_LINK}

type Query {
  product: Product
}

type Product @key(fields: "id") {
  id: ID!
  title: String!
}
`,
};

const BAD_SUBGRAPH_B: SubgraphState = {
    id: "00000000-0000-4000-8000-000000000002",
    name: "inventory",
    url: "http://inventory:4001/graphql",
    schema: `${FED_LINK}

type Product @key(fields: "id") {
  id: ID!
  title: Int!
}
`,
};

const OPERATION = `query {
  product {
    id
    title
  }
}
`;

function toComposeInput(subgraphs: SubgraphState[]) {
    return subgraphs.map((s) => ({
        name: s.name,
        url: s.url,
        schema: s.schema,
    }));
}

describe("bad schema: export → import → composition failure", () => {
    it("round-trips export JSON and still fails composition with errors", async () => {
        const before = [BAD_SUBGRAPH_A, BAD_SUBGRAPH_B];

        const exported = buildExportPayload("=2.13.3", before, OPERATION);
        expect(exported.version).toBe("1.0");
        expect(exported.exportNote.length).toBeGreaterThan(20);
        expect(exported.subgraphs).toHaveLength(2);

        const fileContents = JSON.stringify(exported);
        const afterImport = parseImportPayload(JSON.parse(fileContents) as unknown);

        expect(afterImport.federationVersion).toBe("=2.13.3");
        expect(afterImport.operation).toBe(OPERATION);
        expect(afterImport.subgraphs).toHaveLength(2);

        for (let i = 0; i < 2; i++) {
            expect(afterImport.subgraphs[i].name).toBe(before[i].name);
            expect(afterImport.subgraphs[i].url).toBe(before[i].url);
            expect(afterImport.subgraphs[i].schema).toBe(before[i].schema);
        }

        const composeBefore = await composeSubgraphs(toComposeInput(before), composeServicesFn);
        expect(composeBefore.success).toBe(false);
        expect(composeBefore.errors?.length).toBeGreaterThan(0);

        const composeAfter = await composeSubgraphs(toComposeInput(afterImport.subgraphs), composeServicesFn);
        expect(composeAfter.success).toBe(false);
        expect(composeAfter.errors?.length).toBeGreaterThan(0);

        const msg = composeAfter.errors!.map((e) => e.message).join("\n");
        expect(msg.length).toBeGreaterThan(10);
        expect(msg.toLowerCase()).toMatch(/title|type|field|merge/);
    });
});
