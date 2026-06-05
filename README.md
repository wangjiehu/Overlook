<p align="center">
  <img src="public/favicon.svg" alt="Overlook" width="72" />
</p>

<h1 align="center">Overlook</h1>

<p align="center">
  <strong>Unified creator insights for the Chinese creator economy.</strong>
</p>

<p align="center">
  One elegant dashboard.<br />
  Bilibili · Xiaohongshu · Douyin.<br />
  All your performance data, beautifully unified.
</p>

<p align="center">
  <em>Built with the precision and minimalism of Apple design.</em>
</p>

---

## What is Overlook?

Overlook is a premium, Apple-inspired analytics dashboard made specifically for **personal creators** publishing on China's leading platforms: **Bilibili**, **Xiaohongshu (Little Red Book)**, and **Douyin**.

**2026 Market Context (from research):**
- Personal creators face severe data fragmentation: manual exports, switching tools, no cross-platform insights.
- High demand for affordable tools that turn data into actionable strategies (repurposing long Bilibili videos to XHS notes, timing optimization, trend spotting).
- AI is exploding for creation (lowering barriers), but analytics lag — tools like this fill the gap for solo creators vs expensive MCN platforms.
- Trends: multi-platform "种草->转化" loops, data-driven content calendars, AI-assisted repurposing. Personal creators (not just big accounts) need simple, local-first tools.

As an independent developer, lifestyle note-taker, or short-form video creator, you juggle multiple platforms with fragmented data. Overlook brings everything into one calm, focused interface — no spreadsheets, no tab-switching fatigue, just clarity.

Track views, likes, comments, shares, followers, engagement rates, and top content at a glance. Discover cross-platform patterns. Get intelligent growth recommendations. Export polished reports.

It's the dashboard you wish the platforms themselves provided — refined, private, and designed for creators who value quality over noise.

---

## Key Features

- **Unified KPI Overview** — Total plays, likes, followers, and average engagement across all three platforms in beautiful large-number cards.
- **Cross-Platform Charts** — Interactive bar, donut, and smooth line visualizations powered by Recharts showing comparisons and 30-day trends.
- **Platform Deep Dives** — Dedicated cards for each platform with growth indicators, key metrics, and highlighted top-performing content.
- **Recent Content Table** — Clean, sortable-style view of your latest videos and notes with performance numbers.
- **AI Growth Insights & Content Ideas** — Dynamic, data-driven suggestions + Content Repurposing Generator (cross-platform adaptation with copy) + Content Calendar (7-day) + Series/Episode Planner (5-ep timeline with repurposing notes + apply-to-calendar) + "Ask Claude" stub (keyword-aware responses using your live data; notes on using Anthropic 6-month dev free tier / claude.ai for real with exported JSON).
- **Timing Optimizer** — Publish timing heatmap + best hours per platform (visual + actionable recs that feed calendar). Best-time insights auto included.
- **Advanced Data Exploration** — Real-time search, platform filters, date range, fully sortable table (click headers for views/likes/date), freshness badges ("新"/"本周"), rich empty states.
- **Account Management** — Mock-connected accounts with easy add/remove, visual status, persistence, empty states, onboarding links.
- **Export & Import** — JSON full report, content CSV, **premium Sponsor/Brand PDF report** (jsPDF+html2canvas hybrid: clean text + visual canvas snapshot of KPIs/insights/top content/calendar/repurpose; 1-2 pages, perfect for pitching brands).
- **PWA + Offline** — Full installable PWA (manifest, service worker precache for shell+sample data, beforeinstallprompt "安装 App" button). Data always local; works offline for daily check.
- **Goals Tracker** — Persistent monthly targets (views/followers) with live progress bars, remaining, growth-based prediction "本月预测达标".
- **Delightful Interactions & Apple Polish** — Framer Motion tabs/modals, Sonner toasts, lift cards, complete dark, premium modals (repurpose with live switcher + copy all), onboarding 5-step tour (first-run + re-triggerable via ? icon), a11y (roles, labels, ESC close, sortable headers keyboard, sr-only skip).
- **Creator Growth Tools** — Growth predictor, best type, platform trends, repurposing, series planner, timing recs, goals. Full closed loop: import data → unified view → actionable plan → export proof.

