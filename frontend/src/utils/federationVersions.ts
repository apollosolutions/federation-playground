/**
 * Checks whether a Rover-style federation version string maps to a real
 * published version of `@apollo/composition`.
 *
 * Accepted formats:
 *   "2"        – Federation 2 latest (valid if any 2.x version exists)
 *   "=X.Y.Z"  – exact pinned version (valid if that version is in the list)
 */
export function isValidFederationVersion(
    value: string,
    availableVersions: string[],
): boolean {
    const v = value.trim();
    if (v === "") return true;
    if (v === "2") return availableVersions.some((ver) => ver.startsWith("2."));
    if (v.startsWith("=")) {
        const exact = v.slice(1);
        return availableVersions.includes(exact);
    }
    return false;
}
