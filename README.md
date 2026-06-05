# Overlook

Overlook 是本地优先的个人创作者经营看板，面向同时运营 Bilibili、小红书和抖音的创作者。

它聚合内容表现、账号状态、发布计划、竞品对标和品牌合作报告，适合用 CSV 或手动录入维护自己的创作者数据资产。所有业务数据默认保存在浏览器本地，不需要后端服务。

## 当前能力

- 跨平台 KPI：播放、互动、涨粉、合作准备度。
- 内容库：手动录入、CSV 导入、搜索、平台筛选、删除、CSV 导出。
- 发布计划：月度目标、最佳发布窗口、本周排期生成、计划复制。
- 跨平台重塑：把当前高表现内容拆成其他平台的可执行版本。
- 竞品对标：维护同赛道账号，查看均播和互动率差距。
- 品牌报告：导出 JSON、CSV 和可发送给品牌方的 PDF 报告。
- PWA：GitHub Pages 静态部署，Service Worker 缓存，支持安装到桌面/主屏。

## 本地运行

```bash
npm install
npm run dev
```

默认地址是 `http://localhost:5173`。

## 验证

```bash
npm run verify
```

`verify` 会按顺序执行：

- `npm run lint`
- `npm run typecheck`
- `npm run build`

## CSV 格式

示例文件在 `public/sample-data.csv`。推荐字段：

```csv
平台,标题,类型,日期,小时,播放量,点赞,评论,分享,收藏,涨粉,内容支柱,活动
Bilibili,从 0 到 MVP：一次完整产品构建复盘,长视频,2026-05-20,9,31800,2100,410,330,760,260,产品复盘,MVP 复盘
```

兼容基础字段：`platform/title/date/views/likes`。

## GitHub Pages

仓库已包含 `.github/workflows/deploy.yml`。推送到 `main` 后，Actions 会运行 `npm run verify` 并上传 `dist` 到 GitHub Pages。

Vite 使用 `base: './'`，适配项目页路径。

## 文件结构

```text
src/
  components/     复用 UI
  hooks/          本地持久化
  types/          产品数据模型
  utils/          初始数据和颜色映射
  App.tsx         应用视图与业务逻辑
public/
  sample-data.csv CSV 模板
  sw.js           PWA 缓存
docs/
  market-review.md
```

`_archive/` 是本地归档目录，已从 Git 和 lint 中排除。
