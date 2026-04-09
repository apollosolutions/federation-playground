import { describe, expect, it } from "vitest";
import { resolveVersion } from "../backend/src/services/compositionManager";

const SAMPLE_VERSIONS = [
    "2.0.0",
    "2.0.1",
    "2.1.0",
    "2.9.0",
    "2.9.1",
    "2.10.0-alpha.0",
    "2.13.0-preview.0",
    "2.13.3",
];

describe("resolveVersion", () => {
    it('resolves "=2.9.0" to "2.9.0"', () => {
        expect(resolveVersion("=2.9.0", SAMPLE_VERSIONS)).toBe("2.9.0");
    });

    it('resolves "=2.13.3" to "2.13.3"', () => {
        expect(resolveVersion("=2.13.3", SAMPLE_VERSIONS)).toBe("2.13.3");
    });

    it("resolves a preview version exactly", () => {
        expect(resolveVersion("=2.13.0-preview.0", SAMPLE_VERSIONS)).toBe(
            "2.13.0-preview.0",
        );
    });

    it('resolves "2" to the latest stable 2.x version', () => {
        expect(resolveVersion("2", SAMPLE_VERSIONS)).toBe("2.13.3");
    });

    it('"2" skips pre-release versions', () => {
        const versions = ["2.0.0", "2.1.0", "2.2.0-alpha.0"];
        expect(resolveVersion("2", versions)).toBe("2.1.0");
    });

    it("throws for an exact version that does not exist", () => {
        expect(() => resolveVersion("=9.99.99", SAMPLE_VERSIONS)).toThrow(
            "does not exist on npm",
        );
    });

    it('throws for "1" (Federation 1 unsupported)', () => {
        expect(() => resolveVersion("1", SAMPLE_VERSIONS)).toThrow(
            "Invalid federation version",
        );
    });

    it("throws for arbitrary text", () => {
        expect(() => resolveVersion("foo", SAMPLE_VERSIONS)).toThrow(
            "Invalid federation version",
        );
    });

    it("throws for empty string", () => {
        expect(() => resolveVersion("", SAMPLE_VERSIONS)).toThrow(
            "Invalid federation version",
        );
    });

    it("trims whitespace", () => {
        expect(resolveVersion(" =2.9.0 ", SAMPLE_VERSIONS)).toBe("2.9.0");
        expect(resolveVersion(" 2 ", SAMPLE_VERSIONS)).toBe("2.13.3");
    });
});
