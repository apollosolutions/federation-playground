// Shared backend types used by routes, services, and the MCP server.

export type SubgraphInput = {
    name: string;
    url: string;
    schema: string;
};

export type SerializedGraphQLError = {
    message: string;
    code?: string;
    docsUrl?: string;
    locations?: ReadonlyArray<{ line: number; column: number }>;
    path?: ReadonlyArray<string | number>;
    extensions?: Record<string, unknown>;
};

export type ComposeHint = {
    message: string;
    code: string;
    docsUrl: string;
    level?: string;
    coordinate?: string;
};

export type ComposeSuccess = {
    success: true;
    supergraphSdl: string;
    hints: ComposeHint[];
};

export type AgentDiagnostic = {
    pattern: string;
    summary: string;
    suggestion: string;
};

export type ComposeFailure = {
    success: false;
    errors: SerializedGraphQLError[];
    agentDiagnostics?: AgentDiagnostic[];
};

export type ComposeResult = ComposeSuccess | ComposeFailure;

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

export type ResponseMetadata = {
    timestamp: string;
    durationMs: number;
    compositionVersion: string;
};

export type PlaygroundExportV1 = {
    version: "1.0";
    exportNote?: string;
    exportedAt?: string;
    federationVersion: string;
    subgraphs: Array<{
        name: string;
        url?: string;
        schema: string;
    }>;
    operation: string;
};

// Combined compose + query-plan request/response
export type ComposeAndPlanRequest = {
    federationVersion?: string;
    subgraphs: SubgraphInput[];
    operation?: string;
    operationName?: string | null;
};

export type ComposeAndPlanResult = {
    federationVersion: string;
    composeResult: ComposeResult;
    queryPlanResult: QueryPlanResult | null;
    metadata: ResponseMetadata;
};

// Import endpoint request/response
export type ImportSuccess = {
    valid: true;
    federationVersion: string;
    subgraphs: SubgraphInput[];
    operation: string;
    composeResult?: ComposeResult & { metadata?: ResponseMetadata };
};

export type ImportFailure = {
    valid: false;
    errors: Array<{ message: string }>;
};

export type ImportResult = ImportSuccess | ImportFailure;
