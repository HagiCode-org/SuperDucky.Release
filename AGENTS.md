# SuperDucky Release agent notes

## Project context

- Public download mirror for SuperDucky (超级丫丫) releases: a cross-platform desktop mod manager for Unity games (Escape from Duckov and Probably Stolen).
- The repository holds no application source, build scripts, tests or CI workflows. Everything tracked is `README.md`, `README_cn.md` and `images/*.gif`.

## Layout

- `README.md` (English) and `README_cn.md` (Chinese) are a pair. They have the same sections in the same order, and each links to the other at the top. Change both together.
- `images/<topic>-<en|zh>.gif` are animated illustrations of the app's menus for the sections: mod management, load order, groups, suites, market, save editing. Each README picture uses the file for its language.

## Editing rules

- Keep the caption under the header picture: the pictures are drawn illustrations, not screen recordings.
- The save editing section is marked as not released yet ("coming soon"). Do not describe it as available until the README says so.
- Keep the download links (Microsoft Store and the GitHub releases page) and the official site link in both READMEs.

## Commands

No build, test or lint commands exist here: there is no `package.json`, Makefile or `.github/` workflow tracked.

## References

- Official site: https://sd.hagicode.com/ (English at `/en-US/`)
- Releases: https://github.com/HagiCode-org/SuperDucky.Release/releases
