import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { COPY } from "../src/lib/copy.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readSource = (relative: string) => readFileSync(path.join(ROOT, relative), "utf8");

// The supported games are named in the page copy and in both READMEs; these checks keep them in step.
describe("site copy", () => {
  it("names The Binding of Isaac in the English copy", () => {
    expect(COPY.en.description).toContain("PC games");
    expect(COPY.en.lead).toContain("The Binding of Isaac");
    expect(COPY.en.lead).toContain("Escape from Duckov");
    expect(COPY.en.lead).toContain("Probably Stolen");
  });

  it("names 以撒的结合 in the Chinese copy", () => {
    expect(COPY["zh-CN"].description).toContain("PC 游戏");
    expect(COPY["zh-CN"].lead).toContain("以撒的结合");
    expect(COPY["zh-CN"].lead).toContain("逃离鸭科夫");
    expect(COPY["zh-CN"].lead).toContain("深空当铺");
  });

  it("describes the games as PC games, not Unity games, in both languages", () => {
    for (const locale of Object.keys(COPY) as (keyof typeof COPY)[]) {
      for (const value of Object.values(COPY[locale])) {
        if (typeof value === "string") {
          expect(value).not.toMatch(/Unity/);
        } else {
          for (const label of Object.values(value)) expect(label).not.toMatch(/Unity/);
        }
      }
    }
  });

  it("keeps the English and Chinese copy with the same keys", () => {
    expect(Object.keys(COPY["zh-CN"]).sort()).toEqual(Object.keys(COPY.en).sort());
  });
});

describe("README pair", () => {
  it("lists The Binding of Isaac in both READMEs", () => {
    expect(readSource("README.md")).toMatch(/Isaac/i);
    expect(readSource("README_cn.md")).toContain("以撒的结合");
  });

  it("does not describe the games as Unity games in the READMEs or AGENTS.md", () => {
    for (const file of ["README.md", "README_cn.md", "AGENTS.md"]) {
      expect(readSource(file), file).not.toMatch(/Unity (games|游戏)/);
    }
  });
});
