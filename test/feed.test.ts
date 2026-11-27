import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import { GET } from "../src/pages/release.json.ts";
import { release } from "../src/data/release.ts";

// The generated data file only exists after a fetch, so the feed test builds its release from the fixture.
vi.mock("../src/data/release.ts", async () => {
  const { readFileSync: read } = await import("node:fs");
  const { buildReleaseData } = await import("../scripts/fetch-latest-release.mjs");
  const releases = JSON.parse(read(new URL("./fixtures/releases-valid.json", import.meta.url), "utf8"));
  return { release: buildReleaseData(releases) };
});

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readSource = (relative: string) => readFileSync(path.join(ROOT, relative), "utf8");

async function fetchFeed() {
  const response = GET();
  expect(response.headers.get("Content-Type")).toContain("application/json");
  return (await response.json()) as Record<string, unknown>;
}

describe("release.json feed", () => {
  it("contains every required field of the schemaVersion 1 contract", async () => {
    const feed = await fetchFeed();
    expect(feed.schemaVersion).toBe(1);
    expect(feed.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(feed.tag).toBe(`v${feed.version}`);
    expect(feed.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
    expect(feed.releaseUrl).toBe("https://sd-release.hagicode.com/");
    expect(Array.isArray(feed.assets)).toBe(true);
    expect((feed.assets as unknown[]).length).toBeGreaterThan(0);
  });

  it("lists assets with platform, name, url and size and nothing else", async () => {
    const feed = await fetchFeed();
    for (const asset of feed.assets as Record<string, unknown>[]) {
      expect(Object.keys(asset).sort()).toEqual(["name", "platform", "size", "url"]);
      expect(asset.url).toMatch(/^https:\/\//);
      expect(typeof asset.size).toBe("number");
    }
  });

  it("carries only the contract fields: no release notes and no secrets", async () => {
    const feed = await fetchFeed();
    expect(Object.keys(feed).sort()).toEqual(["assets", "publishedAt", "releaseUrl", "schemaVersion", "tag", "version"]);
    expect(JSON.stringify(feed)).not.toMatch(/token|secret|authorization/i);
  });

  it("reports the same version as the page data, so page and feed cannot disagree", async () => {
    const feed = await fetchFeed();
    expect(feed.version).toBe(release.version);
    expect(feed.version).toBe("0.1.5");
    // Both page entry points render through ReleasePage, which reads the same data module as the feed.
    expect(readSource("src/components/ReleasePage.astro")).toContain('from "../data/release.ts"');
    expect(readSource("src/pages/release.json.ts")).toContain('from "../data/release.ts"');
    expect(readSource("src/pages/index.astro")).toContain("ReleasePage");
    expect(readSource("src/pages/zh-CN/index.astro")).toContain("ReleasePage");
  });
});
