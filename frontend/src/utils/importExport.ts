import type { PlaygroundExportV1, SubgraphState } from "@/types";

/** Included in every export JSON so support can see origin and libraries used. */
export const PLAYGROUND_EXPORT_NOTE =
    "Exported from Apollo Federation Composition Playground (https://github.com/apollosolutions/federation-playground). Supergraph composition uses @apollo/composition; query plans use @apollo/query-planner (playground Node backend).";

export function buildExportPayload(
    federationVersion: string,
    subgraphs: SubgraphState[],
    operation: string,
): PlaygroundExportV1 {
    return {
        version: "1.0",
        exportNote: PLAYGROUND_EXPORT_NOTE,
        exportedAt: new Date().toISOString(),
        federationVersion,
        subgraphs: subgraphs.map((s) => ({
            name: s.name,
            url: s.url,
            schema: s.schema,
        })),
        operation,
    };
}

export function parseImportPayload(json: unknown): {
    federationVersion: string;
    subgraphs: SubgraphState[];
    operation: string;
} {
    if (!json || typeof json !== "object") {
        throw new Error("Invalid file: expected a JSON object");
    }
    const o = json as Record<string, unknown>;
    if (o.version !== "1.0") {
        throw new Error(`Unsupported export version: ${String(o.version)}`);
    }
    if (!Array.isArray(o.subgraphs)) {
        throw new Error("Invalid file: subgraphs must be an array");
    }
    const subgraphs: SubgraphState[] = o.subgraphs.map((raw, i) => {
        if (!raw || typeof raw !== "object") {
            throw new Error(`Invalid subgraph at index ${i}`);
        }
        const s = raw as Record<string, unknown>;
        if (typeof s.name !== "string" || typeof s.schema !== "string") {
            throw new Error(`Subgraph at index ${i} needs name and schema strings`);
        }
        return {
            id: crypto.randomUUID(),
            name: s.name,
            url: typeof s.url === "string" ? s.url : `http://${s.name}/graphql`,
            schema: s.schema,
        };
    });
    const federationVersion =
        typeof o.federationVersion === "string" ? o.federationVersion : "=2.13.3";
    const operation = typeof o.operation === "string" ? o.operation : "";
    return { federationVersion, subgraphs, operation };
}

export function downloadJson(filename: string, data: PlaygroundExportV1): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
