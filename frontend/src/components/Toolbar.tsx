import { BookOpen, Download, GitMerge, Network, Upload } from "lucide-react";
export type ToolbarProps = {
    federationVersion: string;
    federationVersionError: string | null;
    onFederationVersionChange: (v: string) => void;
    onCompose: () => void;
    onPlan: () => void;
    onExport: () => void;
    onImportClick: () => void;
    composeLoading: boolean;
    planLoading: boolean;
};

export function Toolbar({
    federationVersion,
    federationVersionError,
    onFederationVersionChange,
    onCompose,
    onPlan,
    onExport,
    onImportClick,
    composeLoading,
    planLoading,
}: ToolbarProps) {
    return (
        <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-surface-border bg-surface-raised px-4 py-2">
            <h1 className="text-sm font-semibold tracking-tight text-gray-100">
                Federation Composition Playground
            </h1>
            <div className="ml-auto flex flex-wrap items-center gap-2">
                <label className="flex min-w-0 max-w-[14rem] flex-col gap-1 text-xs text-gray-400 sm:max-w-none sm:flex-row sm:items-center">
                    <span className="shrink-0">Federation version</span>
                    <span className="relative">
                        <input
                            type="text"
                            className={`min-w-0 rounded border bg-surface px-2 py-1 font-mono text-gray-100 sm:w-36 ${
                                federationVersionError
                                    ? "border-red-500"
                                    : "border-surface-border"
                            }`}
                            value={federationVersion}
                            onChange={(e) => onFederationVersionChange(e.target.value)}
                            placeholder="2.13.3 or 2"
                            title="Semver version (e.g. 2.13.3) or '2' for latest stable 2.x. Stored in exports."
                            spellCheck={false}
                            autoComplete="off"
                        />
                        {federationVersionError && (
                            <span className="absolute left-0 top-full mt-1 whitespace-nowrap text-xs text-red-400">
                                {federationVersionError}
                            </span>
                        )}
                    </span>

                </label>
                <button
                    type="button"
                    className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                    onClick={onCompose}
                    disabled={composeLoading}
                >
                    <GitMerge size={13} />
                    {composeLoading ? "Composing…" : "Compose"}
                </button>
                <button
                    type="button"
                    className="flex items-center gap-1.5 rounded bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                    onClick={onPlan}
                    disabled={planLoading}
                >
                    <Network size={13} />
                    {planLoading ? "Planning…" : "Query plan"}
                </button>
                <button
                    type="button"
                    className="flex items-center gap-1.5 rounded border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-gray-100 hover:bg-surface-raised"
                    onClick={onImportClick}
                >
                    <Upload size={13} />
                    Import
                </button>
                <button
                    type="button"
                    className="flex items-center gap-1.5 rounded border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-gray-100 hover:bg-surface-raised"
                    onClick={onExport}
                >
                    <Download size={13} />
                    Export
                </button>
                <a
                    href="/api/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-surface-raised hover:text-gray-100"
                >
                    <BookOpen size={13} />
                    API Docs
                </a>
            </div>
        </header>
    );
}
