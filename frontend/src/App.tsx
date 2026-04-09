import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { OperationEditor } from "@/components/OperationEditor";
import { OutputPanel } from "@/components/OutputPanel";
import { QueryPlanViewer } from "@/components/QueryPlanViewer";
import { SubgraphPanel } from "@/components/SubgraphPanel";
import { Toolbar } from "@/components/Toolbar";
import { usePlaygroundState } from "@/hooks/usePlaygroundState";

export default function App() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [outputTab, setOutputTab] = useState<"supergraph" | "errors">("supergraph");

    const pg = usePlaygroundState();

    useEffect(() => {
        if (pg.composeResult && !pg.composeResult.success) {
            setOutputTab("errors");
        }
    }, [pg.composeResult]);

    const handleImportClick = () => fileInputRef.current?.click();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const text = String(reader.result ?? "");
                pg.importFromJsonText(text);
            } catch (err) {
                window.alert(
                    err instanceof Error ? err.message : "Failed to import file",
                );
            }
        };
        reader.onerror = () => window.alert("Could not read file");
        reader.readAsText(file);
    };

    return (
        <div className="flex h-full min-h-0 flex-col">
            <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleFileChange}
            />
            <Toolbar
                federationVersion={pg.federationVersion}
                federationVersionError={pg.federationVersionError}
                onFederationVersionChange={pg.setFederationVersion}
                onCompose={async () => {
                    setOutputTab("supergraph");
                    await pg.runCompose();
                }}
                onPlan={pg.runQueryPlan}
                onExport={pg.exportState}
                onImportClick={handleImportClick}
                composeLoading={pg.composeLoading}
                planLoading={pg.planLoading}
            />
            <Layout
                topLeft={
                    <SubgraphPanel
                        subgraphs={pg.subgraphs}
                        activeId={pg.activeSubgraphId}
                        onSelect={pg.setActiveSubgraphId}
                        onAdd={pg.addSubgraph}
                        onRemove={pg.removeSubgraph}
                        onUpdate={pg.updateSubgraph}
                    />
                }
                topRight={
                    <OutputPanel
                        supergraphSdl={pg.supergraphSdl}
                        composeResult={pg.composeResult}
                        tab={outputTab}
                        onTabChange={setOutputTab}
                    />
                }
                bottomLeft={
                    <OperationEditor
                        value={pg.operation}
                        onChange={pg.setOperation}
                    />
                }
                bottomRight={<QueryPlanViewer result={pg.queryPlanResult} />}
            />
        </div>
    );
}
