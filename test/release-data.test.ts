import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { fetchAndWrite, buildReleaseData } from "../scripts/fetch-latest-release.mjs";
import { loadReleaseList } from "../scripts/lib/github-releases.mjs";
import { platformForAssetName, ReleaseDataError, selectStableRelease, toReleaseData, validateReleaseData } from "../src/lib/release-data.ts";

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const fixture = (name: string) => path.join(FIXTURES, name);
const readFixture = async (name: string) => JSON.parse(await readFile(fixture(name), "utf8"));

let scratch: string;
beforeEach(async () => {
  scratch = await mkdtemp(path.join(tmpdir(), "release-data-"));
});
afterEach(async () => {
  await rm(scratch, { recursive: true, force: true });
});

describe("valid API response", () => {
  it("skips the draft and the prerelease and uses the newest stable release", async () => {
    const data = buildReleaseData(await readFixture("releases-valid.json"));
    expect(data.tag).toBe("v0.1.5");
    expect(data.version).toBe("0.1.5");
    expect(data.schemaVersion).toBe(1);
    expect(data.publishedAt).toBe("2026-11-20T08:00:00.000Z");
    expect(data.releaseUrl).toBe("https://sd-release.hagicode.com/");
    expect(data.notes).toBe("Fixture notes.\n");
  });

  it("maps assets to platforms and keeps unknown files under Other files", async () => {
    const data = buildReleaseData(await readFixture("releases-valid.json"));
    const byName = Object.fromEntries(data.assets.map((asset) => [asset.name, asset.platform]));
    expect(byName["SuperDucky.Setup.0.1.5.exe"]).toBe("windows");
    expect(byName["SuperDucky.0.1.5.msix"]).toBe("windows");
    expect(byName["SuperDucky-0.1.5-x64.AppImage"]).toBe("linux");
    expect(byName["SuperDucky-0.1.5-linux-x64.tar.gz"]).toBe("linux");
    expect(byName["SuperDucky-0.1.5-macos-arm64.dmg"]).toBe("macos");
    expect(byName["SHA256SUMS.txt"]).toBe("other");
    expect(platformForAssetName("notes.bin")).toBe("other");
  });

  it("writes the generated file only after validation succeeds", async () => {
    const outputPath = path.join(scratch, "release.generated.json");
    const written = await fetchAndWrite({ outputPath, releases: await readFixture("releases-valid.json") });
    expect(written.version).toBe("0.1.5");
    const onDisk = JSON.parse(await readFile(outputPath, "utf8"));
    expect(onDisk).toEqual(written);
  });

  it("reads the fixture through RELEASE_API_FIXTURE without touching the network", async () => {
    const releases = await loadReleaseList({ fixturePath: fixture("releases-valid.json") });
    expect(releases).toHaveLength(4);
  });
});

describe("prerelease-only response", () => {
  it("fails loudly and writes no file", async () => {
    const outputPath = path.join(scratch, "release.generated.json");
    await expect(fetchAndWrite({ outputPath, releases: await readFixture("releases-prerelease-only.json") })).rejects.toThrow(
      /releases.*no stable release/,
    );
    expect(await readdir(scratch)).toEqual([]);
  });
});

describe("bad tag", () => {
  it("rejects a tag that is not v + MAJOR.MINOR.PATCH and names the tag field", async () => {
    await expect(fetchAndWrite({ outputPath: path.join(scratch, "x.json"), releases: await readFixture("releases-bad-tag.json") })).rejects.toThrow(
      /"tag"/,
    );
    const prefixless = await readFixture("releases-bad-tag-prefix.json");
    expect(() => buildReleaseData(prefixless)).toThrow(ReleaseDataError);
    expect(await readdir(scratch)).toEqual([]);
  });
});

describe("missing assets", () => {
  it("fails and names the assets field, writing no file", async () => {
    const outputPath = path.join(scratch, "release.generated.json");
    await expect(fetchAndWrite({ outputPath, releases: await readFixture("releases-missing-assets.json") })).rejects.toThrow(
      /"assets" is missing/,
    );
    expect(await readdir(scratch)).toEqual([]);
  });

  it("treats an empty asset list as invalid too", () => {
    const release = { tag_name: "v0.1.5", assets: [], published_at: "2026-11-20T08:00:00Z" };
    expect(() => toReleaseData(release)).toThrow(/"assets" is empty/);
  });
});

describe("validateReleaseData", () => {
  const valid = () => ({
    schemaVersion: 1,
    version: "0.1.5",
    tag: "v0.1.5",
    publishedAt: "2026-11-20T08:00:00.000Z",
    releaseUrl: "https://sd-release.hagicode.com/",
    notes: "",
    assets: [{ platform: "windows", name: "a.exe", url: "https://github.com/x/y.exe", size: 1 }],
  });

  it("accepts a well-formed object", () => {
    expect(validateReleaseData(valid()).version).toBe("0.1.5");
  });

  it("names the failing field for each broken rule", () => {
    expect(() => validateReleaseData({ ...valid(), version: "v0.1.5" })).toThrow(/"version"/);
    expect(() => validateReleaseData({ ...valid(), tag: "v0.1.6" })).toThrow(/"tag"/);
    expect(() => validateReleaseData({ ...valid(), publishedAt: "yesterday" })).toThrow(/"publishedAt"/);
    expect(() => validateReleaseData({ ...valid(), releaseUrl: "http://evil.example/" })).toThrow(/"releaseUrl"/);
    expect(() => validateReleaseData({ ...valid(), assets: [{ ...valid().assets[0], platform: "beos" }] })).toThrow(
      /assets\[0\]\.platform/,
    );
    expect(() => validateReleaseData({ ...valid(), assets: [{ ...valid().assets[0], size: -1 }] })).toThrow(/assets\[0\]\.size/);
  });

  it("selectStableRelease returns the first non-draft, non-prerelease entry", () => {
    const picked = selectStableRelease([{ tag_name: "v9.9.9", prerelease: true }, { tag_name: "v0.1.5" }]);
    expect(picked.tag_name).toBe("v0.1.5");
    expect(() => selectStableRelease("nope")).toThrow(ReleaseDataError);
  });
});
