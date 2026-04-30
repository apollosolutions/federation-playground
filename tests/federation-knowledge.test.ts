/**
 * Tests for the federation knowledge base: loader, matchErrors, and REST endpoint.
 */
import { composeServices } from "@apollo/composition";
import { describe, expect, it, beforeAll } from "vitest";
import { getAllPatterns, getPattern, matchErrors } from "../backend/src/knowledge/index";
import { composeSubgraphs } from "../backend/src/services/composition";
import type { ComposeServicesFn } from "../backend/src/services/compositionManager";
import type { SerializedGraphQLError } from "../backend/src/types";
import express from "express";
import federationPatternsRouter from "../backend/src/routes/federationPatterns";

const composeServicesFn = composeServices as unknown as ComposeServicesFn;

const FED_LINK_V2 =
    'extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@external", "@requires", "@inaccessible"])';

// ─── Knowledge loader ──────────────────────────────────────────────────────────

describe("knowledge loader", () => {
    it("loads at least the 3 initial patterns", () => {
        const patterns = getAllPatterns();
        expect(patterns.length).toBeGreaterThanOrEqual(3);
    });

    it("each pattern has required fields", () => {
        for (const p of getAllPatterns()) {
            expect(typeof p.id).toBe("string");
            expect(p.id.length).toBeGreaterThan(0);
            expect(Array.isArray(p.codes)).toBe(true);
            expect(typeof p.summary).toBe("string");
            expect(typeof p.suggestion).toBe("string");
            expect(typeof p.body).toBe("string");
        }
    });

    it("getPattern returns undefined for unknown IDs", () => {
        expect(getPattern("TOTALLY_UNKNOWN_PATTERN")).toBeUndefined();
    });

    it("getPattern finds known patterns by ID", () => {
        const p = getPattern("EXTERNAL_KEY_WITH_REQUIRES");
        expect(p).toBeDefined();
        expect(p?.id).toBe("EXTERNAL_KEY_WITH_REQUIRES");
        expect(p?.codes).toContain("SATISFIABILITY_ERROR");
        expect(p?.body.length).toBeGreaterThan(0);
    });

    it("SATISFIABILITY_ERROR_EXPLOSION has matchErrorCount set", () => {
        const p = getPattern("SATISFIABILITY_ERROR_EXPLOSION");
        expect(p).toBeDefined();
        expect(typeof p?.matchErrorCount).toBe("number");
        expect(p!.matchErrorCount!).toBeGreaterThan(0);
    });
});

// ─── matchErrors ──────────────────────────────────────────────────────────────

describe("matchErrors", () => {
    it("returns empty array when no errors match", () => {
        const errors: SerializedGraphQLError[] = [
            { message: "Something unrelated", code: "FIELD_TYPE_MISMATCH" },
        ];
        const result = matchErrors(errors);
        expect(result).toEqual([]);
    });

    it("matches EXTERNAL_KEY_WITH_REQUIRES pattern from error message", () => {
        const errors: SerializedGraphQLError[] = [
            {
                message:
                    "cannot satisfy @require conditions on field 'Foo.bar' (please ensure that this is not due to key field 'id' being accidentally marked @external)",
                code: "SATISFIABILITY_ERROR",
            },
        ];
        const result = matchErrors(errors);
        const match = result.find((d) => d.pattern === "EXTERNAL_KEY_WITH_REQUIRES");
        expect(match).toBeDefined();
        expect(match?.suggestion).toBeTruthy();
    });

    it("does not match SATISFIABILITY_ERROR_EXPLOSION below threshold", () => {
        const errors: SerializedGraphQLError[] = Array.from({ length: 5 }, (_, i) => ({
            message: `satisfiability error ${i}`,
            code: "SATISFIABILITY_ERROR",
        }));
        const result = matchErrors(errors);
        const explosion = result.find((d) => d.pattern === "SATISFIABILITY_ERROR_EXPLOSION");
        expect(explosion).toBeUndefined();
    });

    it("matches SATISFIABILITY_ERROR_EXPLOSION at or above threshold", () => {
        const threshold = getPattern("SATISFIABILITY_ERROR_EXPLOSION")?.matchErrorCount ?? 20;
        const errors: SerializedGraphQLError[] = Array.from({ length: threshold + 1 }, (_, i) => ({
            message: `error ${i}`,
            code: "SATISFIABILITY_ERROR",
        }));
        const result = matchErrors(errors);
        const explosion = result.find((d) => d.pattern === "SATISFIABILITY_ERROR_EXPLOSION");
        expect(explosion).toBeDefined();
    });

    it("matches NO_QUERIES on NO_QUERIES code", () => {
        const errors: SerializedGraphQLError[] = [
            { message: "must have at least one query", code: "NO_QUERIES" },
        ];
        const result = matchErrors(errors);
        const match = result.find((d) => d.pattern === "NO_QUERIES");
        expect(match).toBeDefined();
    });
});

