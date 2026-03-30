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
            <div className="flex shrink-0 items-center gap-1 border-b border-surface-border px-2 py-1">
                <span className="px-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Subgraphs
                </span>
                <div className="flex flex-1 flex-wrap gap-1 overflow-x-auto">
                    {subgraphs.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => onSelect(s.id)}
                            className={`rounded px-2 py-0.5 text-xs ${
                                s.id === active?.id
                                    ? "bg-blue-900/50 text-blue-200"
                                    : "text-gray-400 hover:bg-surface-raised"
                            }`}
                        >
                            {s.name}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    className="rounded px-2 py-0.5 text-xs text-green-400 hover:bg-surface-raised"
                    onClick={onAdd}
                    title="Add subgraph"
                >
                    +
                </button>
                {active && subgraphs.length > 1 && (
                    <button
                        type="button"
                        className="rounded px-2 py-0.5 text-xs text-red-400 hover:bg-surface-raised"
                        onClick={() => onRemove(active.id)}
                        title="Remove active subgraph"
                    >
                        −
                    </button>
                )}
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
