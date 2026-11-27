// UI strings for the two static pages. Version numbers, dates and asset names are never translated.
import type { PlatformId } from "./release-data.ts";

export type SiteLocale = "en" | "zh-CN";

export interface SiteCopy {
  htmlTitle: string;
  description: string;
  kicker: string;
  title: string;
  lead: string;
  latest: string;
  version: string;
  published: string;
  downloads: string;
  notes: string;
  notesEmpty: string;
  storeTitle: string;
  storeNote: string;
  storeLink: string;
  feedTitle: string;
  feedNote: string;
  allReleases: string;
  officialSite: string;
  officialSiteHref: string;
  switchLabel: string;
  switchHref: string;
  platformLabels: Record<PlatformId, string>;
}

export const MICROSOFT_STORE_URL = "https://apps.microsoft.com/detail/9ndbtdkqbx30";
export const GITHUB_RELEASES_URL = "https://github.com/HagiCode-org/SuperDucky.Release/releases";

export const COPY: Record<SiteLocale, SiteCopy> = {
  en: {
    htmlTitle: "SuperDucky downloads",
    description: "Latest stable release of SuperDucky, a desktop mod manager for PC games.",
    kicker: "Release downloads",
    title: "SuperDucky",
    lead: "A cross-platform desktop mod manager for PC games: Escape from Duckov, Probably Stolen and The Binding of Isaac. This page always shows the latest stable release.",
    latest: "Latest release",
    version: "Version",
    published: "Published (UTC)",
    downloads: "Downloads",
    notes: "Release notes",
    notesEmpty: "This release has no release notes.",
    storeTitle: "Microsoft Store",
    storeNote: "If you installed SuperDucky from the Microsoft Store, the Store delivers its updates. The downloads below are for installs outside the Store.",
    storeLink: "Open in Microsoft Store",
    feedTitle: "Machine-readable feed",
    feedNote: "Apps and scripts can read the latest version from",
    allReleases: "All releases on GitHub",
    officialSite: "Official site",
    officialSiteHref: "https://sd.hagicode.com/en-US/",
    switchLabel: "简体中文",
    switchHref: "/zh-CN/",
    platformLabels: { windows: "Windows", macos: "macOS", linux: "Linux", other: "Other files" },
  },
  "zh-CN": {
    htmlTitle: "超级丫丫下载",
    description: "超级丫丫(SuperDucky)的最新稳定版本,一款面向 PC 游戏的桌面模组管理器。",
    kicker: "发行版下载",
    title: "SuperDucky(超级丫丫)",
    lead: "面向 PC 游戏的跨平台桌面模组管理器,支持逃离鸭科夫、深空当铺和以撒的结合。本页始终显示最新的稳定版本。",
    latest: "最新版本",
    version: "版本",
    published: "发布时间(UTC)",
    downloads: "下载",
    notes: "更新说明",
    notesEmpty: "该版本没有更新说明。",
    storeTitle: "Microsoft Store",
    storeNote: "通过 Microsoft Store 安装的用户,更新由商店提供。下方的下载链接适用于非商店安装。",
    storeLink: "在 Microsoft Store 中打开",
    feedTitle: "机器可读的版本信息",
    feedNote: "应用和脚本可以从下面的地址读取最新版本:",
    allReleases: "GitHub 上的全部版本",
    officialSite: "官网",
    officialSiteHref: "https://sd.hagicode.com/",
    switchLabel: "English",
    switchHref: "/",
    platformLabels: { windows: "Windows", macos: "macOS", linux: "Linux", other: "其他文件" },
  },
};
