import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'

const outDir = path.join(tmpdir(), 'overlook-visual-smoke')
mkdirSync(outDir, { recursive: true })
const importCsvPath = path.join(outDir, 'import-smoke.csv')
const workspaceJsonPath = path.join(outDir, 'workspace-smoke.json')
writeFileSync(
  importCsvPath,
  [
    '平台,标题,类型,日期,小时,播放量,点赞,评论,分享,收藏,涨粉,内容支柱,系列,标签,受众,钩子,意图',
    'Bilibili,导入验证内容,长视频,2026-06-01,9,100,10,1,1,2,3,验证,导入测试,测试;验证,个人创作者,开头给结果,growth',
    'Bilibili,导入验证内容,长视频,2026-06-01,9,100,10,1,1,2,3,验证,导入测试,测试;验证,个人创作者,重复行,growth',
    '小红书,,图文,not-a-date,10,20,2,0,0,1,0,验证,导入测试,,,,',
  ].join('\n'),
)
writeFileSync(
  workspaceJsonPath,
  JSON.stringify({
    version: 3,
    exportedAt: '2026-06-08T00:00:00.000Z',
    content: [],
    accounts: [],
    goal: { month: '2026-06', targetViews: 1, targetFollowers: 1, targetSponsorLeads: 1 },
    competitors: [],
    competitorSnapshots: [],
    calendar: [],
  }),
)

function findFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.unref()
    probe.on('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      const port = typeof address === 'object' && address ? address.port : 4173
      probe.close(() => resolve(port))
    })
  })
}

const port = await findFreePort()
const baseUrl = `http://127.0.0.1:${port}/`
const viteCli = path.join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js')
const server = spawn(process.execPath, [viteCli, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
})

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForPreview() {
  for (let index = 0; index < 80; index += 1) {
    try {
      const response = await fetch(baseUrl)
      if (response.ok) return
    } catch {
      // preview is still starting
    }
    await sleep(150)
  }
  throw new Error('Vite preview did not become ready')
}

async function readMetrics(page) {
  return page.evaluate(() => {
    const doc = document.documentElement
    return {
      viewport: [window.innerWidth, window.innerHeight],
      scroll: [doc.scrollWidth, doc.scrollHeight],
      overflowX: doc.scrollWidth > window.innerWidth + 1,
      overflowY: doc.scrollHeight > window.innerHeight + 1,
      tabs: document.querySelectorAll('.tab-button').length,
      panels: document.querySelectorAll('.panel').length,
      commands: document.querySelectorAll('.nav-actions button').length,
    }
  })
}

const desktopViews = [
  { key: 'overview', label: '总览' },
  { key: 'content', label: '内容库' },
  { key: 'planner', label: '计划' },
  { key: 'benchmarks', label: '对标' },
  { key: 'accounts', label: '账号' },
]

async function assertDesktopView(page, view) {
  await page.locator(`.tab-button[data-view="${view.key}"]`).click()
  await page.waitForTimeout(100)
  const metrics = await readMetrics(page)
  if (metrics.overflowX || metrics.overflowY) {
    throw new Error(`${view.label} desktop overflow: ${JSON.stringify(metrics)}`)
  }
  if (metrics.tabs !== 5 || metrics.commands < 5 || metrics.panels < 1) {
    throw new Error(`${view.label} desktop missing controls: ${JSON.stringify(metrics)}`)
  }

  const criticalFits = await page.evaluate((viewKey) => {
    const selectorMap = {
      overview: ['.experiment-list'],
      content: ['.content-form'],
      planner: ['.progress-grid', '.slot-grid', '.repurpose-grid'],
      benchmarks: ['.snapshot-grid'],
      accounts: ['.health-list'],
    }
    return (selectorMap[viewKey] || []).flatMap((selector) =>
      [...document.querySelectorAll(selector)].map((element) => ({
        selector,
        scroll: [element.scrollWidth, element.scrollHeight],
        client: [element.clientWidth, element.clientHeight],
        fits: element.scrollWidth <= element.clientWidth + 4 && element.scrollHeight <= element.clientHeight + 4,
      })),
    )
  }, view.key)
  const clipped = criticalFits.filter((item) => !item.fits)
  if (clipped.length > 0) {
    throw new Error(`${view.label} desktop clipped critical content: ${JSON.stringify(clipped)}`)
  }
}

