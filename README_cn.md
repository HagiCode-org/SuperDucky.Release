# SuperDucky.Release

[English](./README.md)

SuperDucky(超级丫丫)发行版的公开下载镜像。SuperDucky 是一款面向 PC 游戏的跨平台桌面模组管理器,支持逃离鸭科夫、深空当铺(Probably Stolen)和以撒的结合(The Binding of Isaac)。

**[官网](https://sd.hagicode.com/)** · **[Microsoft Store](https://apps.microsoft.com/detail/9ndbtdkqbx30)** · **[发行版](https://github.com/HagiCode-org/SuperDucky.Release/releases)** · **[发行版站点](https://sd-release.hagicode.com/)**

![超级丫丫介绍](images/introduction-zh.gif)

*本页图片是根据应用菜单绘制的动态示意图,并非录屏。*

## 下载

- [Microsoft Store](https://apps.microsoft.com/detail/9ndbtdkqbx30)
- [最新版与历史版本](https://github.com/HagiCode-org/SuperDucky.Release/releases)

## 功能一览

### 模组管理

在同一个列表里启用、停用和排序模组,支持拖拽排序和分组排序。

![模组管理页动态示意图](images/mod-management-zh.gif)

### 加载顺序

开始游戏之前,先发现依赖和顺序上的问题。

![加载顺序页动态示意图](images/load-order-zh.gif)

### 分组

把模组归入分组,并给分组排序。

![模组分组动态示意图](images/groups-zh.gif)

### 套件

把每套模组配置保存为套件,随时切换。

![模组套件动态示意图](images/suites-zh.gif)

### 市场

不离开应用,直接浏览 Steam 创意工坊的模组。

![市场页动态示意图](images/market-zh.gif)

### 存档编辑(即将推出)

在同一个地方编辑存档。该功能尚未发布。

![存档编辑动态示意图](images/save-editing-zh.gif)

## 发行版站点

发行版站点 <https://sd-release.hagicode.com/> 展示最新的稳定版本:版本号、发布时间、更新说明,以及每个平台的下载链接。同一份数据也以机器可读的形式发布在 <https://sd-release.hagicode.com/release.json>。

站点是一个使用 pnpm 管理的 Astro 项目,目录结构如下:

- `scripts/fetch-latest-release.mjs` 从最新的稳定 GitHub 发行版写入 `src/data/release.generated.json`。草稿和预发布版本会被跳过。生成的文件不提交到仓库。
- `src/data/release.ts` 是唯一读取该文件的模块。中英文页面(`src/pages/`)和版本信息文件(`src/pages/release.json.ts`)都使用它,因此两者不会不一致。
- `test/` 存放测试。`test/fixtures/` 存放固定的 GitHub API 响应,测试因此不访问网络。
- `.github/workflows/release-site-publish.yml` 每 6 小时运行一次。只有当线上的 `release.json` 缺失或版本与最新稳定版本不同时才发布。手动运行可以强制发布。

命令在本目录下运行(只使用 pnpm):

```bash
pnpm install --frozen-lockfile   # 按锁文件安装依赖
pnpm test                        # 运行测试(只使用固定数据,不访问网络)
pnpm run fetch:release           # 从最新的稳定发行版写入 src/data/release.generated.json
pnpm run build                   # 获取数据、构建 dist/ 并校验输出
pnpm run dev                     # 启动本地开发服务器
```

离线构建时,可用 `RELEASE_API_FIXTURE=test/fixtures/releases-valid.json pnpm run build` 让获取步骤读取固定数据。该输出是测试数据,不得发布。

## 相关链接

- 官网与文档:<https://sd.hagicode.com/>
- Hagicode:<https://hagicode.com>
