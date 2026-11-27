// Plain MAJOR.MINOR.PATCH versions only: no leading "v", no pre-release or build suffix.
export interface Version {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

/** Parses "MAJOR.MINOR.PATCH" into numbers. Returns null for anything else. */
export function parseVersion(input: unknown): Version | null {
  if (typeof input !== "string" || !VERSION_PATTERN.test(input)) {
    return null;
  }
  const [major, minor, patch] = input.split(".").map(Number);
  if (![major, minor, patch].every(Number.isSafeInteger)) {
    return null;
  }
  return { major, minor, patch };
}

export function isVersion(input: unknown): input is string {
  return parseVersion(input) !== null;
}

/**
 * Compares two MAJOR.MINOR.PATCH strings numerically per component.
 * Returns a negative number when a < b, 0 when equal, a positive number when a > b.
 * Throws a TypeError for malformed input so a bad value can never compare as "equal".
 */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) {
    throw new TypeError(`Malformed version: ${JSON.stringify(left ? b : a)}`);
  }
  return left.major - right.major || left.minor - right.minor || left.patch - right.patch;
}