async function main() {
  await waitForPreview()
  const browser = await chromium.launch()
  try {
    const desktop = await browser.newPage({ viewport: { width: 1280, height: 760 } })
    await desktop.goto(baseUrl)
    for (const view of desktopViews) {
      await assertDesktopView(desktop, view)
    }

    await desktop.locator('.tab-button[data-view="benchmarks"]').click()
    await desktop.locator('input[placeholder="@handle 或账号名"]').fill('@auto_scan_demo')
    await desktop.waitForTimeout(800)
    const scannedDraft = await desktop.evaluate(() => {
      const inputs = [...document.querySelectorAll('.benchmark-form input')]
      return {
        account: inputs[0]?.value,
        followers: Number(inputs[1]?.value ?? 0),
        avgViews: Number(inputs[2]?.value ?? 0),
        engagementRate: Number(inputs[3]?.value ?? 0),
        angle: inputs[4]?.value ?? '',
        status: document.querySelector('.section-title span:last-child')?.textContent ?? '',
      }
    })
    if (!scannedDraft.account || scannedDraft.followers <= 0 || scannedDraft.avgViews <= 0 || scannedDraft.engagementRate <= 0 || !scannedDraft.angle) {
      throw new Error(`competitor auto scan failed: ${JSON.stringify(scannedDraft)}`)
    }

    await desktop.locator('.tab-button[data-view="content"]').click()
    await desktop.locator('input[accept=".csv,text/csv"]').setInputFiles(importCsvPath)
    await desktop.getByRole('dialog', { name: 'CSV 导入预览' }).waitFor()
    const importMetrics = await desktop.locator('.preview-metrics strong').allTextContents()
    if (importMetrics.join('|') !== '3|1|1|1') {
      throw new Error(`CSV preview metrics changed: ${JSON.stringify(importMetrics)}`)
    }
    await desktop.keyboard.press('Escape')
    await desktop.getByRole('dialog', { name: 'CSV 导入预览' }).waitFor({ state: 'hidden' })

    await desktop.locator('input[accept="application/json,.json"]').setInputFiles(workspaceJsonPath)
    await desktop.getByRole('dialog', { name: '工作区恢复预览' }).waitFor()
    await desktop.keyboard.press('Escape')
    await desktop.getByRole('dialog', { name: '工作区恢复预览' }).waitFor({ state: 'hidden' })

    await desktop.locator('.tab-button[data-view="overview"]').click()
    await desktop.locator('.tab-button--active[data-view="overview"]').waitFor()
    await desktop.locator('.recharts-surface').first().waitFor()
    await desktop.waitForTimeout(300)
    await desktop.screenshot({ path: path.join(outDir, 'desktop-1280x760.png'), fullPage: false })

    const wide = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await wide.goto(baseUrl)
    await wide.locator('.recharts-surface').first().waitFor()
    await wide.waitForTimeout(300)
    const wideMetrics = await readMetrics(wide)
    if (wideMetrics.overflowX || wideMetrics.overflowY) {
      throw new Error(`wide desktop overflow: ${JSON.stringify(wideMetrics)}`)
    }
    await wide.screenshot({ path: path.join(outDir, 'desktop-1440.png'), fullPage: false })

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true })
    await mobile.goto(baseUrl)
    const mobileMetrics = await readMetrics(mobile)
    if (mobileMetrics.overflowX || mobileMetrics.tabs !== 5) {
      throw new Error(`mobile layout failure: ${JSON.stringify(mobileMetrics)}`)
    }
    await mobile.screenshot({ path: path.join(outDir, 'mobile-390.png'), fullPage: false })

    console.log(`visual smoke passed; screenshots: ${outDir}`)
  } finally {
    await browser.close()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => {
    server.kill()
  })
