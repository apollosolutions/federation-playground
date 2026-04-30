import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const esmRequire = createRequire(import.meta.url);
const compositionPkgPath = esmRequire.resolve("@apollo/composition/package.json");
export const COMPOSITION_VERSION: string = JSON.parse(
    readFileSync(compositionPkgPath, "utf-8"),
).version as string;

export function makeMetadata(startMs: number) {
    return {
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - startMs),
        compositionVersion: COMPOSITION_VERSION,
    };
}
