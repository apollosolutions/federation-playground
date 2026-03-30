import type {
    ComposeApiFailure,
    ComposeApiSuccess,
    QueryPlanApiFailure,
    QueryPlanApiSuccess,
} from "@/types";

async function parseJson<T>(res: Response): Promise<T> {
    const text = await res.text();
    try {
        return JSON.parse(text) as T;
    } catch {
        throw new Error(`Invalid JSON response (${res.status}): ${text.slice(0, 200)}`);
    }
}

export type ComposeRequestBody = {
    federationVersion: string;
    subgraphs: Array<{ name: string; url: string; schema: string }>;
};

export async function compose(
    body: ComposeRequestBody,
): Promise<ComposeApiSuccess | ComposeApiFailure> {
    const res = await fetch("/api/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    return parseJson<ComposeApiSuccess | ComposeApiFailure>(res);
}

export type QueryPlanRequestBody = {
    supergraphSdl: string;
    operation: string;
    operationName?: string | null;
};

export async function queryPlan(
    body: QueryPlanRequestBody,
): Promise<QueryPlanApiSuccess | QueryPlanApiFailure> {
    const res = await fetch("/api/query-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    return parseJson<QueryPlanApiSuccess | QueryPlanApiFailure>(res);
}
