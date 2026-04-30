import { useCallback, useEffect, useMemo, useState } from "react";
import { compose, fetchFederationVersions, queryPlan } from "@/api/client";
import type {
    ComposeApiFailure,
    ComposeApiSuccess,
    QueryPlanApiFailure,
    QueryPlanApiSuccess,
    SubgraphState,
} from "@/types";
import {
    createDefaultSubgraphs,
    DEFAULT_FEDERATION_VERSION,
    DEFAULT_OPERATION,
} from "@/utils/defaultSchemas";
import {
    displayFederationVersion,
    isValidFederationVersion,
    normalizeFederationVersion,
} from "@/utils/federationVersions";
import { buildExportPayload, downloadJson, parseImportPayload } from "@/utils/importExport";

function initialPlayground() {
    const subgraphs = createDefaultSubgraphs();
    return {
        subgraphs,
        activeSubgraphId: subgraphs[0]?.id ?? null,
    };
}

export function usePlaygroundState() {
    const initial = useMemo(() => initialPlayground(), []);
    const [federationVersion, setFederationVersion] = useState(DEFAULT_FEDERATION_VERSION);
    const [subgraphs, setSubgraphs] = useState<SubgraphState[]>(initial.subgraphs);
    const [activeSubgraphId, setActiveSubgraphId] = useState<string | null>(
        initial.activeSubgraphId,
    );
    const [operation, setOperation] = useState(DEFAULT_OPERATION);

    const [supergraphSdl, setSupergraphSdl] = useState("");
    const [composeResult, setComposeResult] = useState<
        ComposeApiSuccess | ComposeApiFailure | null
    >(null);
    const [queryPlanResult, setQueryPlanResult] = useState<
        QueryPlanApiSuccess | QueryPlanApiFailure | null
    >(null);

    const [composeLoading, setComposeLoading] = useState(false);
    const [planLoading, setPlanLoading] = useState(false);

    const [availableVersions, setAvailableVersions] = useState<string[]>([]);

    useEffect(() => {
        fetchFederationVersions()
            .then(setAvailableVersions)
            .catch(() => {
                /* graceful degradation: skip validation when npm is unreachable */
            });
    }, []);

    const federationVersionError: string | null = useMemo(() => {
        if (availableVersions.length === 0) return null;
        if (isValidFederationVersion(federationVersion, availableVersions)) return null;
        return "Unknown federation version — not found on npm";
    }, [federationVersion, availableVersions]);

    const updateSubgraph = useCallback(
        (id: string, patch: Partial<Omit<SubgraphState, "id">>) => {
            setSubgraphs((prev) =>
                prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
            );
        },
        [],
    );

    const addSubgraph = useCallback(() => {
        const name = `subgraph${subgraphs.length + 1}`;
        const newSg: SubgraphState = {
            id: crypto.randomUUID(),
            name,
            url: `http://${name}:4000/graphql`,
            schema: `extend schema @link(url: "https://specs.apollo.dev/federation/v2.10", import: ["@key"])\n\ntype Query {\n  _empty: String\n}\n`,
        };
        setSubgraphs((prev) => [...prev, newSg]);
        setActiveSubgraphId(newSg.id);
    }, [subgraphs.length]);

    const removeSubgraph = useCallback((id: string) => {
        setSubgraphs((prev) => {
            const next = prev.filter((s) => s.id !== id);
            setActiveSubgraphId((cur) => {
                if (cur !== id) return cur;
                return next[0]?.id ?? null;
            });
            return next;
        });
    }, []);

    const runCompose = useCallback(async () => {
        setComposeLoading(true);
        setQueryPlanResult(null);
        try {
            const result = await compose({
                federationVersion: normalizeFederationVersion(federationVersion),
                subgraphs: subgraphs.map((s) => ({
                    name: s.name,
                    url: s.url,
                    schema: s.schema,
                })),
            });
            setComposeResult(result);
            if (result.success) {
                setSupergraphSdl(result.supergraphSdl);
            } else {
                setSupergraphSdl("");
            }
        } catch (e) {
            setComposeResult({
                success: false,
                errors: [{ message: e instanceof Error ? e.message : String(e) }],
            });
            setSupergraphSdl("");
        } finally {
            setComposeLoading(false);
        }
    }, [federationVersion, subgraphs]);

    const runQueryPlan = useCallback(async () => {
        if (!supergraphSdl) {
            setQueryPlanResult({
                success: false,
                errors: [
                    {
                        message:
                            "Compose successfully first to produce a supergraph, or run Compose after fixing errors.",
                    },
                ],
            });
            return;
        }
        setPlanLoading(true);
        try {
            const result = await queryPlan({
                supergraphSdl,
                operation,
            });
            setQueryPlanResult(result);
        } catch (e) {
            setQueryPlanResult({
                success: false,
                errors: [{ message: e instanceof Error ? e.message : String(e) }],
            });
        } finally {
            setPlanLoading(false);
        }
    }, [supergraphSdl, operation]);

    const exportState = useCallback(() => {
        const data = buildExportPayload(normalizeFederationVersion(federationVersion), subgraphs, operation);
        const stamp = new Date().toISOString().slice(0, 10);
        downloadJson(`federation-playground-export-${stamp}.json`, data);
    }, [federationVersion, subgraphs, operation]);

    const importFromJsonText = useCallback((text: string) => {
        let parsed: unknown;
        try {
            parsed = JSON.parse(text) as unknown;
        } catch {
            throw new Error("File is not valid JSON");
        }
        const { federationVersion: fv, subgraphs: sgs, operation: op } =
            parseImportPayload(parsed);
        setFederationVersion(displayFederationVersion(fv));
        setSubgraphs(sgs);
        setActiveSubgraphId(sgs[0]?.id ?? null);
        setOperation(op);
        setComposeResult(null);
        setQueryPlanResult(null);
        setSupergraphSdl("");
    }, []);

    return {
        federationVersion,
        federationVersionError,
        setFederationVersion,
        subgraphs,
        activeSubgraphId,
        setActiveSubgraphId,
        operation,
        setOperation,
        supergraphSdl,
        composeResult,
        queryPlanResult,
        composeLoading,
        planLoading,
        updateSubgraph,
        addSubgraph,
        removeSubgraph,
        runCompose,
        runQueryPlan,
        exportState,
        importFromJsonText,
    };
}
