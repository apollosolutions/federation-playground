import { Supergraph, operationFromDocument } from "@apollo/federation-internals";
import { QueryPlanner, prettyFormatQueryPlan } from "@apollo/query-planner";
import { GraphQLError } from "graphql";
import { parse } from "graphql";
import type { QueryPlanFailure, QueryPlanResult, QueryPlanSuccess } from "../types.js";

export type { QueryPlanResult, QueryPlanSuccess, QueryPlanFailure };

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
        } satisfies QueryPlanSuccess;
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
            } satisfies QueryPlanFailure;
        }
        const message = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            errors: [{ message }],
        } satisfies QueryPlanFailure;
    }
}