Everything runs 100% locally. Your data never leaves your machine.

---

## Apple-Inspired UI Highlights

Overlook follows Apple’s design philosophy: restraint, clarity, and delight in the details.

- **Typography** — Generous 56px headlines with tight −0.03em tracking. System font stack (`-apple-system`, SF Pro Display) for native macOS/iOS feel.
- **Color** — Signature Apple blue (`#007AFF`) as the sole vibrant accent against a soft `#F5F5F7` background. Subtle green (`#34C759`) for positive growth, orange for highlights.
- **Navigation** — Frosted-glass top bar with backdrop blur, sticky, and perfectly balanced spacing.
- **Cards** — Elevated white surfaces with refined 20px radii, soft shadows, and gentle hover lifts (`translateY(-2px)`).
- **Components** — Pill-shaped buttons, precise 17px body text, elegant tables, and focus states that feel expensive.
- **Motion** — Subtle, purposeful animations via Framer Motion — never distracting.
- **Polish** — Custom chart tooltips, insight callouts with left accent borders, and responsive behavior that feels at home on desktop or tablet.

The result is a tool that feels more like a native Mac app than a web dashboard.

---

## Screenshots

> **Placeholders below.** Run the app locally (`npm run dev`) and take beautiful screenshots (recommended: full-width at 1440px+, using CleanShot X, Shottr, or browser dev tools with device frame).

### Dashboard — Unified Overview

