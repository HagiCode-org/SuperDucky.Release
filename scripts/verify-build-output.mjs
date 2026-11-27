// Post-build gate: the static output must match the validated release data before it can be published.
// Checks dist/release.json against the contract, that both pages show the version and every asset link,
// and that the cache rule for /release.json is in the payload. Exits non-zero with every problem listed.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { toFeedDocument, validateReleaseData } from "../src/lib/release-data.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const GENERATED = path.join(ROOT, "src", "data", "release.generated.json");
const PAGES = ["index.html", path.join("zh-CN", "index.html")];

const escapeHtml = (value) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function verifyBuildOutput({ dist = DIST, generatedPath = GENERATED } = {}) {
  const problems = [];
  const data = validateReleaseData(JSON.parse(await readFile(generatedPath, "utf8")));
  const expectedFeed = toFeedDocument(data);

  let feed;
  try {
    feed = JSON.parse(await readFile(path.join(dist, "release.json"), "utf8"));
  } catch (error) {
    problems.push(`dist/release.json is missing or invalid JSON (${error.code ?? error.message})`);
  }
  if (feed && JSON.stringify(feed) !== JSON.stringify(expectedFeed)) {
    problems.push("dist/release.json does not match the release data");
  }

  for (const page of PAGES) {
    let html;
    try {
      html = await readFile(path.join(dist, page), "utf8");
    } catch {
      problems.push(`dist/${page} is missing`);
      continue;
    }
    if (!html.includes(data.tag)) {
      problems.push(`dist/${page} does not show ${data.tag}`);
    }
    for (const asset of data.assets) {
      if (!html.includes(`href="${escapeHtml(asset.url)}"`)) {
        problems.push(`dist/${page} is missing the download link for ${asset.name}`);
      }
    }
  }

  let headers = "";
  try {
    headers = await readFile(path.join(dist, "_headers"), "utf8");
  } catch {
    problems.push("dist/_headers is missing (cache rule for /release.json)");
  }
  if (headers && !/^\/release\.json\s*\n\s*Cache-Control:\s*no-cache\s*$/m.test(headers)) {
    problems.push("dist/_headers does not declare Cache-Control: no-cache for /release.json");
  }

  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const problems = await verifyBuildOutput();
  if (problems.length > 0) {
    console.error(`verify-build-output failed:\n- ${problems.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    console.log("verify-build-output: release.json, both pages and the cache rule match the release data.");
  }
}
