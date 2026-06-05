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

As an independent developer, lifestyle note-taker, or short-form video creator, you juggle multiple platforms with fragmented data. Overlook brings everything into one calm, focused interface — no spreadsheets, no tab-switching fatigue, just clarity.

Track views, likes, comments, shares, followers, engagement rates, and top content at a glance. Discover cross-platform patterns. Get intelligent growth recommendations. Export polished reports.

It's the dashboard you wish the platforms themselves provided — refined, private, and designed for creators who value quality over noise.

---

## Key Features

- **Unified KPI Overview** — Total plays, likes, followers, and average engagement across all three platforms in beautiful large-number cards.
- **Cross-Platform Charts** — Interactive bar, donut, and smooth line visualizations powered by Recharts showing comparisons and 30-day trends.
- **Platform Deep Dives** — Dedicated cards for each platform with growth indicators, key metrics, and highlighted top-performing content.
- **Recent Content Table** — Clean, sortable-style view of your latest videos and notes with performance numbers.
- **AI Growth Insights & Content Ideas** — Dynamic, data-driven suggestions + Content Repurposing Generator (e.g., turn Bilibili video into Xiaohongshu notes). Ready for real Claude.
- **Advanced Data Exploration** — Real-time search, platform filters, date range picker, sorted content performance.
- **Account Management** — Mock-connected accounts with easy add/remove flow, visual status, and persistence.
- **Export & Import** — One-click JSON report export. Full CSV import (PapaParse) - use sample or real exports to merge your data; clear imported anytime.
- **Delightful Interactions** — Smooth tab transitions with Framer Motion, elegant toasts via Sonner, lift-on-hover cards, dark mode.

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
- **PWA** — Installable, offline-capable experience for mobile creators.

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
