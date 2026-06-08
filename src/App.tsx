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
  Undo2,
  Users,
  WandSparkles,
} from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { Navbar } from './components/Navbar'
import { KPICard } from './components/KPICard'
import { useLocalStorage } from './hooks/useLocalStorage'
import type { Account, CalendarItem, Competitor, CompetitorSnapshot, ContentIntent, ContentItem, Goal, Platform, PlatformSummary, ViewKey } from './types'
import { PLATFORMS } from './types'
import {
  platformColors,
  platformSoftColors,
  seedAccounts,
  seedCalendar,
  seedCompetitorSnapshots,
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

type ParsedImportRow = {
  rowNumber: number
  item: ContentItem | null
  issues: string[]
  duplicate: boolean
}

type ImportFieldKey =
  | 'platform'
  | 'title'
  | 'type'
  | 'publishedAt'
  | 'hour'
  | 'views'
  | 'likes'
  | 'comments'
  | 'shares'
  | 'saves'
  | 'followersGained'
  | 'pillar'
  | 'campaign'
  | 'tags'
  | 'audience'
  | 'hook'
  | 'intent'

type ImportColumnMapping = {
  field: ImportFieldKey
  label: string
  source: string | null
  required?: boolean
}

type ImportPreview = {
  filename: string
  accepted: ContentItem[]
  skipped: ParsedImportRow[]
  totalRows: number
  duplicateCount: number
  invalidCount: number
  mappings: ImportColumnMapping[]
  ignoredColumns: string[]
}

type ActionExperiment = {
  id: string
  platform: Platform
  title: string
  action: string
  metric: string
  evidence: string
}

type WorkspaceSnapshot = {
  version: number
  exportedAt: string
  content: ContentItem[]
  accounts: Account[]
  goal: Goal
  competitors: Competitor[]
  competitorSnapshots: CompetitorSnapshot[]
  calendar: CalendarItem[]
}

type RestorePreview = {
  filename: string
  snapshot: WorkspaceSnapshot
  version: number
  exportedAt?: string
  metrics: Array<{ label: string; current: number; incoming: number }>
}

type WorkspaceUndo = {
  label: string
  capturedAt: string
  snapshot: WorkspaceSnapshot
}

type CompetitorScanState = {
  status: 'idle' | 'scanning' | 'ready' | 'manual'
  message: string
}

const WORKSPACE_VERSION = 3

const intentLabel: Record<ContentIntent, string> = {
  growth: '拉新',
  save: '收藏',
  trust: '信任',
  conversion: '转化',
}

const intentOptions: ContentIntent[] = ['growth', 'save', 'trust', 'conversion']

const importFieldDefinitions: Array<{ field: ImportFieldKey; label: string; aliases: string[]; required?: boolean }> = [
  { field: 'platform', label: '平台', aliases: ['平台', 'platform', 'Platform'], required: true },
  { field: 'title', label: '标题', aliases: ['标题', 'title', 'Title', '内容标题'], required: true },
  { field: 'type', label: '类型', aliases: ['类型', 'type', 'format', '内容类型'] },
  { field: 'publishedAt', label: '日期', aliases: ['日期', 'date', 'publishedAt', '发布时间'], required: true },
  { field: 'hour', label: '小时', aliases: ['小时', 'hour', '发布小时'] },
  { field: 'views', label: '播放量', aliases: ['播放量', 'views', '曝光', '阅读量'] },
  { field: 'likes', label: '点赞', aliases: ['点赞', 'likes', '赞'] },
  { field: 'comments', label: '评论', aliases: ['评论', 'comments'] },
  { field: 'shares', label: '分享', aliases: ['分享', 'shares', '转发'] },
  { field: 'saves', label: '收藏', aliases: ['收藏', 'saves', 'favorites'] },
  { field: 'followersGained', label: '涨粉', aliases: ['涨粉', 'followersGained', '新增粉丝'] },
  { field: 'pillar', label: '内容支柱', aliases: ['内容支柱', 'pillar', '主题'] },
  { field: 'campaign', label: '活动', aliases: ['活动', 'campaign', '系列'] },
  { field: 'tags', label: '标签', aliases: ['标签', 'tags', '关键词'] },
  { field: 'audience', label: '受众', aliases: ['受众', 'audience', '目标人群'] },
  { field: 'hook', label: '钩子', aliases: ['钩子', 'hook', '开头'] },
  { field: 'intent', label: '意图', aliases: ['意图', 'intent', '目标'] },
]

const viewMeta: Record<ViewKey, { eyebrow: string; title: string; summary: string }> = {
  overview: {
    eyebrow: '今日经营状态',
    title: '创作者经营看板',
    summary: '把表现、实验和招商准备压缩在同一个决策面里。',
  },
  content: {
    eyebrow: '内容资产管理',
    title: '内容库',
    summary: '维护选题、受众、钩子和表现数据，形成可复用资产。',
  },
  planner: {
    eyebrow: '实验排期',
    title: '发布计划',
    summary: '让目标、发布时间和复盘指标保持同一个节奏。',
  },
  benchmarks: {
    eyebrow: '赛道观察',
    title: '竞品对标',
    summary: '记录差距和快照，把外部变化转成下一轮动作。',
  },
  accounts: {
    eyebrow: '本地优先',
    title: '账号与数据',
    summary: '管理账号素材、备份恢复和离线可用状态。',
  },
}

const defaultHours: Record<Platform, number[]> = {
  Bilibili: [9, 10, 11, 20],
  Xiaohongshu: [20, 21, 22, 17],
  Douyin: [12, 19, 20, 21],
}

const contentMixColors = ['#007aff', '#34c759', '#ff9500', '#5856d6']

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
  tags: [],
  audience: '个人创作者',
  hook: '',
  intent: 'growth',
}

