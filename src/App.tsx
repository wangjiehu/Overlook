import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode, RefObject } from 'react'
import Papa from 'papaparse'
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Download,
  Eye,
  FileText,
  Flame,
  Heart,
  Lightbulb,
  Plus,
  Search,
  ShieldCheck,
  Smartphone,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  Users,
  WandSparkles,
} from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { Navbar } from './components/Navbar'
import { KPICard } from './components/KPICard'
import { useLocalStorage } from './hooks/useLocalStorage'
import type { Account, CalendarItem, Competitor, ContentItem, Goal, Platform, PlatformSummary, ViewKey } from './types'
import { PLATFORMS } from './types'
import {
  platformColors,
  platformSoftColors,
  seedAccounts,
  seedCalendar,
  seedCompetitors,
  seedContent,
  seedGoal,
} from './utils/mockData'

type ContentDraft = Omit<ContentItem, 'id'>
type CompetitorDraft = Omit<Competitor, 'id'>

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type BestSlot = {
  platform: Platform
  hour: number
  label: string
  score: number
}

const defaultHours: Record<Platform, number[]> = {
  Bilibili: [9, 10, 11, 20],
  Xiaohongshu: [20, 21, 22, 17],
  Douyin: [12, 19, 20, 21],
}

const contentMixColors = ['#0071e3', '#248a3d', '#ff9500', '#5856d6']

const emptyDraft: ContentDraft = {
  platform: 'Bilibili',
  title: '',
  type: '长视频',
  publishedAt: new Date().toISOString().slice(0, 10),
  hour: 10,
  views: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  saves: 0,
  followersGained: 0,
  pillar: '内容增长',
  campaign: '默认系列',
}

const emptyCompetitorDraft: CompetitorDraft = {
  platform: 'Xiaohongshu',
  name: '',
  followers: 0,
  avgViews: 0,
  engagementRate: 0,
  angle: '',
}

const statusLabel: Record<CalendarItem['status'], string> = {
  draft: '草稿',
  scheduled: '已排期',
  done: '已完成',
}

const accountStatusLabel: Record<Account['status'], string> = {
  connected: '已连接',
  manual: '手动维护',
  missing: '待补充',
}

