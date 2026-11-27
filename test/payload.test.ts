import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildReleaseData } from "../scripts/fetch-latest-release.mjs";
import { verifyBuildOutput } from "../scripts/verify-build-output.mjs";
import { toFeedDocument } from "../src/lib/release-data.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RELEASES = JSON.parse(await readFile(path.join(ROOT, "test", "fixtures", "releases-valid.json"), "utf8"));
const RELEASE_CACHE_RULE = /^\/release\.json\s*\n\s*Cache-Control:\s*no-cache\s*$/m;

describe("publication payload cache rule", () => {
  it("declares a revalidating cache policy for /release.json in public/_headers", async () => {
    // Astro copies public/ into dist/ unchanged, so this source file is what the payload carries.
    const headers = await readFile(path.join(ROOT, "public", "_headers"), "utf8");
    expect(headers).toMatch(RELEASE_CACHE_RULE);
  });
});

describe("assembled payload gate", () => {
  let scratch: string;
  let dist: string;
  let generatedPath: string;

  beforeEach(async () => {
    scratch = await mkdtemp(path.join(tmpdir(), "payload-"));
    dist = path.join(scratch, "dist");
    generatedPath = path.join(scratch, "release.generated.json");
    const data = buildReleaseData(RELEASES);
    await writeFile(generatedPath, JSON.stringify(data), "utf8");
    await mkdir(path.join(dist, "zh-CN"), { recursive: true });
    await writeFile(path.join(dist, "release.json"), JSON.stringify(toFeedDocument(data)), "utf8");
    const links = data.assets.map((asset) => `<a href="${asset.url}">${asset.name}</a>`).join("\n");
    await writeFile(path.join(dist, "index.html"), `<h1>${data.tag}</h1>\n${links}`, "utf8");
    await writeFile(path.join(dist, "zh-CN", "index.html"), `<h1>${data.tag}</h1>\n${links}`, "utf8");
    await writeFile(path.join(dist, "_headers"), "/release.json\n  Cache-Control: no-cache\n", "utf8");
  });

  afterEach(async () => {
    await rm(scratch, { recursive: true, force: true });
  });

  it("passes when the payload carries the cache rule, the feed and both pages", async () => {
    expect(await verifyBuildOutput({ dist, generatedPath })).toEqual([]);
  });

  it("fails and names the cache rule when dist/_headers is missing", async () => {
    await rm(path.join(dist, "_headers"));
    const problems = await verifyBuildOutput({ dist, generatedPath });
    expect(problems.join("\n")).toMatch(/_headers/);
  });

  it("fails when a download link is missing from a page", async () => {
    await writeFile(path.join(dist, "index.html"), `<h1>v0.1.5</h1>`, "utf8");
    const problems = await verifyBuildOutput({ dist, generatedPath });
    expect(problems.some((problem) => problem.includes("missing the download link"))).toBe(true);
  });
});

describe("ESA Pages metadata", () => {
  const readJsonc = async (relative: string) => JSON.parse(await readFile(path.join(ROOT, relative), "utf8"));

  it("root esa.jsonc and the workflow copy parse as JSON and are identical", async () => {
    const root = await readJsonc("esa.jsonc");
    const workflowCopy = await readJsonc(path.join(".github", "gh-pages", "esa.jsonc"));
    expect(root).toEqual(workflowCopy);
  });

  it("uses the docs install and build commands and serves ./dist", async () => {
    const esa = await readJsonc(path.join(".github", "gh-pages", "esa.jsonc"));
    expect(esa.installCommand).toBe("corepack enable && pnpm install --frozen-lockfile");
    expect(esa.buildCommand).toBe("pnpm run build");
    expect(esa.assets.directory).toBe("./dist");
  });
});