// ─── agentDiagnostics on composition failure ───────────────────────────────────

describe("agentDiagnostics in composition", () => {
    it("fires EXTERNAL_KEY_WITH_REQUIRES when @external on @key + @requires present", async () => {
        const subgraphs = [
            {
                name: "jobs",
                url: "http://jobs/graphql",
                schema: `${FED_LINK_V2}
type Query { job: EmployerJob }
type EmployerJob @key(fields: "id") {
  id: ID!
  title: String
  checkReadJobPermission: String! @external
  readViaJobs: String @requires(fields: "checkReadJobPermission")
}`,
            },
            {
                name: "authz",
                url: "http://authz/graphql",
                schema: `${FED_LINK_V2}
type EmployerJob @key(fields: "id") {
  id: ID! @external
  checkReadJobPermission: String! @inaccessible
}`,
            },
            {
                name: "employer",
                url: "http://employer/graphql",
                schema: `${FED_LINK_V2}
type EmployerJob @key(fields: "id") {
  id: ID! @external
  title: String @external
  employerName: String @requires(fields: "title")
}`,
            },
        ];

        const result = await composeSubgraphs(subgraphs, composeServicesFn);
        expect(result.success).toBe(false);
        if (result.success) return;

        expect(result.agentDiagnostics).toBeDefined();
        const match = result.agentDiagnostics?.find(
            (d) => d.pattern === "EXTERNAL_KEY_WITH_REQUIRES",
        );
        expect(match).toBeDefined();
    });

    it("omits agentDiagnostics when no patterns match", async () => {
        const subgraphs = [
            {
                name: "a",
                url: "http://a/graphql",
                schema: `${FED_LINK_V2}
type Query { x: Foo }
type Foo @key(fields: "id") { id: ID! val: String! }`,
            },
            {
                name: "b",
                url: "http://b/graphql",
                schema: `${FED_LINK_V2}
type Foo @key(fields: "id") { id: ID! val: Int! }`,
            },
        ];

        const result = await composeSubgraphs(subgraphs, composeServicesFn);
        expect(result.success).toBe(false);
        if (result.success) return;

        // FIELD_TYPE_MISMATCH doesn't match any pattern — diagnostics should be absent or empty
        const diag = result.agentDiagnostics;
        expect(!diag || diag.length === 0).toBe(true);
    });
});

// ─── REST endpoint ─────────────────────────────────────────────────────────────

describe("GET /api/federation-patterns", () => {
    let app: ReturnType<typeof express>;

    beforeAll(() => {
        app = express();
        app.use("/api/federation-patterns", federationPatternsRouter);
    });

    it("lists all patterns", async () => {
        const { default: request } = await import("supertest");
        const res = await request(app).get("/api/federation-patterns");
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.patterns)).toBe(true);
        expect(res.body.patterns.length).toBeGreaterThanOrEqual(3);
        for (const p of res.body.patterns) {
            expect(p.id).toBeTruthy();
            expect(p.summary).toBeTruthy();
            expect(p.suggestion).toBeTruthy();
        }
    });

    it("returns full pattern detail for known ID (case-insensitive)", async () => {
        const { default: request } = await import("supertest");
        const res = await request(app).get(
            "/api/federation-patterns/external_key_with_requires",
        );
        expect(res.status).toBe(200);
        expect(res.body.id).toBe("EXTERNAL_KEY_WITH_REQUIRES");
        expect(res.body.body).toBeTruthy();
        expect(res.body.codes).toContain("SATISFIABILITY_ERROR");
    });

    it("returns 404 for unknown pattern ID", async () => {
        const { default: request } = await import("supertest");
        const res = await request(app).get("/api/federation-patterns/NOT_A_PATTERN");
        expect(res.status).toBe(404);
        expect(res.body.error).toContain("NOT_A_PATTERN");
    });
});
