import { composeServices } from "@apollo/composition";
import { GraphQLError } from "graphql";
import { parse } from "graphql";

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

function serializeError(err: GraphQLError): SerializedGraphQLError {
    return {
        message: err.message,
        locations: err.locations,
        path: err.path as ReadonlyArray<string | number> | undefined,
        extensions: err.extensions as Record<string, unknown> | undefined,
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

export function composeSubgraphs(subgraphs: SubgraphInput[]): ComposeResult {
    try {
        const services = subgraphs.map((sg) => ({
            name: sg.name,
            typeDefs: parse(sg.schema),
            url: sg.url,
        }));

        const result = composeServices(services);

        if (result.errors) {
            return {
                success: false,
                errors: result.errors.map((e) =>
                    e instanceof GraphQLError ? serializeError(e) : { message: String(e) },
                ),
            };
        }

        return {
            success: true,
            supergraphSdl: result.supergraphSdl,
            hints: (result.hints ?? []).map((h) => ({
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
