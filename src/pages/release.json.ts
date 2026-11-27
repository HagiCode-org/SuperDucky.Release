// Static feed: GET is evaluated at build time and written to dist/release.json.
// Serializes only the schemaVersion 1 contract, from the same data module the page uses.
import { release } from "../data/release.ts";
import { toFeedDocument } from "../lib/release-data.ts";

export const prerender = true;

export function GET() {
  return new Response(`${JSON.stringify(toFeedDocument(release), null, 2)}\n`, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
