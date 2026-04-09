import { describe, expect, it } from "vitest";
import { isValidFederationVersion } from "../frontend/src/utils/federationVersions";

const SAMPLE_VERSIONS = [
    "2.0.0",
    "2.0.1",
    "2.1.0",
    "2.9.0",
    "2.13.3",
    "2.13.0-preview.0",
    "2.13.0-preview.1",
];

describe("isValidFederationVersion", () => {
    it("accepts empty string (user is typing)", () => {
        expect(isValidFederationVersion("", SAMPLE_VERSIONS)).toBe(true);
    });

    it('rejects "1" (Federation 1 is unsupported)', () => {
        expect(isValidFederationVersion("1", SAMPLE_VERSIONS)).toBe(false);
    });

    it('accepts "2" when 2.x versions exist', () => {
        expect(isValidFederationVersion("2", SAMPLE_VERSIONS)).toBe(true);
    });

    it('rejects "2" when no 2.x versions exist', () => {
        expect(isValidFederationVersion("2", ["1.0.0"])).toBe(false);
    });

    it("accepts an exact pinned version that exists", () => {
        expect(isValidFederationVersion("=2.13.3", SAMPLE_VERSIONS)).toBe(true);
    });

    it("accepts a preview version that exists", () => {
        expect(isValidFederationVersion("=2.13.0-preview.0", SAMPLE_VERSIONS)).toBe(true);
    });

    it("rejects an exact pinned version that does not exist", () => {
        expect(isValidFederationVersion("=9.99.99", SAMPLE_VERSIONS)).toBe(false);
    });

    it('rejects "3" (no Federation 3)', () => {
        expect(isValidFederationVersion("3", SAMPLE_VERSIONS)).toBe(false);
    });

    it('rejects "v3" (invalid format)', () => {
        expect(isValidFederationVersion("v3", SAMPLE_VERSIONS)).toBe(false);
    });

    it('rejects "v2" (invalid format, should be "2")', () => {
        expect(isValidFederationVersion("v2", SAMPLE_VERSIONS)).toBe(false);
    });

    it("rejects arbitrary text", () => {
        expect(isValidFederationVersion("foo", SAMPLE_VERSIONS)).toBe(false);
    });

    it("trims whitespace before validating", () => {
        expect(isValidFederationVersion(" 2 ", SAMPLE_VERSIONS)).toBe(true);
        expect(isValidFederationVersion(" =2.13.3 ", SAMPLE_VERSIONS)).toBe(true);
    });

    it("rejects non-empty invalid values even when available versions is empty", () => {
        expect(isValidFederationVersion("v3", [])).toBe(false);
        expect(isValidFederationVersion("1", [])).toBe(false);
    });
});