const emptyCompetitorDraft: CompetitorDraft = {
  platform: 'Xiaohongshu',
  name: '',
  followers: 0,
  avgViews: 0,
  engagementRate: 0,
  angle: '',
  scanSource: 'manual',
  scanConfidence: 0,
  scannedAt: '',
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

const scanProfiles: Record<Platform, { followerBase: number; viewRatio: number; engagementBase: number; angles: string[] }> = {
  Bilibili: {
    followerBase: 42000,
    viewRatio: 0.48,
    engagementBase: 7.8,
    angles: ['项目拆解 + 过程复盘', '长视频教程 + 评论答疑', '代码演示 + 结果对比'],
  },
  Xiaohongshu: {
    followerBase: 26000,
    viewRatio: 0.66,
    engagementBase: 13.6,
    angles: ['模板清单 + 个人经历', '首图结果 + 收藏步骤', '避坑笔记 + 场景案例'],
  },
  Douyin: {
    followerBase: 68000,
    viewRatio: 0.72,
    engagementBase: 10.4,
    angles: ['强钩子 + 三段式口播', '反差结论 + 快速演示', '热点切入 + 工具结果'],
  },
}

const scanSourceLabel: Record<NonNullable<Competitor['scanSource']>, string> = {
  'local-estimate': '本地估算',
  manual: '手动修正',
  sample: '示例数据',
  external: '外部数据',
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

function snapshotTimestamp(snapshot: Pick<CompetitorSnapshot, 'date' | 'capturedAt'>) {
  const time = new Date(snapshot.capturedAt ?? `${snapshot.date}T00:00:00`).getTime()
  return Number.isFinite(time) ? time : 0
}

function formatSignedDelta(value: number | null, formatter: (input: number) => string) {
  if (value === null) return '首次'
  if (value === 0) return '持平'
  const sign = value > 0 ? '+' : '-'
  return `${sign}${formatter(Math.abs(value))}`
}

function formatScanMeta(competitor: Pick<Competitor, 'scanSource' | 'scanConfidence'>) {
  const source = scanSourceLabel[competitor.scanSource ?? 'manual']
  return competitor.scanConfidence ? `${source} · ${competitor.scanConfidence}%` : source
}

function formatScanTime(value?: string) {
  if (!value) return '未记录更新时间'
  return `更新 ${new Date(value).toLocaleDateString('zh-CN')}`
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

function hashText(value: string) {
  return [...value].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 100000, 17)
}

function estimateCompetitorFromHandle(platform: Platform, rawName: string): CompetitorDraft {
  const name = rawName.trim()
  const profile = scanProfiles[platform]
  const seed = hashText(`${platform}:${name}`)
  const followerLift = 0.74 + (seed % 67) / 100
  const followers = Math.round((profile.followerBase * followerLift + (seed % 9000)) / 100) * 100
  const avgViews = Math.round((followers * (profile.viewRatio + (seed % 19) / 100)) / 100) * 100
  const engagementRate = Number((profile.engagementBase + ((seed % 41) - 14) / 10).toFixed(1))
  const scanConfidence = 62 + (seed % 19)
  return {
    platform,
    name,
    followers,
    avgViews,
    engagementRate: Math.max(1, engagementRate),
    angle: profile.angles[seed % profile.angles.length],
    scanSource: 'local-estimate',
    scanConfidence,
    scannedAt: new Date().toISOString(),
  }
}

function readCell(row: Record<string, string>, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = row[key]?.trim()
    if (value) return value
  }
  return fallback
}

function normalizeHeader(value: string) {
  return value.replace(/\s+/g, '').trim().toLowerCase()
}

function buildImportMapping(headers: string[]) {
  const normalizedHeaders = headers.filter(Boolean).map((header) => ({ header, normalized: normalizeHeader(header) }))
  const usedHeaders = new Set<string>()

  const mappings = importFieldDefinitions.map((definition) => {
    const match = normalizedHeaders.find(
      (entry) => !usedHeaders.has(entry.header) && definition.aliases.some((alias) => normalizeHeader(alias) === entry.normalized),
    )
    if (match) usedHeaders.add(match.header)
    return {
      field: definition.field,
      label: definition.label,
      required: definition.required,
      source: match?.header ?? null,
    }
  })

  return {
    mappings,
    ignoredColumns: headers.filter((header) => header && !usedHeaders.has(header)),
  }
}

function readMappedCell(row: Record<string, string>, mappings: ImportColumnMapping[], field: ImportFieldKey, fallback = '') {
  const mapping = mappings.find((entry) => entry.field === field)
  const mappedValue = mapping?.source ? row[mapping.source]?.trim() : ''
  if (mappedValue) return mappedValue

  const definition = importFieldDefinitions.find((entry) => entry.field === field)
  return definition ? readCell(row, definition.aliases, fallback) : fallback
}

function splitTags(value: string) {
  return value
    .split(/[,，、;；|/]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8)
}

function normalizeIntent(value: string): ContentIntent {
  const normalized = value.trim().toLowerCase()
  if (normalized.includes('收藏') || normalized.includes('save')) return 'save'
  if (normalized.includes('信任') || normalized.includes('trust')) return 'trust'
  if (normalized.includes('转化') || normalized.includes('合作') || normalized.includes('conversion')) return 'conversion'
  return 'growth'
}

function contentKey(item: Pick<ContentItem, 'platform' | 'title' | 'publishedAt'>) {
  return `${item.platform}|${item.title.trim().toLowerCase()}|${item.publishedAt}`
}

function normalizeContentItem(item: ContentItem): ContentItem {
  return {
    ...item,
    tags: Array.isArray(item.tags)
      ? item.tags
          .map((tag) => String(tag).trim())
          .filter(Boolean)
          .slice(0, 8)
      : splitTags(item.pillar || item.campaign || ''),
    audience: item.audience || '个人创作者',
    hook: item.hook || item.title,
    intent: normalizeIntent(item.intent ?? 'growth'),
  }
}

function parseImportedRow(row: Record<string, string>, index: number, existingKeys: Set<string>, mappings: ImportColumnMapping[]): ParsedImportRow {
  const issues: string[] = []
  const platform = normalizePlatform(readMappedCell(row, mappings, 'platform'))
  const title = readMappedCell(row, mappings, 'title')
  const publishedAt = readMappedCell(row, mappings, 'publishedAt', new Date().toISOString().slice(0, 10)).slice(0, 10)

  if (!platform) issues.push('平台无法识别')
  if (!title) issues.push('缺少标题')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedAt)) issues.push('日期格式应为 YYYY-MM-DD')

  if (!platform || !title || issues.length > 0) {
    return { rowNumber: index + 2, item: null, issues, duplicate: false }
  }

  const item: ContentItem = {
    id: makeId(`import-${index}`),
    platform,
    title,
    type: readMappedCell(row, mappings, 'type', platform === 'Xiaohongshu' ? '图文笔记' : '短视频'),
    publishedAt,
    hour: Math.min(23, Math.max(0, Math.round(toNumber(readMappedCell(row, mappings, 'hour', '20'))))),
    views: toNumber(readMappedCell(row, mappings, 'views')),
    likes: toNumber(readMappedCell(row, mappings, 'likes')),
    comments: toNumber(readMappedCell(row, mappings, 'comments')),
    shares: toNumber(readMappedCell(row, mappings, 'shares')),
    saves: toNumber(readMappedCell(row, mappings, 'saves')),
    followersGained: toNumber(readMappedCell(row, mappings, 'followersGained')),
    pillar: readMappedCell(row, mappings, 'pillar', '未分类'),
    campaign: readMappedCell(row, mappings, 'campaign', '导入数据'),
    tags: splitTags(readMappedCell(row, mappings, 'tags', '')),
    audience: readMappedCell(row, mappings, 'audience', '个人创作者'),
    hook: readMappedCell(row, mappings, 'hook', title),
    intent: normalizeIntent(readMappedCell(row, mappings, 'intent', 'growth')),
  }

  const duplicate = existingKeys.has(contentKey(item))
  return { rowNumber: index + 2, item, issues: duplicate ? ['重复内容'] : [], duplicate }
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

