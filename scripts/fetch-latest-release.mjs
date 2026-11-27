// Writes src/data/release.generated.json from the newest stable GitHub release.
// Validation runs before anything is written: on any invalid data the script exits non-zero and leaves no file.
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadReleaseList } from "./lib/github-releases.mjs";
import { selectStableRelease, toReleaseData, validateReleaseData } from "../src/lib/release-data.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const OUTPUT_PATH = path.join(ROOT, "src", "data", "release.generated.json");

/** Builds the validated ReleaseData from a releases list. Throws ReleaseDataError on bad input. */
/** @param {unknown} releases */
export function buildReleaseData(releases) {
  return validateReleaseData(toReleaseData(selectStableRelease(releases)));
}

/**
 * @param {{ outputPath?: string, releases?: unknown[] }} [options]
 */
export async function fetchAndWrite({ outputPath = OUTPUT_PATH, releases } = {}) {
  const list = releases ?? (await loadReleaseList());
  const data = buildReleaseData(list);
  await mkdir(path.dirname(outputPath), { recursive: true });
  // Write to a temp file and rename, so a half-written file never reaches the build.
  const tmp = `${outputPath}.tmp`;
  await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(tmp, outputPath);
  return data;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const data = await fetchAndWrite();
    console.log(`Wrote ${path.relative(ROOT, OUTPUT_PATH)} for ${data.tag} (${data.assets.length} assets).`);
  } catch (error) {
    console.error(`fetch-latest-release failed: ${error.message}`);
    process.exitCode = 1;
  }
}
