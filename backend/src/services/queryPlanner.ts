import { Supergraph, operationFromDocument } from "@apollo/federation-internals";
import { QueryPlanner, prettyFormatQueryPlan } from "@apollo/query-planner";
import { GraphQLError } from "graphql";
import { parse } from "graphql";

export type QueryPlanSuccess = {
    success: true;
    queryPlan: unknown;
    formattedPlan: string;
};

export type QueryPlanFailure = {
    success: false;
    errors: Array<{ message: string; extensions?: Record<string, unknown> }>;
};

export type QueryPlanResult = QueryPlanSuccess | QueryPlanFailure;

export function generateQueryPlan(
    supergraphSdl: string,
    operationStr: string,
    operationName?: string | null,
): QueryPlanResult {
    try {
        const supergraph = Supergraph.build(supergraphSdl, {
            supportedFeatures: null,
        });
        const planner = new QueryPlanner(supergraph);
        const operationDoc = parse(operationStr);
        const operation = operationFromDocument(supergraph.apiSchema(), operationDoc, {
            operationName: operationName ?? undefined,
            validate: true,
        });
        const plan = planner.buildQueryPlan(operation);
        const formatted = prettyFormatQueryPlan(plan);

        return {
            success: true,
            queryPlan: plan as unknown,
            formattedPlan: formatted,
        };
    } catch (err) {
        if (err instanceof GraphQLError) {
            return {
                success: false,
                errors: [
                    {
                        message: err.message,
                        extensions: err.extensions as Record<string, unknown> | undefined,
                    },
                ],
            };
        }
        const message = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            errors: [{ message }],
        };
    }
}
