# SuperDucky Release agent notes

## Project context

- Public download mirror for SuperDucky (超级丫丫) releases: a cross-platform desktop mod manager for Unity games (Escape from Duckov and Probably Stolen).
- Hosts the release site at https://sd-release.hagicode.com/ (an Astro static site) and its feed https://sd-release.hagicode.com/release.json. The site shows only the latest stable GitHub release.
- The repository holds no application source. The application lives in the SuperDucky repository.

## Layout

- `README.md` (English) and `README_cn.md` (Chinese) are a pair. They have the same sections in the same order, and each links to the other at the top. Change both together.
- `images/<topic>-<en|zh>.gif` are animated illustrations of the app's menus for the sections: mod management, load order, groups, suites, market, save editing. Each README picture uses the file for its language.
- `src/data/release.ts` is the only module that reads the release data. It reads `src/data/release.generated.json`, which `scripts/fetch-latest-release.mjs` writes from the newest stable GitHub release. The generated file is git-ignored. Do not commit it or hand-edit it.
- `src/lib/release-data.ts` holds the release rules: skip drafts and prereleases, validate the tag, map assets to platforms (unknown files fall under "Other files"). `src/lib/version.ts` holds MAJOR.MINOR.PATCH parse and compare.
- `src/pages/index.astro`, `src/pages/zh-CN/index.astro` and `src/components/ReleasePage.astro` render the page. `src/pages/release.json.ts` writes the feed. Both use the same data.
- `src/lib/copy.ts` holds the English and Chinese UI strings. `src/styles/site.css` holds the page styles, using the SuperDucky Docs design tokens, with dark mode via `prefers-color-scheme`.
- `public/_headers` declares the revalidating cache rule for `/release.json`. Astro copies it into `dist/`, so it is part of the publication payload.
- `scripts/should-publish.mjs` decides whether the live site is stale. `scripts/verify-build-output.mjs` checks `dist/` after the build.
- `test/` holds the vitest tests. `test/fixtures/` holds fixed GitHub API responses. Tests must not use the network.
- `esa.jsonc` (root) and `.github/gh-pages/esa.jsonc` are the same ESA Pages metadata. The workflow copies the second one into the payload.
- `.github/workflows/release-site-publish.yml` checks every 6 hours (and on push to `main` or a forced manual run) and publishes `dist/` to the `gh-pages` branch only when the live version is stale.

## Editing rules

- Keep the caption under the header picture: the pictures are drawn illustrations, not screen recordings.
- The save editing section is marked as not released yet ("coming soon"). Do not describe it as available until the README says so.
- Keep the download links (Microsoft Store and the GitHub releases page) and the official site link in both READMEs.
- Keep the release site link (https://sd-release.hagicode.com/) in both READMEs.
- Never invent release data or describe the feed as live unless the published site shows it. Test data lives only in `test/fixtures/`.
- Keep the feed to the `schemaVersion: 1` contract. Do not add release notes or other fields to `release.json`, and never put secrets or personal data in it.

## Commands

Use pnpm only. Never run npm or yarn, and never create `package-lock.json` or `yarn.lock`. Run commands from the repository root.

```bash
pnpm install --frozen-lockfile   # install the locked dependencies
pnpm test                        # run the vitest tests (fixtures only, no network)
pnpm run fetch:release           # write src/data/release.generated.json from the latest stable release
pnpm run build                   # fetch, build dist/ and verify the output
pnpm run dev                     # start a local development server
```

For an offline build, set `RELEASE_API_FIXTURE=test/fixtures/releases-valid.json`. That output is test data and must not be published.

## References

- Official site: https://sd.hagicode.com/ (English at `/en-US/`)
- Release site: https://sd-release.hagicode.com/ (feed at `/release.json`)
- Releases: https://github.com/HagiCode-org/SuperDucky.Release/releases
- Reference shape for the pnpm project, ESA metadata and publish workflow: `repos/SuperDucky.Docs`
