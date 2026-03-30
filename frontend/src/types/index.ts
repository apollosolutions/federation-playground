export type SubgraphState = {
    id: string;
    name: string;
    url: string;
    schema: string;
};

export type PlaygroundExportV1 = {
    version: "1.0";
    /** Human-readable provenance for support; not required on import. */
    exportNote: string;
    exportedAt: string;
    federationVersion: string;
    subgraphs: Array<{
        name: string;
        url: string;
        schema: string;
    }>;
    operation: string;
};

export type ComposeApiSuccess = {
    success: true;
    supergraphSdl: string;
    hints: Array<{
        message: string;
        code: string;
        level?: string;
        coordinate?: string;
    }>;
};

export type ComposeApiFailure = {
    success: false;
    errors: Array<{
        message: string;
        locations?: ReadonlyArray<{ line: number; column: number }>;
        path?: ReadonlyArray<string | number>;
        extensions?: Record<string, unknown>;
    }>;
};

export type QueryPlanApiSuccess = {
    success: true;
    queryPlan: unknown;
    formattedPlan: string;
};

export type QueryPlanApiFailure = {
    success: false;
    errors: Array<{ message: string; extensions?: Record<string, unknown> }>;
};
