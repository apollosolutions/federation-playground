import type { QueryPlanApiFailure, QueryPlanApiSuccess } from "@/types";
import { MonacoEditor } from "./MonacoEditor";

export type QueryPlanViewerProps = {
    result: QueryPlanApiSuccess | QueryPlanApiFailure | null;
};

export function QueryPlanViewer({ result }: QueryPlanViewerProps) {
    let text = "";
    if (!result) {
        text = "Run Query plan after a successful composition.";
    } else if (!result.success) {
        text = result.errors.map((e) => e.message).join("\n\n");
    } else {
        text = result.formattedPlan;
    }

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface">
            <div className="shrink-0 border-b border-surface-border px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                Query plan
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
                <div className="relative min-h-0 flex-1 overflow-hidden rounded border border-surface-border">
                    <MonacoEditor value={text} readOnly language="plaintext" />
                </div>
            </div>
        </div>
    );
}
