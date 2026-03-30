import { MonacoEditor } from "./MonacoEditor";

export type OperationEditorProps = {
    value: string;
    onChange: (v: string) => void;
};

export function OperationEditor({ value, onChange }: OperationEditorProps) {
    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-surface-border bg-surface">
            <div className="shrink-0 border-b border-surface-border px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                Operation
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
                <div className="relative min-h-0 flex-1 overflow-hidden rounded border border-surface-border">
                    <MonacoEditor value={value} onChange={onChange} language="graphql" />
                </div>
            </div>
        </div>
    );
}
