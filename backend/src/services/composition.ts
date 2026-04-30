import { parse } from "graphql";
import type { ComposeServicesFn } from "./compositionManager.js";
import type {
    ComposeFailure,
    ComposeResult,
    ComposeSuccess,
    SerializedGraphQLError,
    SubgraphInput,
} from "../types.js";

export type { SubgraphInput, ComposeResult, ComposeSuccess, ComposeFailure };

const DOCS_BASE =
    "https://www.apollographql.com/docs/graphos/schema-design/federated-schemas/reference/errors";

function errorDocsUrl(code: string): string {
    return `${DOCS_BASE}#${code.toLowerCase().replace(/_/g, "_")}`;
}

function serializeError(err: unknown): SerializedGraphQLError {
    if (typeof err !== "object" || err === null) {
        return { message: String(err) };
    }
    const e = err as Record<string, unknown>;
    const extensions =
        typeof e.extensions === "object" && e.extensions !== null
            ? (e.extensions as Record<string, unknown>)
            : undefined;

    const code =
        typeof extensions?.code === "string" ? extensions.code : undefined;

    return {
        message: typeof e.message === "string" ? e.message : String(err),
        ...(code ? { code, docsUrl: errorDocsUrl(code) } : {}),
        locations: Array.isArray(e.locations)
            ? (e.locations as ReadonlyArray<{ line: number; column: number }>)
            : undefined,
        path: Array.isArray(e.path)
            ? (e.path as ReadonlyArray<string | number>)
            : undefined,
        extensions,
    };
}

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
            } satisfies ComposeFailure;
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
                docsUrl: errorDocsUrl(h.definition.code),
                level: h.definition.level.name,
                coordinate: h.coordinate,
            })),
        } satisfies ComposeSuccess;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            errors: [{ message }],
        } satisfies ComposeFailure;
    }
}