const compactNumber = new Intl.NumberFormat('zh-CN', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const plainNumber = new Intl.NumberFormat('zh-CN')

function formatNumber(value: number) {
  return compactNumber.format(Math.max(0, value))
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function sumBy<T>(items: T[], pick: (item: T) => number) {
  return items.reduce((total, item) => total + pick(item), 0)
}

function toNumber(value: string | number | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const normalized = String(value ?? '').replace(/[,%，\s]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 10000)}`
}

function normalizePlatform(value: string): Platform | null {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  if (normalized.includes('bili') || normalized.includes('哔') || normalized.includes('b站')) return 'Bilibili'
  if (normalized.includes('xhs') || normalized.includes('red') || normalized.includes('小红书')) return 'Xiaohongshu'
  if (normalized.includes('douyin') || normalized.includes('tiktok') || normalized.includes('抖音')) return 'Douyin'
  return PLATFORMS.find((platform) => platform.toLowerCase() === normalized) ?? null
}

function readCell(row: Record<string, string>, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = row[key]?.trim()
    if (value) return value
  }
  return fallback
}

function parseImportedRow(row: Record<string, string>, index: number): ContentItem | null {
  const platform = normalizePlatform(readCell(row, ['平台', 'platform', 'Platform']))
  const title = readCell(row, ['标题', 'title', 'Title', '内容标题'])
  if (!platform || !title) return null

  return {
    id: makeId(`import-${index}`),
    platform,
    title,
    type: readCell(row, ['类型', 'type', 'format', '内容类型'], platform === 'Xiaohongshu' ? '图文笔记' : '短视频'),
    publishedAt: readCell(row, ['日期', 'date', 'publishedAt', '发布时间'], new Date().toISOString().slice(0, 10)).slice(0, 10),
    hour: Math.min(23, Math.max(0, Math.round(toNumber(readCell(row, ['小时', 'hour', '发布小时'], '20'))))),
    views: toNumber(readCell(row, ['播放量', 'views', '曝光', '阅读量'])),
    likes: toNumber(readCell(row, ['点赞', 'likes', '赞'])),
    comments: toNumber(readCell(row, ['评论', 'comments'])),
    shares: toNumber(readCell(row, ['分享', 'shares', '转发'])),
    saves: toNumber(readCell(row, ['收藏', 'saves', 'favorites'])),
    followersGained: toNumber(readCell(row, ['涨粉', 'followersGained', '新增粉丝'])),
    pillar: readCell(row, ['内容支柱', 'pillar', '主题'], '未分类'),
    campaign: readCell(row, ['活动', 'campaign', '系列'], '导入数据'),
  }
}

function buildPlatformSummaries(content: ContentItem[]): PlatformSummary[] {
  return PLATFORMS.map((platform) => {
    const items = content.filter((item) => item.platform === platform)
    const views = sumBy(items, (item) => item.views)
    const likes = sumBy(items, (item) => item.likes)
    const comments = sumBy(items, (item) => item.comments)
    const shares = sumBy(items, (item) => item.shares)
    const saves = sumBy(items, (item) => item.saves)
    const followersGained = sumBy(items, (item) => item.followersGained)
    const interactions = likes + comments + shares + saves
    const topContent = [...items].sort((a, b) => b.views - a.views)[0]

    return {
      platform,
      posts: items.length,
      views,
      likes,
      comments,
      shares,
      saves,
      followersGained,
      interactions,
      engagementRate: views > 0 ? (interactions / views) * 100 : 0,
      avgViews: items.length > 0 ? views / items.length : 0,
      topContent,
    }
  })
}

function getBestSlots(content: ContentItem[], platform: Platform): BestSlot[] {
  const scoped = content.filter((item) => item.platform === platform)
  const scoredHours = new Map<number, { score: number; count: number }>()

  scoped.forEach((item) => {
    const engagement = item.views > 0 ? ((item.likes + item.comments + item.shares + item.saves) / item.views) * 100 : 0
    const qualityScore = engagement * 2 + item.followersGained / 25 + Math.min(40, item.views / 3000)
    const existing = scoredHours.get(item.hour) ?? { score: 0, count: 0 }
    scoredHours.set(item.hour, { score: existing.score + qualityScore, count: existing.count + 1 })
  })

  const defaultCandidates = defaultHours[platform].map((hour, index) => ({
    platform,
    hour,
    label: `${String(hour).padStart(2, '0')}:00`,
    score: 72 - index * 5,
  }))

  const dataCandidates = [...scoredHours.entries()].map(([hour, value]) => ({
    platform,
    hour,
    label: `${String(hour).padStart(2, '0')}:00`,
    score: Math.round(value.score / Math.max(1, value.count)),
  }))

  return [...dataCandidates, ...defaultCandidates]
    .sort((a, b) => b.score - a.score)
    .filter((slot, index, slots) => slots.findIndex((candidate) => candidate.hour === slot.hour) === index)
    .slice(0, 3)
}

function createCalendar(content: ContentItem[], summaries: PlatformSummary[], slots: BestSlot[]): CalendarItem[] {
  const top = [...content].sort((a, b) => b.views - a.views)[0]
  const bestPlatform = [...summaries].sort((a, b) => b.engagementRate - a.engagementRate)[0]?.platform ?? 'Xiaohongshu'
  const topPillars = [...new Set(content.map((item) => item.pillar).filter(Boolean))].slice(0, 4)
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

  return days.map((day, index) => {
    const platform = PLATFORMS[index % PLATFORMS.length]
    const slot = slots.find((candidate) => candidate.platform === platform)
    const pillar = topPillars[index % Math.max(1, topPillars.length)] ?? '内容增长'
    const sourceTitle = top?.title ?? '本周最高互动内容'
    const format = platform === 'Bilibili' ? '长视频' : platform === 'Xiaohongshu' ? '图文笔记' : '短视频'

    return {
      id: makeId(`plan-${index}`),
      day,
      platform,
      title:
        platform === bestPlatform
          ? `${pillar}：复盘「${sourceTitle.slice(0, 16)}」`
          : `${pillar}：${platform} 适配版`,
      format,
      time: slot?.label ?? `${String(defaultHours[platform][0]).padStart(2, '0')}:00`,
      objective: index % 3 === 0 ? '拉新' : index % 3 === 1 ? '收藏' : '转化',
      status: index < 2 ? 'scheduled' : 'draft',
    }
  })
}

function buildInsightList(
  summaries: PlatformSummary[],
  content: ContentItem[],
  competitors: Competitor[],
  goal: Goal,
  slots: BestSlot[],
) {
  const insights: string[] = []
  const topPlatform = [...summaries].sort((a, b) => b.engagementRate - a.engagementRate)[0]
  const topContent = [...content].sort((a, b) => b.views - a.views)[0]
  const totalViews = sumBy(content, (item) => item.views)
  const totalFollowers = sumBy(content, (item) => item.followersGained)
  const bestSlot = slots[0]

  if (topPlatform) {
    insights.push(`${topPlatform.platform} 当前互动率最高，优先承接深度观点和商务转化。`)
  }

  if (topContent) {
    insights.push(`最高播放内容是「${topContent.title}」，可拆成短视频、图文卡片和长视频延展。`)
  }

  if (bestSlot) {
    insights.push(`${bestSlot.platform} 的优先发布窗口是 ${bestSlot.label}，可放入本周排期。`)
  }

  const saveRate = totalViews > 0 ? (sumBy(content, (item) => item.saves) / totalViews) * 100 : 0
  if (saveRate < 2.5) {
    insights.push('收藏率偏低，封面和正文需要更多清单、模板、步骤和可保存截图。')
  } else {
    insights.push('收藏率已经能支撑资料型选题，下一步应把高收藏内容转成系列。')
  }

  const strongestCompetitor = [...competitors].sort((a, b) => b.avgViews - a.avgViews)[0]
  if (strongestCompetitor) {
    insights.push(`对标账号「${strongestCompetitor.name}」的平均播放更高，差距点集中在「${strongestCompetitor.angle}」。`)
  }

  if (totalViews < goal.targetViews || totalFollowers < goal.targetFollowers) {
    insights.push('月度目标未满，优先做高复用选题，不要新增过多分散主题。')
  }

  return insights.slice(0, 6)
}

function downloadBlob(content: BlobPart, type: string, filename: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function OverlookApp() {
  const [activeView, setActiveView] = useState<ViewKey>('overview')
  const [content, setContent] = useLocalStorage<ContentItem[]>('overlook-content-v2', seedContent)
  const [accounts, setAccounts] = useLocalStorage<Account[]>('overlook-accounts-v2', seedAccounts)
  const [goal, setGoal] = useLocalStorage<Goal>('overlook-goal-v2', seedGoal)
  const [competitors, setCompetitors] = useLocalStorage<Competitor[]>('overlook-competitors-v2', seedCompetitors)
  const [calendar, setCalendar] = useLocalStorage<CalendarItem[]>('overlook-calendar-v2', seedCalendar)
  const [query, setQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState<'all' | Platform>('all')
  const [draft, setDraft] = useState<ContentDraft>(emptyDraft)
  const [competitorDraft, setCompetitorDraft] = useState<CompetitorDraft>(emptyCompetitorDraft)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [offlineReady, setOfflineReady] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
      const swUrl = `${import.meta.env.BASE_URL}sw.js`
      navigator.serviceWorker.register(swUrl).then(() => setOfflineReady(true)).catch(() => setOfflineReady(false))
    }

    const installHandler = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', installHandler)
    return () => window.removeEventListener('beforeinstallprompt', installHandler)
  }, [])

  const summaries = useMemo(() => buildPlatformSummaries(content), [content])
  const bestSlots = useMemo(() => PLATFORMS.flatMap((platform) => getBestSlots(content, platform)), [content])

  const totals = useMemo(() => {
    const views = sumBy(content, (item) => item.views)
    const likes = sumBy(content, (item) => item.likes)
    const comments = sumBy(content, (item) => item.comments)
    const shares = sumBy(content, (item) => item.shares)
    const saves = sumBy(content, (item) => item.saves)
    const followersGained = sumBy(content, (item) => item.followersGained)
    const interactions = likes + comments + shares + saves
    const accountFollowers = sumBy(accounts, (account) => account.followers)
    const engagementRate = views > 0 ? (interactions / views) * 100 : 0
    const sponsorScore = Math.min(100, Math.round(engagementRate * 3 + accountFollowers / 1800 + content.length * 1.5))

    return {
      views,
      likes,
      comments,
      shares,
      saves,
      followersGained,
      interactions,
      accountFollowers,
      engagementRate,
      sponsorScore,
    }
  }, [accounts, content])

  const trendData = useMemo(() => {
    const grouped = new Map<string, { date: string; views: number; interactions: number }>()
    content.forEach((item) => {
      const existing = grouped.get(item.publishedAt) ?? { date: item.publishedAt, views: 0, interactions: 0 }
      grouped.set(item.publishedAt, {
        date: item.publishedAt,
        views: existing.views + item.views,
        interactions: existing.interactions + item.likes + item.comments + item.shares + item.saves,
      })
    })

    return [...grouped.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-12)
      .map((item) => ({ ...item, day: item.date.slice(5) }))
  }, [content])

  const contentMix = useMemo(() => {
    const grouped = new Map<string, number>()
    content.forEach((item) => grouped.set(item.type, (grouped.get(item.type) ?? 0) + item.views))
    return [...grouped.entries()].map(([name, value]) => ({ name, value }))
  }, [content])

  const campaignRows = useMemo(() => {
    const grouped = new Map<string, { campaign: string; views: number; saves: number; followers: number; posts: number }>()
    content.forEach((item) => {
      const existing = grouped.get(item.campaign) ?? { campaign: item.campaign, views: 0, saves: 0, followers: 0, posts: 0 }
      grouped.set(item.campaign, {
        campaign: item.campaign,
        views: existing.views + item.views,
        saves: existing.saves + item.saves,
        followers: existing.followers + item.followersGained,
        posts: existing.posts + 1,
      })
    })
    return [...grouped.values()].sort((a, b) => b.views - a.views)
  }, [content])

  const topContent = useMemo(() => [...content].sort((a, b) => b.views - a.views).slice(0, 6), [content])

  const insights = useMemo(
    () => buildInsightList(summaries, content, competitors, goal, bestSlots),
    [bestSlots, competitors, content, goal, summaries],
  )

  const filteredContent = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return [...content]
      .filter((item) => {
        const matchesPlatform = platformFilter === 'all' || item.platform === platformFilter
        const matchesQuery =
          !normalizedQuery ||
          item.title.toLowerCase().includes(normalizedQuery) ||
          item.pillar.toLowerCase().includes(normalizedQuery) ||
          item.campaign.toLowerCase().includes(normalizedQuery)
        return matchesPlatform && matchesQuery
      })
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || b.views - a.views)
  }, [content, platformFilter, query])

  const benchmarkRows = useMemo(() => {
    return competitors.map((competitor) => {
      const own = summaries.find((summary) => summary.platform === competitor.platform)
      const ownAvgViews = own?.avgViews ?? 0
      const ownEngagement = own?.engagementRate ?? 0
      return {
        ...competitor,
        avgViewGap: ownAvgViews - competitor.avgViews,
        engagementGap: ownEngagement - competitor.engagementRate,
      }
    })
  }, [competitors, summaries])

  const repurposeCards = useMemo(() => {
    const source = topContent[0]
    if (!source) return []

    return PLATFORMS.filter((platform) => platform !== source.platform).map((platform) => {
      const format = platform === 'Bilibili' ? '长视频复盘' : platform === 'Xiaohongshu' ? '图文卡片' : '15 秒短视频'
      const hook =
        platform === 'Bilibili'
          ? `把「${source.title.slice(0, 18)}」扩成问题、过程、结果三段。`
          : platform === 'Xiaohongshu'
            ? `标题保留结果感，首图放 3 个可收藏步骤。`
            : `开头 3 秒直接给反差结论，再补一条操作证据。`
      return { platform, format, hook }
    })
  }, [topContent])

  const goalProgress = {
    views: Math.min(100, (totals.views / Math.max(1, goal.targetViews)) * 100),
    followers: Math.min(100, (totals.followersGained / Math.max(1, goal.targetFollowers)) * 100),
    sponsor: Math.min(100, (totals.sponsorScore / Math.max(1, goal.targetSponsorLeads * 10)) * 100),
  }

  const handleCSVImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data
          .map((row, index) => parseImportedRow(row, index))
          .filter((item): item is ContentItem => Boolean(item))

        if (parsed.length === 0) {
          toast.error('没有识别到有效内容')
          return
        }

        setContent((current) => [...parsed, ...current])
        toast.success(`已导入 ${parsed.length} 条内容`)
      },
      error: () => toast.error('CSV 解析失败'),
    })

    event.currentTarget.value = ''
  }

  const handleAddContent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.title.trim()) {
      toast.error('标题不能为空')
      return
    }

    setContent((current) => [{ ...draft, id: makeId('manual'), title: draft.title.trim() }, ...current])
    setDraft({ ...emptyDraft, platform: draft.platform, type: draft.type, hour: draft.hour })
    toast.success('内容已加入看板')
  }

  const handleAddCompetitor = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!competitorDraft.name.trim()) {
      toast.error('对标账号不能为空')
      return
    }

    setCompetitors((current) => [{ ...competitorDraft, id: makeId('competitor'), name: competitorDraft.name.trim() }, ...current])
    setCompetitorDraft(emptyCompetitorDraft)
    toast.success('对标账号已加入')
  }

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      content,
      accounts,
      goal,
      competitors,
      calendar,
      summaries,
      insights,
    }

    downloadBlob(JSON.stringify(payload, null, 2), 'application/json;charset=utf-8', `overlook-report-${new Date().toISOString().slice(0, 10)}.json`)
    toast.success('JSON 已导出')
  }

  const handleExportCsv = () => {
    const csv = Papa.unparse(
      content.map((item) => ({
        平台: item.platform,
        标题: item.title,
        类型: item.type,
        日期: item.publishedAt,
        小时: item.hour,
        播放量: item.views,
        点赞: item.likes,
        评论: item.comments,
        分享: item.shares,
        收藏: item.saves,
        涨粉: item.followersGained,
        内容支柱: item.pillar,
        活动: item.campaign,
      })),
    )

    downloadBlob(csv, 'text/csv;charset=utf-8', `overlook-content-${new Date().toISOString().slice(0, 10)}.csv`)
    toast.success('CSV 已导出')
  }

  const handleExportReport = async () => {
    if (!reportRef.current) return
    const toastId = toast.loading('正在生成报告')

    try {
      const [{ jsPDF }, html2canvasModule] = await Promise.all([import('jspdf'), import('html2canvas')])
      const canvas = await html2canvasModule.default(reportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 24
      const imageWidth = pageWidth - margin * 2
      const imageHeight = (canvas.height / canvas.width) * imageWidth
      const fittedHeight = Math.min(imageHeight, pageHeight - margin * 2)

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, imageWidth, fittedHeight)
      pdf.save(`overlook-brand-report-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('品牌报告 PDF 已生成', { id: toastId })
    } catch {
      toast.error('PDF 生成失败', { id: toastId })
    }
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      toast.success('已安装')
    }
    setDeferredPrompt(null)
  }

  const handleGenerateCalendar = () => {
    setCalendar(createCalendar(content, summaries, bestSlots))
    toast.success('本周计划已生成')
  }

  const copyPlan = async () => {
    const text = calendar.map((item) => `${item.day} ${item.time}｜${item.platform}｜${item.title}｜${statusLabel[item.status]}`).join('\n')
    await navigator.clipboard.writeText(text)
    toast.success('计划已复制')
  }

  const resetWorkspace = () => {
    setContent(seedContent)
    setAccounts(seedAccounts)
    setCompetitors(seedCompetitors)
    setCalendar(seedCalendar)
    setGoal(seedGoal)
    toast.success('示例工作区已恢复')
  }

  return (
    <div className="app-shell">
      <Toaster position="top-right" richColors closeButton />
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        onImportClick={() => fileInputRef.current?.click()}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        onExportReport={handleExportReport}
        onResetWorkspace={resetWorkspace}
        onInstall={handleInstall}
        showInstall={Boolean(deferredPrompt)}
      />
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={handleCSVImport} />

      <main className="app-main">
        <section className="workspace-header">
          <div className="workspace-title">
            <div className="eyebrow">今日经营状态</div>
            <h1>创作者经营看板</h1>
          </div>
          <div className="status-strip" aria-label="总览状态">
            <p>
              <strong>{content.length}</strong>
              <span>内容</span>
            </p>
            <p>
              <strong>{PLATFORMS.length}</strong>
              <span>平台</span>
            </p>
            <p>
              <strong>{Math.round(goalProgress.views)}%</strong>
              <span>播放目标</span>
            </p>
            <p>
              <strong>{totals.sponsorScore}</strong>
              <span>合作准备度</span>
            </p>
            <p>
              <strong>{offlineReady ? '可用' : '本地'}</strong>
              <span>{offlineReady ? '离线模式' : '浏览器保存'}</span>
            </p>
          </div>
        </section>

        {activeView === 'overview' && (
          <div className="view-stack view-stack--overview">
            <section className="kpi-grid">
              <KPICard icon={<Eye size={18} />} label="总播放" value={formatNumber(totals.views)} helper={`${content.length} 条内容`} tone="blue" />
              <KPICard icon={<Heart size={18} />} label="互动率" value={formatPercent(totals.engagementRate)} helper={`${formatNumber(totals.interactions)} 次互动`} tone="rose" />
              <KPICard icon={<Users size={18} />} label="新增粉丝" value={formatNumber(totals.followersGained)} helper={`${formatNumber(totals.accountFollowers)} 总粉丝`} tone="teal" />
              <KPICard icon={<Trophy size={18} />} label="合作准备度" value={`${totals.sponsorScore}/100`} helper="基于互动、粉丝和内容量" tone="amber" />
            </section>

            <section className="dashboard-grid">
              <article className="panel panel--wide">
                <SectionTitle icon={<TrendingUp size={18} />} title="内容表现趋势" action={`${trendData.length} 个时间点`} />
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="4 4" />
                      <XAxis dataKey="day" />
                      <YAxis tickFormatter={(value: number) => formatNumber(value)} width={48} />
                      <Tooltip formatter={(value: number) => plainNumber.format(value)} />
                      <Line type="monotone" dataKey="views" stroke="#0071e3" strokeWidth={3} dot={false} name="播放" isAnimationActive={false} />
                      <Line type="monotone" dataKey="interactions" stroke="#248a3d" strokeWidth={2} dot={false} name="互动" isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="panel">
                <SectionTitle icon={<Database size={18} />} title="内容结构" action="按播放量" />
                <div className="chart-box chart-box--compact">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={contentMix} dataKey="value" nameKey="name" innerRadius={44} outerRadius={68} paddingAngle={3} isAnimationActive={false}>
                        {contentMix.map((entry, index) => (
                          <Cell key={entry.name} fill={contentMixColors[index % contentMixColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatNumber(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="compact-legend" aria-label="内容类型占比">
                  {contentMix.map((entry, index) => (
                    <span key={entry.name}>
                      <i style={{ background: contentMixColors[index % contentMixColors.length] }} />
                      {entry.name}
                    </span>
                  ))}
                </div>
              </article>
            </section>

            <section className="dashboard-grid">
              <article className="panel">
                <SectionTitle icon={<Lightbulb size={18} />} title="运营判断" action="实时" />
                <div className="insight-list">
                  {insights.map((insight) => (
                    <div className="insight-item" key={insight}>
                      <Lightbulb size={16} />
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel">
                <SectionTitle icon={<Flame size={18} />} title="平台表现" action="互动率排序" />
                <div className="platform-list">
                  {[...summaries]
                    .sort((a, b) => b.engagementRate - a.engagementRate)
                    .map((summary) => (
                      <div className="platform-row" key={summary.platform}>
                        <span className="platform-dot" style={{ background: platformColors[summary.platform] }} />
                        <div>
                          <strong>{summary.platform}</strong>
                          <small>{summary.topContent?.title ?? '暂无内容'}</small>
                        </div>
                        <span>{formatPercent(summary.engagementRate)}</span>
                      </div>
                    ))}
                </div>
              </article>
            </section>

            <article className="panel">
              <SectionTitle icon={<CalendarDays size={18} />} title="选题系列" action="按播放排序" />
              <div className="campaign-grid">
                {campaignRows.map((campaign) => (
                  <div className="campaign-card" key={campaign.campaign}>
                    <strong>{campaign.campaign}</strong>
                    <span>{campaign.posts} 条内容</span>
                    <div className="mini-metrics">
                      <span>{formatNumber(campaign.views)} 播放</span>
                      <span>{formatNumber(campaign.saves)} 收藏</span>
                      <span>{formatNumber(campaign.followers)} 涨粉</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        )}

        {activeView === 'content' && (
          <div className="view-stack view-stack--content">
            <section className="panel">
              <SectionTitle icon={<Plus size={18} />} title="新增内容" action="本地保存" />
              <form className="content-form" onSubmit={handleAddContent}>
                <label>
                  平台
                  <select value={draft.platform} onChange={(event) => setDraft({ ...draft, platform: event.target.value as Platform })}>
                    {PLATFORMS.map((platform) => (
                      <option key={platform}>{platform}</option>
                    ))}
                  </select>
                </label>
                <label className="span-2">
                  标题
                  <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="内容标题" />
                </label>
                <label>
                  类型
                  <input value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })} />
                </label>
                <label>
                  日期
                  <input type="date" value={draft.publishedAt} onChange={(event) => setDraft({ ...draft, publishedAt: event.target.value })} />
                </label>
                <label>
                  小时
                  <input type="number" min="0" max="23" value={draft.hour} onChange={(event) => setDraft({ ...draft, hour: toNumber(event.target.value) })} />
                </label>
                <label>
                  播放
                  <input type="number" min="0" value={draft.views} onChange={(event) => setDraft({ ...draft, views: toNumber(event.target.value) })} />
                </label>
                <label>
                  点赞
                  <input type="number" min="0" value={draft.likes} onChange={(event) => setDraft({ ...draft, likes: toNumber(event.target.value) })} />
                </label>
                <label>
                  收藏
                  <input type="number" min="0" value={draft.saves} onChange={(event) => setDraft({ ...draft, saves: toNumber(event.target.value) })} />
                </label>
                <label>
                  涨粉
                  <input
                    type="number"
                    min="0"
                    value={draft.followersGained}
                    onChange={(event) => setDraft({ ...draft, followersGained: toNumber(event.target.value) })}
                  />
                </label>
                <label>
                  支柱
                  <input value={draft.pillar} onChange={(event) => setDraft({ ...draft, pillar: event.target.value })} />
                </label>
                <label>
                  活动
                  <input value={draft.campaign} onChange={(event) => setDraft({ ...draft, campaign: event.target.value })} />
                </label>
                <button className="action-button" type="submit">
                  <Plus size={16} />
                  添加
                </button>
              </form>
            </section>

            <section className="panel">
              <SectionTitle icon={<Search size={18} />} title="内容库" action={`${filteredContent.length} 条`} />
              <div className="table-toolbar">
                <div className="search-field">
                  <Search size={16} />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、主题、活动" />
                </div>
                <select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value as 'all' | Platform)}>
                  <option value="all">全部平台</option>
                  {PLATFORMS.map((platform) => (
                    <option key={platform}>{platform}</option>
                  ))}
                </select>
                <button className="action-button action-button--ghost" onClick={handleExportCsv}>
                  <Download size={16} />
                  CSV
                </button>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>内容</th>
                      <th>平台</th>
                      <th>播放</th>
                      <th>互动</th>
                      <th>收藏</th>
                      <th>日期</th>
                      <th aria-label="操作" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContent.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.title}</strong>
                          <small>
                            {item.type} · {item.pillar} · {item.campaign}
                          </small>
                        </td>
                        <td>
                          <span className="platform-chip" style={{ background: platformSoftColors[item.platform], color: platformColors[item.platform] }}>
                            {item.platform}
                          </span>
                        </td>
                        <td>{formatNumber(item.views)}</td>
                        <td>{formatNumber(item.likes + item.comments + item.shares + item.saves)}</td>
                        <td>{formatNumber(item.saves)}</td>
                        <td>
                          {item.publishedAt} {String(item.hour).padStart(2, '0')}:00
                        </td>
                        <td>
                          <button
                            className="icon-button icon-button--danger"
                            onClick={() => setContent((current) => current.filter((contentItem) => contentItem.id !== item.id))}
                            aria-label={`删除 ${item.title}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {activeView === 'planner' && (
          <div className="view-stack view-stack--planner">
            <section className="dashboard-grid">
              <article className="panel">
                <SectionTitle icon={<Target size={18} />} title="月度目标" action={goal.month} />
                <div className="goal-form">
                  <label>
                    播放目标
                    <input type="number" min="1" value={goal.targetViews} onChange={(event) => setGoal({ ...goal, targetViews: toNumber(event.target.value) })} />
                  </label>
                  <label>
                    涨粉目标
                    <input
                      type="number"
                      min="1"
                      value={goal.targetFollowers}
                      onChange={(event) => setGoal({ ...goal, targetFollowers: toNumber(event.target.value) })}
                    />
                  </label>
                  <label>
                    商务线索
                    <input
                      type="number"
                      min="1"
                      value={goal.targetSponsorLeads}
                      onChange={(event) => setGoal({ ...goal, targetSponsorLeads: toNumber(event.target.value) })}
                    />
                  </label>
                </div>
                <Progress label="播放" value={goalProgress.views} detail={`${formatNumber(totals.views)} / ${formatNumber(goal.targetViews)}`} />
                <Progress label="涨粉" value={goalProgress.followers} detail={`${formatNumber(totals.followersGained)} / ${formatNumber(goal.targetFollowers)}`} />
                <Progress label="合作准备" value={goalProgress.sponsor} detail={`${totals.sponsorScore}/100`} />
              </article>

              <article className="panel">
                <SectionTitle icon={<Clock size={18} />} title="优先发布窗口" action="按历史表现" />
                <div className="slot-grid">
                  {PLATFORMS.map((platform) => (
                    <div className="slot-card" key={platform}>
                      <span className="platform-dot" style={{ background: platformColors[platform] }} />
                      <strong>{platform}</strong>
                      <div>
                        {bestSlots
                          .filter((slot) => slot.platform === platform)
                          .map((slot) => (
                            <span key={`${platform}-${slot.hour}`} className="time-pill">
                              {slot.label}
                            </span>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="panel">
              <SectionTitle icon={<CalendarDays size={18} />} title="本周排期" action={`${calendar.length} 项`} />
              <div className="section-actions">
                <button className="action-button" onClick={handleGenerateCalendar}>
                  <WandSparkles size={16} />
                  生成
                </button>
                <button className="action-button action-button--ghost" onClick={copyPlan}>
                  <Copy size={16} />
                  复制
                </button>
              </div>
              <div className="calendar-grid">
                {calendar.map((item) => (
                  <article className={`calendar-card calendar-card--${item.status}`} key={item.id}>
                    <div className="calendar-card__top">
                      <span>{item.day}</span>
                      <button
                        className="status-pill"
                        onClick={() =>
                          setCalendar((current) =>
                            current.map((entry) => {
                              if (entry.id !== item.id) return entry
                              const order: CalendarItem['status'][] = ['draft', 'scheduled', 'done']
                              return { ...entry, status: order[(order.indexOf(entry.status) + 1) % order.length] }
                            }),
                          )
                        }
                      >
                        {statusLabel[item.status]}
                      </button>
                    </div>
                    <strong>{item.title}</strong>
                    <small>
                      {item.platform} · {item.format} · {item.time}
                    </small>
                    <span className="objective-pill">{item.objective}</span>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel">
              <SectionTitle icon={<WandSparkles size={18} />} title="跨平台重塑" action={topContent[0]?.platform ?? 'Top 内容'} />
              <div className="repurpose-grid">
                {repurposeCards.map((card) => (
                  <article className="repurpose-card" key={card.platform}>
                    <span className="platform-chip" style={{ background: platformSoftColors[card.platform], color: platformColors[card.platform] }}>
                      {card.platform}
                    </span>
                    <strong>{card.format}</strong>
                    <p>{card.hook}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeView === 'benchmarks' && (
          <div className="view-stack view-stack--benchmarks">
            <section className="panel">
              <SectionTitle icon={<Trophy size={18} />} title="对标账号" action={`${competitors.length} 个`} />
              <form className="content-form benchmark-form" onSubmit={handleAddCompetitor}>
                <label>
                  平台
                  <select value={competitorDraft.platform} onChange={(event) => setCompetitorDraft({ ...competitorDraft, platform: event.target.value as Platform })}>
                    {PLATFORMS.map((platform) => (
                      <option key={platform}>{platform}</option>
                    ))}
                  </select>
                </label>
                <label>
                  账号
                  <input value={competitorDraft.name} onChange={(event) => setCompetitorDraft({ ...competitorDraft, name: event.target.value })} />
                </label>
                <label>
                  粉丝
                  <input
                    type="number"
                    min="0"
                    value={competitorDraft.followers}
                    onChange={(event) => setCompetitorDraft({ ...competitorDraft, followers: toNumber(event.target.value) })}
                  />
                </label>
                <label>
                  均播
                  <input
                    type="number"
                    min="0"
                    value={competitorDraft.avgViews}
                    onChange={(event) => setCompetitorDraft({ ...competitorDraft, avgViews: toNumber(event.target.value) })}
                  />
                </label>
                <label>
                  互动率 %
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={competitorDraft.engagementRate}
                    onChange={(event) => setCompetitorDraft({ ...competitorDraft, engagementRate: toNumber(event.target.value) })}
                  />
                </label>
                <label className="span-2">
                  角度
                  <input value={competitorDraft.angle} onChange={(event) => setCompetitorDraft({ ...competitorDraft, angle: event.target.value })} />
                </label>
                <button className="action-button" type="submit">
                  <Plus size={16} />
                  添加
                </button>
              </form>
            </section>

            <section className="panel">
              <SectionTitle icon={<AlertTriangle size={18} />} title="差距扫描" action="手动对标" />
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>账号</th>
                      <th>平台</th>
                      <th>均播差</th>
                      <th>互动率差</th>
                      <th>内容角度</th>
                      <th aria-label="操作" />
                    </tr>
                  </thead>
                  <tbody>
                    {benchmarkRows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <strong>{row.name}</strong>
                          <small>{formatNumber(row.followers)} 粉丝</small>
                        </td>
                        <td>{row.platform}</td>
                        <td className={row.avgViewGap >= 0 ? 'positive' : 'negative'}>{formatNumber(Math.abs(row.avgViewGap))}</td>
                        <td className={row.engagementGap >= 0 ? 'positive' : 'negative'}>
                          {row.engagementGap >= 0 ? '+' : '-'}
                          {formatPercent(Math.abs(row.engagementGap))}
                        </td>
                        <td>{row.angle}</td>
                        <td>
                          <button
                            className="icon-button icon-button--danger"
                            onClick={() => setCompetitors((current) => current.filter((competitor) => competitor.id !== row.id))}
                            aria-label={`删除 ${row.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <SectionTitle icon={<Flame size={18} />} title="能力覆盖" action="V1" />
              <div className="market-grid">
                {[
                  ['最佳发布时间', '基于历史表现生成窗口，并写入排期。'],
                  ['竞品对标', '手动维护同赛道账号，输出均播和互动差距。'],
                  ['趋势素材池', '用内容支柱、活动和收藏率判断可复用主题。'],
                  ['品牌报告', 'PDF、JSON、CSV 三种交付面。'],
                ].map(([title, detail]) => (
                  <div className="market-card" key={title}>
                    <CheckCircle2 size={16} />
                    <strong>{title}</strong>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeView === 'accounts' && (
          <div className="view-stack view-stack--accounts">
            <section className="account-grid">
              {accounts.map((account) => (
                <article className="panel account-card" key={account.platform}>
                  <SectionTitle icon={<ShieldCheck size={18} />} title={account.platform} action={accountStatusLabel[account.status]} />
                  <label>
                    账号
                    <input
                      value={account.handle}
                      onChange={(event) =>
                        setAccounts((current) =>
                          current.map((entry) => (entry.platform === account.platform ? { ...entry, handle: event.target.value } : entry)),
                        )
                      }
                    />
                  </label>
                  <label>
                    粉丝
                    <input
                      type="number"
                      min="0"
                      value={account.followers}
                      onChange={(event) =>
                        setAccounts((current) =>
                          current.map((entry) =>
                            entry.platform === account.platform ? { ...entry, followers: toNumber(event.target.value), status: 'manual' } : entry,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    状态
                    <select
                      value={account.status}
                      onChange={(event) =>
                        setAccounts((current) =>
                          current.map((entry) =>
                            entry.platform === account.platform ? { ...entry, status: event.target.value as Account['status'] } : entry,
                          ),
                        )
                      }
                    >
                      <option value="connected">connected</option>
                      <option value="manual">manual</option>
                      <option value="missing">missing</option>
                    </select>
                  </label>
                  <small>Last sync: {account.lastSync}</small>
                </article>
              ))}
            </section>

            <section className="dashboard-grid">
              <article className="panel">
                <SectionTitle icon={<Smartphone size={18} />} title="PWA" action={offlineReady ? '离线就绪' : '等待缓存'} />
                <div className="health-list">
                  <HealthRow ok={offlineReady} label="Service Worker" />
                  <HealthRow ok={content.length > 0} label="本地数据" />
                  <HealthRow ok={totals.sponsorScore >= 60} label="合作报告素材" />
                  <HealthRow ok={competitors.length > 0} label="竞品样本" />
                </div>
              </article>

              <article className="panel">
                <SectionTitle icon={<FileText size={18} />} title="发布面" action="GitHub Pages" />
                <div className="health-list">
                  <HealthRow ok label="静态构建" />
                  <HealthRow ok label="相对路径部署" />
                  <HealthRow ok label="CSV / JSON / PDF 导出" />
                  <HealthRow ok label="本地优先存储" />
                </div>
              </article>
            </section>
          </div>
        )}
      </main>

      <ReportSheet
        refNode={reportRef}
        totals={totals}
        summaries={summaries}
        insights={insights}
        topContent={topContent}
        calendar={calendar}
        goal={goal}
      />
    </div>
  )
}

function SectionTitle({ icon, title, action }: { icon: ReactNode; title: string; action?: string }) {
  return (
    <div className="section-title">
      <div>
        <span className="section-title__icon">{icon}</span>
        <h2>{title}</h2>
      </div>
      {action && <span>{action}</span>}
    </div>
  )
}

function Progress({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="progress-row">
      <div>
        <span>{label}</span>
        <strong>{detail}</strong>
      </div>
      <div className="progress-track" aria-label={`${label} ${Math.round(value)}%`}>
        <span style={{ width: `${Math.round(value)}%` }} />
      </div>
    </div>
  )
}

function HealthRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="health-row">
      {ok ? <CheckCircle2 size={16} className="positive" /> : <AlertTriangle size={16} className="negative" />}
      <span>{label}</span>
    </div>
  )
}

function ReportSheet({
  refNode,
  totals,
  summaries,
  insights,
  topContent,
  calendar,
  goal,
}: {
  refNode: RefObject<HTMLDivElement | null>
  totals: {
    views: number
    interactions: number
    followersGained: number
    engagementRate: number
    sponsorScore: number
  }
  summaries: PlatformSummary[]
  insights: string[]
  topContent: ContentItem[]
  calendar: CalendarItem[]
  goal: Goal
}) {
  return (
    <div className="report-sheet" ref={refNode} aria-hidden="true">
      <header>
        <span>Overlook</span>
        <h1>创作者经营报告</h1>
        <p>
          {goal.month} · {new Date().toLocaleDateString('zh-CN')}
        </p>
      </header>
      <section className="report-metrics">
        <div>
          <strong>{formatNumber(totals.views)}</strong>
          <span>总播放</span>
        </div>
        <div>
          <strong>{formatNumber(totals.interactions)}</strong>
          <span>总互动</span>
        </div>
        <div>
          <strong>{formatPercent(totals.engagementRate)}</strong>
          <span>互动率</span>
        </div>
        <div>
          <strong>{totals.sponsorScore}/100</strong>
          <span>合作准备度</span>
        </div>
      </section>
      <section>
        <h2>平台摘要</h2>
        {summaries.map((summary) => (
          <p key={summary.platform}>
            {summary.platform}: {formatNumber(summary.views)} 播放，{formatPercent(summary.engagementRate)} 互动率，Top 内容：
            {summary.topContent?.title ?? '暂无'}。
          </p>
        ))}
      </section>
      <section>
        <h2>关键判断</h2>
        <ul>
          {insights.slice(0, 5).map((insight) => (
            <li key={insight}>{insight}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Top 内容</h2>
        {topContent.slice(0, 5).map((item) => (
          <p key={item.id}>
            {item.platform} · {item.title} · {formatNumber(item.views)} 播放 · {formatNumber(item.saves)} 收藏
          </p>
        ))}
      </section>
      <section>
        <h2>本周排期</h2>
        {calendar.slice(0, 5).map((item) => (
          <p key={item.id}>
            {item.day} {item.time} · {item.platform} · {item.title}
          </p>
        ))}
      </section>
    </div>
  )
}

export default OverlookApp
