# Overlook

Overlook 是本地优先的个人创作者经营看板，面向同时运营 Bilibili、小红书和抖音的创作者。

它聚合内容表现、账号状态、发布计划、竞品对标和品牌合作报告，适合用 CSV、手动录入或工作区备份维护自己的创作者数据资产。所有业务数据默认保存在浏览器本地，不需要后端服务。

## 当前能力

- 跨平台 KPI：播放、互动、涨粉、合作准备度和下一轮实验建议。
- 内容库：手动录入、CSV 自动列映射与预览导入、重复/无效行拦截、标签/受众/钩子/意图管理、搜索、平台筛选、删除、CSV 导出。
- 发布计划：月度目标、最佳发布窗口、本周排期生成、平台筛选、实验目标和追踪指标。
- 跨平台重塑：把当前高表现内容拆成其他平台的可执行版本。
- 竞品对标：输入对标账号后自动补全本地估算画像，查看均播、互动率差距、快照记录和相对上次的趋势变化。
- 品牌报告：导出 JSON、CSV 和可发送给品牌方的 Creator Media Kit PDF 报告。
- 数据安全：导出完整工作区备份，恢复前显示当前/备份差异，导入/恢复/重置后可撤销最近一次大改，报告中可隐藏账号 handle。
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
- `npm run visual:smoke`

视觉烟测会用 Playwright 打开构建后的预览站点，检查桌面 1280x760、桌面 1440x900 和移动 390x844 的布局溢出，并覆盖 CSV 导入预览。

## CSV 格式

示例文件在 `public/sample-data.csv`。推荐字段：

```csv
平台,标题,类型,日期,小时,播放量,点赞,评论,分享,收藏,涨粉,内容支柱,系列,标签,受众,钩子,意图
Bilibili,从 0 到 MVP：一次完整产品构建复盘,长视频,2026-05-20,9,31800,2100,410,330,760,260,产品复盘,MVP 复盘,复盘;MVP,独立开发者,先给交付结果再拆过程,trust
```

导入时会自动识别中文或英文列名，并在确认前展示已匹配字段、忽略列、重复行和无效行。兼容基础字段：`platform/title/date/views/likes`。`意图` 可填 `growth`、`save`、`trust`、`conversion`，缺省时会自动归为增长型内容。

## 账号扫描

当前静态版会在输入对标账号后自动补全一组稳定的本地估算数据，便于完成产品流程和差距分析；粉丝、均播、互动率和角度都可以继续手动修正。真实平台扫描需要后端代理、授权或官方数据源接入，避免在浏览器端直接依赖不稳定抓取。

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
scripts/
  visual-smoke.mjs 构建后视觉与导入烟测
```
