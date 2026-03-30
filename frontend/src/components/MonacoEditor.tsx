import Editor, { type OnMount } from "@monaco-editor/react";

export type MonacoEditorProps = {
    value: string;
    onChange?: (value: string) => void;
    language?: string;
    readOnly?: boolean;
    className?: string;
    /** Called with editor instance for layout updates */
    onMount?: OnMount;
};

export function MonacoEditor({
    value,
    onChange,
    language = "graphql",
    readOnly = false,
    className = "",
    onMount,
}: MonacoEditorProps) {
    const handleMount: OnMount = (ed, monaco) => {
        ed.updateOptions({
            fontSize: 13,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            tabSize: 2,
            readOnly,
        });
        monaco.editor.defineTheme("playground-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [],
            colors: {
                "editor.background": "#0d1117",
            },
        });
        monaco.editor.setTheme("playground-dark");
        requestAnimationFrame(() => {
            ed.layout();
        });
        onMount?.(ed, monaco);
    };

    // Flex + percentage height: Monaco needs a definite box. Fill parent with
    // relative/absolute so line numbers and last lines are not clipped under headers.
    return (
        <div
            className={`relative h-full min-h-0 min-w-0 w-full overflow-hidden ${className}`}
        >
            <div className="absolute inset-0">
                <Editor
                    height="100%"
                    width="100%"
                    language={language}
                    value={value}
                    onChange={(v) => onChange?.(v ?? "")}
                    options={{ readOnly }}
                    onMount={handleMount}
                />
            </div>
        </div>
    );
}
