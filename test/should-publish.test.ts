import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { decidePublish, readLiveVersion, writeDecision } from "../scripts/should-publish.mjs";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts", "should-publish.mjs");
const VALID_RELEASES = path.join(ROOT, "test", "fixtures", "releases-valid.json");

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("decidePublish", () => {
  it("does not publish when the live version equals the latest stable release", () => {
    expect(decidePublish({ latestVersion: "0.1.5", live: { ok: true, version: "0.1.5" } }).publish).toBe(false);
  });

  it("publishes when a newer release exists than the live version", () => {
    expect(decidePublish({ latestVersion: "0.1.5", live: { ok: true, version: "0.1.4" } }).publish).toBe(true);
  });

  it("publishes when the live file is unreachable", () => {
    expect(decidePublish({ latestVersion: "0.1.5", live: { ok: false, reason: "timed out" } }).publish).toBe(true);
  });

  it("publishes on a forced run even when the versions are equal", () => {
    expect(decidePublish({ force: true, latestVersion: "0.1.5", live: { ok: true, version: "0.1.5" } }).publish).toBe(true);
  });
});

describe("readLiveVersion", () => {
  it("reads a valid version", async () => {
    const live = await readLiveVersion({ fetchImpl: async () => jsonResponse({ version: "0.1.5" }) });
    expect(live).toEqual({ ok: true, version: "0.1.5" });
  });

  it("treats an HTTP error as unreadable", async () => {
    const live = await readLiveVersion({ fetchImpl: async () => jsonResponse({}, 503) });
    expect(live).toEqual({ ok: false, reason: "HTTP 503" });
  });

  it("treats invalid JSON as unreadable", async () => {
    const live = await readLiveVersion({ fetchImpl: async () => new Response("<html>", { status: 200 }) });
    expect(live.ok).toBe(false);
  });

  it("treats a non-plain version field as unreadable", async () => {
    const live = await readLiveVersion({ fetchImpl: async () => jsonResponse({ version: "v0.1.5" }) });
    expect(live).toEqual({ ok: false, reason: "no valid version field" });
  });

  it("times out instead of waiting forever", async () => {
    const hangs = ((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "TimeoutError" })));
      })) as typeof fetch;
    const live = await readLiveVersion({ fetchImpl: hangs, timeoutMs: 20 });
    expect(live).toEqual({ ok: false, reason: "timed out" });
  });
});

describe("writeDecision", () => {
  let scratch: string;
  beforeEach(async () => {
    scratch = await mkdtemp(path.join(tmpdir(), "should-publish-"));
  });
  afterEach(async () => {
    await rm(scratch, { recursive: true, force: true });
  });

  it("writes publish=true|false to GITHUB_OUTPUT when it is set", async () => {
    const outputFile = path.join(scratch, "github-output");
    await writeDecision(true, { env: { GITHUB_OUTPUT: outputFile } });
    await writeDecision(false, { env: { GITHUB_OUTPUT: outputFile } });
    expect(await readFile(outputFile, "utf8")).toBe("publish=true\npublish=false\n");
  });

  it("writes to stdout when GITHUB_OUTPUT is not set", async () => {
    let written = "";
    await writeDecision(false, { env: {}, stdout: { write: (chunk: string) => ((written += chunk), true) } });
    expect(written).toBe("publish=false\n");
  });
});

describe("should-publish.mjs end to end", () => {
  let server: Server;
  let liveUrl: string;
  let liveVersion = "0.1.5";
  let scratch: string;

  beforeAll(async () => {
    server = createServer((request, response) => {
      if (request.url === "/release.json") {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ schemaVersion: 1, version: liveVersion }));
      } else {
        response.writeHead(404).end();
      }
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    liveUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/release.json`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(async () => {
    scratch = await mkdtemp(path.join(tmpdir(), "should-publish-e2e-"));
  });
  afterEach(async () => {
    await rm(scratch, { recursive: true, force: true });
  });

  // Runs the real script with a clean environment; the latest stable release comes from the fixture file.
  async function runScript(extraEnv: Record<string, string>, { useOutputFile }: { useOutputFile: boolean }) {
    const env: Record<string, string> = { PATH: process.env.PATH ?? "", HOME: scratch, RELEASE_API_FIXTURE: VALID_RELEASES, ...extraEnv };
    const outputFile = path.join(scratch, "github-output");
    if (useOutputFile) {
      env.GITHUB_OUTPUT = outputFile;
    }
    const result = await execFileAsync(process.execPath, [SCRIPT], { env, cwd: ROOT });
    const output = useOutputFile ? await readFile(outputFile, "utf8") : result.stdout;
    return { output, stderr: result.stderr };
  }

  it("publishes=false when the live file already shows the latest stable version", async () => {
    liveVersion = "0.1.5";
    const { output } = await runScript({ LIVE_FEED_URL: liveUrl }, { useOutputFile: true });
    expect(output).toBe("publish=false\n");
  });

  it("publishes=true when the live file is older than the latest stable version", async () => {
    liveVersion = "0.1.4";
    const { output } = await runScript({ LIVE_FEED_URL: liveUrl }, { useOutputFile: true });
    expect(output).toBe("publish=true\n");
  });

  it("publishes=true when the live file cannot be reached", async () => {
    const { output } = await runScript({ LIVE_FEED_URL: "http://127.0.0.1:1/release.json" }, { useOutputFile: false });
    expect(output).toBe("publish=true\n");
  });

  it("publishes=true on a forced run and prints to stdout without GITHUB_OUTPUT", async () => {
    liveVersion = "0.1.5";
    const { output } = await runScript({ FORCE_PUBLISH: "true", LIVE_FEED_URL: liveUrl }, { useOutputFile: false });
    expect(output).toBe("publish=true\n");
  });

  it("fails without writing any decision when the latest release data is invalid", async () => {
    await expect(
      runScript({ RELEASE_API_FIXTURE: path.join(ROOT, "test", "fixtures", "releases-prerelease-only.json"), LIVE_FEED_URL: liveUrl }, { useOutputFile: true }),
    ).rejects.toMatchObject({ code: 1 });
  });
});
