const SEMVER_RE = /^\d+\.\d+\.\d+/;

/**
 * Converts a user-friendly version string to the Rover-style format
 * expected by the backend:
 *   "2.13.3"  → "=2.13.3"
 *   "2"       → "2"
 *   "=2.13.3" → "=2.13.3" (already normalized)
 */
export function normalizeFederationVersion(value: string): string {
    const v = value.trim();
    if (v.startsWith("=")) return v;
    if (SEMVER_RE.test(v)) return `=${v}`;
    return v;
}

/**
 * Strips the leading "=" for user-facing display so users type "2.13.3"
 * instead of "=2.13.3".
 */
export function displayFederationVersion(value: string): string {
    return value.startsWith("=") ? value.slice(1) : value;
}

/**
 * Checks whether a user-typed version string maps to a real published version
 * of `@apollo/composition`.
 *
 * Accepts both display format ("2.13.3", "2") and normalized format ("=2.13.3").
 */
export function isValidFederationVersion(
    value: string,
    availableVersions: string[],
): boolean {
    const v = value.trim();
    if (v === "") return true;
    if (v === "2") return availableVersions.some((ver) => ver.startsWith("2."));
    const exact = v.startsWith("=") ? v.slice(1) : v;
    if (SEMVER_RE.test(exact)) return availableVersions.includes(exact);
    return false;
}
