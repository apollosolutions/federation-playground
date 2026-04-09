import { FEDERATION_VERSION_SUGGESTIONS } from "@/utils/defaultSchemas";

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
                            list="federation-version-suggestions"
                            placeholder="=2.13.3 or 2"
                            title="Any Rover-style value (e.g. =2.14.1, 2, 1). Stored in exports; composition uses @apollo/composition from the server package.json."
                            spellCheck={false}
                            autoComplete="off"
                        />
                        {federationVersionError && (
                            <span className="absolute left-0 top-full mt-1 whitespace-nowrap text-xs text-red-400">
                                {federationVersionError}
                            </span>
                        )}
                    </span>
                    <datalist id="federation-version-suggestions">
                        {FEDERATION_VERSION_SUGGESTIONS.map((v) => (
                            <option key={v} value={v} />
                        ))}
                    </datalist>
                </label>
                <button
                    type="button"
                    className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                    onClick={onCompose}
                    disabled={composeLoading}
                >
                    {composeLoading ? "Composing…" : "Compose"}
                </button>
                <button
                    type="button"
                    className="rounded border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-gray-100 hover:bg-surface-raised disabled:opacity-50"
                    onClick={onPlan}
                    disabled={planLoading}
                >
                    {planLoading ? "Planning…" : "Query plan"}
                </button>
                <button
                    type="button"
                    className="rounded border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-gray-100 hover:bg-surface-raised"
                    onClick={onImportClick}
                >
                    Import
                </button>
                <button
                    type="button"
                    className="rounded border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-gray-100 hover:bg-surface-raised"
                    onClick={onExport}
                >
                    Export
                </button>
            </div>
        </header>
    );
}
