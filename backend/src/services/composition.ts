import { parse } from "graphql";
import type { ComposeServicesFn } from "./compositionManager.js";

export type SubgraphInput = {
    name: string;
    url: string;
    schema: string;
};

export type SerializedGraphQLError = {
    message: string;
    locations?: ReadonlyArray<{ line: number; column: number }>;
    path?: ReadonlyArray<string | number>;
    extensions?: Record<string, unknown>;
};

function serializeError(err: unknown): SerializedGraphQLError {
    if (typeof err !== "object" || err === null) {
        return { message: String(err) };
    }
    const e = err as Record<string, unknown>;
    return {
        message: typeof e.message === "string" ? e.message : String(err),
        locations: Array.isArray(e.locations)
            ? (e.locations as ReadonlyArray<{ line: number; column: number }>)
            : undefined,
        path: Array.isArray(e.path)
            ? (e.path as ReadonlyArray<string | number>)
            : undefined,
        extensions:
            typeof e.extensions === "object" && e.extensions !== null
                ? (e.extensions as Record<string, unknown>)
                : undefined,
    };
}

export type ComposeSuccess = {
    success: true;
    supergraphSdl: string;
    hints: Array<{
        message: string;
        code: string;
        level?: string;
        coordinate?: string;
    }>;
};

export type ComposeFailure = {
    success: false;
    errors: SerializedGraphQLError[];
};

export type ComposeResult = ComposeSuccess | ComposeFailure;

export async function composeSubgraphs(
    subgraphs: SubgraphInput[],
    composeServicesFn: ComposeServicesFn,
): Promise<ComposeResult> {
    try {
        const services = subgraphs.map((sg) => ({
            name: sg.name,
            typeDefs: parse(sg.schema),
            url: sg.url,
        }));

        const result = composeServicesFn(services);

        if (result.errors) {
            return {
                success: false,
                errors: result.errors.map((e) => serializeError(e)),
            };
        }

        const hints = (result.hints ?? []) as Array<{
            message: string;
            definition: { code: string; level: { name: string } };
            coordinate?: string;
        }>;

        return {
            success: true,
            supergraphSdl: result.supergraphSdl,
            hints: hints.map((h) => ({
                message: h.message,
                code: h.definition.code,
                level: h.definition.level.name,
                coordinate: h.coordinate,
            })),
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            errors: [{ message }],
        };
    }
}
