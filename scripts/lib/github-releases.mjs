// Read-only access to the GitHub Releases API for the release repository.
// Used by fetch-latest-release.mjs and should-publish.mjs. Never prints the token.
import { readFile } from "node:fs/promises";

export const DEFAULT_RELEASE_REPO = "HagiCode-org/SuperDucky.Release";
export const GITHUB_API_TIMEOUT_MS = 15_000;

/**
 * Returns the list of releases as the GitHub API returns it.
 * Reads RELEASE_API_FIXTURE (a JSON file holding a releases list) instead of the network when it is set;
 * tests and offline builds use this.
 */
export async function loadReleaseList({
  repo = process.env.RELEASE_REPO || DEFAULT_RELEASE_REPO,
  token = process.env.GITHUB_TOKEN,
  fixturePath = process.env.RELEASE_API_FIXTURE,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (fixturePath) {
    return JSON.parse(await readFile(fixturePath, "utf8"));
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    throw new Error(`RELEASE_REPO must look like owner/name, got "${repo}"`);
  }
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "superducky-release-site",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetchImpl(`https://api.github.com/repos/${repo}/releases?per_page=30`, {
    headers,
    signal: AbortSignal.timeout(GITHUB_API_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`GitHub releases request for ${repo} failed with HTTP ${response.status}`);
  }
  const body = await response.json();
  if (!Array.isArray(body)) {
    throw new Error(`GitHub releases response for ${repo} is not a list`);
  }
  return body;
}
