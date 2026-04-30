import { parse, Kind } from "graphql";
import type { DocumentNode } from "graphql";
import type { ComposeServicesFn } from "./compositionManager.js";
import type {
    ComposeFailure,
    ComposeResult,
    ComposeSuccess,
    SerializedGraphQLError,
    SubgraphInput,
} from "../types.js";
import { matchErrors } from "../knowledge/index.js";

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

/**
 * Returns true if any subgraph defines at least one field on the Query type.
 * Checks ObjectTypeDefinition and ObjectTypeExtension named "Query".
 */
function hasQueryType(docs: DocumentNode[]): boolean {
    for (const doc of docs) {
        for (const def of doc.definitions) {
            if (
                (def.kind === Kind.OBJECT_TYPE_DEFINITION ||
                    def.kind === Kind.OBJECT_TYPE_EXTENSION) &&
                def.name.value === "Query" &&
                def.fields &&
                def.fields.length > 0
            ) {
                return true;
            }
        }
    }
    return false;
}

const DUMMY_QUERY_SDL = `type Query { _playground_health_check: String }`;
const DUMMY_QUERY_DOC = parse(DUMMY_QUERY_SDL);

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

        const docs = services.map((s) => s.typeDefs);
        let injectedDummyQuery = false;

        if (!hasQueryType(docs)) {
            const firstService = services[0];
            firstService.typeDefs = {
                kind: Kind.DOCUMENT,
                definitions: [
                    ...firstService.typeDefs.definitions,
                    ...DUMMY_QUERY_DOC.definitions,
                ],
            } as DocumentNode;
            injectedDummyQuery = true;
        }

        const result = composeServicesFn(services);

        if (result.errors) {
            const errors = result.errors.map((e) => serializeError(e));
            const agentDiagnostics = matchErrors(errors);
            return {
                success: false,
                errors,
                ...(agentDiagnostics.length > 0 ? { agentDiagnostics } : {}),
            } satisfies ComposeFailure;
        }

        const hints = (result.hints ?? []) as Array<{
            message: string;
            definition: { code: string; level: { name: string } };
            coordinate?: string;
        }>;

        const mappedHints = hints.map((h) => ({
            message: h.message,
            code: h.definition.code,
            docsUrl: errorDocsUrl(h.definition.code),
            level: h.definition.level.name,
            coordinate: h.coordinate,
        }));

        if (injectedDummyQuery) {
            mappedHints.push({
                message:
                    "No subgraph defined a Query type, so a dummy " +
                    "`type Query { _playground_health_check: String }` was auto-injected " +
                    "into the first subgraph to avoid a NO_QUERIES composition error. " +
                    "Add a real Query type to your subgraphs for production schemas.",
                code: "PLAYGROUND_AUTO_QUERY",
                docsUrl: "",
                level: "WARN",
                coordinate: undefined,
            });
        }

        return {
            success: true,
            supergraphSdl: result.supergraphSdl,
            hints: mappedHints,
        } satisfies ComposeSuccess;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            errors: [{ message }],
        } satisfies ComposeFailure;
    }
}
