import { describe, expect, it } from "vitest";

import { compareVersions, isVersion, parseVersion } from "../src/lib/version.ts";

describe("parseVersion", () => {
  it("parses MAJOR.MINOR.PATCH into numbers", () => {
    expect(parseVersion("0.1.10")).toEqual({ major: 0, minor: 1, patch: 10 });
  });

  it("rejects a leading v, pre-release suffixes and partial versions", () => {
    expect(parseVersion("v0.1.5")).toBeNull();
    expect(parseVersion("0.1.5-beta.1")).toBeNull();
    expect(parseVersion("0.1")).toBeNull();
    expect(parseVersion("")).toBeNull();
    expect(isVersion(undefined)).toBe(false);
  });
});

describe("compareVersions", () => {
  it("compares numerically, so 0.1.10 is newer than 0.1.9", () => {
    expect(compareVersions("0.1.10", "0.1.9")).toBeGreaterThan(0);
    expect(compareVersions("0.1.9", "0.1.10")).toBeLessThan(0);
  });

  it("returns 0 for equal versions", () => {
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
  });

  it("orders older versions below newer ones at every component", () => {
    expect(compareVersions("0.1.4", "0.1.5")).toBeLessThan(0);
    expect(compareVersions("0.9.9", "1.0.0")).toBeLessThan(0);
    expect(compareVersions("1.0.0", "0.99.99")).toBeGreaterThan(0);
  });

  it("throws on malformed input instead of treating it as equal", () => {
    expect(() => compareVersions("v0.1.5", "0.1.5")).toThrow(TypeError);
    expect(() => compareVersions("0.1.5", "latest")).toThrow(TypeError);
  });
});
