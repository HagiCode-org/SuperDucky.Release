// Decides whether the release site must be rebuilt and published.
// Publish when the live release.json is missing, unreadable or shows a different version than the latest stable release,
// or when the run is forced. Writes publish=true|false to $GITHUB_OUTPUT when set, otherwise to stdout.
// Never prints response bodies or tokens; only the decision and a short reason go to the log.
import { appendFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadReleaseList } from "./lib/github-releases.mjs";
import { selectStableRelease, toReleaseData } from "../src/lib/release-data.ts";
import { isVersion } from "../src/lib/version.ts";

export const DEFAULT_LIVE_FEED_URL = "https://sd-release.hagicode.com/release.json";
export const LIVE_FEED_TIMEOUT_MS = 10_000;

/**
 * Reads the live feed's version. Any failure (HTTP error, timeout, invalid JSON, missing version) is reported
 * as unreadable, which the decision treats as stale.
 */
export async function readLiveVersion({ url = DEFAULT_LIVE_FEED_URL, fetchImpl = globalThis.fetch, timeoutMs = LIVE_FEED_TIMEOUT_MS } = {}) {
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: "application/json", "Cache-Control": "no-cache", "User-Agent": "superducky-release-site" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      return { ok: false, reason: `HTTP ${response.status}` };
    }
    const body = await response.json();
    if (typeof body !== "object" || body === null || !isVersion(body.version)) {
      return { ok: false, reason: "no valid version field" };
    }
    return { ok: true, version: body.version };
  } catch (error) {
    return { ok: false, reason: error?.name === "TimeoutError" ? "timed out" : "request or JSON parsing failed" };
  }
}

/** Pure decision. `live` is the result of readLiveVersion. */
export function decidePublish({ force = false, latestVersion, live }) {
  if (force) {
    return { publish: true, reason: "forced run" };
  }
  if (!live.ok) {
    return { publish: true, reason: `live release.json unreadable (${live.reason}); treating the site as stale` };
  }
  if (live.version !== latestVersion) {
    return { publish: true, reason: `live version ${live.version} differs from latest stable ${latestVersion}` };
  }
  return { publish: false, reason: `live version ${live.version} is already the latest stable release` };
}

/**
 * Writes the decision: GITHUB_OUTPUT when set, stdout otherwise.
 * @param {boolean} publish
 * @param {{ env?: Record<string, string | undefined>, stdout?: { write(chunk: string): unknown } }} [options]
 */
export async function writeDecision(publish, { env = process.env, stdout = process.stdout } = {}) {
  const line = `publish=${publish ? "true" : "false"}`;
  if (env.GITHUB_OUTPUT) {
    await appendFile(env.GITHUB_OUTPUT, `${line}\n`, "utf8");
  } else {
    stdout.write(`${line}\n`);
  }
  return line;
}

export async function main({ env = process.env, fetchImpl = globalThis.fetch, releases, argv = process.argv } = {}) {
  const force = env.FORCE_PUBLISH === "true" || argv.includes("--force");
  let decision;
  if (force) {
    decision = decidePublish({ force: true });
  } else {
    const latestVersion = toReleaseData(selectStableRelease(releases ?? (await loadReleaseList({ fetchImpl })))).version;
    const live = await readLiveVersion({ url: env.LIVE_FEED_URL || DEFAULT_LIVE_FEED_URL, fetchImpl });
    decision = decidePublish({ latestVersion, live });
  }
  await writeDecision(decision.publish, { env });
  console.error(`should-publish: publish=${decision.publish} (${decision.reason})`);
  return decision;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    await main();
  } catch (error) {
    // A failed check must stop the run before any build or deploy: no output line is written.
    console.error(`should-publish failed: ${error.message}`);
    process.exitCode = 1;
  }
}