![Overlook Dashboard](https://placehold.co/1200x620/f5f5f7/1d1d1f/png?text=Overlook+Dashboard%0A%0AUnified+KPI+cards+%7C+Cross-platform+charts+%7C+Quick+AI+insights)

### Platforms View

![Platform Details](https://placehold.co/1200x620/f5f5f7/1d1d1f/png?text=Platforms+View%0A%0ADetailed+metrics+for+Bilibili%2C+Xiaohongshu%2C+Douyin)

### Insights & Accounts

![AI Insights](https://placehold.co/1200x620/f5f5f7/1d1d1f/png?text=AI+Insights+%26+Account+Management%0A%0AActionable+recommendations+%7C+Connected+platforms)

---

## Getting Started

### Run Locally

```bash
cd projects/overlook
npm install
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173). The experience is instant.

### Production Build

```bash
npm run build
```

Outputs optimized static files to `dist/`.

---

## Deploy to GitHub Pages

Overlook is a pure static Vite application. It is **already configured and ready for GitHub Pages**.

The `vite.config.ts` includes `base: './'` so asset paths remain reliable whether served from a project subdirectory or custom domain.

### Step-by-Step Deployment

1. **Create your repository on GitHub**
   - New repo → do **not** add a README, .gitignore, or license (we will push everything).

2. **Push your code**
   ```bash
   git init
   git add .
   git commit -m "feat: initial Overlook release — Apple-style creator dashboard"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/overlook.git
   git push -u origin main
   ```

3. **Build the static site**
   ```bash
   npm run build
   ```

4. **Choose your deployment method**

   **Recommended: gh-pages package (fastest manual deploy)**
   ```bash
   npm install --save-dev gh-pages
   ```
   Add to your `package.json` scripts:
   ```json
   "deploy": "gh-pages -d dist"
   ```
   Then run:
   ```bash
   npm run deploy
   ```

   **GitHub repo settings:**
   - Go to **Settings → Pages**
   - Source: “Deploy from a branch”
   - Branch: `gh-pages` / `/ (root)`
   - Save. Your site will be live at `https://YOUR_USERNAME.github.io/overlook/`

   **Fully automated: GitHub Actions**
   Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy Overlook to GitHub Pages
   on:
     push:
       branches: [ "main" ]
   permissions:
     contents: read
     pages: write
     id-token: write
   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 20
             cache: 'npm'
         - run: npm ci
         - run: npm run build
         - name: Upload artifact
           uses: actions/upload-pages-artifact@v3
           with:
             path: ./dist
     deploy:
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       runs-on: ubuntu-latest
       needs: build
       steps:
         - name: Deploy to GitHub Pages
           id: deployment
           uses: actions/deploy-pages@v4
   ```
   Then enable GitHub Pages in repo settings to “GitHub Actions”.

5. **Done.**  
   Visit your new site. Share the link with fellow creators.

**Overlook is ready for GitHub.** The Vite configuration, relative asset paths, and static nature make deployment effortless and reliable.

---

## 作为 PWA 安装使用

Overlook 现为第一类可安装 PWA，专为日常个人创作者使用设计：支持离线查看上次数据（localStorage + 缓存的 App Shell 与示例 CSV），一键添加到 iOS/Android 主屏或桌面。

### 如何安装
1. 用现代浏览器（Chrome/Edge/Safari 推荐）打开部署后的站点（GitHub Pages 或本地 `npm run dev` / `npm run preview`）。
2. **支持 beforeinstallprompt 的浏览器**（Android Chrome/Edge 等）：Navbar 右侧会出现「安装到桌面/主屏」按钮（仅在提示可用时显示）。点击后按浏览器原生对话框确认安装。
3. **iOS Safari**：点击分享按钮 → 「添加到主屏幕」。（使用 apple-mobile-web-app meta 实现类原生体验，无需按钮提示。）
4. 安装后以 standalone 模式运行（无浏览器 UI），主题色 #007AFF，启动 URL 相对，背景 #F5F5F7。

### 离线能力
- Service Worker (`public/sw.js`) 使用 cache-first + 运行时缓存策略预缓存/缓存：
  - index.html、manifest、核心 JS/CSS（包括 Vite 构建后的 hashed assets）、favicon、sample-data.csv 等 App Shell。
  - 首次访问后，后续即使断网也能加载界面 + 使用本地存储的最后数据（导入的 CSV 内容、账号、主题等均持久化在 localStorage）。
- 离线时仍可浏览仪表盘、图表、洞察、内容重塑工具（基于已加载/缓存数据 + mock）。导出等功能在无网时受限。
- 底部 footer 显示「离线就绪」徽章（SW 注册成功后）。

### 技术细节
- `public/manifest.json`：name/short_name/start_url/display/theme/background + 引用 favicon.svg 作为 icon（生产建议替换为 192/512 PNG）。
- `index.html`：添加 manifest link（%BASE_URL% 感知）、apple-mobile-web-app-* meta、apple-touch-icon、theme-color。
- App.tsx：beforeinstallprompt 状态 + deferredPrompt 处理；仅提示可用时在 Navbar 展示按钮；成功安装 toast "感谢安装！数据始终本地，离线可用"；mount 时注册 SW（演示始终启用）；swReady 状态驱动「离线就绪」徽章。
- 安装流程干净 Apple 风格（pill 按钮 + 系统原生 prompt）。
- 兼容 GitHub Pages 子路径部署（BASE_URL + 相对路径 + SW scope）。

安装后每天打开主屏图标即可快速查看个人创作者数据，无需网络。

---

## Technology

- React 19 + TypeScript
- Vite 8 (with HMR)
- Tailwind CSS + `@tailwindcss/vite`
- Recharts (beautiful, accessible charts)
- Framer Motion (refined animations)
- Lucide React (crisp icons)
- Sonner (elegant, Apple-like notifications)

All dependencies are lightweight and focused.

---

## Future Roadmap

- **More Platforms** — Weibo, YouTube, Instagram, TikTok, and others.
- **Real APIs** — Native connectors (optional future) - CSV/JSON import already fully functional for official exports.
- **Claude-Powered AI** — Replace rule-based insights with real Anthropic Claude (or equivalent) calls for deeply personalized, predictive recommendations and content strategy.
- **Persistent Data** — Local-first storage (IndexedDB) + optional opt-in sync.
- **Advanced Analytics** — Custom date ranges, cohort analysis, best-time-to-post heatmaps.
- **Dark Mode** — Automatic following system appearance.
- **Exports** — PDF reports and shareable public snapshot links.
- **PWA** — ✅ Installable (manifest + SW), offline shell + last data viewing, add-to-home on iOS/Android (complete).

Contributions that preserve the calm, premium, Apple-quality experience are especially welcome.

---

## Philosophy

Overlook exists because creator tools should feel as thoughtful as the content they help produce.

Less noise. More signal. Beautiful by default.

---

<p align="center">
  <strong>Overlook</strong> — for personal creators who care about craft.
</p>

<p align="center">
  <sub>MIT licensed. Local-first. Ready for GitHub Pages.</sub>
</p>
