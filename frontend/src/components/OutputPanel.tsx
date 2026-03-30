import type { ComposeApiFailure, ComposeApiSuccess } from "@/types";
import { MonacoEditor } from "./MonacoEditor";

export type OutputPanelProps = {
    supergraphSdl: string;
    composeResult: ComposeApiSuccess | ComposeApiFailure | null;
    tab: "supergraph" | "errors";
    onTabChange: (t: "supergraph" | "errors") => void;
};

export function OutputPanel({
    supergraphSdl,
    composeResult,
    tab,
    onTabChange,
}: OutputPanelProps) {
    const errorsText =
        composeResult && !composeResult.success
            ? composeResult.errors.map((e) => e.message).join("\n\n")
            : "";
    const hintsText =
        composeResult && composeResult.success && composeResult.hints.length > 0
            ? composeResult.hints
                  .map(
                      (h) =>
                          `[${h.code}]${h.coordinate ? ` ${h.coordinate}` : ""}\n${h.message}`,
                  )
                  .join("\n\n---\n\n")
            : "";

    let secondaryTabContent = "";
    if (tab === "errors") {
        const parts: string[] = [];
        if (errorsText) parts.push(`# Composition errors\n\n${errorsText}`);
        if (hintsText) parts.push(`# Composition hints\n\n${hintsText}`);
        if (composeResult?.success && !hintsText && !errorsText) {
            parts.push("Composition succeeded with no hints.");
        }
        secondaryTabContent =
            parts.join("\n\n") ||
            "(No composition result yet. Run Compose.)";
    }

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface">
            <div className="flex shrink-0 border-b border-surface-border">
                <button
                    type="button"
                    className={`px-3 py-1.5 text-xs font-medium ${
                        tab === "supergraph"
                            ? "border-b-2 border-blue-500 text-blue-200"
                            : "text-gray-500 hover:text-gray-300"
                    }`}
                    onClick={() => onTabChange("supergraph")}
                >
                    Supergraph SDL
                </button>
                <button
                    type="button"
                    className={`px-3 py-1.5 text-xs font-medium ${
                        tab === "errors"
                            ? "border-b-2 border-blue-500 text-blue-200"
                            : "text-gray-500 hover:text-gray-300"
                    }`}
                    onClick={() => onTabChange("errors")}
                >
                    Errors &amp; hints
                </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
                {tab === "supergraph" ? (
                    <div className="relative min-h-0 flex-1 overflow-hidden rounded border border-surface-border">
                        <MonacoEditor
                            value={supergraphSdl}
                            readOnly
                            language="graphql"
                        />
                    </div>
                ) : (
                    <div className="relative min-h-0 flex-1 overflow-hidden rounded border border-surface-border">
                        <MonacoEditor
                            value={secondaryTabContent}
                            readOnly
                            language="plaintext"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