function buildExperiments(
  summaries: PlatformSummary[],
  content: ContentItem[],
  competitors: Competitor[],
  slots: BestSlot[],
): ActionExperiment[] {
  const topContent = [...content].sort((a, b) => b.views - a.views)[0]
  const bestPlatform = [...summaries].sort((a, b) => b.engagementRate - a.engagementRate)[0]
  const weakestPlatform = [...summaries].filter((summary) => summary.posts > 0).sort((a, b) => a.engagementRate - b.engagementRate)[0]
  const bestSlot = slots[0]
  const strongestCompetitor = [...competitors].sort((a, b) => b.avgViews - a.avgViews)[0]
  const experiments: ActionExperiment[] = []

  if (topContent) {
    experiments.push({
      id: 'extend-top-content',
      platform: bestPlatform?.platform ?? topContent.platform,
      title: '爆款延展实验',
      action: `把「${topContent.title.slice(0, 18)}」拆成 1 条短视频和 1 篇图文卡片。`,
      metric: '收藏率与转发率',
      evidence: `${formatNumber(topContent.views)} 播放，适合作为系列母题。`,
    })
  }

  if (bestSlot) {
    experiments.push({
      id: 'best-time-window',
      platform: bestSlot.platform,
      title: '发布时间窗口实验',
      action: `连续两次在 ${bestSlot.label} 发布同一系列内容，避免同时更换选题结构。`,
      metric: '前 24 小时播放',
      evidence: `当前历史评分最高窗口为 ${bestSlot.label}。`,
    })
  }

  if (weakestPlatform) {
    experiments.push({
      id: 'weak-platform-adapter',
      platform: weakestPlatform.platform,
      title: '低互动平台适配实验',
      action: `${weakestPlatform.platform} 暂停直接搬运，改为重写开头钩子和结尾保存点。`,
      metric: '互动率提升',
      evidence: `当前互动率 ${formatPercent(weakestPlatform.engagementRate)}，低于其他平台。`,
    })
  }

  if (strongestCompetitor && experiments.length < 4) {
    experiments.push({
      id: 'competitor-angle',
      platform: strongestCompetitor.platform,
      title: '竞品角度复刻实验',
      action: `围绕「${strongestCompetitor.angle}」做一次同主题不同结构的内容。`,
      metric: '均播差缩小',
      evidence: `${strongestCompetitor.name} 当前均播 ${formatNumber(strongestCompetitor.avgViews)}。`,
    })
  }

  return experiments.slice(0, 4)
}

