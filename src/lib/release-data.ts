// Pure release-data rules shared by the fetch script, the publish decision and the Astro site.
// Keep this file free of Node-only and Astro-only imports so it runs under vitest, plain Node and Vite.
import { isVersion } from "./version.ts";

export const FEED_SCHEMA_VERSION = 1;
export const SITE_URL = "https://sd-release.hagicode.com/";
export const PLATFORM_IDS = ["windows", "macos", "linux", "other"] as const;
export type PlatformId = (typeof PLATFORM_IDS)[number];

export const PLATFORM_LABELS: Record<PlatformId, string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
  other: "Other files",
};

export interface ReleaseAsset {
  platform: PlatformId;
  name: string;
  url: string;
  size: number;
}

export interface ReleaseData {
  schemaVersion: typeof FEED_SCHEMA_VERSION;
  version: string;
  tag: string;
  publishedAt: string;
  releaseUrl: string;
  notes: string;
  assets: ReleaseAsset[];
}

/** Subset of a GitHub Releases API object that the site reads. */
export interface GitHubRelease {
  tag_name?: unknown;
  draft?: unknown;
  prerelease?: unknown;
  published_at?: unknown;
  body?: unknown;
  assets?: unknown;
}

export class ReleaseDataError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(`Invalid release data: "${field}" ${message}`);
    this.name = "ReleaseDataError";
    this.field = field;
  }
}

const TAG_PATTERN = /^v(\d+\.\d+\.\d+)$/;

/** Maps an asset file name to a platform. Unknown names fall back to "other", never dropped. */
export function platformForAssetName(name: string): PlatformId {
  if (/linux|\.appimage$|\.deb$|\.rpm$/i.test(name)) return "linux";
  if (/mac|darwin|\.dmg$|\.pkg$/i.test(name)) return "macos";
  if (/win|\.exe$|\.msix(bundle)?$|\.msi$/i.test(name)) return "windows";
  return "other";
}

/** Returns the newest stable (not draft, not prerelease) release, or throws when there is none. */
export function selectStableRelease(releases: unknown): GitHubRelease {
  if (!Array.isArray(releases)) {
    throw new ReleaseDataError("releases", "must be a list of GitHub releases");
  }
  const stable = releases.find(
    (release): release is GitHubRelease =>
      typeof release === "object" && release !== null && release.draft !== true && release.prerelease !== true,
  );
  if (!stable) {
    throw new ReleaseDataError("releases", "contain no stable release (only drafts or prereleases)");
  }
  return stable;
}

/**
 * Builds ReleaseData from one GitHub release object. Every failure throws a ReleaseDataError naming the field.
 * The result is validated again by validateReleaseData before anything is written.
 */
export function toReleaseData(release: GitHubRelease): ReleaseData {
  const tagMatch = typeof release.tag_name === "string" ? TAG_PATTERN.exec(release.tag_name) : null;
  if (!tagMatch) {
    throw new ReleaseDataError("tag", "must look like v<MAJOR>.<MINOR>.<PATCH>");
  }
  const version = tagMatch[1];
  if (!Array.isArray(release.assets)) {
    throw new ReleaseDataError("assets", "is missing from the release");
  }
  if (release.assets.length === 0) {
    throw new ReleaseDataError("assets", "is empty; the release has nothing to download");
  }
  const assets: ReleaseAsset[] = release.assets.map((asset, index) => {
    const raw = (asset ?? {}) as Record<string, unknown>;
    const name = raw.name;
    const url = raw.browser_download_url;
    const size = raw.size;
    if (typeof name !== "string" || name.length === 0) {
      throw new ReleaseDataError(`assets[${index}].name`, "must be a non-empty string");
    }
    if (typeof url !== "string") {
      throw new ReleaseDataError(`assets[${index}].url`, "must be a string");
    }
    if (typeof size !== "number" || !Number.isSafeInteger(size) || size < 0) {
      throw new ReleaseDataError(`assets[${index}].size`, "must be a non-negative integer");
    }
    return { platform: platformForAssetName(name), name, url, size };
  });
  const publishedMs = typeof release.published_at === "string" ? Date.parse(release.published_at) : Number.NaN;
  if (Number.isNaN(publishedMs)) {
    throw new ReleaseDataError("publishedAt", "must be an ISO 8601 timestamp");
  }
  return validateReleaseData({
    schemaVersion: FEED_SCHEMA_VERSION,
    version,
    tag: `v${version}`,
    publishedAt: new Date(publishedMs).toISOString(),
    releaseUrl: SITE_URL,
    notes: typeof release.body === "string" ? release.body : "",
    assets,
  });
}

/** Strict check of a ReleaseData object (the generated JSON or a fixture). Returns it typed when valid. */
export function validateReleaseData(input: unknown): ReleaseData {
  if (typeof input !== "object" || input === null) {
    throw new ReleaseDataError("(root)", "must be a JSON object");
  }
  const data = input as Record<string, unknown>;
  if (data.schemaVersion !== FEED_SCHEMA_VERSION) {
    throw new ReleaseDataError("schemaVersion", `must be ${FEED_SCHEMA_VERSION}`);
  }
  if (!isVersion(data.version)) {
    throw new ReleaseDataError("version", "must match MAJOR.MINOR.PATCH without a v prefix");
  }
  if (typeof data.tag !== "string" || data.tag !== `v${data.version}`) {
    throw new ReleaseDataError("tag", "must be v followed by version");
  }
  if (typeof data.publishedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(data.publishedAt) || Number.isNaN(Date.parse(data.publishedAt))) {
    throw new ReleaseDataError("publishedAt", "must be an ISO 8601 UTC timestamp ending in Z");
  }
  if (typeof data.releaseUrl !== "string" || !/^https:\/\/sd-release\.hagicode\.com\//.test(data.releaseUrl)) {
    throw new ReleaseDataError("releaseUrl", "must be an absolute https URL on sd-release.hagicode.com");
  }
  if (typeof data.notes !== "string") {
    throw new ReleaseDataError("notes", "must be a string");
  }
  if (!Array.isArray(data.assets) || data.assets.length === 0) {
    throw new ReleaseDataError("assets", "must be a non-empty array");
  }
  data.assets.forEach((asset: unknown, index: number) => {
    const a = (asset ?? {}) as Record<string, unknown>;
    if (typeof a.platform !== "string" || !(PLATFORM_IDS as readonly string[]).includes(a.platform)) {
      throw new ReleaseDataError(`assets[${index}].platform`, `must be one of ${PLATFORM_IDS.join(", ")}`);
    }
    if (typeof a.name !== "string" || a.name.length === 0) {
      throw new ReleaseDataError(`assets[${index}].name`, "must be a non-empty string");
    }
    if (typeof a.url !== "string" || !/^https:\/\//.test(a.url)) {
      throw new ReleaseDataError(`assets[${index}].url`, "must be an absolute https URL");
    }
    if (typeof a.size !== "number" || !Number.isSafeInteger(a.size) || a.size < 0) {
      throw new ReleaseDataError(`assets[${index}].size`, "must be a non-negative integer");
    }
  });
  return input as ReleaseData;
}

/** The release.json feed body: the schemaVersion 1 contract only (no release notes). */
export function toFeedDocument(data: ReleaseData) {
  return {
    schemaVersion: data.schemaVersion,
    version: data.version,
    tag: data.tag,
    publishedAt: data.publishedAt,
    releaseUrl: data.releaseUrl,
    assets: data.assets.map(({ platform, name, url, size }) => ({ platform, name, url, size })),
  };
}
