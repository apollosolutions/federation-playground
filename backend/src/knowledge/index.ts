import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import type { SerializedGraphQLError, AgentDiagnostic } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PATTERNS_DIR = join(__dirname, "patterns");

export type FederationPattern = {
    id: string;
    codes: string[];
    /** Regex string matched against error messages (optional) */
    match?: string;
    /**
     * If set, pattern only triggers when the count of matching error codes
     * meets or exceeds this threshold. Used for error explosion detection.
     */
    matchErrorCount?: number;
    summary: string;
    suggestion: string;
    affectedVersions?: string[];
    docsUrl?: string;
    /** Full markdown body (everything after the frontmatter) */
    body: string;
};

let _cache: FederationPattern[] | null = null;

function loadPatterns(): FederationPattern[] {
    if (_cache) return _cache;

    const files = readdirSync(PATTERNS_DIR).filter((f) => f.endsWith(".md"));
    _cache = files.map((file) => {
        const raw = readFileSync(join(PATTERNS_DIR, file), "utf-8");
        const { data, content } = matter(raw);

        return {
            id: String(data.id),
            codes: Array.isArray(data.codes) ? data.codes.map(String) : [],
            match: typeof data.match === "string" ? data.match : undefined,
            matchErrorCount:
                typeof data.matchErrorCount === "number"
                    ? data.matchErrorCount
                    : undefined,
            summary: String(data.summary ?? "").trim(),
            suggestion: String(data.suggestion ?? "").trim(),
            affectedVersions: Array.isArray(data.affectedVersions)
                ? data.affectedVersions.map(String)
                : undefined,
            docsUrl: typeof data.docsUrl === "string" ? data.docsUrl : undefined,
            body: content.trim(),
        } satisfies FederationPattern;
    });

    return _cache;
}

export function getAllPatterns(): FederationPattern[] {
    return loadPatterns();
}

export function getPattern(id: string): FederationPattern | undefined {
    return loadPatterns().find((p) => p.id === id);
}

/**
 * Match a list of composition errors against known patterns.
 * Returns AgentDiagnostic entries for each pattern that fires.
 *
 * Matching rules (all conditions must be satisfied):
 *   - pattern.codes: at least one error has a matching code
 *   - pattern.match (if set): at least one error message matches the regex
 *   - pattern.matchErrorCount (if set): the count of errors with a matching code
 *     meets or exceeds the threshold
 */
export function matchErrors(
    errors: SerializedGraphQLError[],
): AgentDiagnostic[] {
    const patterns = loadPatterns();
    const diagnostics: AgentDiagnostic[] = [];

    for (const pattern of patterns) {
        const matchingErrors = errors.filter((e) =>
            pattern.codes.some((code) => e.code === code),
        );

        if (matchingErrors.length === 0) continue;

        if (
            pattern.matchErrorCount !== undefined &&
            matchingErrors.length < pattern.matchErrorCount
        ) {
            continue;
        }

        if (pattern.match) {
            const re = new RegExp(pattern.match, "i");
            const anyMatch = matchingErrors.some((e) => re.test(e.message));
            if (!anyMatch) continue;
        }

        diagnostics.push({
            pattern: pattern.id,
            summary: pattern.summary,
            suggestion: pattern.suggestion,
        });
    }

    return diagnostics.length > 0 ? diagnostics : [];
}
