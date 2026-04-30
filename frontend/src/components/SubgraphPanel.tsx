import { Plus, X } from "lucide-react";
import type { SubgraphState } from "@/types";
import { MonacoEditor } from "./MonacoEditor";

export type SubgraphPanelProps = {
    subgraphs: SubgraphState[];
    activeId: string | null;
    onSelect: (id: string) => void;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onUpdate: (id: string, patch: Partial<Omit<SubgraphState, "id">>) => void;
};

export function SubgraphPanel({
    subgraphs,
    activeId,
    onSelect,
    onAdd,
    onRemove,
    onUpdate,
}: SubgraphPanelProps) {
    const active = subgraphs.find((s) => s.id === activeId) ?? subgraphs[0];

    if (subgraphs.length === 0) {
        return (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center border-r border-surface-border bg-surface p-4 text-center text-sm text-gray-500">
                No subgraphs. Use Import or add a subgraph with +.
                <button
                    type="button"
                    className="mt-3 rounded bg-blue-600 px-3 py-1.5 text-xs text-white"
                    onClick={onAdd}
                >
                    Add subgraph
                </button>
            </div>
        );
    }

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-surface-border bg-surface">
            {/* IDE-style tab bar */}
            <div className="flex shrink-0 items-stretch overflow-x-auto border-b border-surface-border bg-surface-raised">
                {subgraphs.map((s) => {
                    const isActive = s.id === active?.id;
                    return (
                        <div
                            key={s.id}
                            className={`group relative flex shrink-0 items-center gap-2 border-r border-surface-border px-4 py-2 text-xs cursor-pointer select-none ${
                                isActive
                                    ? "bg-surface text-gray-100 after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-blue-500"
                                    : "text-gray-500 hover:bg-surface/60 hover:text-gray-300"
                            }`}
                            onClick={() => onSelect(s.id)}
                        >
                            <span className="font-mono">{s.name || "untitled"}</span>
                            {subgraphs.length > 1 && (
                                <button
                                    type="button"
                                    title={`Remove ${s.name}`}
                                    onClick={(e) => { e.stopPropagation(); onRemove(s.id); }}
                                    className={`flex items-center justify-center rounded p-0.5 transition-colors ${
                                        isActive
                                            ? "text-gray-500 hover:bg-surface-raised hover:text-red-400"
                                            : "text-transparent group-hover:text-gray-600 hover:!text-red-400"
                                    }`}
                                >
                                    <X size={11} />
                                </button>
                            )}
                        </div>
                    );
                })}
                <button
                    type="button"
                    onClick={onAdd}
                    title="Add subgraph"
                    className="flex shrink-0 items-center px-3 text-gray-500 hover:bg-surface/60 hover:text-gray-200"
                >
                    <Plus size={14} />
                </button>
            </div>
            {active && (
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2">
                    <div className="grid shrink-0 grid-cols-2 gap-2 text-xs">
                        <label className="flex flex-col gap-1 text-gray-400">
                            Name
                            <input
                                className="rounded border border-surface-border bg-surface-raised px-2 py-1 text-gray-100"
                                value={active.name}
                                onChange={(e) =>
                                    onUpdate(active.id, { name: e.target.value })
                                }
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-gray-400">
                            Routing URL
                            <input
                                className="rounded border border-surface-border bg-surface-raised px-2 py-1 text-gray-100"
                                value={active.url}
                                onChange={(e) =>
                                    onUpdate(active.id, { url: e.target.value })
                                }
                            />
                        </label>
                    </div>
                    <div className="relative min-h-0 flex-1 overflow-hidden rounded border border-surface-border">
                        <MonacoEditor
                            value={active.schema}
                            onChange={(schema) => onUpdate(active.id, { schema })}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
