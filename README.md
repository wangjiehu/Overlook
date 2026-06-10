# Overlook

Overlook 是一个本地优先的创作者经营看板，面向同时运营 Bilibili、小红书和抖音的个人创作者或小团队。

它把内容表现、账号状态、发布计划、竞品快照和品牌合作报告放进同一个安静、清晰的工作台。业务数据默认保存在浏览器本地，不依赖后端服务，可以直接以 GitHub Pages 静态站点发布。

在线体验：https://wangjiehu.github.io/Overlook/

## 核心能力

- **总览分析：** 查看播放、互动率、涨粉、合作准备度、内容结构和下一轮实验建议。
- **内容库：** 支持手动录入、CSV 自动列映射、导入预览、重复/无效行拦截、搜索筛选、删除和 CSV 导出。
- **发布计划：** 设置月度目标，生成本周排期，记录平台、时间窗口、实验目标和追踪指标。
- **跨平台重塑：** 将高表现内容拆成适合其他平台的可执行版本。
- **竞品对标：** 输入账号后自动扫描；保留来源、置信度、更新时间、快照历史和相对上次的变化。
- **品牌报告：** 导出可发送给品牌方的 Media Kit PDF，也可导出 JSON 或 CSV；分享前可隐藏账号 handle。
- **数据安全：** 支持完整工作区备份、恢复前差异预览，以及最近一次导入/恢复/重置撤销。
- **PWA：** 支持浏览器安装，适合直接部署到 GitHub Pages。

## 产品边界

Overlook 1.0.0 是一个可直接使用的本地优先版本。它不会在浏览器端抓取平台页面，因为这种方式不稳定，也可能不符合平台规则。

如果要接入真实账号扫描，请提供后端代理、官方数据源、授权数据源或其他合规数据源：

```text
VITE_OVERLOOK_SCAN_ENDPOINT=https://your-api.example.com/scan
```

前端会发送：

```json
{ "platform": "Bilibili", "handle": "@creator" }
```

期望返回：

```json
{
  "followers": 53000,
  "avgViews": 36000,
  "engagementRate": 18.4,
  "angle": "模板下载 + 个人经历",
  "confidence": 86,
  "scannedAt": "2026-06-01T09:00:00.000Z"
}
```

如果接口不可用、超时或返回无效结构，前端会自动回退到稳定的本地估算数据，保证对标流程仍然可用。

## 本地运行

```bash
npm install
npm run dev
```

默认地址：

```text
http://localhost:5173
```

## 验证

```bash
npm run verify
```

`verify` 会依次运行 lint、TypeScript 类型检查、生产构建和 Playwright 视觉烟测，覆盖桌面与移动视口。

## CSV 导入

示例文件位于 `public/sample-data.csv`。

推荐字段：

```csv
平台,标题,类型,日期,小时,播放量,点赞,评论,分享,收藏,涨粉,内容支柱,系列,标签,受众,钩子,意图
Bilibili,从 0 到 MVP：一次完整产品构建复盘,长视频,2026-05-20,9,31800,2100,410,330,760,260,产品复盘,MVP 复盘,复盘;MVP,独立开发者,先给交付结果再拆过程,trust
```

中文和英文列名都可识别。最小可用字段为 `platform`、`title`、`date`、`views` 和 `likes`。

## 部署

仓库已包含 `.github/workflows/deploy.yml`。

推送到 `main` 后，GitHub Actions 会运行 `npm run verify`，构建生产包，并发布到 GitHub Pages。Vite 使用 `base: './'`，适配项目页路径。

## 文件结构

```text
src/
  components/        复用 UI
  hooks/             本地持久化
  types/             产品数据模型
  utils/             初始数据和平台颜色
  App.tsx            应用流程
public/
  sample-data.csv    导入模板
  sw.js              PWA 缓存
scripts/
  visual-smoke.mjs   生产视觉烟测
docs/
  market-review.md   产品和市场审查记录
```
