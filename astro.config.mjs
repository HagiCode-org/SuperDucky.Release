import { defineConfig } from "astro/config";

// Public release site. Build output is plain static files (index.html, zh-CN/index.html, release.json).
export default defineConfig({
  site: "https://sd-release.hagicode.com",
  output: "static",
  trailingSlash: "ignore",
});