function isWorkspaceSnapshot(value: unknown): value is WorkspaceSnapshot {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as Partial<WorkspaceSnapshot>
  return Array.isArray(snapshot.content) && Array.isArray(snapshot.accounts) && Boolean(snapshot.goal) && Array.isArray(snapshot.competitors)
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
  const [competitorSnapshots, setCompetitorSnapshots] = useLocalStorage<CompetitorSnapshot[]>('overlook-competitor-snapshots-v1', seedCompetitorSnapshots)
  const [calendar, setCalendar] = useLocalStorage<CalendarItem[]>('overlook-calendar-v2', seedCalendar)
  const [hideSensitiveInReport, setHideSensitiveInReport] = useLocalStorage<boolean>('overlook-hide-sensitive-report-v1', false)
  const [query, setQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState<'all' | Platform>('all')
  const [calendarPlatformFilter, setCalendarPlatformFilter] = useState<'all' | Platform>('all')
  const [draft, setDraft] = useState<ContentDraft>(emptyDraft)
  const [competitorDraft, setCompetitorDraft] = useState<CompetitorDraft>(emptyCompetitorDraft)
  const [competitorScan, setCompetitorScan] = useState<CompetitorScanState>({ status: 'idle', message: '输入账号后自动扫描' })
  const [pendingImport, setPendingImport] = useState<ImportPreview | null>(null)
  const [pendingRestore, setPendingRestore] = useState<RestorePreview | null>(null)
  const [lastWorkspaceUndo, setLastWorkspaceUndo] = useState<WorkspaceUndo | null>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [offlineReady, setOfflineReady] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const workspaceFileRef = useRef<HTMLInputElement>(null)
  const reportRef = useRef<HTMLDivElement>(null)
  const scanRequestRef = useRef(0)

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

  useEffect(() => {
    const name = competitorDraft.name.trim()
    const platform = competitorDraft.platform
    if (!name) {
      return
    }

    const requestId = scanRequestRef.current + 1
    scanRequestRef.current = requestId
    const timer = window.setTimeout(() => {
      if (scanRequestRef.current !== requestId) return
      const estimatedDraft = estimateCompetitorFromHandle(platform, name)
      setCompetitorDraft((current) => {
        if (current.name.trim() !== name || current.platform !== platform) return current
        return { ...current, ...estimatedDraft }
      })
      setCompetitorScan({ status: 'ready', message: `本地估算 · 可信度 ${estimatedDraft.scanConfidence}%` })
    }, 650)

    return () => window.clearTimeout(timer)
  }, [competitorDraft.name, competitorDraft.platform])

  const normalizedContent = useMemo(() => content.map(normalizeContentItem), [content])
  const summaries = useMemo(() => buildPlatformSummaries(normalizedContent), [normalizedContent])
  const bestSlots = useMemo(() => PLATFORMS.flatMap((platform) => getBestSlots(normalizedContent, platform)), [normalizedContent])

  const totals = useMemo(() => {
    const views = sumBy(normalizedContent, (item) => item.views)
    const likes = sumBy(normalizedContent, (item) => item.likes)
    const comments = sumBy(normalizedContent, (item) => item.comments)
    const shares = sumBy(normalizedContent, (item) => item.shares)
    const saves = sumBy(normalizedContent, (item) => item.saves)
    const followersGained = sumBy(normalizedContent, (item) => item.followersGained)
    const interactions = likes + comments + shares + saves
    const accountFollowers = sumBy(accounts, (account) => account.followers)
    const engagementRate = views > 0 ? (interactions / views) * 100 : 0
    const sponsorScore = Math.min(100, Math.round(engagementRate * 3 + accountFollowers / 1800 + normalizedContent.length * 1.5))

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
  }, [accounts, normalizedContent])

  const trendData = useMemo(() => {
    const grouped = new Map<string, { date: string; views: number; interactions: number }>()
    normalizedContent.forEach((item) => {
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
  }, [normalizedContent])

  const contentMix = useMemo(() => {
    const grouped = new Map<string, number>()
    normalizedContent.forEach((item) => grouped.set(item.type, (grouped.get(item.type) ?? 0) + item.views))
    return [...grouped.entries()].map(([name, value]) => ({ name, value }))
  }, [normalizedContent])

  const campaignRows = useMemo(() => {
    const grouped = new Map<string, { campaign: string; views: number; saves: number; followers: number; posts: number }>()
    normalizedContent.forEach((item) => {
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
  }, [normalizedContent])

  const topContent = useMemo(() => [...normalizedContent].sort((a, b) => b.views - a.views).slice(0, 6), [normalizedContent])

  const insights = useMemo(
    () => buildInsightList(summaries, normalizedContent, competitors, goal, bestSlots),
    [bestSlots, competitors, goal, normalizedContent, summaries],
  )

  const experiments = useMemo(
    () => buildExperiments(summaries, normalizedContent, competitors, bestSlots),
    [bestSlots, competitors, normalizedContent, summaries],
  )

  const filteredContent = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return [...normalizedContent]
      .filter((item) => {
        const matchesPlatform = platformFilter === 'all' || item.platform === platformFilter
        const matchesQuery =
          !normalizedQuery ||
          item.title.toLowerCase().includes(normalizedQuery) ||
          item.pillar.toLowerCase().includes(normalizedQuery) ||
          item.campaign.toLowerCase().includes(normalizedQuery) ||
          item.audience.toLowerCase().includes(normalizedQuery) ||
          item.hook.toLowerCase().includes(normalizedQuery) ||
          item.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
        return matchesPlatform && matchesQuery
      })
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || b.views - a.views)
  }, [normalizedContent, platformFilter, query])

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

  const latestSnapshots = useMemo(() => {
    const grouped = new Map<string, CompetitorSnapshot[]>()
    competitorSnapshots.forEach((snapshot) => {
      grouped.set(snapshot.competitorId, [...(grouped.get(snapshot.competitorId) ?? []), snapshot])
    })

    return [...grouped.values()]
      .map((snapshots) => {
        const ordered = [...snapshots].sort((a, b) => snapshotTimestamp(b) - snapshotTimestamp(a))
        const latest = ordered[0]
        const previous = ordered[1]
        return {
          ...latest,
          competitor: competitors.find((competitor) => competitor.id === latest.competitorId),
          followerDelta: previous ? latest.followers - previous.followers : null,
          avgViewsDelta: previous ? latest.avgViews - previous.avgViews : null,
          engagementDelta: previous ? latest.engagementRate - previous.engagementRate : null,
        }
      })
      .sort((a, b) => snapshotTimestamp(b) - snapshotTimestamp(a))
      .slice(0, 8)
  }, [competitorSnapshots, competitors])

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

  const visibleCalendar = useMemo(
    () => calendar.filter((item) => calendarPlatformFilter === 'all' || item.platform === calendarPlatformFilter),
    [calendar, calendarPlatformFilter],
  )

  const goalProgress = {
    views: Math.min(100, (totals.views / Math.max(1, goal.targetViews)) * 100),
    followers: Math.min(100, (totals.followersGained / Math.max(1, goal.targetFollowers)) * 100),
    sponsor: Math.min(100, (totals.sponsorScore / Math.max(1, goal.targetSponsorLeads * 10)) * 100),
  }

  const createWorkspaceSnapshot = (): WorkspaceSnapshot => ({
    version: WORKSPACE_VERSION,
    exportedAt: new Date().toISOString(),
    content: normalizedContent,
    accounts,
    goal,
    competitors,
    competitorSnapshots,
    calendar,
  })

  const applyWorkspaceSnapshot = (snapshot: WorkspaceSnapshot) => {
    setContent(snapshot.content.map(normalizeContentItem))
    setAccounts(snapshot.accounts)
    setGoal(snapshot.goal)
    setCompetitors(snapshot.competitors)
    setCompetitorSnapshots(Array.isArray(snapshot.competitorSnapshots) ? snapshot.competitorSnapshots : [])
    setCalendar(Array.isArray(snapshot.calendar) ? snapshot.calendar : [])
  }

  const captureWorkspaceUndo = (label: string) => {
    setLastWorkspaceUndo({ label, capturedAt: new Date().toISOString(), snapshot: createWorkspaceSnapshot() })
  }

  const markCompetitorDraftManual = (patch: Partial<CompetitorDraft>) => {
    scanRequestRef.current += 1
    setCompetitorDraft((current) => ({
      ...current,
      ...patch,
      scanSource: 'manual',
      scanConfidence: 100,
      scannedAt: new Date().toISOString(),
    }))
    setCompetitorScan({ status: 'manual', message: '手动修正 · 以你填写为准' })
  }

  const restoreLastWorkspaceUndo = () => {
    if (!lastWorkspaceUndo) return
    const currentSnapshot = createWorkspaceSnapshot()
    applyWorkspaceSnapshot(lastWorkspaceUndo.snapshot)
    setLastWorkspaceUndo({ label: '撤销前状态', capturedAt: new Date().toISOString(), snapshot: currentSnapshot })
    toast.success('已恢复到上一个工作区状态')
  }

  const handleCSVImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const existingKeys = new Set(normalizedContent.map(contentKey))
        const headers = results.meta.fields?.filter(Boolean) ?? Object.keys(results.data[0] ?? {})
        const { mappings, ignoredColumns } = buildImportMapping(headers)
        const parsedRows = results.data.map((row, index) => {
          const parsed = parseImportedRow(row, index, existingKeys, mappings)
          if (parsed.item && !parsed.duplicate) {
            existingKeys.add(contentKey(parsed.item))
          }
          return parsed
        })
        const accepted = parsedRows
          .filter((row): row is ParsedImportRow & { item: ContentItem } => Boolean(row.item) && !row.duplicate)
          .map((row) => row.item)
        const skipped = parsedRows.filter((row) => !row.item || row.duplicate)

        if (accepted.length === 0) {
          toast.error('没有识别到有效内容')
          setPendingImport({
            filename: file.name,
            accepted,
            skipped,
            totalRows: results.data.length,
            duplicateCount: parsedRows.filter((row) => row.duplicate).length,
            invalidCount: parsedRows.filter((row) => !row.item).length,
            mappings,
            ignoredColumns,
          })
          return
        }

        setPendingImport({
          filename: file.name,
          accepted,
          skipped,
          totalRows: results.data.length,
          duplicateCount: parsedRows.filter((row) => row.duplicate).length,
          invalidCount: parsedRows.filter((row) => !row.item).length,
          mappings,
          ignoredColumns,
        })
        toast.info(`已解析 ${accepted.length} 条可导入内容`)
      },
      error: () => toast.error('CSV 解析失败'),
    })

    event.currentTarget.value = ''
  }

  const confirmImport = () => {
    if (!pendingImport || pendingImport.accepted.length === 0) return
    captureWorkspaceUndo('导入前状态')
    setContent((current) => [...pendingImport.accepted, ...current])
    toast.success(`已导入 ${pendingImport.accepted.length} 条内容`)
    setPendingImport(null)
  }

  const confirmRestoreWorkspace = () => {
    if (!pendingRestore) return
    captureWorkspaceUndo('恢复前状态')
    applyWorkspaceSnapshot(pendingRestore.snapshot)
    setPendingRestore(null)
    toast.success('工作区已恢复')
  }

  const handleAddContent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.title.trim()) {
      toast.error('标题不能为空')
      return
    }

    const normalizedDraft = normalizeContentItem({ ...draft, id: makeId('manual'), title: draft.title.trim(), hook: draft.hook.trim() || draft.title.trim() })
    setContent((current) => [normalizedDraft, ...current])
    setDraft({ ...emptyDraft, platform: draft.platform, type: draft.type, hour: draft.hour })
    toast.success('内容已加入看板')
  }

  const handleAddCompetitor = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!competitorDraft.name.trim()) {
      toast.error('对标账号不能为空')
      return
    }

    const scannedDraft =
      competitorDraft.followers > 0 || competitorDraft.avgViews > 0 || competitorDraft.engagementRate > 0 || competitorDraft.angle.trim()
        ? competitorDraft
        : estimateCompetitorFromHandle(competitorDraft.platform, competitorDraft.name)
    const preparedDraft: CompetitorDraft = {
      ...scannedDraft,
      name: scannedDraft.name.trim(),
      scanSource: scannedDraft.scanSource ?? 'manual',
      scanConfidence: scannedDraft.scanConfidence ?? 100,
      scannedAt: scannedDraft.scannedAt || new Date().toISOString(),
    }
    setCompetitors((current) => [{ ...preparedDraft, id: makeId('competitor') }, ...current])
    setCompetitorDraft(emptyCompetitorDraft)
    setCompetitorScan({ status: 'idle', message: '输入账号后自动扫描' })
    toast.success('对标账号已加入')
  }

  const handleExportJson = () => {
    const payload: WorkspaceSnapshot & { summaries: PlatformSummary[]; insights: string[]; experiments: ActionExperiment[] } = {
      version: WORKSPACE_VERSION,
      exportedAt: new Date().toISOString(),
      content: normalizedContent,
      accounts,
      goal,
      competitors,
      competitorSnapshots,
      calendar,
      summaries,
      insights,
      experiments,
    }

    downloadBlob(JSON.stringify(payload, null, 2), 'application/json;charset=utf-8', `overlook-report-${new Date().toISOString().slice(0, 10)}.json`)
    toast.success('JSON 已导出')
  }

  const handleExportWorkspace = () => {
    const snapshot = createWorkspaceSnapshot()
    downloadBlob(JSON.stringify(snapshot, null, 2), 'application/json;charset=utf-8', `overlook-workspace-${new Date().toISOString().slice(0, 10)}.json`)
    toast.success('工作区备份已导出')
  }

  const handleRestoreWorkspace = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (!isWorkspaceSnapshot(parsed)) {
          toast.error('备份文件结构不正确')
          return
        }
        const snapshot: WorkspaceSnapshot = {
          ...parsed,
          content: parsed.content.map(normalizeContentItem),
          competitorSnapshots: Array.isArray(parsed.competitorSnapshots) ? parsed.competitorSnapshots : [],
          calendar: Array.isArray(parsed.calendar) ? parsed.calendar : [],
        }
        setPendingRestore({
          filename: file.name,
          snapshot,
          version: snapshot.version,
          exportedAt: snapshot.exportedAt,
          metrics: [
            { label: '内容', current: normalizedContent.length, incoming: snapshot.content.length },
            { label: '账号', current: accounts.length, incoming: snapshot.accounts.length },
            { label: '竞品', current: competitors.length, incoming: snapshot.competitors.length },
            { label: '快照', current: competitorSnapshots.length, incoming: snapshot.competitorSnapshots.length },
            { label: '排期', current: calendar.length, incoming: snapshot.calendar.length },
          ],
        })
        toast.info('已读取备份，确认后恢复')
      } catch {
        toast.error('备份文件解析失败')
      }
    }
    reader.readAsText(file)
    event.currentTarget.value = ''
  }

  const handleExportCsv = () => {
    const csv = Papa.unparse(
      normalizedContent.map((item) => ({
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
        标签: item.tags.join(','),
        受众: item.audience,
        钩子: item.hook,
        意图: intentLabel[item.intent],
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
    const nextCalendar = createCalendar(normalizedContent, summaries, bestSlots).map((item, index) => {
      const experiment = experiments[index % Math.max(1, experiments.length)]
      return experiment
        ? {
            ...item,
            platform: experiment.platform,
            experiment: experiment.title,
            metric: experiment.metric,
            objective: intentLabel[normalizedContent[index % Math.max(1, normalizedContent.length)]?.intent ?? 'growth'],
          }
        : item
    })
    setCalendar(nextCalendar)
    toast.success('本周计划已生成')
  }

  const captureCompetitorSnapshots = () => {
    const capturedAt = new Date().toISOString()
    const today = capturedAt.slice(0, 10)
    const snapshots = competitors.map((competitor) => ({
      id: makeId('snapshot'),
      competitorId: competitor.id,
      date: today,
      capturedAt,
      followers: competitor.followers,
      avgViews: competitor.avgViews,
      engagementRate: competitor.engagementRate,
    }))
    setCompetitorSnapshots((current) => [...snapshots, ...current].slice(0, 60))
    toast.success(`已记录 ${snapshots.length} 条竞品快照`)
  }

  const copyPlan = async () => {
    const text = calendar.map((item) => `${item.day} ${item.time}｜${item.platform}｜${item.title}｜${statusLabel[item.status]}`).join('\n')
    await navigator.clipboard.writeText(text)
    toast.success('计划已复制')
  }

  const resetWorkspace = () => {
    captureWorkspaceUndo('恢复示例前状态')
    applyWorkspaceSnapshot({
      version: WORKSPACE_VERSION,
      exportedAt: new Date().toISOString(),
      content: seedContent,
      accounts: seedAccounts,
      goal: seedGoal,
      competitors: seedCompetitors,
      competitorSnapshots: seedCompetitorSnapshots,
      calendar: seedCalendar,
    })
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
      <input ref={workspaceFileRef} type="file" accept="application/json,.json" className="sr-only" onChange={handleRestoreWorkspace} />

      <main className="app-main">
        <section className="workspace-header">
          <div className="workspace-title">
            <div className="eyebrow">{viewMeta[activeView].eyebrow}</div>
            <h1>{viewMeta[activeView].title}</h1>
            <p>{viewMeta[activeView].summary}</p>
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
                <SectionTitle icon={<Lightbulb size={18} />} title="下一轮实验" action={`${experiments.length} 项`} />
                <div className="experiment-list">
                  {experiments.map((experiment) => (
                    <div className="experiment-card" key={experiment.id}>
                      <Lightbulb size={16} />
                      <div>
                        <strong>{experiment.title}</strong>
                        <span>{experiment.action}</span>
                        <small>
                          {experiment.platform} · 指标：{experiment.metric} · {experiment.evidence}
                        </small>
                      </div>
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
                  系列
                  <input value={draft.campaign} onChange={(event) => setDraft({ ...draft, campaign: event.target.value })} />
                </label>
                <label className="span-2">
                  标签
                  <input value={draft.tags.join(', ')} onChange={(event) => setDraft({ ...draft, tags: splitTags(event.target.value) })} placeholder="模板, 工具, 复盘" />
                </label>
                <label>
                  受众
                  <input value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })} />
                </label>
                <label className="span-2">
                  钩子
                  <input value={draft.hook} onChange={(event) => setDraft({ ...draft, hook: event.target.value })} placeholder="开头承诺或反差点" />
                </label>
                <label>
                  意图
                  <select value={draft.intent} onChange={(event) => setDraft({ ...draft, intent: event.target.value as ContentIntent })}>
                    {intentOptions.map((intent) => (
                      <option value={intent} key={intent}>
                        {intentLabel[intent]}
                      </option>
                    ))}
                  </select>
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
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、标签、受众、系列" />
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
                            {item.type} · {item.pillar} · {item.campaign} · {item.audience} · {intentLabel[item.intent]}
                          </small>
                          <div className="tag-row">
                            {item.tags.slice(0, 4).map((tag) => (
                              <span key={`${item.id}-${tag}`}>{tag}</span>
                            ))}
                          </div>
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
                <div className="progress-grid">
                  <Progress label="播放" value={goalProgress.views} detail={`${formatNumber(totals.views)} / ${formatNumber(goal.targetViews)}`} />
                  <Progress label="涨粉" value={goalProgress.followers} detail={`${formatNumber(totals.followersGained)} / ${formatNumber(goal.targetFollowers)}`} />
                  <Progress label="合作准备" value={goalProgress.sponsor} detail={`${totals.sponsorScore}/100`} />
                </div>
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
                <select value={calendarPlatformFilter} onChange={(event) => setCalendarPlatformFilter(event.target.value as 'all' | Platform)}>
                  <option value="all">全部平台</option>
                  {PLATFORMS.map((platform) => (
                    <option key={platform}>{platform}</option>
                  ))}
                </select>
              </div>
              <div className="calendar-grid">
                {visibleCalendar.map((item) => (
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
                    {item.experiment && <small>{item.experiment}</small>}
                    {item.metric && <span className="objective-pill">指标：{item.metric}</span>}
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
              <SectionTitle
                icon={<Trophy size={18} />}
                title="对标账号"
                action={competitorScan.status === 'idle' ? `${competitors.length} 个 · 输入后自动扫描` : competitorScan.message}
              />
              <form className="content-form benchmark-form" onSubmit={handleAddCompetitor}>
                <label>
                  平台
                  <select
                    value={competitorDraft.platform}
                    onChange={(event) => {
                      setCompetitorDraft({
                        ...competitorDraft,
                        platform: event.target.value as Platform,
                        followers: 0,
                        avgViews: 0,
                        engagementRate: 0,
                        angle: '',
                        scanSource: 'manual',
                        scanConfidence: 0,
                        scannedAt: '',
                      })
                      if (competitorDraft.name.trim()) setCompetitorScan({ status: 'scanning', message: '正在扫描账号画像' })
                    }}
                  >
                    {PLATFORMS.map((platform) => (
                      <option key={platform}>{platform}</option>
                    ))}
                  </select>
                </label>
                <label>
                  账号
                  <input
                    value={competitorDraft.name}
                    placeholder="@handle 或账号名"
                    onChange={(event) => {
                      setCompetitorDraft({
                        ...competitorDraft,
                        name: event.target.value,
                        followers: 0,
                        avgViews: 0,
                        engagementRate: 0,
                        angle: '',
                        scanSource: 'manual',
                        scanConfidence: 0,
                        scannedAt: '',
                      })
                      setCompetitorScan(
                        event.target.value.trim()
                          ? { status: 'scanning', message: '正在扫描账号画像' }
                          : { status: 'idle', message: '输入账号后自动扫描' },
                      )
                    }}
                  />
                </label>
                <label>
                  粉丝
                  <input
                    type="number"
                    min="0"
                    value={competitorDraft.followers}
                    onChange={(event) => {
                      markCompetitorDraftManual({ followers: toNumber(event.target.value) })
                    }}
                  />
                </label>
                <label>
                  均播
                  <input
                    type="number"
                    min="0"
                    value={competitorDraft.avgViews}
                    onChange={(event) => {
                      markCompetitorDraftManual({ avgViews: toNumber(event.target.value) })
                    }}
                  />
                </label>
                <label>
                  互动率 %
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={competitorDraft.engagementRate}
                    onChange={(event) => {
                      markCompetitorDraftManual({ engagementRate: toNumber(event.target.value) })
                    }}
                  />
                </label>
                <label className="span-2">
                  角度
                  <input
                    value={competitorDraft.angle}
                    onChange={(event) => {
                      markCompetitorDraftManual({ angle: event.target.value })
                    }}
                  />
                </label>
                <button className="action-button" type="submit">
                  <Plus size={16} />
                  添加
                </button>
              </form>
            </section>

            <section className="panel">
              <SectionTitle icon={<AlertTriangle size={18} />} title="差距扫描" action="自动补全 + 手动确认" />
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
                          <small>
                            {formatNumber(row.followers)} 粉丝 · {formatScanMeta(row)}
                          </small>
                        </td>
                        <td>{row.platform}</td>
                        <td className={row.avgViewGap >= 0 ? 'positive' : 'negative'}>{formatNumber(Math.abs(row.avgViewGap))}</td>
                        <td className={row.engagementGap >= 0 ? 'positive' : 'negative'}>
                          {row.engagementGap >= 0 ? '+' : '-'}
                          {formatPercent(Math.abs(row.engagementGap))}
                        </td>
                        <td>
                          <strong>{row.angle}</strong>
                          <small>{formatScanTime(row.scannedAt)}</small>
                        </td>
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
              <SectionTitle icon={<Flame size={18} />} title="竞品快照" action={`${competitorSnapshots.length} 条`} />
              <div className="section-actions">
                <button className="action-button" onClick={captureCompetitorSnapshots}>
                  <Plus size={16} />
                  记录快照
                </button>
              </div>
              <div className="snapshot-grid">
                {latestSnapshots.map((snapshot) => (
                  <div className="snapshot-card" key={snapshot.id}>
                    <strong>{snapshot.competitor?.name ?? '已删除账号'}</strong>
                    <small>
                      {snapshot.date} · {formatNumber(snapshot.followers)} 粉丝 · {formatNumber(snapshot.avgViews)} 均播
                    </small>
                    <em
                      className={
                        snapshot.avgViewsDelta === null
                          ? 'snapshot-trend'
                          : snapshot.avgViewsDelta >= 0
                            ? 'snapshot-trend snapshot-trend--positive'
                            : 'snapshot-trend snapshot-trend--negative'
                      }
                    >
                      互动 {formatPercent(snapshot.engagementRate)} · 均播较上次 {formatSignedDelta(snapshot.avgViewsDelta, formatNumber)}
                    </em>
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
                <SectionTitle icon={<FileText size={18} />} title="数据安全" action={`v${WORKSPACE_VERSION}`} />
                <div className="backup-actions">
                  <button className="action-button" onClick={handleExportWorkspace}>
                    <Download size={16} />
                    导出工作区
                  </button>
                  <button className="action-button action-button--ghost" onClick={() => workspaceFileRef.current?.click()}>
                    <Database size={16} />
                    恢复工作区
                  </button>
                </div>
                {lastWorkspaceUndo && (
                  <div className="undo-card">
                    <div>
                      <strong>{lastWorkspaceUndo.label}</strong>
                      <span>{new Date(lastWorkspaceUndo.capturedAt).toLocaleString('zh-CN')}</span>
                    </div>
                    <button className="action-button action-button--ghost" onClick={restoreLastWorkspaceUndo}>
                      <Undo2 size={15} />
                      撤销
                    </button>
                  </div>
                )}
                <label className="toggle-row">
                  <input type="checkbox" checked={hideSensitiveInReport} onChange={(event) => setHideSensitiveInReport(event.target.checked)} />
                  <span>报告中隐藏账号 handle</span>
                </label>
                <div className="health-list">
                  <HealthRow ok label="完整工作区备份" />
                  <HealthRow ok label="恢复前结构校验" />
                  {lastWorkspaceUndo && <HealthRow ok label="最近一次大改可撤销" />}
                  <HealthRow ok label="本地优先存储" />
                </div>
              </article>
            </section>
          </div>
        )}
      </main>

      {pendingImport && <ImportPreviewModal preview={pendingImport} onCancel={() => setPendingImport(null)} onConfirm={confirmImport} />}
      {pendingRestore && (
        <RestorePreviewModal preview={pendingRestore} onCancel={() => setPendingRestore(null)} onConfirm={confirmRestoreWorkspace} />
      )}

      <ReportSheet
        refNode={reportRef}
        totals={totals}
        summaries={summaries}
        insights={insights}
        experiments={experiments}
        topContent={topContent}
        calendar={calendar}
        goal={goal}
        accounts={accounts}
        hideSensitive={hideSensitiveInReport}
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

function useEscapeClose(onClose: () => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])
}

function ImportPreviewModal({ preview, onCancel, onConfirm }: { preview: ImportPreview; onCancel: () => void; onConfirm: () => void }) {
  useEscapeClose(onCancel)
  const recognizedCount = preview.mappings.filter((mapping) => mapping.source).length
  const missingRequired = preview.mappings.filter((mapping) => mapping.required && !mapping.source)

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="CSV 导入预览">
      <section className="modal-panel">
        <SectionTitle icon={<Database size={18} />} title="CSV 导入预览" action={preview.filename} />
        <div className="preview-metrics">
          <div>
            <strong>{preview.totalRows}</strong>
            <span>总行数</span>
          </div>
          <div>
            <strong>{preview.accepted.length}</strong>
            <span>可导入</span>
          </div>
          <div>
            <strong>{preview.duplicateCount}</strong>
            <span>重复</span>
          </div>
          <div>
            <strong>{preview.invalidCount}</strong>
            <span>无效</span>
          </div>
        </div>
        <div className="mapping-summary" aria-label="CSV 列识别结果">
          <div>
            <strong>{recognizedCount}</strong>
            <span>已识别字段</span>
          </div>
          <div>
            <strong>{preview.ignoredColumns.length}</strong>
            <span>忽略列</span>
          </div>
          <div className={missingRequired.length > 0 ? 'mapping-warning' : ''}>
            <strong>{missingRequired.length}</strong>
            <span>缺少必填</span>
          </div>
        </div>
        <div className="mapping-grid">
          {preview.mappings.map((mapping) => (
            <span className={mapping.source ? 'mapping-chip' : 'mapping-chip mapping-chip--missing'} key={mapping.field}>
              {mapping.label}
              <em>{mapping.source ?? (mapping.required ? '未匹配' : '默认')}</em>
            </span>
          ))}
          {preview.ignoredColumns.slice(0, 6).map((column) => (
            <span className="mapping-chip mapping-chip--ignored" key={`ignored-${column}`}>
              未使用
              <em>{column}</em>
            </span>
          ))}
        </div>
        <div className="preview-list">
          {preview.accepted.slice(0, 5).map((item) => (
            <div className="preview-row" key={item.id}>
              <strong>{item.title}</strong>
              <span>
                {item.platform} · {item.publishedAt} · {item.tags.join(', ') || '无标签'}
              </span>
            </div>
          ))}
          {preview.skipped.slice(0, 5).map((row) => (
            <div className="preview-row preview-row--warning" key={`skip-${row.rowNumber}`}>
              <strong>第 {row.rowNumber} 行跳过</strong>
              <span>{row.issues.join('、') || '无法识别'}</span>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="action-button action-button--ghost" onClick={onCancel} autoFocus>
            取消
          </button>
          <button className="action-button" onClick={onConfirm} disabled={preview.accepted.length === 0}>
            确认导入
          </button>
        </div>
      </section>
    </div>
  )
}

function RestorePreviewModal({ preview, onCancel, onConfirm }: { preview: RestorePreview; onCancel: () => void; onConfirm: () => void }) {
  useEscapeClose(onCancel)
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="工作区恢复预览">
      <section className="modal-panel">
        <SectionTitle icon={<ShieldCheck size={18} />} title="恢复前确认" action={preview.filename} />
        <div className="restore-meta">
          <span>备份版本 v{preview.version}</span>
          <span>{preview.exportedAt ? new Date(preview.exportedAt).toLocaleString('zh-CN') : '未记录导出时间'}</span>
        </div>
        <div className="restore-grid">
          {preview.metrics.map((metric) => (
            <div className="restore-card" key={metric.label}>
              <span>{metric.label}</span>
              <strong>
                {plainNumber.format(metric.current)} <em>→</em> {plainNumber.format(metric.incoming)}
              </strong>
            </div>
          ))}
        </div>
        <div className="preview-row preview-row--warning">
          <strong>确认后会替换当前本地工作区</strong>
          <span>建议先导出当前工作区备份；取消不会改动任何本地数据。</span>
        </div>
        <div className="modal-actions">
          <button className="action-button action-button--ghost" onClick={onCancel} autoFocus>
            取消
          </button>
          <button className="action-button" onClick={onConfirm}>
            确认恢复
          </button>
        </div>
      </section>
    </div>
  )
}

function ReportSheet({
  refNode,
  totals,
  summaries,
  insights,
  experiments,
  topContent,
  calendar,
  goal,
  accounts,
  hideSensitive,
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
  experiments: ActionExperiment[]
  topContent: ContentItem[]
  calendar: CalendarItem[]
  goal: Goal
  accounts: Account[]
  hideSensitive: boolean
}) {
  const audiences = [...new Set(topContent.flatMap((item) => [item.audience, ...item.tags]).filter(Boolean))].slice(0, 8)

  return (
    <div className="report-sheet" ref={refNode} aria-hidden="true">
      <header>
        <span>Overlook</span>
        <h1>Creator Media Kit</h1>
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
        <h2>账号与受众</h2>
        {accounts.map((account) => (
          <p key={account.platform}>
            {account.platform}: {hideSensitive ? '账号已隐藏' : account.handle} · {formatNumber(account.followers)} 粉丝 · {accountStatusLabel[account.status]}。
          </p>
        ))}
        <p>核心受众与标签：{audiences.join('、') || '待补充'}。</p>
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
        <h2>下一轮实验</h2>
        {experiments.slice(0, 4).map((experiment) => (
          <p key={experiment.id}>
            {experiment.platform} · {experiment.title}: {experiment.action} 指标：{experiment.metric}。
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
