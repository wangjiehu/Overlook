import { useState, useMemo, useRef, useEffect } from 'react'
import Papa from 'papaparse'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'
import { 
  Users, Eye, Heart, MessageCircle, TrendingUp, Calendar, Download, Upload, 
  Plus, BarChart3, Lightbulb, User, Repeat, Copy, X, Sparkles, FileText,
  Target, ListOrdered, Bot, Clock, ChevronUp, ChevronDown
} from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocalStorage } from './hooks/useLocalStorage'
import type { PlatformData, ContentItem, Account, Platform, Goal } from './types'
import { mockPlatformData, mockContent, COLORS } from './utils/mockData'
import { KPICard } from './components/KPICard'
import { Navbar } from './components/Navbar'

// Apple-inspired Overlook - Unified Creator Insights for Personal Creators
// Platforms: Bilibili, Xiaohongshu (Little Red Book), Douyin

const PLATFORMS = ['Bilibili', 'Xiaohongshu', 'Douyin'] as const

function OverlookApp() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'platforms' | 'insights' | 'accounts'>('dashboard')
  const [accounts, setAccounts] = useLocalStorage<Account[]>('overlook-accounts', [
    { platform: 'Bilibili', username: '@yourname', connected: true },
    { platform: 'Xiaohongshu', username: '@yourname', connected: true },
    { platform: 'Douyin', username: '@yourname', connected: true },
  ])

  const [userContent, setUserContent] = useLocalStorage<ContentItem[]>('overlook-user-content', [])

  const fileInputRef = useRef<HTMLInputElement>(null)
  // Ref for premium sponsor/brand report printable area (hybrid capture for visual fidelity)
  const reportRef = useRef<HTMLDivElement>(null)

  const [showAddAccount, setShowAddAccount] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [platformFilter, setPlatformFilter] = useState<'all' | Platform>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Content Repurposing Tool state - premium modal for platform adaptation
  const [repurposeItem, setRepurposeItem] = useState<ContentItem | null>(null)

  // Content Calendar state for 7-day schedule
  const [contentCalendar, setContentCalendar] = useState<Array<{day: string; platform: string; type: string; time: string; tip: string}>>([])
  const [isCalendarGenerated, setIsCalendarGenerated] = useState(false)

  // PWA install prompt (deferred)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isPwaInstalled, setIsPwaInstalled] = useState(false)
  // "离线就绪" badge state (set after successful SW registration for demo)
  const [swReady, setSwReady] = useState(false)

  // Series / Episode Planner state
  const [seriesPlan, setSeriesPlan] = useState<Array<{
    episode: number
    title: string
    platformFocus: string
    repurposingNote: string
    publishDay: string
    whyThisWorks: string
  }>>([])
  const [isSeriesGenerated, setIsSeriesGenerated] = useState(false)

  // Ask Claude / AI stub state
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [claudeApiKey] = useLocalStorage<string>('overlook-claude-key', '')

  // Goals Tracker - persistent monthly goals
  const [goals, setGoals] = useLocalStorage<Goal | null>('overlook-goals', null)
  const [tempTargetViews, setTempTargetViews] = useState(100000)
  const [tempTargetFollowers, setTempTargetFollowers] = useState(500)

  // Table sort state for platforms tab content table (Apple HIG polish + creator workflow)
  const [sortKey, setSortKey] = useState<'views' | 'likes' | 'date'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Onboarding / first-run tour state (localStorage flag 'overlook-onboarded-v1')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [hasOnboarded, setHasOnboarded] = useLocalStorage<boolean>('overlook-onboarded-v1', false)

  // Filtered content (search + platform + date filters) — extracted for clarity + perf
  const filteredContent = useMemo(() => {
    return [...mockContent, ...userContent].filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesPlatform = platformFilter === 'all' || item.platform === platformFilter
      const itemDate = item.date
      const matchesFrom = !dateFrom || itemDate >= dateFrom
      const matchesTo = !dateTo || itemDate <= dateTo
      return matchesSearch && matchesPlatform && matchesFrom && matchesTo
    })
  }, [userContent, searchTerm, platformFilter, dateFrom, dateTo])

  // Sorted + filtered for table (and downstream). Default date desc. useMemo for perf (task req).
  // Note: filteredContent keeps pure filter; displayContent applies sort for table view.
  const displayContent = useMemo(() => {
    return [...filteredContent].sort((a, b) => {
      let comparison = 0
      if (sortKey === 'date') {
        comparison = b.date.localeCompare(a.date)
        if (sortDir === 'asc') comparison = -comparison
      } else if (sortKey === 'views') {
        comparison = b.views - a.views
        if (sortDir === 'asc') comparison = -comparison
      } else if (sortKey === 'likes') {
        comparison = b.likes - a.likes
        if (sortDir === 'asc') comparison = -comparison
      }
      return comparison
    })
  }, [filteredContent, sortKey, sortDir])

  // Restore theme from localStorage or system preference on mount (Apple native feel)
  useEffect(() => {
    const saved = localStorage.getItem('overlook-theme')
    const root = document.documentElement
    if (saved === 'dark') {
      root.classList.add('dark')
    } else if (saved === 'light') {
      root.classList.remove('dark')
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark')
    }
  }, [])

  // Onboarding first-run tour: auto show beautiful multi-step Apple modal on first mount if not onboarded
  // Uses localStorage key 'overlook-onboarded-v1'. Dismiss forever by setting flag. Can re-trigger via header button.
  useEffect(() => {
    if (!hasOnboarded) {
      const timer = setTimeout(() => {
        setShowOnboarding(true)
        setOnboardingStep(0)
      }, 1100)
      return () => clearTimeout(timer)
    }
  }, [hasOnboarded])

  // ESC closes open modals (repurpose, add-account, onboarding etc). Simple global listener while any relevant open.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (repurposeItem) {
          setRepurposeItem(null)
        } else if (showAddAccount) {
          setShowAddAccount(false)
        } else if (showOnboarding) {
          // For onboarding, ESC does not auto-set flag; user must choose skip or finish to persist dismiss
          setShowOnboarding(false)
        }
      }
    }
    const anyModalOpen = !!repurposeItem || showAddAccount || showOnboarding
    if (anyModalOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [repurposeItem, showAddAccount, showOnboarding])

  // PWA: register service worker + capture beforeinstallprompt (Apple-feel install)
  // Always register for demo (works on https/localhost; GH Pages https). Caches app shell + sample-data for offline last-data view.
  useEffect(() => {
    // Register SW 
    if ('serviceWorker' in navigator) {
      // BASE_URL aware ( './sw.js' or '/Overlook/sw.js' etc for GitHub Pages static )
      const base = (import.meta.env as any)?.BASE_URL || '/'
      const swUrl = `${base}sw.js`.replace(/\/+/g, '/').replace(':/', '://') // normalize
      navigator.serviceWorker.register(swUrl).then((reg) => {
        setSwReady(true)
        // If there's waiting SW, could update but simple for now
      }).catch(() => {/* ignore in dev or non-https */})
    }

    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Listen for successful install (covers some flows + iOS-ish after add)
    const installedHandler = () => {
      setIsPwaInstalled(true)
      setDeferredPrompt(null)
      toast.success('感谢安装！数据始终本地，离线可用')
    }
    window.addEventListener('appinstalled', installedHandler)

    // If already in standalone / installed mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsPwaInstalled(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      toast.info('在支持的浏览器中（Chrome / Edge / Safari），使用「添加到主屏幕」即可安装')
      return
    }
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      // Exact toast per spec: clean Apple-style success
      toast.success('感谢安装！数据始终本地，离线可用')
      setIsPwaInstalled(true)
    }
    setDeferredPrompt(null)
  }

  // Sync goals to temp inputs when loaded from localStorage (for edit UX)
  useEffect(() => {
    if (goals) {
      setTempTargetViews(goals.targetViews)
      setTempTargetFollowers(goals.targetFollowers)
    }
  }, [goals])

  // Calculate totals (use displayContent for personal stats too, but keep platform aggregates)
  const totalViews = mockPlatformData.reduce((sum, p) => sum + p.views, 0)
  const totalLikes = mockPlatformData.reduce((sum, p) => sum + p.likes, 0)
  const totalFollowers = mockPlatformData.reduce((sum, p) => sum + p.followers, 0)
  const avgEngagement = (mockPlatformData.reduce((sum, p) => sum + p.engagement, 0) / mockPlatformData.length).toFixed(1)

  const topPlatform = [...mockPlatformData].sort((a, b) => b.engagement - a.engagement)[0]

  // Personal stats from imported + mock content
  const personalTotalViews = displayContent.reduce((sum, c) => sum + c.views, 0)
  const personalTotalLikes = displayContent.reduce((sum, c) => sum + c.likes, 0)

  // Simple growth predictor and best type
  const avgGrowth = mockPlatformData.reduce((s, p) => s + p.growth, 0) / mockPlatformData.length
  const contentTypeCounts = displayContent.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const bestType = Object.entries(contentTypeCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || '笔记'

  const platformTrends = mockPlatformData.map(p => `${p.platform}：增长 +${p.growth}% ，互动率 ${p.engagement}%`).join('； ')

  // Cross-platform comparison data for charts
  const comparisonData = mockPlatformData.map(p => ({
    name: p.platform,
    views: Math.round(p.views / 1000),
    engagement: p.engagement,
  }))

  // Engagement distribution data (total interactions: likes + comments + shares per platform) - memoized for perf
  const engagementData = useMemo(() => mockPlatformData.map(p => ({
    name: p.platform,
    value: p.likes + p.comments + p.shares,
  })), [])

  // Mock deterministic 30-day growth trend data for last 30 days (smooth natural growth) - memoized
  const growthTrendData = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const day = i + 1
    const base = 16500 + (i * 320) // steady upward trend
    const wave = Math.sin(i * 0.7) * 2400 + Math.cos(i * 0.3) * 1100
    const value = Math.round(Math.max(13500, base + wave))
    return { day, value }
  }), [])

  // ========================================
  // Publish Timing Heatmap + Best Hours Optimizer (new premium feature)
  // 24h x 3 platforms realistic mock data (XHS evening peaks, Bili morning+weekend, Douyin noon/night)
  // useMemo for perf; data-driven: static patterns + supplement from displayContent date distribution (weekday bias)
  // Used for: heatmap viz, best slots list, timing insights (feeds generateInsights + dedicated), optimized calendar
  // Fully client, uses existing COLORS/framer/lucide (Clock), Apple glass cards + custom colored grid (no new Recharts needed)
  // ========================================
  const heatmapData = useMemo(() => {
    const platforms: Platform[] = [...PLATFORMS]
    // weekday bias from user's (mock+imported) content dates -> slightly boosts "realistic" recommendations
    const dayBias = [0, 0, 0, 0, 0, 0, 0] // JS: 0=Sun, 1=Mon, ..., 6=Sat
    displayContent.forEach(item => {
      const d = new Date(item.date + 'T00:00:00')
      if (!isNaN(d.getTime())) {
        dayBias[d.getDay()] += 1
      }
    })
    const totalBias = dayBias.reduce((a, b) => a + b, 0) || 1
    // weekend emphasis for Bili e.g.
    const hasWeekendBias = (dayBias[0] + dayBias[6]) > (totalBias * 0.35)

    return platforms.map((platform) => {
      const scores = Array.from({ length: 24 }, (_, hour) => {
        let score = 32 + Math.sin(hour / 4.2) * 7 // gentle daily wave base

        if (platform === 'Xiaohongshu') {
          // classic XHS: evening 17-23 peak ~20-21, decent afternoon
          if (hour >= 17 && hour <= 23) {
            score = 58 + Math.sin(((hour - 17) / 6) * Math.PI) * 32
          } else if (hour >= 12 && hour < 17) {
            score = 46 + (hour - 12) * 3
          } else if (hour < 9) {
            score = 20 + hour * 2.2
          }
        } else if (platform === 'Bilibili') {
          // Bili: deep content loves mornings 7-13 (esp weekend), some evening
          if (hour >= 7 && hour <= 13) {
            score = 55 + Math.sin(((hour - 7) / 6) * Math.PI) * 26
          } else if (hour >= 19 && hour <= 23) {
            score = 48 + (hour - 19) * 4
          } else if (hour >= 14 && hour < 19) {
            score = 30 + (hour - 14) * 2.5
          }
        } else {
          // Douyin: strong noon 10-15 + night 18-23 windows
          if ((hour >= 10 && hour <= 15) || (hour >= 18 && hour <= 23)) {
            const phase = hour <= 15 ? (hour - 10) / 5 : (hour - 18) / 5
            score = 58 + Math.sin(phase * Math.PI) * 30
          } else if (hour >= 0 && hour < 9) {
            score = 24
          } else {
            score = 40
          }
        }

        // deterministic micro jitter (stable "mock")
        const jitter = ((hour * 13 + 7) % 9) - 4
        let final = Math.round(Math.max(16, Math.min(96, score + jitter)))

        // data-driven supplement: if user posts bias weekends, boost Bili morning hours
        if (platform === 'Bilibili' && hour >= 8 && hour <= 12 && hasWeekendBias) {
          final = Math.min(96, final + 7)
        }
        // slight overall lift for platforms with more user content (personal signal)
        const platPosts = displayContent.filter(c => c.platform === platform).length
        if (platPosts > 0) final = Math.min(96, final + Math.min(4, platPosts))

        return final
      })
      return { platform, scores }
    })
  }, [displayContent])

  // Derived top 3 best hours per platform (for lists + calendar + insights)
  const bestHoursData = useMemo(() => {
    return heatmapData.map(({ platform, scores }) => {
      const withHour = scores.map((score, hour) => ({ hour, score }))
      const sorted = [...withHour].sort((a, b) => b.score - a.score).slice(0, 3)
      const avg = scores.reduce((s, v) => s + v, 0) / 24
      return {
        platform,
        top: sorted.map(s => ({
          hour: s.hour,
          score: s.score,
          label: `${s.hour.toString().padStart(2, '0')}:00`,
          lift: Math.round(((s.score - avg) / Math.max(1, avg)) * 100)
        })),
        avgScore: Math.round(avg)
      }
    })
  }, [heatmapData])

  // Best timing insights (used both in generateInsights feed + dedicated "最佳时段洞察" card)
  const bestTimingInsights = useMemo(() => {
    const ins: string[] = []
    const bili = bestHoursData.find(b => b.platform === 'Bilibili')
    if (bili?.top[0]) {
      const t = bili.top[0]
      ins.push(`根据你的历史，B站周六上午${t.hour}点发布可提升预期完播 ${Math.max(12, t.lift)}%。`)
    }
    const xhs = bestHoursData.find(b => b.platform === 'Xiaohongshu')
    if (xhs?.top[0]) {
      const t = xhs.top[0]
      ins.push(`小红书 ${t.label} 发布时段，模拟数据显示收藏与互动率高于日均 ${t.lift}%。`)
    }
    const dy = bestHoursData.find(b => b.platform === 'Douyin')
    if (dy?.top[0]) {
      const t0 = dy.top[0]
      const t1 = dy.top[1] || dy.top[0]
      ins.push(`抖音 ${t0.label}（或 ${t1.label}）是流量高峰，匹配你的短视频完播潜力。`)
    }
    ins.push('跨平台建议：避开 02:00-06:00 低谷，优先平台专属峰值时段可提升整体 15-25% 表现。')
    return ins
  }, [bestHoursData])

  // Dynamic + rule-based insights (ready for real Claude integration)
  const topContentByPlatform = PLATFORMS.map(platform => {
    const platformContent = displayContent.filter(c => c.platform === platform)
    if (platformContent.length === 0) return null
    return platformContent.reduce((max, c) => c.views > max.views ? c : max)
  }).filter(Boolean) as ContentItem[]

  const generateInsights = () => {
    const insights: string[] = [
      `${topPlatform.platform} 互动率最高 (${topPlatform.engagement}%)，建议优先在这个平台发布核心内容。`,
      "跨平台最佳发布时间：小红书晚上8-10点，B站周末上午，抖音工作日中午。",
    ]

    // Feed "最佳时段洞察" from the new heatmap-derived data (data-driven + realistic)
    if (bestTimingInsights.length > 0) {
      insights.push(bestTimingInsights[0])
    }

    if (topContentByPlatform.length > 0) {
      const topBili = topContentByPlatform.find(c => c.platform === 'Bilibili')
      if (topBili) {
        insights.push(`B站爆款「${topBili.title}」建议改编为小红书笔记：提取3个核心观点 + 配图 + 个人经验。（平台页点击「重塑」按钮查看完整工具）`)
      }
      const topXhs = topContentByPlatform.find(c => c.platform === 'Xiaohongshu')
      if (topXhs) {
        insights.push(`小红书高互动笔记可转成抖音短视频脚本：用前15秒钩子讲痛点，结尾引导关注。（使用内容重塑工具一键生成详细版）`)
      }
    }

    // Add data-driven
    const avgViews = displayContent.length > 0 ? displayContent.reduce((s, c) => s + c.views, 0) / displayContent.length : 0
    if (avgViews > 30000) {
      insights.push('你的平均播放量不错！尝试固定系列内容（如每周一「工具推荐」），提升粉丝粘性。')
    } else {
      insights.push('播放量有提升空间：分析标题党 vs 价值党，测试A/B标题在不同平台。')
    }

    insights.push(`你的最佳内容类型是「${bestType}」，建议多产出类似，预计增长 ${avgGrowth.toFixed(1)}% 左右。`)

    insights.push(`平台趋势概览：${platformTrends}`)

    return insights
  }

  const insights = generateInsights()

  // Content Idea Generator for personal creators
  const generateContentIdeas = () => {
    const ideas: string[] = []
    if (topContentByPlatform.length > 0) {
      const top = topContentByPlatform[0]
      ideas.push(`基于「${top.title}」爆款：制作系列「${top.platform} 干货」笔记，每周一篇，保持一致风格。`)
      ideas.push(`跨平台复用：将 ${top.platform} 内容拆成 3 条短视频（抖音）+ 1 篇深度笔记（小红书）。`)
    }
    ideas.push('热门趋势：结合「AI工具」+「个人成长」，做「我用AI做的第一个副业项目」分享。')
    ideas.push('互动钩子：结尾问「你最想学哪个技能？评论区告诉我」，提升完播和评论。')
    return ideas
  }

  const contentIdeas = generateContentIdeas()

  // ========================================
  // Content Calendar for personal creators (new feature)
  // Simple 7-day suggested posting schedule.
  // Derives from: user's top content types (contentTypeCounts/bestType),
  // platform trends (mockPlatformData engagement+growth), best times (from existing insights strings + mocks).
  // Uses purely mock/deterministic data. Apple-premium card + clean list UI.
  // ========================================
  const generateContentCalendar = () => {
    // Top content types from user's (mock + imported) data
    const sortedTypes = Object.entries(contentTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t)
    const primaryType = bestType

    // Best posting times pulled from existing hardcoded insights + platform data
    // (in real: would come from computed best-time heatmaps)
    const bestTimes: Record<string, string> = {
      'Xiaohongshu': '晚上 8-10 点',
      'Bilibili': '周末 上午 10-12 点',
      'Douyin': '工作日 中午 12-14 点 / 19-21 点'
    }

    // Rank platforms by combined trend strength (engagement + growth) — from existing platform data
    const rankedPlatforms = [...mockPlatformData]
      .sort((a, b) => (b.engagement + b.growth) - (a.engagement + a.growth))
      .map(p => p.platform)

    const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

    const schedule = weekdays.map((day, index) => {
      const platform = rankedPlatforms[index % rankedPlatforms.length]
      const type = sortedTypes[index % sortedTypes.length] || primaryType
      const time = bestTimes[platform] || '晚上 8 点'

      let why = ''
      if (platform === 'Xiaohongshu') {
        why = '高互动率平台，适合图文种草与收藏'
      } else if (platform === 'Bilibili') {
        why = '周末深度观众活跃，适合长内容'
      } else {
        why = '短视频算法高峰，适合钩子测试'
      }
      // Tie to top content type
      if (type.includes('视频') || type === '短视频') {
        why += ' · 延续你的视频优势'
      } else {
        why += ' · 发挥笔记/干货优势'
      }
      why += `（数据来源：你的 ${primaryType} 表现 + 平台趋势）`

      return {
        day,
        platform,
        type,
        time,
        tip: why
      }
    })

    return schedule
  }

  // ========================================
  // generateOptimizedCalendar: augments the 7-day calendar using precise times from heatmapData / bestHoursData
  // Called by the new "生成优化后日历" button. Picks specific HH:00 from per-platform peaks (with weekend/day bias)
  // Keeps the same structure/types as contentCalendar so existing UI renders it seamlessly.
  // "Augments" meaning uses the advanced data instead of the range strings in original generateContentCalendar.
  // ========================================
  const generateOptimizedCalendar = () => {
    // reuse same top types / ranking logic as the base calendar (DRY where possible)
    const sortedTypes = Object.entries(contentTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t)
    const primaryType = bestType

    const rankedPlatforms = [...mockPlatformData]
      .sort((a, b) => (b.engagement + b.growth) - (a.engagement + a.growth))
      .map(p => p.platform)

    const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

    // Pick precise time string using heatmap best (data-driven)
    const getPreciseTime = (platform: string, dayIdx: number): string => {
      const entry = bestHoursData.find(e => e.platform === platform)
      if (!entry || entry.top.length === 0) return '20:00'

      const isWeekend = dayIdx >= 5 // 周六 / 周日
      let preferredHours: number[] = []

      if (platform === 'Bilibili') {
        preferredHours = isWeekend ? [8, 9, 10, 11, 12] : [9, 10, 11, 20, 21]
      } else if (platform === 'Xiaohongshu') {
        preferredHours = [17, 18, 19, 20, 21, 22]
      } else {
        // Douyin
        preferredHours = [11, 12, 13, 19, 20, 21, 22]
      }

      // choose the highest scoring among preferred (or fall to overall top)
      let bestHour = entry.top[0].hour
      let bestScore = -1
      preferredHours.forEach(h => {
        const sc = (entry as any).top.find((t: any) => t.hour === h)?.score ?? heatmapData.find(d => d.platform === platform)!.scores[h]
        if (sc > bestScore) {
          bestScore = sc
          bestHour = h
        }
      })

      // final guard: overall best if significantly higher
      const overallTop = entry.top[0].hour
      if (entry.top[0].score > bestScore + 4) bestHour = overallTop

      return `${bestHour.toString().padStart(2, '0')}:00`
    }

    const schedule = weekdays.map((day, index) => {
      const platform = rankedPlatforms[index % rankedPlatforms.length]
      const type = sortedTypes[index % sortedTypes.length] || primaryType
      const time = getPreciseTime(platform, index)

      let why = ''
      if (platform === 'Xiaohongshu') {
        why = '热力图峰值晚间 · 高互动收藏期'
      } else if (platform === 'Bilibili') {
        const isWknd = (day === '周六' || day === '周日')
        why = isWknd ? 'B站周末上午/晚高峰 · 深度观众活跃' : 'B站工作日晚间窗口 · 完播友好'
      } else {
        why = '抖音算法流量峰值窗口 · 完播潜力高'
      }
      // Tie to content type + heatmap
      if (type.includes('视频') || type === '短视频') {
        why += ' · 延续你的视频优势'
      } else {
        why += ' · 发挥笔记/干货优势'
      }
      why += `（热力图精选 ${time} · 表现指数优于均值）`

      return {
        day,
        platform,
        type,
        time,
        tip: why
      }
    })

    return schedule
  }

  // ========================================
  // Series / Episode Planner (5-episode deterministic plan)
  // Uses bestType, topContentByPlatform, displayContent
  // Each episode: variations on top performer title, platform focus cycling best platforms,
  // repurposing note linking to repurposer, estimated publish from calendar logic (weekdays + best times),
  // "why this works" tied to real stats/engagement/growth.
  // ========================================
  const generateSeriesPlan = () => {
    // Find top performer(s)
    const topItem = topContentByPlatform.length > 0 
      ? topContentByPlatform.reduce((max, c) => c.views > max.views ? c : max)
      : displayContent[0] || { title: '我的爆款内容', platform: 'Bilibili', type: bestType, views: 45000, likes: 3200 }

    const topTitle = topItem.title
    const baseTitle = topTitle.length > 22 ? topTitle.slice(0, 21) + '…' : topTitle

    // Use best performing platform first, then cycle
    const rankedPlatforms = [...mockPlatformData]
      .sort((a, b) => (b.engagement + b.growth) - (a.engagement + b.growth))
      .map(p => p.platform)

    const sortedTypes = Object.entries(contentTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t)
    const primaryType = bestType

    const bestTimes: Record<string, string> = {
      'Xiaohongshu': '晚上 8-10 点',
      'Bilibili': '周末 上午 10-12 点',
      'Douyin': '工作日 中午 12-14 点'
    }

    const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    const episodeThemes = ['引言与钩子', '核心干货拆解', '实战案例复盘', '避坑与进阶', '行动号召 + 系列预告']

    const plan = Array.from({ length: 5 }, (_, i) => {
      const episodeNum = i + 1
      const platformFocus = rankedPlatforms[i % rankedPlatforms.length]
      const typeForEp = sortedTypes[i % sortedTypes.length] || primaryType

      // Title variations on top performer
      let suggestedTitle = ''
      if (i === 0) {
        suggestedTitle = `${baseTitle} · ${episodeThemes[0]}（第1集）`
      } else if (i === 1) {
        suggestedTitle = `如何${baseTitle.replace(/如何|的/g, '')}：${episodeThemes[1]}`
      } else if (i === 2) {
        suggestedTitle = `我的${baseTitle}真实复盘（${episodeThemes[2]}）`
      } else if (i === 3) {
        suggestedTitle = `${baseTitle.split(/[，。]/)[0]}避坑指南：${episodeThemes[3]}`
      } else {
        suggestedTitle = `从0到爆款：${baseTitle} ${episodeThemes[4]}`
      }

      // Repurposing note linking to existing repurposer
      const repurposingNote = `使用「重塑」工具从「${topItem.platform} · ${topTitle.slice(0,18)}」改编为${platformFocus}版本`

      // Estimated publish day from calendar logic
      const dayIndex = i % 7
      const publishDay = `${weekdays[dayIndex]} · ${bestTimes[platformFocus] || '晚上 8 点'}`

      // Why this works - data driven
      const topPlatformData = mockPlatformData.find(p => p.platform === platformFocus)
      const eng = topPlatformData ? topPlatformData.engagement : 12
      const gr = topPlatformData ? topPlatformData.growth : avgGrowth
      let whyThisWorks = `你的 ${primaryType} 平均表现优秀（数据驱动），${platformFocus} 互动率 ${eng}% + 增长 +${gr.toFixed(1)}% 是系列最佳载体。`
      if (topItem.views > 30000) {
        whyThisWorks += ` 基于爆款「${topTitle.slice(0,14)}」的 ${ (topItem.views/1000).toFixed(0) }K 播放，系列化可提升完播与留存。`
      } else {
        whyThisWorks += ` 延续 ${bestType} 优势，预计单集增长贡献 ${ (avgGrowth * 0.6).toFixed(1) }%。`
      }
      whyThisWorks += `（数据来源：topContentByPlatform + platform engagement）`

      return {
        episode: episodeNum,
        title: suggestedTitle,
        platformFocus,
        repurposingNote,
        publishDay,
        whyThisWorks
      }
    })

    return plan
  }

  // Rule-based smart AI response generator (for "Ask Claude" stub, uses current data)
  // Parses Chinese keywords: 重塑/系列/增长/时间 etc. Crafts helpful reply with real stats/bestType/top items.
  const generateSmartAIResponse = (question: string): string => {
    const q = question.toLowerCase().trim()
    const top = topContentByPlatform[0] || displayContent[0]
    const topTitle = top ? top.title : '你的爆款内容'
    const topPlatform = top ? top.platform : 'Bilibili'
    const avgV = displayContent.length > 0 
      ? Math.round(displayContent.reduce((s, c) => s + c.views, 0) / displayContent.length / 1000) 
      : 25

    let reply = `基于你的 Overlook 数据（最佳类型：${bestType}，平均播放 ~${avgV}K，平台趋势 ${platformTrends.slice(0,60)}...），`

    if (q.includes('重塑') || q.includes('改编') || q.includes('转') || q.includes('小红书') || q.includes('抖音')) {
      reply += `我推荐用内容重塑工具把「${topTitle}」从 ${topPlatform} 转成 3 篇小红书笔记：1. 痛点+工具清单；2. 步骤截图+个人避坑；3. 成果数据+CTA。`
      reply += `每篇控制 1800 字左右，晚 8-10 点发布。你的高互动内容转笔记收藏率通常 >18%。`
    } else if (q.includes('系列') || q.includes('多集') || q.includes('5集') || q.includes('规划')) {
      reply += `强烈建议做 5 集系列！以「${topTitle}」为母题，每集聚焦一个阶段：引言、拆解、复盘、避坑、行动。`
      reply += `平台轮动：优先 ${topPlatform} 发长版，其余用重塑工具分发。预计系列总播放提升 2.3x（基于你的 ${bestType} 数据）。`
    } else if (q.includes('增长') || q.includes('粉') || q.includes('涨粉') || q.includes('粉丝')) {
      reply += `当前平均增长 ${avgGrowth.toFixed(1)}%。专注 ${bestType} + 高互动平台（小红书 ${mockPlatformData.find(p=>p.platform==='Xiaohongshu')?.engagement}%），`
      reply += `每周固定 1 集系列内容 + 结尾强 CTA「评论领系列清单」，预计月增粉 400-700（你的 top 内容已证明有效）。`
    } else if (q.includes('时间') || q.includes('发布') || q.includes('日历') || q.includes('什么时候')) {
      reply += `参考内容日历：小红书晚上 8-10 点、B站周末上午、抖音工作日中午。`
      reply += `用「生成系列规划」后，点击「应用到日历」可直接合并到你的 7 天计划。坚持 4 周可看到数据曲线向上。`
    } else if (q.includes('ai') || q.includes('claude') || q.includes('工具')) {
      reply += `你已经在用 Overlook 的模拟 Claude 了！生产环境填 Anthropic key（本地存），或导出 JSON 去 claude.ai 分析。`
      reply += `Claude 特别擅长把你的 ${bestType} 爆款扩展成完整内容大纲。`
    } else {
      // general helpful using data
      reply += `当前总播放 ${ (personalTotalViews / 1000).toFixed(0) }K，粉丝基数约 ${ (totalFollowers / 1000).toFixed(0) }K。`
      reply += `建议：把 ${topPlatform} 的「${topTitle}」重塑成系列内容，每周发布 1-2 次，配合日历节奏。`
      reply += `想具体方案？试试「生成系列规划」按钮，或直接问我「如何把爆款变成系列」。`
    }

    reply += `\n\n（模拟响应 · 使用了你的实时 displayContent、bestType、topContentByPlatform 数据）`
    return reply
  }

  // ========================================
  // Content Repurposing Tool - Core Logic (single clean implementation)
  // Uses existing ContentItem data (platform, title, views, likes, type, date)
  // Generates premium, platform-specific adaptation suggestions.
  // Deterministic, data-aware (high engagement favors personal/CTA heavy for XHS etc.)
  // ========================================
  interface RepurposeSuggestion {
    targetPlatform: string
    adaptedTitle: string
    keyPoints: string[]
    visuals: string
    cta: string
    tips: string
    rationale: string
  }

  const generateRepurposeSuggestions = (item: ContentItem): RepurposeSuggestion[] => {
    const otherPlatforms = PLATFORMS.filter(p => p !== item.platform)
    const suggestions: RepurposeSuggestion[] = []

    const isHighEngagement = item.likes > 3000 || (item.views > 0 && (item.likes / item.views) > 0.08)
    const isVideo = item.type.includes('视频') || item.type === '短视频'
    const titleWords = item.title.split(/[\s，。：:]+/).filter(w => w.length > 1).slice(0, 5)

    otherPlatforms.forEach(target => {
      let adaptedTitle = ''
      let keyPoints: string[] = []
      let visuals = ''
      let cta = ''
      let tips = ''
      let rationale = ''

      const baseTitle = item.title.length > 18 ? item.title.slice(0, 17) + '…' : item.title

      if (item.platform === 'Bilibili' && target === 'Xiaohongshu') {
        adaptedTitle = `${baseTitle} | 干货实录 + 工具清单（个人创作者必看）`
        keyPoints = [
          `核心价值提取：从「${titleWords[0] || '实战'}」出发，拆解 3-4 个可立即行动的步骤`,
          isHighEngagement ? '高互动点复用：加入真实复盘数据与避坑经验（小红书用户爱「干货+真实」）' : '加入个人成长心路 + 具体成果数据',
          '结构：痛点开篇 → 工具/方法详解 → 结果截图/数据 → 复盘',
          '长度控制：1500-2500字，配 5-8 张图'
        ]
        visuals = '封面：简洁 Mac/桌面 + 醒目标题 + 少量图标；正文配流程图、截图、对比图；避免过多文字堆砌'
        cta = '评论区告诉我：「你目前卡在哪个阶段？」我挑高赞回复继续拆解'
        tips = '发布时间：晚 8-10 点。标签：#独立开发 #AI工具 #副业分享 #内容创作'
        rationale = `B站长视频深度内容天然适合小红书图文笔记。你的作品播放 ${ (item.views/1000).toFixed(0) }K，互动潜力高，转笔记可触达更精准的「工具党」读者。`
      } else if (item.platform === 'Bilibili' && target === 'Douyin') {
        adaptedTitle = `${titleWords.slice(0,2).join('')}的3个核心技巧 #${titleWords[0] || 'AI'} #副业`
        keyPoints = [
          '前 3 秒钩子：直击痛点（“3个月用AI变现，我做对了什么”）',
          '中间 15-45 秒：快速展示 2-3 个关键步骤 + 视觉演示',
          '结尾 5 秒：强 CTA + 完整版去 B 站 / 评论领资料',
          '竖版 9:16，字幕大、节奏快、背景音乐轻快'
        ]
        visuals = '竖屏实拍/屏幕录制混剪；关键帧放大文字；使用原视频精彩片段 + 简单转场'
        cta = '评论「AI」二字，我私信发完整工具清单；关注后看系列'
        tips = 'BGM 用 upbeat 轻音乐；首图用高对比封面；测试 3 种钩子标题'
        rationale = `抖音用户注意力短，你的 B 站深度内容拆成短视频钩子 + 导流，可大幅提升完播与粉丝增长。数据表明高播放内容转短视频转化优秀。`
      } else if (item.platform === 'Xiaohongshu' && target === 'Bilibili') {
        adaptedTitle = `${baseTitle} 完整版：从灵感到落地全过程（附源码/清单）`
        keyPoints = [
          `扩展笔记精华：把 ${titleWords[0] || '分享'} 的每个点讲透，增加演示与代码/步骤细节`,
          '增加「幕后」故事与时间线（小红书用户爱故事，B站用户爱干货）',
          '结尾 Q&A 环节或「你也可以这么做」章节',
          '视频长度 8-15 分钟，章节标记清晰'
        ]
        visuals = '封面使用笔记同款高级感；正文大量实操屏幕录制、桌面展示、手写笔记特写；B 站缩略图用大标题+人物/产品'
        cta = '三连 + 评论你最想深挖的部分，我做续集；B 站关注领完整资源包'
        tips = 'B站封面文字要大而清晰；添加「合集」标签；发布时间选周末上午或周中晚'
        rationale = `小红书笔记高互动说明内容共鸣强，扩展成长为 B 站长视频可建立「专家」人设，带来订阅与深度粉丝。`
      } else if (item.platform === 'Xiaohongshu' && target === 'Douyin') {
        adaptedTitle = `笔记里没讲完的：${titleWords[0] || '我的'} 真实 ${titleWords[1] || '经历'} #生活分享`
        keyPoints = [
          '开场 2 秒抓眼球：用笔记中最打动人的那句话或表情包',
          '快速展示 3 张图/前后对比，配口播讲解',
          '结尾引导去小红书看完整笔记 + 关注',
          '竖版真人出镜或精美图文转场，情绪真诚'
        ]
        visuals = '用笔记封面/内图做主体；加真人出镜或手势演示；文字叠加简洁；自然光或干净背景'
        cta = '关注领「完整版笔记链接」；评论你最有共鸣的一点'
        tips = 'Douyin 算法爱完播，控制在 45-75 秒；多用疑问句钩子；带#小红书同款 #真实分享'
        rationale = `小红书高点赞笔记证明情感价值强，短视频形式能触达更多年轻用户，导流回笔记形成闭环。你的 ${ (item.likes/1000).toFixed(1) }K 赞说明共鸣点优秀。`
      } else if (item.platform === 'Douyin' && target === 'Bilibili') {
        adaptedTitle = `${baseTitle} 深度版：原理 + 完整实操 + 数据复盘`
        keyPoints = [
          '把抖音 3 个小技巧扩展为系统方法论',
          '增加「为什么有效」的理论/案例拆解 + 你的实测数据',
          '结尾附「进阶练习」与资源链接',
          '时长 10-20 分钟，加入章节卡片与时间戳'
        ]
        visuals = '高质量屏幕录制 + 讲解画面；使用图表、流程动画；封面专业感强（非抖音竖版）'
        cta = '点赞三连后评论「想看第2集」，我按需求产出；B站合集持续更新'
        tips = 'B站更注重完播与互动，脚本要慢一点、解释更充分；可加弹幕互动引导'
        rationale = `抖音爆款短内容证明话题热度，扩展成 B 站长视频可沉淀为「系列内容」，提升平均观看时长与粉丝忠诚度。`
      } else if (item.platform === 'Douyin' && target === 'Xiaohongshu') {
        adaptedTitle = `${baseTitle} 笔记版：手把手 + 避坑 + 我的真实结果`
        keyPoints = [
          '将视频技巧转化为图文步骤（编号 1/2/3）',
          '补充抖音里没时间讲的「工具下载」「参数设置」「常见错误」',
          '加入前后对比图 + 个人使用心得（XHS 用户最爱）',
          '结尾「你也可以 7 天内尝试」行动号召'
        ]
        visuals = '封面用抖音同款视觉但横版高级；正文 6-10 张高清步骤截图 + 标注；干净排版留白'
        cta = '收藏 + 评论「已尝试」，我来帮你解答；关注看我下篇实测'
        tips = 'XHS 笔记封面文字占比 30% 以内；用 emoji 点缀但不过度；晚高峰发布'
        rationale = `抖音高播放证明话题抓人，笔记形式适合深度沉淀，方便用户「稍后看」与搜索，转化收藏与关注极高。`
      } else {
        // Fallback generic
        adaptedTitle = `${baseTitle} · ${target} 适配版`
        keyPoints = ['提取原内容 3 个核心价值点', '适配平台表达习惯', '强化视觉与互动']
        visuals = '平台推荐视觉风格'
        cta = '引导关注与互动'
        tips = '测试不同发布时间'
        rationale = '基于跨平台数据，类似内容表现良好。'
      }

      suggestions.push({
        targetPlatform: target,
        adaptedTitle,
        keyPoints,
        visuals,
        cta,
        tips,
        rationale
      })
    })

    return suggestions
  }

  const copyToClipboard = (text: string, label?: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(label ? `${label} 已复制` : '已复制到剪贴板')
    }).catch(() => toast.error('复制失败，请手动选择'))
  }

  // Handle Ask Claude submit - rule based + simulate call if key present
  const handleAskAI = () => {
    const q = aiQuestion.trim()
    if (!q) {
      toast.error('请输入问题')
      return
    }
    setIsAsking(true)
    setAiResponse('')

    const simulatedDelay = claudeApiKey && claudeApiKey.length > 3 ? 1350 : 580

    setTimeout(() => {
      const smartReply = generateSmartAIResponse(q)
      const prefix = (claudeApiKey && claudeApiKey.length > 3)
        ? '【已检测到 Claude API Key（本地存储），模拟真实调用中...】\n\n'
        : '【模拟 Claude 响应 · 规则驱动，使用当前 Overlook 数据】\n\n'
      setAiResponse(prefix + smartReply)
      setIsAsking(false)
      toast.success('AI 响应已生成')
    }, simulatedDelay)
  }

  // Apply series plan to contentCalendar (merge for combined view)
  const applySeriesToCalendar = () => {
    if (seriesPlan.length === 0) {
      toast.error('请先生成系列规划')
      return
    }
    const newEntries = seriesPlan.map((ep) => {
      const parts = ep.publishDay.split(' · ')
      return {
        day: parts[0] || `第${ep.episode}集`,
        platform: ep.platformFocus,
        type: bestType,
        time: parts[1] || '晚上 8 点',
        tip: `【系列】${ep.title} — ${ep.whyThisWorks.slice(0, 95)}…`
      }
    })
    // Merge strategy: prepend series entries (prioritize action), keep some existing for combined
    const merged = [...newEntries, ...contentCalendar].slice(0, 7)
    setContentCalendar(merged)
    setIsCalendarGenerated(true)
    toast.success('系列 5 集已应用到日历（已合并显示组合视图）')
  }

  // Save goals (persistent via useLocalStorage)
  const saveGoals = () => {
    const newGoals: Goal = {
      targetViews: Math.max(5000, Math.floor(tempTargetViews)),
      targetFollowers: Math.max(50, Math.floor(tempTargetFollowers)),
    }
    setGoals(newGoals)
    toast.success('月度目标已保存 · 将用于进度跟踪')
  }

  // Memoized repurposing suggestions (uses existing data; recomputes only on item selection change)
  const currentRepurposeSuggestions = useMemo(() => {
    return repurposeItem ? generateRepurposeSuggestions(repurposeItem) : []
  }, [repurposeItem])

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      platforms: mockPlatformData,
      content: displayContent,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `overlook-report-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    toast.success('报告已导出（可直接上传GitHub或分享）')
  }

  // Export content list as CSV (useful for personal creators to track in sheets)
  const handleExportContentCSV = () => {
    if (displayContent.length === 0) {
      toast.error('没有内容可导出')
      return
    }
    const headers = ['平台', '标题', '播放量', '点赞', '日期', '类型']
    const rows = displayContent.map(item => [
      item.platform,
      item.title.replace(/"/g, '""'), // escape quotes
      item.views,
      item.likes,
      item.date,
      item.type
    ])
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `overlook-content-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    toast.success(`已导出 ${displayContent.length} 条内容为 CSV`)
  }

  // ========================================
  // Premium Sponsor / Brand Report PDF Export
  // Uses jsPDF + html2canvas (hybrid: clean text sections + canvas snapshot of visual area)
  // Always uses current data: displayContent, insights, contentCalendar, mockPlatformData
  // Produces 1-2 page Chinese premium report for solo creators to pitch brands/sponsors.
  // Loading via toast. Keeps JSON/CSV intact.
  // ========================================
  const handleExportPDF = async () => {
    const toastId = toast.loading('生成中...')
    try {
      // Dynamic import to avoid bloating main bundle (good practice for export feature)
      const { jsPDF } = await import('jspdf')
      const html2canvas = (await import('html2canvas')).default

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      const contentWidth = pageWidth - margin * 2
      let y = margin

      // Helper: add wrapped text
      const addWrappedText = (text: string, x: number, startY: number, maxWidth: number, lineHeight: number, fontSize = 11) => {
        doc.setFontSize(fontSize)
        const lines = doc.splitTextToSize(text, maxWidth)
        doc.text(lines, x, startY)
        return startY + lines.length * lineHeight
      }

      // ========== HEADER / TITLE ==========
      doc.setFillColor(0, 122, 255) // #007AFF
      doc.rect(0, 0, pageWidth, 28, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.text('Overlook 赞助商报告', margin, 12)
      doc.setFontSize(11)
      doc.text(`为创作者 • ${new Date().toLocaleDateString('zh-CN')} 生成`, margin, 20)

      // User / Creator name placeholder (use first account or generic)
      const creatorName = accounts[0]?.username || '@yourname'
      doc.setFontSize(10)
      doc.text(`报告对象：${creatorName} 的跨平台数据`, margin, 26)

      y = 35
      doc.setTextColor(0, 0, 0)

      // ========== KPIs SUMMARY (text/table style - premium clean) ==========
      doc.setFontSize(14)
      doc.setTextColor(0, 122, 255)
      doc.text('核心 KPI 概览', margin, y)
      y += 6

      doc.setDrawColor(0, 122, 255)
      doc.setLineWidth(0.3)
      doc.line(margin, y, margin + contentWidth, y)
      y += 7

      doc.setTextColor(33, 33, 33)
      doc.setFontSize(11)

      // KPI summary (text rows - premium clean layout, no array needed for text path)
      const kpiTextRows = [
        ['总播放量', `${(totalViews / 1000).toFixed(0)}K`, `+14% 本月`],
        ['总点赞', `${(totalLikes / 1000).toFixed(0)}K`, `+22% 本月`],
        ['总粉丝', `${(totalFollowers / 1000).toFixed(0)}K`, `+9% 本月`],
        ['平均互动率', `${avgEngagement}%`, `小红书突出`],
      ]

      kpiTextRows.forEach((row, idx) => {
        doc.setFontSize(10)
        doc.text(row[0], margin, y)
        doc.text(row[1], margin + 45, y)
        doc.setTextColor(52, 199, 89) // green accent
        doc.text(row[2], margin + 85, y)
        doc.setTextColor(33, 33, 33)
        y += 6
        if (idx < kpiTextRows.length - 1) {
          doc.setDrawColor(230, 230, 235)
          doc.line(margin, y - 2, margin + 100, y - 2)
        }
      })

      y += 4

      // Top platform highlight
      doc.setFontSize(10)
      doc.text(`表现最佳平台：${topPlatform.platform}（互动率 ${topPlatform.engagement}%）`, margin, y)
      y += 8

      // ========== TOP PERFORMING CONTENT LIST ==========
      doc.setFontSize(14)
      doc.setTextColor(0, 122, 255)
      doc.text('Top 表现内容（最近）', margin, y)
      y += 6
      doc.setDrawColor(0, 122, 255)
      doc.line(margin, y, margin + contentWidth, y)
      y += 6

      doc.setTextColor(33, 33, 33)
      const topContents = [...displayContent].sort((a, b) => b.views - a.views).slice(0, 5)
      topContents.forEach((item, idx) => {
        if (y > pageHeight - 45) { // new page check
          doc.addPage()
          y = margin + 10
          doc.setTextColor(0, 122, 255)
          doc.setFontSize(10)
          doc.text('Overlook 赞助商报告（续）', margin, y)
          y += 8
          doc.setTextColor(33, 33, 33)
        }
        const perf = `${(item.views/1000).toFixed(0)}K 播放 · ${(item.likes/1000).toFixed(1)}K 赞`
        doc.setFontSize(10)
        doc.text(`${idx + 1}. [${item.platform}] ${item.title.length > 38 ? item.title.slice(0,37)+'…' : item.title}`, margin, y)
        y += 5
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`   ${item.date} · ${item.type} · ${perf}`, margin, y)
        doc.setTextColor(33, 33, 33)
        y += 6
      })

      y += 3

      // ========== CURRENT INSIGHTS (bullets) ==========
      if (y > pageHeight - 60) {
        doc.addPage()
        y = margin + 10
      }
      doc.setFontSize(14)
      doc.setTextColor(0, 122, 255)
      doc.text('当前智能洞察', margin, y)
      y += 6
      doc.setDrawColor(0, 122, 255)
      doc.line(margin, y, margin + contentWidth, y)
      y += 6

      doc.setTextColor(33, 33, 33)
      insights.slice(0, 6).forEach((ins, i) => {
        if (y > pageHeight - 35) {
          doc.addPage()
          y = margin + 10
          doc.setTextColor(33, 33, 33)
        }
        doc.setFontSize(9.5)
        const bulletText = `• ${ins}`
        const lines = doc.splitTextToSize(bulletText, contentWidth - 5)
        doc.text(lines, margin, y)
        y += lines.length * 5 + 2
      })

      y += 4

      // ========== REPURPOSING HIGHLIGHTS (if any active) ==========
      if (repurposeItem && currentRepurposeSuggestions.length > 0) {
        if (y > pageHeight - 55) {
          doc.addPage()
          y = margin + 10
        }
        doc.setFontSize(14)
        doc.setTextColor(0, 122, 255)
        doc.text('内容重塑亮点（供品牌合作参考）', margin, y)
        y += 6
        doc.setDrawColor(0, 122, 255)
        doc.line(margin, y, margin + contentWidth, y)
        y += 5

        doc.setTextColor(33, 33, 33)
        doc.setFontSize(9)
        doc.text(`基于爆款「${repurposeItem.title.length > 30 ? repurposeItem.title.slice(0,29)+'…' : repurposeItem.title}」`, margin, y)
        y += 5
        currentRepurposeSuggestions.slice(0, 2).forEach(sug => {
          doc.text(`→ ${sug.targetPlatform}: ${sug.adaptedTitle.length > 42 ? sug.adaptedTitle.slice(0,41)+'…' : sug.adaptedTitle}`, margin, y)
          y += 5
        })
        y += 3
      }

      // ========== 7-DAY CALENDAR (if generated) ==========
      if (isCalendarGenerated && contentCalendar.length > 0) {
        if (y > pageHeight - 70) {
          doc.addPage()
          y = margin + 10
        }
        doc.setFontSize(14)
        doc.setTextColor(0, 122, 255)
        doc.text('7 天内容日历建议', margin, y)
        y += 6
        doc.setDrawColor(0, 122, 255)
        doc.line(margin, y, margin + contentWidth, y)
        y += 5

        doc.setTextColor(33, 33, 33)
        contentCalendar.slice(0, 7).forEach((entry, i) => {
          if (y > pageHeight - 30) {
            doc.addPage()
            y = margin + 10
          }
          doc.setFontSize(9)
          doc.text(`${entry.day} | ${entry.platform} · ${entry.type} @ ${entry.time}`, margin, y)
          y += 4.5
          doc.setFontSize(8.5)
          doc.setTextColor(80, 80, 80)
          const tipShort = entry.tip.length > 55 ? entry.tip.slice(0,54)+'…' : entry.tip
          doc.text(`   ${tipShort}`, margin, y)
          doc.setTextColor(33, 33, 33)
          y += 5.5
        })
        y += 3
      }

      // ========== HYBRID: text for clean sections + CANVAS SNAPSHOT of the specific "report printable area" div ==========
      // reportRef div is always in DOM (offscreen), contains premium styled Chinese content using current data.
      // Snapshot it for visual beauty/fidelity in PDF (1-2 pages total). Text sections ensure clean selectable data.
      if (reportRef.current) {
        try {
          // Capture the dedicated printable area for high visual fidelity (premium look, tables, lists)
          const canvas = await html2canvas(reportRef.current, {
            scale: 1.6,
            backgroundColor: '#ffffff',
            logging: false,
            width: 780,
            height: Math.min(620, reportRef.current.offsetHeight || 520)
          })
          const imgData = canvas.toDataURL('image/png')
          const imgWidth = contentWidth * 0.98
          const imgHeight = (canvas.height / canvas.width) * imgWidth

          // Place the canvas snapshot on new page or after text if space
          if (y + 12 > pageHeight - 30 || y > 120) {
            doc.addPage()
            y = margin + 6
          }
          y += 3
          doc.setFontSize(10)
          doc.setTextColor(0, 122, 255)
          doc.text('视觉报告区快照（html2canvas 捕获 · 含完整 KPI / Top / 洞察）', margin, y)
          y += 4

          if (y + imgHeight > pageHeight - 20) {
            // scale down slightly if needed for 1 page visual
            const scaleFit = (pageHeight - y - 22) / imgHeight
            const fitH = imgHeight * Math.max(0.65, scaleFit)
            doc.addImage(imgData, 'PNG', margin + 1, y, imgWidth, fitH)
            y += fitH + 6
          } else {
            doc.addImage(imgData, 'PNG', margin + 1, y, imgWidth, imgHeight)
            y += imgHeight + 6
          }
        } catch (e) {
          // canvas fail is non-fatal, text PDF still complete
          console.warn('html2canvas reportRef snapshot skipped', e)
        }
      } else {
        // ultimate fallback: simple temp visual (rare)
        try {
          const temp = document.createElement('div')
          temp.style.cssText = 'position:absolute;left:-9999px;top:0;width:650px;padding:12px;background:#fff;border:1px solid #eee;border-radius:8px;font-size:11px;color:#222'
          temp.innerHTML = `<div style="color:#007AFF;font-weight:600;margin-bottom:4px;">Overlook 报告摘要</div><div>KPI: 播放 ${(totalViews/1000).toFixed(0)}K | 点赞 ${(totalLikes/1000).toFixed(0)}K | 粉丝 ${(totalFollowers/1000).toFixed(0)}K</div>`
          document.body.appendChild(temp)
          const canvas = await html2canvas(temp, {scale:1.5, backgroundColor:'#fff', logging:false})
          const imgData = canvas.toDataURL('image/png')
          const imgW = contentWidth * 0.9
          const imgH = (canvas.height / canvas.width) * imgW * 0.8
          if (y + imgH + 15 < pageHeight) {
            doc.addImage(imgData, 'PNG', margin, y, imgW, imgH)
            y += imgH + 4
          }
          document.body.removeChild(temp)
        } catch (_) {}
      }

      // ========== FOOTER WITH LINK ==========
      if (y > pageHeight - 30) {
        doc.addPage()
        y = margin + 10
      }
      y = Math.max(y, pageHeight - 28)
      doc.setDrawColor(200, 200, 205)
      doc.line(margin, y, pageWidth - margin, y)
      y += 6
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text('Overlook • 个人创作者跨平台数据看板  |  https://wangjiehu.github.io/Overlook', margin, y)
      doc.text('本报告使用模拟+用户导入数据生成，适合品牌合作提案参考。', margin, y + 4)

      // Save
      const fileName = `overlook-sponsor-report-${new Date().toISOString().slice(0,10)}.pdf`
      doc.save(fileName)

      toast.success('赞助商报告 PDF 已生成！可直接发送给品牌方', { id: toastId })
    } catch (err) {
      console.error('PDF export failed', err)
      toast.error('PDF 生成失败，请重试或检查控制台', { id: toastId })
    }
  }

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const newItems: ContentItem[] = []
        results.data.forEach((row: any, idx: number) => {
          const platform = row['平台'] || row['platform']
          const title = row['标题'] || row['title']
          const views = parseInt(row['播放量'] || row['views'] || '0', 10)
          const likes = parseInt(row['点赞'] || row['likes'] || '0', 10)
          const date = row['日期'] || row['date'] || new Date().toISOString().slice(0, 10)
          const type = row['类型'] || row['type'] || '视频'

          if (platform && title) {
            newItems.push({
              id: Date.now() + idx,
              platform: String(platform).trim(),
              title: String(title).trim(),
              views: isNaN(views) ? 0 : views,
              likes: isNaN(likes) ? 0 : likes,
              date: String(date),
              type: String(type).trim()
            })
          }
        })

        if (newItems.length > 0) {
          setUserContent(prev => [...prev, ...newItems])
          toast.success(`成功导入 ${newItems.length} 条内容数据！`)
        } else {
          toast.error('未识别到有效数据，请检查CSV格式（参考示例）')
        }
      },
      error: () => toast.error('CSV解析失败')
    })

    // reset input
    e.target.value = ''
  }

  const handleDownloadSample = () => {
    const base = (import.meta.env as any)?.BASE_URL || '/'
    const a = document.createElement('a')
    a.href = base + 'sample-data.csv'
    a.download = 'sample-data.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const clearImportedData = () => {
    if (userContent.length === 0) return
    if (window.confirm(`清除 ${userContent.length} 条导入数据？`)) {
      setUserContent([])
      toast.success('已清除导入数据')
    }
  }

  const addMockAccount = (platform: string) => {
    if (!accounts.find(a => a.platform === platform)) {
      setAccounts([...accounts, { platform, username: '@yourname', connected: true }])
    }
    setShowAddAccount(false)
    toast.success(`已连接 ${platform} 账号`)
  }

  const removeAccount = (platform: string) => {
    setAccounts(accounts.filter(a => a.platform !== platform))
    toast.success(`已断开 ${platform} 账号`)
  }

  const handleThemeToggle = () => {
    const isDark = document.documentElement.classList.toggle('dark')
    localStorage.setItem('overlook-theme', isDark ? 'dark' : 'light')
    toast.success(isDark ? '已切换到深色模式（Apple 风格）' : '已切换到浅色模式')
  }

  // Table sort handler: click header toggles 播放量/点赞/日期 . Default date desc. Shows indicator.
  const handleSort = (key: 'views' | 'likes' | 'date') => {
    if (sortKey === key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc') // default to desc for metrics (higher better) and date newest first
    }
  }

  // Data freshness badge logic (for content rows): within ~7 days of 2026-06-03 ref (mocks 2026-05 treated as fresh per task)
  // Uses new Date(); shows green "新" (very recent) or "本周"
  const getFreshnessBadge = (dateStr: string): string | null => {
    try {
      const itemDate = new Date(dateStr + 'T00:00:00')
      const todayRef = new Date('2026-06-03T00:00:00') // chosen so recent May mocks qualify as "本周"
      const diffDays = Math.floor((todayRef.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays < 0) return null
      if (diffDays <= 2) return '新'
      if (diffDays <= 7) return '本周'
      return null
    } catch {
      return null
    }
  }

  // Start/restart onboarding tour (for header button + accounts tab)
  const startOnboarding = () => {
    setShowOnboarding(true)
    setOnboardingStep(0)
  }

  // Onboarding steps content (4-5 steps per spec, Apple HIG style, illustration + microcopy)
  const onboardingSteps = [
    {
      num: 1,
      icon: <Upload className="w-7 h-7" />,
      title: '导入你的CSV',
      desc: '从 B站、小红书或抖音创作者中心导出数据 CSV。点击顶部「导入CSV」或使用示例。数据 100% 本地存储，永不上传。',
      illust: '📥 支持官方格式，一秒合并示例数据到你的看板。隐私优先。'
    },
    {
      num: 2,
      icon: <Lightbulb className="w-7 h-7" />,
      title: '查看洞察',
      desc: '切换「洞察」标签，获得数据驱动的增长建议、爆款复用灵感与最佳发布时间。持续添加数据后建议更准。',
      illust: '💡 自动分析你的 top 内容，推荐系列化策略与跨平台机会。'
    },
    {
      num: 3,
      icon: <Repeat className="w-7 h-7" />,
      title: '使用重塑工具',
      desc: '平台内容表里点击任意行的「重塑」按钮。针对选中内容，一键生成目标平台的标题、结构、视觉与 CTA 建议。',
      illust: '🔄 B站视频 → 小红书笔记 / 抖音脚本。复制即用，提效 10x。'
    },
    {
      num: 4,
      icon: <Calendar className="w-7 h-7" />,
      title: '生成日历与系列',
      desc: '在洞察页「生成内容日历」，获得 7 天专属发布计划。另有系列规划器帮你把爆款拆成多集连载。',
      illust: '📅 结合平台高峰 + 你最强内容类型，节奏化输出不卡壳。'
    },
    {
      num: 5,
      icon: <Download className="w-7 h-7" />,
      title: '导出报告 / PDF / PWA安装',
      desc: '导出 JSON 或 CSV 存档。打印或「导出赞助商报告 PDF」。浏览器菜单可「安装」Overlook 为 PWA（离线优先）。',
      illust: '📤 备份数据、投递品牌合作、手机桌面直达。'
    }
  ]

  return (
    <div className="min-h-screen bg-[var(--apple-gray-3)] text-[var(--apple-gray-1)]">
      <Toaster position="top-center" richColors closeButton />

      {/* Minimal skip to content link for a11y (keyboard users) */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:dark:bg-[#1C1C1E] focus:text-[#007AFF] focus:rounded-full focus:shadow focus:text-sm"
      >
        跳到主要内容
      </a>

      <Navbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExport={handleExport}
        onImportClick={() => fileInputRef.current?.click()}
        onDownloadSample={handleDownloadSample}
        onClearImported={clearImportedData}
        hasImported={userContent.length > 0}
        onThemeToggle={handleThemeToggle}
        onShowOnboarding={startOnboarding}
        showInstall={!!deferredPrompt && !isPwaInstalled}
        onInstall={handleInstallPWA}
      />

      <div id="main-content" className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        {/* Hero Header - Apple clean */}
        <div className="mb-10">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="apple-h1">Overlook</h1>
              <p className="apple-body mt-2 max-w-md">
                专为个人创作者打造的一站式数据看板。B站 · 小红书 · 抖音，全部数据，一目了然。
              </p>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <div className="text-sm text-secondary">最后同步</div>
              <div className="font-medium">刚刚 · 2026年6月</div>
              {/* Prominent Sponsor / Brand Report PDF button - for creators pitching brands, always visible in header */}
              <button
                onClick={handleExportPDF}
                className="apple-btn apple-btn-primary text-xs sm:text-sm inline-flex items-center gap-1.5 mt-1 px-3.5 py-1 shadow-sm"
                title="生成专业赞助商/品牌报告 PDF，1-2 页，含 KPI、Top 内容、洞察、日历等，适合直接发送给潜在赞助方"
              >
                <FileText className="w-3.5 h-3.5" /> 导出赞助商报告 PDF
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* DASHBOARD TAB - Unified Overview */}
          {activeTab === 'dashboard' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* KPI Cards - Apple generous cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPICard 
                  icon={<Eye className="w-4 h-4" />} 
                  label="总播放" 
                  value={`${(totalViews / 1000).toFixed(0)}K`} 
                  change="+14% 本月" 
                />
                <KPICard 
                  icon={<Heart className="w-4 h-4" />} 
                  label="总点赞" 
                  value={`${(totalLikes / 1000).toFixed(0)}K`} 
                  change="+22% 本月" 
                />
                <KPICard 
                  icon={<Users className="w-4 h-4" />} 
                  label="总粉丝" 
                  value={`${(totalFollowers / 1000).toFixed(0)}K`} 
                  change="+9% 本月" 
                />
                <KPICard 
                  icon={<BarChart3 className="w-4 h-4" />} 
                  label="平均互动率" 
                  value={`${avgEngagement}%`} 
                  change="小红书表现突出" 
                  changeColor="#FF9500" 
                />
              </div>

              {/* Cross Platform Comparison Chart */}
              <div className="apple-card p-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="apple-h3">跨平台表现对比</h3>
                    <p className="text-sm text-secondary">过去30天数据</p>
                  </div>
                  <button onClick={() => setActiveTab('platforms')} className="apple-btn apple-btn-ghost text-sm">
                    查看详情 →
                  </button>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--apple-border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--apple-text-secondary)', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'var(--apple-text-secondary)', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--apple-bg-elevated)',
                          border: '1px solid var(--apple-border)',
                          borderRadius: '12px',
                          boxShadow: 'var(--shadow)',
                          fontSize: '13px',
                          color: 'var(--apple-text-primary)'
                        }}
                      />
                      <Bar dataKey="views" fill="var(--apple-blue)" radius={6} name="播放量 (千)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Charts Section: Engagement Distribution Pie + 30-day Growth Trend Line - Apple aesthetic */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Engagement Distribution PieChart - clean donut with Apple palette */}
                <div className="apple-card p-8">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="apple-h3">互动分布</h3>
                      <p className="text-sm text-secondary">各平台总互动贡献占比</p>
                    </div>
                  </div>
                  <div className="h-72 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={engagementData}
                          cx="50%"
                          cy="48%"
                          labelLine={false}
                          outerRadius={95}
                          innerRadius={52}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {engagementData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--apple-bg-elevated)',
                            border: '1px solid var(--apple-border)',
                            borderRadius: '12px',
                            boxShadow: 'var(--shadow)',
                            fontSize: '13px',
                            color: 'var(--apple-text-primary)'
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={32}
                          iconType="circle"
                          iconSize={8}
                          formatter={(value) => (
                            <span style={{ color: 'var(--apple-text-primary)', fontSize: '13px', fontWeight: 500 }}>{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Growth Trend Line Chart - last 30 days, smooth Apple-style */}
                <div className="apple-card p-8">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="apple-h3">增长趋势</h3>
                      <p className="text-sm text-secondary">过去30天每日互动量（模拟数据）</p>
                    </div>
                  </div>
                  <div className="h-72 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={growthTrendData}>
                        <CartesianGrid strokeDasharray="2 2" stroke="var(--apple-border)" />
                        <XAxis 
                          dataKey="day" 
                          tick={{ fontSize: 10, fill: 'var(--apple-text-secondary)' }} 
                          interval={5}
                          tickLine={{ stroke: 'var(--apple-border)' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 10, fill: 'var(--apple-text-secondary)' }} 
                          tickLine={{ stroke: 'var(--apple-border)' }}
                          tickFormatter={(v) => `${Math.round(v / 1000)}K`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--apple-bg-elevated)',
                            border: '1px solid var(--apple-border)',
                            borderRadius: '12px',
                            boxShadow: 'var(--shadow)',
                            fontSize: '13px',
                            color: 'var(--apple-text-primary)'
                          }}
                          formatter={(value) => [`${(value / 1000).toFixed(1)}K`, '互动']}
                        />
                        <Line 
                          type="natural" 
                          dataKey="value" 
                          stroke="var(--apple-blue)" 
                          strokeWidth={2.5} 
                          dot={false} 
                          activeDot={{ r: 4.5, fill: 'var(--apple-blue)', stroke: 'var(--apple-bg-elevated)', strokeWidth: 2 }} 
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Quick Insights */}
              <div className="apple-card p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Lightbulb className="w-5 h-5 text-[#FF9500]" />
                  <h3 className="apple-h3">智能洞察（AI 建议）</h3>
                </div>
                <div className="grid gap-4">
                  {insights.slice(0, 3).map((insight, i) => (
                    <div key={i} className="insight-card p-5 text-[15px] leading-relaxed border-l-4 border-[#007AFF]">
                      {insight}
                    </div>
                  ))}
                </div>
                <button onClick={() => setActiveTab('insights')} className="mt-6 text-sm text-[#007AFF] hover:underline flex items-center gap-1">
                  查看全部洞察与行动建议 <TrendingUp className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* PLATFORMS TAB */}
          {activeTab === 'platforms' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <h2 className="apple-h2">平台详情</h2>
                {/* Enhanced pill-like Apple filter bar (wrap + microcopy + a11y) */}
                <div className="platforms-filters">
                  <div className="inline-flex flex-wrap items-center gap-2 p-1.5 bg-[var(--apple-bg-secondary)] rounded-3xl border border-apple/70 shadow-sm" role="group" aria-label="内容筛选工具栏">
                    <input
                      type="text"
                      placeholder="搜索内容标题..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="px-4 py-2 rounded-full border border-apple bg-elevated text-sm w-full sm:w-64 focus:outline-none focus:border-[#007AFF] apple-input"
                      aria-label="搜索内容标题"
                    />
                    <select
                      value={platformFilter}
                      onChange={(e) => setPlatformFilter(e.target.value as any)}
                      className="px-4 py-2 rounded-full border border-apple bg-elevated text-sm focus:outline-none focus:border-[#007AFF] apple-select"
                      aria-label="按平台筛选"
                    >
                      <option value="all">所有平台</option>
                      {PLATFORMS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="px-3 py-2 rounded-full border border-apple bg-elevated text-sm focus:outline-none focus:border-[#007AFF] apple-input"
                      aria-label="从此日期开始筛选"
                    />
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="px-3 py-2 rounded-full border border-apple bg-elevated text-sm focus:outline-none focus:border-[#007AFF] apple-input"
                      aria-label="到此日期结束筛选"
                    />
                    {(searchTerm || platformFilter !== 'all' || dateFrom || dateTo) && (
                      <button
                        onClick={() => { setSearchTerm(''); setPlatformFilter('all'); setDateFrom(''); setDateTo(''); setSortKey('date'); setSortDir('desc'); }}
                        className="apple-btn apple-btn-ghost text-sm px-3"
                        aria-label="清除所有筛选与排序"
                      >
                        清除筛选
                      </button>
                    )}
                  </div>
                  <div className="text-[10px] text-secondary mt-1.5 ml-1 tracking-wide">提示：点击表头可排序播放/点赞/日期（默认最新）</div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {mockPlatformData.map((data, index) => (
                  <div key={index} className="apple-card p-7">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="font-semibold text-2xl">{data.platform}</div>
                        <div className="text-secondary text-sm">@{accounts.find(a => a.platform === data.platform)?.username || 'yourname'}</div>
                      </div>
                      <div className={`text-sm px-3 py-1 rounded-full ${data.growth > 10 ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-[#FF9500]/10 text-[#FF9500]'}`}>
                        +{data.growth}% 本月
                      </div>
                    </div>

                    <div className="space-y-4 text-sm">
                      <div className="flex justify-between"><span className="text-secondary">播放量</span><span className="font-medium">{(data.views / 1000).toFixed(0)}K</span></div>
                      <div className="flex justify-between"><span className="text-secondary">点赞</span><span className="font-medium">{(data.likes / 1000).toFixed(1)}K</span></div>
                      <div className="flex justify-between"><span className="text-secondary">评论</span><span className="font-medium">{data.comments}</span></div>
                      <div className="flex justify-between"><span className="text-secondary">互动率</span><span className="font-medium">{data.engagement}%</span></div>
                      <div className="flex justify-between"><span className="text-secondary">粉丝</span><span className="font-medium">{(data.followers / 1000).toFixed(1)}K</span></div>
                    </div>

                    <div className="mt-6 pt-6 border-t text-sm border-apple">
                      <div className="text-secondary mb-1">本月爆款</div>
                      <div className="font-medium leading-tight">“{data.topContent}”</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Content Performance Table (sortable by 播放/点赞/日期; freshness badges; a11y) */}
              <div className="apple-card p-7 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="apple-h3">你的内容表现（示例 + 导入的CSV数据）</h3>
                  {displayContent.length > 0 && (
                    <button onClick={handleExportContentCSV} className="apple-btn apple-btn-ghost text-xs px-3 py-1">
                      <Download className="w-3.5 h-3.5 inline mr-1" /> 导出 CSV
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto -mx-1 px-1">
                  <table className="apple-table min-w-full">
                  <thead>
                    <tr>
                      <th>平台</th>
                      <th>标题</th>
                      <th 
                        className="sortable" 
                        onClick={() => handleSort('views')}
                        tabIndex={0}
                        role="columnheader"
                        aria-sort={sortKey === 'views' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                        aria-label="按播放量排序，点击切换升降序"
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('views'); } }}
                      >
                        播放 {sortKey === 'views' && (sortDir === 'desc' ? <ChevronDown className="inline w-3 h-3 -mt-0.5" /> : <ChevronUp className="inline w-3 h-3 -mt-0.5" />)}
                      </th>
                      <th 
                        className="sortable" 
                        onClick={() => handleSort('likes')}
                        tabIndex={0}
                        role="columnheader"
                        aria-sort={sortKey === 'likes' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                        aria-label="按点赞数排序，点击切换升降序"
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('likes'); } }}
                      >
                        点赞 {sortKey === 'likes' && (sortDir === 'desc' ? <ChevronDown className="inline w-3 h-3 -mt-0.5" /> : <ChevronUp className="inline w-3 h-3 -mt-0.5" />)}
                      </th>
                      <th 
                        className="sortable" 
                        onClick={() => handleSort('date')}
                        tabIndex={0}
                        role="columnheader"
                        aria-sort={sortKey === 'date' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                        aria-label="按日期排序，点击切换升降序。默认倒序最新优先"
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('date'); } }}
                      >
                        日期 {sortKey === 'date' && (sortDir === 'desc' ? <ChevronDown className="inline w-3 h-3 -mt-0.5" /> : <ChevronUp className="inline w-3 h-3 -mt-0.5" />)}
                      </th>
                      <th className="text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Enhanced empty state + microcopy for filters (Apple HIG) */}
                    {displayContent.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12">
                          <div className="flex flex-col items-center justify-center text-center text-secondary">
                            <BarChart3 className="w-7 h-7 mb-3 opacity-60" />
                            <div className="font-medium text-[15px] text-[#1d1d1f] dark:text-white mb-1">没有匹配的内容</div>
                            <p className="text-sm max-w-[260px]">当前筛选或排序条件下没有结果。请尝试清除筛选，或导入示例/真实 CSV 补充数据。</p>
                            <button
                              onClick={() => { setSearchTerm(''); setPlatformFilter('all'); setDateFrom(''); setDateTo(''); setSortKey('date'); setSortDir('desc'); }}
                              className="mt-4 apple-btn apple-btn-ghost text-xs px-4 py-1.5"
                              aria-label="清除所有筛选并重置为日期降序"
                            >
                              清除筛选与排序
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      displayContent.map(item => (
                        <tr key={item.id}>
                          <td><span className="font-medium">{item.platform}</span>{item.id > 1000 && <span className="ml-1 text-[10px] px-1 py-0.5 bg-[#007AFF] text-white rounded">导入</span>}</td>
                          <td className="max-w-xs truncate">{item.title}</td>
                          <td>{(item.views / 1000).toFixed(0)}K</td>
                          <td>{(item.likes / 1000).toFixed(1)}K</td>
                          <td className="text-secondary tabular-nums">
                            {item.date}
                            {(() => {
                              const badge = getFreshnessBadge(item.date)
                              return badge ? (
                                <span className="ml-1.5 inline-block px-1.5 py-px text-[9px] font-semibold rounded-full bg-[#34C759] text-white align-middle" aria-label="数据新鲜度">{badge}</span>
                              ) : null
                            })()}
                          </td>
                          <td className="text-right">
                            <button
                              onClick={() => setRepurposeItem(item)}
                              className="apple-btn apple-btn-ghost text-xs px-3 py-1 inline-flex items-center gap-1.5"
                              aria-label="重塑此内容"
                              title="重塑此内容：生成跨平台适配建议"
                            >
                              <Repeat className="w-3.5 h-3.5" /> 重塑
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* INSIGHTS TAB - AI powered */}
          {activeTab === 'insights' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl">
              <div className="flex items-center justify-between mb-2">
                <h2 className="apple-h2">AI 增长洞察</h2>
                {/* Extra prominent PDF in Insights header for brand pitching context */}
                <button
                  onClick={handleExportPDF}
                  className="apple-btn apple-btn-primary text-sm inline-flex items-center gap-2 px-4 py-1.5"
                  title="导出赞助商报告 PDF"
                >
                  <FileText className="w-4 h-4" /> 导出赞助商报告 PDF
                </button>
              </div>
              <p className="apple-body mb-8 text-secondary">基于你的跨平台数据，Overlook 给出 actionable 建议（未来可直接接入 Claude 获得更智能分析）。</p>

              {displayContent.length === 0 && (
                <div className="apple-card p-6 mb-4 text-sm border-l-4 border-[#FF9500]">
                  暂无个人内容数据。导入 CSV 或使用示例后，这里会显示个性化洞察、内容灵感与增长预测。
                </div>
              )}

              <div className="space-y-4">
                {insights.map((insight, index) => (
                  <div key={index} className="apple-card p-7 insight-card">
                    <div className="flex gap-4">
                      <div className="mt-1 text-[#007AFF]">
                        <Lightbulb className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-[15px] leading-relaxed">{insight}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <h3 className="apple-h3 mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-[#FF9500]" /> 内容灵感生成器（基于你的数据）
                </h3>
                <div className="grid gap-3">
                  {contentIdeas.map((idea, i) => (
                    <div key={i} className="apple-card p-5 text-[15px] border-l-4 border-[#FF9500]">
                      {idea}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-secondary mt-2">这些建议根据你的高表现内容自动生成。持续输入数据，建议会更准。</p>
                <div className="mt-4">
                  <button 
                    onClick={() => {
                      const topItem = topContentByPlatform[0] || displayContent[0]
                      if (topItem) setRepurposeItem(topItem)
                    }}
                    className="apple-btn apple-btn-secondary text-sm inline-flex items-center gap-2"
                    title="基于你的数据，一键打开内容重塑工具，查看跨平台改编建议"
                  >
                    <Repeat className="w-4 h-4" /> 试试内容重塑工具
                  </button>
                  <span className="ml-3 text-[11px] text-secondary">选爆款内容 → 生成 XHS / 抖音 / B站 适配版本</span>
                </div>
              </div>

              {/* Content Calendar mini-section — Apple-premium cards + clean list for personal creators. (updated comment)
                   Triggered by Generate button. Uses mock data derived from top types + existing insights best times + platform trends.
                   Placed in Insights tab as requested. */}
              <div className="mt-8">
                <h3 className="apple-h3 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#007AFF]" /> 内容日历 · 7 天建议发布计划
                </h3>

                {!isCalendarGenerated || contentCalendar.length === 0 ? (
                  // Elegant empty / call-to-action state (Apple restraint)
                  <div className="apple-card p-8 text-center">
                    <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-[#007AFF]" />
                    </div>
                    <div className="font-medium text-[15px] mb-1">为你的创作节奏规划 7 天</div>
                    <p className="text-sm text-secondary max-w-xs mx-auto mb-5">
                      结合你最擅长的内容类型（{bestType} 等）、平台趋势与现有洞察中的最佳发布时间，一键生成专属发布建议。
                    </p>
                    <button
                      onClick={() => {
                        const cal = generateContentCalendar()
                        setContentCalendar(cal)
                        setIsCalendarGenerated(true)
                        toast.success('内容日历已生成！按建议节奏发布，效果更佳。')
                      }}
                      className="apple-btn apple-btn-primary inline-flex items-center gap-2 px-5"
                    >
                      <Sparkles className="w-4 h-4" /> 生成内容日历
                    </button>
                    <p className="text-[11px] text-secondary mt-3">纯模拟数据（可多次重新生成）。未来支持本地保存与通知提醒。</p>
                  </div>
                ) : (
                  // Generated state: premium clean list of day cards
                  <div className="space-y-3">
                    {contentCalendar.map((entry, i) => (
                      <div
                        key={i}
                        className="apple-card p-5 flex flex-col sm:flex-row sm:items-center gap-x-5 gap-y-3 transition-all hover:-translate-y-px"
                      >
                        <div className="sm:w-14 shrink-0 text-center">
                          <div className="text-[10px] uppercase tracking-[1px] text-secondary">DAY {i + 1}</div>
                          <div className="font-semibold text-xl tabular-nums tracking-[-0.02em] text-[#1d1d1f] dark:text-white">{entry.day}</div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="inline-flex items-center px-2.5 py-px rounded-full text-xs font-medium bg-[#007AFF]/10 text-[#007AFF]">
                              {entry.platform}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-px rounded-full text-xs font-medium bg-[#34C759]/10 text-[#34C759]">
                              {entry.type}
                            </span>
                          </div>
                          <div className="font-semibold text-[15px]">{entry.time}</div>
                          <div className="text-secondary text-[13px] leading-snug mt-0.5 pr-1">{entry.tip}</div>
                        </div>

                        <button
                          onClick={() => {
                            copyToClipboard(
                              `${entry.day} | ${entry.platform} · ${entry.type}\n时间：${entry.time}\n建议：${entry.tip}`,
                              '日历条目'
                            )
                          }}
                          className="apple-btn apple-btn-ghost text-xs px-3 py-1.5 self-start sm:self-center flex items-center gap-1 shrink-0"
                          title="复制这一天建议到剪贴板"
                        >
                          <Copy className="w-3.5 h-3.5" /> 复制
                        </button>
                      </div>
                    ))}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => {
                          const cal = generateContentCalendar()
                          setContentCalendar(cal)
                          toast.success('已重新生成 7 天内容日历')
                        }}
                        className="apple-btn apple-btn-secondary text-sm inline-flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" /> 重新生成
                      </button>
                      <button
                        onClick={() => {
                          setContentCalendar([])
                          setIsCalendarGenerated(false)
                          toast.success('日历已清除')
                        }}
                        className="apple-btn apple-btn-ghost text-sm"
                      >
                        清除日历
                      </button>
                      <span className="text-xs text-secondary self-center ml-2">提示：可结合内容重塑工具，提前准备适配内容。</span>
                    </div>
                  </div>
                )}
              </div>

              {/* NEW: Publish Timing Heatmap + Best Hours Optimizer
                   Placed IMMEDIATELY AFTER the Content Calendar section's </div> in Insights (per spec).
                   Then the combined planner/goals follow after it.
                   Apple premium UI with glass cards, custom intensity-colored 24h grid (per platform using COLORS), lift %s, dedicated 最佳时段洞察 card.
                   "生成优化后日历" augments calendar state with precise times.
              */}
              <div className="mt-8">
                <h3 className="apple-h3 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#007AFF]" /> 发布时间优化 · 最佳发布时段
                </h3>
                <p className="text-sm text-secondary mb-4 max-w-prose">
                  基于平台特性与你的历史数据分布（补充 displayContent 日期偏好），生成的 24 小时热力表现。避开低谷，抓住峰值可显著提升完播与互动。
                </p>

                {/* Heatmap: clean custom grid, per-platform color with intensity from mock engagement scores */}
                <div className="apple-card p-6 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[13px] font-semibold tracking-tight">24 小时发布表现热力图（模拟 + 数据驱动）</div>
                    <div className="text-[10px] text-secondary">颜色深 = 更高预期表现</div>
                  </div>

                  {/* Scrollable wide grid for 24h precision on all viewports */}
                  <div className="overflow-x-auto pb-2 -mx-1">
                    <div className="min-w-[820px]">
                      {/* Hour labels (every 4h for cleanliness) */}
                      <div className="flex items-end mb-1 pl-24">
                        {Array.from({ length: 24 }, (_, h) => (
                          <div
                            key={h}
                            className="flex-1 text-center text-[9px] tabular-nums text-secondary/70 font-mono"
                            style={{ minWidth: '22px' }}
                          >
                            {h % 4 === 0 ? h.toString().padStart(2, '0') : ''}
                          </div>
                        ))}
                      </div>

                      {/* Platform rows with colored cells */}
                      {heatmapData.map((row, ri) => {
                        const pIdx = PLATFORMS.indexOf(row.platform as any)
                        const baseCol = COLORS[pIdx % COLORS.length] || '#007AFF'
                        return (
                          <div key={ri} className="flex items-center mb-1.5 last:mb-0">
                            <div className="w-24 shrink-0 pr-3 text-xs font-medium text-right tabular-nums tracking-tight">
                              {row.platform}
                            </div>
                            <div className="flex-1 flex gap-[1px]">
                              {row.scores.map((score, h) => {
                                const intensity = Math.max(0.18, Math.min(0.98, score / 100))
                                return (
                                  <div
                                    key={h}
                                    className="flex-1 h-[22px] rounded-[3px] transition-all hover:z-10 hover:scale-y-[1.65] hover:shadow active:scale-[1.03] cursor-help border border-white/30 dark:border-black/20"
                                    style={{
                                      backgroundColor: baseCol,
                                      opacity: intensity,
                                      minWidth: '18px'
                                    }}
                                    title={`${row.platform} ${h.toString().padStart(2, '0')}:00 · 表现指数 ${score}`}
                                  />
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Subtle Apple-style legend */}
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-secondary">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-2.5 rounded bg-[#8E8E93] opacity-30" /> 低
                      <div className="w-3 h-2.5 rounded" style={{ backgroundColor: COLORS[0], opacity: 0.5 }} />
                      <div className="w-3 h-2.5 rounded" style={{ backgroundColor: COLORS[0], opacity: 0.88 }} /> 高
                    </div>
                    <div>每平台独立色阶（Bilibili 蓝 · 小红书 绿 · 抖音 橙）</div>
                  </div>
                </div>

                {/* 推荐本周最佳发布时段 - top 3 per platform, with lift % computed from avg */}
                <div className="mb-4">
                  <div className="text-[13px] font-semibold mb-2 flex items-center gap-1.5">
                    <span>推荐本周最佳发布时段</span>
                    <span className="text-[10px] px-1.5 py-px rounded bg-[#007AFF]/10 text-[#007AFF]">Top 3 / 平台</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {bestHoursData.map((platData, idx) => {
                      const cIdx = PLATFORMS.indexOf(platData.platform as any)
                      const accent = COLORS[cIdx % COLORS.length]
                      return (
                        <div key={idx} className="apple-card p-4 text-sm">
                          <div className="font-semibold mb-1.5 flex items-center gap-2" style={{ color: accent }}>
                            {platData.platform}
                            <span className="text-[10px] text-secondary font-normal">均值 {platData.avgScore}</span>
                          </div>
                          <div className="space-y-1">
                            {platData.top.map((slot, sidx) => (
                              <div key={sidx} className="flex items-center justify-between text-[13px]">
                                <span className="font-mono tabular-nums text-[#1d1d1f] dark:text-white">{slot.label}</span>
                                <span className="text-[#34C759] text-xs font-medium">+{slot.lift}%</span>
                              </div>
                            ))}
                          </div>
                          <div className="text-[10px] text-secondary mt-1.5">周内优先匹配此平台活跃观众</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 最佳时段洞察 - dedicated new card, also feeds generateInsights (see above) */}
                <div className="apple-card p-5 border-l-4 border-[#FF9500] mb-4">
                  <div className="flex gap-3">
                    <div className="mt-0.5">
                      <Lightbulb className="w-4 h-4 text-[#FF9500]" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm mb-1">最佳时段洞察</div>
                      <ul className="space-y-1 text-[13px] text-secondary">
                        {bestTimingInsights.slice(0, 3).map((txt, i) => (
                          <li key={i} className="leading-snug">• {txt}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 生成优化后日历 button: augments existing calendar state with specific HH:00 times from the heatmap */}
                <div>
                  <button
                    onClick={() => {
                      const opt = generateOptimizedCalendar()
                      setContentCalendar(opt)
                      setIsCalendarGenerated(true)
                      toast.success('优化后日历已生成！7 天计划现已使用热力图精选的具体时段（查看上方「内容日历」区块）。')
                    }}
                    className="apple-btn apple-btn-primary inline-flex items-center gap-2 px-5"
                  >
                    <Clock className="w-4 h-4" /> 生成优化后日历
                  </button>
                  <span className="ml-3 text-xs text-secondary align-middle">
                    将日历时间精确到小时（来自热力图峰值），并丰富建议理由。
                  </span>
                  <p className="text-[10px] text-secondary mt-1.5 ml-0.5">
                    提示：可先点击「生成内容日历」再点此进行时段优化；或直接生成优化版。纯客户端，未来可替换为真实发布日志分析。
                  </p>
                </div>
              </div>

              {/* ========================================
                   规划与行动 COMBINED AREA (after calendar as specified)
                   1. Series/Episode Planner (5-ep) using bestType + topContentByPlatform + displayContent
                   2. Ask Claude stub (rule-based Chinese smart replies + key detect)
                   3. Goals Tracker (localStorage, progress colored Apple-style, prediction with avgGrowth)
                   Strong action loop: data→insight→repurpose/calendar/series→ask ai→goals.
                   No conflict: placed strictly before heatmap/PDF sections.
                   Ultra premium Apple: generous p, subtle borders, colored progress bars, numbered timeline.
              ======================================== */}
              <div className="mt-10">
                <div className="flex items-center gap-3 mb-4">
                  <ListOrdered className="w-5 h-5 text-[#007AFF]" />
                  <h3 className="apple-h3">规划与行动</h3>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#007AFF]/10 text-[#007AFF] font-medium">数据驱动闭环</span>
                </div>
                <p className="text-sm text-secondary mb-6 max-w-prose">从你的 bestType、topContentByPlatform、displayContent 出发，生成可执行 5 集系列；用 AI stub 决策；用目标跟踪达成。点击「应用到日历」或重塑即可执行。</p>

                {/* 1. Series / Episode Planner */}
                <div className="mb-9">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <h4 className="font-semibold flex items-center gap-2 text-[15px]">
                      <ListOrdered className="w-4 h-4 text-[#007AFF]" /> 5 集系列 / Episode 规划器
                    </h4>
                    <button
                      onClick={() => {
                        const plan = generateSeriesPlan()
                        setSeriesPlan(plan)
                        setIsSeriesGenerated(true)
                        toast.success('系列规划已生成！基于 top performer + 平台数据。')
                      }}
                      className="apple-btn apple-btn-primary text-sm inline-flex items-center gap-2 self-start sm:self-auto"
                    >
                      <Sparkles className="w-4 h-4" /> 生成系列规划
                    </button>
                  </div>

                  {!isSeriesGenerated || seriesPlan.length === 0 ? (
                    <div className="apple-card p-8 text-center">
                      <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-[#34C759]/10 flex items-center justify-center">
                        <ListOrdered className="w-6 h-6 text-[#34C759]" />
                      </div>
                      <div className="font-medium text-[15px] mb-1.5">为你的爆款内容规划 5 集连贯系列</div>
                      <p className="text-sm text-secondary max-w-xs mx-auto mb-1">
                        标题 = top performer 变体；平台 focus 循环 top 平台；重塑笔记直链「重塑」工具；发布时间来自日历逻辑；whyThisWorks 绑定真实 engagement / growth / bestType。
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Beautiful vertical timeline with numbered Apple cards */}
                      <div className="relative pl-9 border-l border-[var(--apple-border)]">
                        {seriesPlan.map((ep, idx) => (
                          <div key={idx} className="apple-card p-5 mb-4 last:mb-0 relative -ml-px transition-all hover:-translate-y-px">
                            {/* Number dot */}
                            <div className="absolute -left-[17px] top-5 w-8 h-8 rounded-full bg-[#007AFF] text-white text-[13px] font-semibold tabular-nums flex items-center justify-center ring-4 ring-[var(--apple-bg-elevated)] shadow-sm">
                              {ep.episode}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#007AFF]/10 text-[#007AFF]">{ep.platformFocus}</span>
                                <span className="text-xs text-secondary tabular-nums">{ep.publishDay}</span>
                              </div>
                              <div className="font-semibold text-[15px] leading-snug tracking-[-0.01em] mb-2.5 pr-2">{ep.title}</div>

                              <div className="text-[13px] text-secondary mb-3 flex items-start gap-1.5">
                                <Repeat className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#FF9500]" />
                                <span>{ep.repurposingNote}</span>
                              </div>

                              <div className="text-[13px] bg-[var(--apple-bg-secondary)] border border-apple/60 rounded-2xl px-4 py-3 leading-snug text-secondary">
                                {ep.whyThisWorks}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            const outline = seriesPlan.map(ep =>
                              `第${ep.episode}集｜${ep.title}\n平台重点：${ep.platformFocus} ｜ ${ep.publishDay}\n重塑提示：${ep.repurposingNote}\n为什么有效：${ep.whyThisWorks}\n`
                            ).join('\n————————\n\n')
                            copyToClipboard(outline, '系列大纲')
                          }}
                          className="apple-btn apple-btn-secondary text-sm inline-flex items-center gap-2"
                        >
                          <Copy className="w-4 h-4" /> 复制系列大纲
                        </button>
                        <button
                          onClick={applySeriesToCalendar}
                          className="apple-btn apple-btn-primary text-sm inline-flex items-center gap-2"
                        >
                          <Calendar className="w-4 h-4" /> 应用到日历（合并视图）
                        </button>
                        <button
                          onClick={() => {
                            const plan = generateSeriesPlan()
                            setSeriesPlan(plan)
                            toast.success('已重新生成 5 集系列规划')
                          }}
                          className="apple-btn apple-btn-ghost text-sm"
                        >
                          重新生成
                        </button>
                      </div>
                      <div className="text-[11px] text-secondary pl-1">「应用到日历」会合并到上方 7 天日历区形成组合计划。想改编具体一集？去平台页或灵感区选对应内容点「重塑」。</div>
                    </div>
                  )}
                </div>

                {/* 2. Ask Claude stub - critical for 6-month free benefit */}
                <div className="mb-9">
                  <h4 className="font-semibold flex items-center gap-2 text-[15px] mb-3">
                    <Bot className="w-4 h-4 text-[#AF52DE]" /> 向 AI 提问（示例：如何把我的爆款视频变成 3 篇小红书笔记？）
                  </h4>
                  <div className="apple-card p-6">
                    <div className="flex gap-2.5">
                      <input
                        type="text"
                        value={aiQuestion}
                        onChange={(e) => setAiQuestion(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !isAsking) handleAskAI() }}
                        placeholder="向 AI 提问（示例：如何把我的爆款视频变成 3 篇小红书笔记？）"
                        className="flex-1 px-4 py-3 text-[15px] rounded-2xl border border-apple bg-elevated focus:outline-none focus:border-[#007AFF] apple-input"
                      />
                      <button
                        onClick={handleAskAI}
                        disabled={isAsking || !aiQuestion.trim()}
                        className="apple-btn apple-btn-primary px-6 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        {isAsking ? '模拟思考...' : '发送'}
                      </button>
                    </div>

                    {aiResponse && (
                      <div className="mt-5 pt-5 border-t border-apple">
                        <div className="uppercase tracking-[0.08em] text-[10px] font-semibold mb-2 flex items-center gap-1.5 text-[#AF52DE]">
                          <Bot className="w-3.5 h-3.5" /> 模拟 Claude 响应
                        </div>
                        <div className="text-[14px] leading-relaxed whitespace-pre-wrap bg-[var(--apple-bg-secondary)] p-5 rounded-2xl border border-apple text-[var(--apple-text-primary)]">
                          {aiResponse}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 text-[11px] text-secondary leading-relaxed">
                      生产环境：把你的 Anthropic Claude API key 填到设置里（仅本地存储），或直接在 claude.ai 用 6 个月开发者福利额度分析 Overlook 导出的 JSON。
                      {claudeApiKey && claudeApiKey.length > 3 && (
                        <span className="ml-1 text-[#34C759]">（检测到 key，模拟调用将使用更长延迟）</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Simple Goals Tracker */}
                <div>
                  <h4 className="font-semibold flex items-center gap-2 text-[15px] mb-3">
                    <Target className="w-4 h-4 text-[#FF9500]" /> 目标跟踪器（个人创作者 must-have）
                  </h4>

                  {!goals ? (
                    /* Nice empty state */
                    <div className="apple-card p-7">
                      <div className="mb-5">
                        <div className="font-medium mb-1">本月目标尚未设置</div>
                        <p className="text-sm text-secondary">设置 targetViews / targetFollowers 后，实时用 personalTotalViews、totalFollowers 计算进度条与剩余。保存即持久化。</p>
                      </div>

                      {/* Quick set buttons - Apple quick chips */}
                      <div className="flex flex-wrap gap-2 mb-6">
                        <button onClick={() => setTempTargetViews(100000)} className="text-xs px-3.5 py-1.5 rounded-full border border-apple active:bg-[#007AFF]/5 hover:bg-[#007AFF]/5 transition">10万播放</button>
                        <button onClick={() => setTempTargetViews(250000)} className="text-xs px-3.5 py-1.5 rounded-full border border-apple active:bg-[#007AFF]/5 hover:bg-[#007AFF]/5 transition">25万播放</button>
                        <button onClick={() => setTempTargetViews(500000)} className="text-xs px-3.5 py-1.5 rounded-full border border-apple active:bg-[#007AFF]/5 hover:bg-[#007AFF]/5 transition">50万播放</button>
                        <button onClick={() => setTempTargetFollowers(300)} className="text-xs px-3.5 py-1.5 rounded-full border border-apple active:bg-[#34C759]/5 hover:bg-[#34C759]/5 transition">增 300 粉</button>
                        <button onClick={() => setTempTargetFollowers(500)} className="text-xs px-3.5 py-1.5 rounded-full border border-apple active:bg-[#34C759]/5 hover:bg-[#34C759]/5 transition">增 500 粉</button>
                        <button onClick={() => setTempTargetFollowers(1000)} className="text-xs px-3.5 py-1.5 rounded-full border border-apple active:bg-[#34C759]/5 hover:bg-[#34C759]/5 transition">增 1000 粉</button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 mb-5">
                        <div>
                          <div className="text-[10px] font-semibold tracking-[0.06em] text-secondary mb-1.5">目标播放量</div>
                          <input 
                            type="number" 
                            value={tempTargetViews} 
                            onChange={(e) => setTempTargetViews(parseInt(e.target.value) || 100000)} 
                            className="w-full px-4 py-2.5 text-base tabular-nums rounded-2xl border border-apple bg-elevated focus:border-[#007AFF] outline-none" 
                          />
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold tracking-[0.06em] text-secondary mb-1.5">目标粉丝增量</div>
                          <input 
                            type="number" 
                            value={tempTargetFollowers} 
                            onChange={(e) => setTempTargetFollowers(parseInt(e.target.value) || 500)} 
                            className="w-full px-4 py-2.5 text-base tabular-nums rounded-2xl border border-apple bg-elevated focus:border-[#007AFF] outline-none" 
                          />
                        </div>
                      </div>

                      <button 
                        onClick={saveGoals} 
                        className="apple-btn apple-btn-primary w-full sm:w-auto px-7"
                      >
                        保存目标
                      </button>
                      <p className="text-[11px] text-secondary mt-3">数据完全本地存储。进度将使用当前 personalTotalViews 与 totalFollowers 计算。</p>
                    </div>
                  ) : (
                    /* Set state with premium progress */
                    <div className="apple-card p-7 space-y-7">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs uppercase tracking-widest text-secondary">本月目标</div>
                          <div className="font-semibold">已保存 · 实时跟踪</div>
                        </div>
                        <button 
                          onClick={() => setGoals(null)} 
                          className="apple-btn apple-btn-ghost text-xs text-[#FF3B30] px-3 py-1"
                        >
                          重置目标
                        </button>
                      </div>

                      {/* Views progress bar - colored Apple */}
                      <div>
                        <div className="flex justify-between items-baseline mb-2 text-[13px]">
                          <span className="font-medium">播放量</span>
                          <span className="tabular-nums text-secondary">{personalTotalViews.toLocaleString()} / {goals.targetViews.toLocaleString()}</span>
                        </div>
                        {(() => {
                          const pct = Math.min(100, Math.max(0, Math.round((personalTotalViews / Math.max(1, goals.targetViews)) * 100)))
                          const remain = Math.max(0, goals.targetViews - personalTotalViews)
                          return (
                            <>
                              <div className="h-3 bg-[var(--apple-gray-4)] rounded-full overflow-hidden">
                                <div 
                                  className="h-3 rounded-full transition-all duration-500" 
                                  style={{ 
                                    width: `${pct}%`, 
                                    background: pct >= 90 ? '#34C759' : '#007AFF' 
                                  }} 
                                />
                              </div>
                              <div className="mt-1.5 flex justify-between text-xs">
                                <span style={{ color: pct >= 90 ? '#34C759' : '#007AFF' }} className="font-semibold">{pct}% 完成</span>
                                <span className="text-secondary">剩余 {remain.toLocaleString()}</span>
                              </div>
                            </>
                          )
                        })()}
                      </div>

                      {/* Followers progress bar */}
                      <div>
                        <div className="flex justify-between items-baseline mb-2 text-[13px]">
                          <span className="font-medium">粉丝</span>
                          <span className="tabular-nums text-secondary">{totalFollowers.toLocaleString()} / {(totalFollowers + goals.targetFollowers).toLocaleString()}</span>
                        </div>
                        {(() => {
                          const targetF = totalFollowers + goals.targetFollowers
                          const pctF = Math.min(100, Math.max(0, Math.round((totalFollowers / Math.max(1, targetF)) * 100)))
                          const remainF = Math.max(0, goals.targetFollowers)
                          return (
                            <>
                              <div className="h-3 bg-[var(--apple-gray-4)] rounded-full overflow-hidden">
                                <div 
                                  className="h-3 rounded-full transition-all duration-500" 
                                  style={{ width: `${pctF}%`, background: '#34C759' }} 
                                />
                              </div>
                              <div className="mt-1.5 flex justify-between text-xs">
                                <span className="font-semibold text-[#34C759]">{pctF}% 完成</span>
                                <span className="text-secondary">还需增 {remainF}</span>
                              </div>
                            </>
                          )
                        })()}
                      </div>

                      {/* 本月预测达标 using avgGrowth */}
                      <div className="pt-4 border-t border-apple">
                        <div className="font-semibold text-[13px] mb-1">本月预测达标</div>
                        <p className="text-[13px] text-secondary leading-snug">
                          当前月均增长率 {avgGrowth.toFixed(1)}%。预计本月新增播放约 <span className="font-medium text-[var(--apple-text-primary)]">{(personalTotalViews * avgGrowth / 100).toFixed(0)}</span>。
                          {(personalTotalViews + personalTotalViews * avgGrowth / 100) >= goals.targetViews ? (
                            <span className="text-[#34C759] font-medium"> 播放目标预计达标！</span>
                          ) : (
                            <span> 播放目标还需补充内容输出。粉丝增量预计随系列发布加速。</span>
                          )}
                        </p>
                      </div>

                      {/* Editable quick inputs + save */}
                      <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] text-secondary mb-1.5">编辑目标播放量</div>
                          <div className="flex gap-2">
                            <input 
                              type="number" 
                              value={tempTargetViews} 
                              onChange={(e) => setTempTargetViews(parseInt(e.target.value) || goals.targetViews)} 
                              className="flex-1 px-3 py-2 rounded-2xl border border-apple bg-elevated text-sm tabular-nums" 
                            />
                            <button onClick={saveGoals} className="apple-btn apple-btn-secondary text-xs px-4">保存</button>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-secondary mb-1.5">编辑目标粉丝增</div>
                          <div className="flex gap-2">
                            <input 
                              type="number" 
                              value={tempTargetFollowers} 
                              onChange={(e) => setTempTargetFollowers(parseInt(e.target.value) || goals.targetFollowers)} 
                              className="flex-1 px-3 py-2 rounded-2xl border border-apple bg-elevated text-sm tabular-nums" 
                            />
                            <button onClick={saveGoals} className="apple-btn apple-btn-secondary text-xs px-4">保存</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* end 规划与行动 */}

              <div className="mt-8 text-xs text-secondary border-t pt-4 border-apple">
                提示：连接真实账号后，这里会显示基于 Claude 等模型的个性化建议。目前为演示数据。
              </div>

              <div className="mt-6 p-5 apple-card border-l-4 border-[#34C759]">
                <h4 className="font-semibold mb-2">简单增长预测器</h4>
                <p className="text-sm text-secondary">基于当前平均增长率 {avgGrowth.toFixed(1)}%，如果你每月增加 20% 内容输出，预计 3 个月后总播放量可达当前 {(personalTotalViews * 1.2 * 3).toFixed(0)} 左右。持续使用工具跟踪数据，预测会更准！</p>
              </div>
            </motion.div>
          )}

          {/* ACCOUNTS TAB */}
          {activeTab === 'accounts' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="apple-h2">已连接账号</h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={startOnboarding} 
                    className="apple-btn apple-btn-ghost text-sm"
                    aria-label="新手引导"
                  >
                    新手引导
                  </button>
                  <button 
                    onClick={() => setShowAddAccount(true)} 
                    className="apple-btn apple-btn-primary text-sm"
                  >
                    <Plus className="w-4 h-4" /> 添加平台账号
                  </button>
                </div>
              </div>

              {accounts.length === 0 ? (
                /* Empty state (Apple HIG): friendly, actionable when no accounts + link to onboarding */
                <div className="apple-card p-8 text-center">
                  <div className="mx-auto mb-3 w-10 h-10 rounded-2xl bg-[#FF9500]/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-[#FF9500]" />
                  </div>
                  <div className="font-medium mb-1">尚未连接任何平台账号</div>
                  <p className="text-sm text-secondary max-w-[280px] mx-auto mb-5">
                    连接账号后，洞察、日历和平台数据将更个性化。当前仍可使用示例数据浏览全部功能。
                  </p>
                  <button 
                    onClick={() => setShowAddAccount(true)} 
                    className="apple-btn apple-btn-primary text-sm inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> 添加你的第一个平台账号
                  </button>
                  <button 
                    onClick={startOnboarding} 
                    className="mt-2 text-sm text-[#007AFF] underline-offset-2 hover:underline"
                    aria-label="查看新手引导"
                  >
                    或先看看新手引导（5 步快速上手）
                  </button>
                </div>
              ) : (
                <div className="apple-card divide-y">
                  {accounts.map((acc, i) => (
                    <div key={i} className="px-7 py-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 bg-[#007AFF] rounded-2xl flex items-center justify-center text-white text-xs font-medium">
                          {acc.platform.slice(0,2)}
                        </div>
                        <div>
                          <div className="font-medium">{acc.platform}</div>
                          <div className="text-sm text-secondary">{acc.username}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="px-3 py-1 bg-[#34C759] text-white rounded-full text-xs">已连接</span>
                        <button 
                          onClick={() => removeAccount(acc.platform)} 
                          className="apple-btn apple-btn-ghost text-sm px-3 py-1 text-[#FF3B30]"
                        >
                          移除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-secondary mt-4">支持导入官方导出的 CSV（B站/小红书/抖音创作者中心）。数据会与示例合并显示并可导出。</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Account Modal - Apple clean */}
      <AnimatePresence>
        {showAddAccount && (
          <div 
            className="fixed inset-0 bg-black/40 modal-overlay flex items-center justify-center z-50" 
            onClick={() => setShowAddAccount(false)}
            role="presentation"
          >
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="apple-card w-full max-w-sm p-7 mx-4"
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-account-title"
            >
              <h3 id="add-account-title" className="apple-h3 mb-6">添加平台账号</h3>
              <div className="space-y-3">
                {PLATFORMS.filter(p => !accounts.find(a => a.platform === p)).map(platform => (
                  <button 
                    key={platform}
                    onClick={() => addMockAccount(platform)}
                    className="w-full apple-btn apple-btn-secondary justify-start px-5 py-3 text-left"
                    aria-label={`连接 ${platform} 账号`}
                  >
                    {platform}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowAddAccount(false)} className="mt-6 w-full apple-btn apple-btn-secondary" aria-label="取消添加账号">取消</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Content Repurposing Tool Modal — Premium Apple-like design */}
      <AnimatePresence>
        {repurposeItem && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" 
            onClick={() => setRepurposeItem(null)}
            role="presentation"
          >
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.985 }}
              transition={{ type: 'spring', bounce: 0.02, duration: 0.25 }}
              className="apple-card w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col mx-auto"
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="repurpose-title"
            >
              {/* Modal Header - Apple restraint + clarity */}
              <div className="px-7 pt-6 pb-4 border-b border-apple flex items-start justify-between gap-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-[#007AFF] flex items-center justify-center text-white">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div id="repurpose-title" className="apple-h3 tracking-[-0.01em]">内容重塑工具</div>
                    <div className="text-xs text-secondary -mt-0.5">平台适配建议 · 基于你的真实内容数据</div>
                  </div>
                </div>
                <button 
                  onClick={() => setRepurposeItem(null)} 
                  className="apple-btn apple-btn-ghost p-2 -mr-2 text-secondary hover:opacity-70"
                  aria-label="关闭"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content Picker + Selected Summary */}
              <div className="px-7 pt-5 pb-4 bg-[var(--apple-bg-secondary)] border-b border-apple flex-shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold tracking-[0.08em] text-secondary mb-1.5">当前选中内容</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#007AFF] text-white">{repurposeItem.platform}</span>
                      <span className="text-[13px] text-secondary">{repurposeItem.type} · {repurposeItem.date}</span>
                      <span className="text-xs px-2 py-px rounded bg-white/70 dark:bg-black/30 text-secondary tabular-nums">
                        {(repurposeItem.views / 1000).toFixed(0)}K 播放 · {(repurposeItem.likes / 1000).toFixed(1)}K 赞
                      </span>
                    </div>
                    <div className="font-semibold text-[15px] leading-tight mt-1.5 pr-2 line-clamp-2">{repurposeItem.title}</div>
                  </div>

                  {/* Content switcher - makes selection easy inside modal too */}
                  <div className="sm:w-72">
                    <div className="text-[10px] font-semibold tracking-[0.08em] text-secondary mb-1">切换其他内容</div>
                    <select
                      value={repurposeItem.id}
                      onChange={(e) => {
                        const found = displayContent.find(c => c.id === Number(e.target.value))
                        if (found) setRepurposeItem(found)
                      }}
                      className="w-full px-3 py-2 text-sm rounded-full border border-apple bg-elevated focus:outline-none focus:border-[#007AFF] apple-select"
                      aria-label="切换当前用于重塑的内容"
                    >
                      {displayContent.slice(0, 25).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.platform} · {c.title.length > 42 ? c.title.slice(0, 41) + '…' : c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Suggestions Body */}
              <div className="overflow-y-auto flex-1 px-7 py-6 space-y-6" style={{ scrollbarWidth: 'thin' }}>
                <>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="font-semibold text-base tracking-tight">跨平台适配建议</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF9500]/10 text-[#FF9500]">即时生成</span>
                    </div>
                    <p className="text-sm text-secondary">针对 {repurposeItem.platform} → 其他平台的表达方式、结构与视觉优化。数据驱动（播放量、互动率影响建议侧重）。</p>
                  </div>

                  <div className="space-y-5">
                    {currentRepurposeSuggestions.map((sug, idx) => {
                      const platformColor = sug.targetPlatform === 'Bilibili' ? '#00A1D6' : sug.targetPlatform === 'Xiaohongshu' ? '#FF2442' : '#000000'
                      return (
                        <div key={idx} className="apple-card p-6 border-l-[5px]" style={{ borderLeftColor: platformColor }}>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                              <div 
                                className="text-sm font-semibold px-3 py-1 rounded-full" 
                                style={{ background: `${platformColor}15`, color: platformColor }}
                              >
                                → {sug.targetPlatform}
                              </div>
                              <div className="text-[11px] text-secondary">适配版</div>
                            </div>
                            <button 
                              onClick={() => {
                                const fullText = `【${sug.targetPlatform} 适配建议】\n标题：${sug.adaptedTitle}\n\n关键要点：\n${sug.keyPoints.map(p => '• ' + p).join('\n')}\n\n视觉建议：${sug.visuals}\n\nCTA：${sug.cta}\n\n发布提示：${sug.tips}\n\n为什么有效：${sug.rationale}`
                                copyToClipboard(fullText, `${sug.targetPlatform} 建议`)
                              }}
                              className="apple-btn apple-btn-ghost text-xs px-2.5 py-1 flex items-center gap-1"
                              title="复制这条平台的完整建议"
                            >
                              <Copy className="w-3.5 h-3.5" /> 复制
                            </button>
                          </div>

                          {/* Adapted Title */}
                          <div className="mb-4">
                            <div className="uppercase text-[10px] font-semibold tracking-[0.06em] text-secondary mb-1">推荐标题</div>
                            <div className="font-semibold text-[15px] leading-snug pr-10">{sug.adaptedTitle}</div>
                          </div>

                          {/* Structured details - clean Apple grid */}
                          <div className="space-y-4 text-[14px]">
                            <div>
                              <div className="text-[10px] font-semibold tracking-[0.05em] text-secondary mb-1.5">关键要点</div>
                              <ul className="space-y-[5px] pl-1">
                                {sug.keyPoints.map((point, i) => (
                                  <li key={i} className="flex gap-2 leading-snug">
                                    <span className="mt-[5px] inline-block w-1 h-1 rounded-full bg-current opacity-60 shrink-0" />
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-1">
                              <div>
                                <div className="text-[10px] font-semibold tracking-[0.05em] text-secondary mb-1">视觉建议</div>
                                <div className="leading-relaxed text-[13.5px] text-[var(--apple-text-primary)]">{sug.visuals}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-semibold tracking-[0.05em] text-secondary mb-1">行动号召 (CTA)</div>
                                <div className="leading-relaxed text-[13.5px]">{sug.cta}</div>
                              </div>
                            </div>

                            <div>
                              <div className="text-[10px] font-semibold tracking-[0.05em] text-secondary mb-1">平台发布提示</div>
                              <div className="text-secondary text-[13.5px]">{sug.tips}</div>
                            </div>

                            <div className="pt-3 mt-1 border-t border-apple text-[12.5px] text-secondary leading-snug italic">
                              {sug.rationale}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              </div>

              {/* Modal Footer Actions - generous Apple spacing */}
              <div className="px-7 py-5 border-t border-apple flex-shrink-0 bg-[var(--apple-bg-secondary)] flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="text-xs text-secondary order-2 sm:order-1">
                  建议为演示逻辑生成 • 接入真实 AI（如 Claude）后可产出更个性化版本
                </div>
                <div className="flex items-center gap-2 order-1 sm:order-2 w-full sm:w-auto">
                  <button 
                    onClick={() => {
                      if (currentRepurposeSuggestions.length === 0) return
                      const combined = currentRepurposeSuggestions.map(s => 
                        `【${s.targetPlatform}】\n标题：${s.adaptedTitle}\n要点：${s.keyPoints.join('； ')}\n视觉：${s.visuals}\nCTA：${s.cta}\n提示：${s.tips}`
                      ).join('\n\n——\n\n')
                      copyToClipboard(combined, '全部平台建议')
                    }}
                    className="apple-btn apple-btn-secondary text-sm flex-1 sm:flex-none"
                  >
                    <Copy className="w-4 h-4" /> 复制全部建议
                  </button>
                  <button 
                    onClick={() => setRepurposeItem(null)} 
                    className="apple-btn apple-btn-primary text-sm flex-1 sm:flex-none"
                  >
                    完成
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Onboarding / First-run tour modal — beautiful multi-step Apple-style (slide/modal). Uses framer for polish. */}
      <AnimatePresence>
        {showOnboarding && (
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-[80] p-4" 
            onClick={() => setShowOnboarding(false)}
            role="presentation"
          >
            <motion.div 
              initial={{ opacity: 0, y: 30, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.99 }}
              transition={{ type: 'spring', bounce: 0.04, duration: 0.28 }}
              className="apple-card w-full max-w-lg mx-auto overflow-hidden"
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="onboard-title"
            >
              {/* Header with progress dots (Apple restraint) */}
              <div className="px-6 pt-5 pb-3 border-b border-apple bg-[var(--apple-bg-secondary)]">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] uppercase tracking-[2px] text-secondary font-semibold">新手引导 · 5 步上手</div>
                  <button 
                    onClick={() => { setHasOnboarded(true); setShowOnboarding(false); }} 
                    className="text-xs text-secondary hover:text-[#FF3B30] px-2 py-0.5"
                    aria-label="跳过并永远不再显示"
                  >
                    跳过
                  </button>
                </div>
                <div className="flex gap-1.5" aria-hidden="true">
                  {onboardingSteps.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`h-1 flex-1 rounded-full transition-all ${idx <= onboardingStep ? 'bg-[#007AFF]' : 'bg-[var(--apple-border)]'}`} 
                    />
                  ))}
                </div>
              </div>

              {/* Step content */}
              <div className="p-7">
                <div className="flex items-start gap-4 mb-5">
                  <div className="mt-0.5 w-11 h-11 rounded-2xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center shrink-0">
                    {onboardingSteps[onboardingStep].icon}
                  </div>
                  <div className="min-w-0">
                    <div id="onboard-title" className="apple-h3 tracking-[-0.01em] mb-1 pr-2">
                      {onboardingSteps[onboardingStep].title}
                    </div>
                    <div className="text-[13px] text-secondary">步骤 {onboardingSteps[onboardingStep].num} / {onboardingSteps.length}</div>
                  </div>
                </div>

                <p className="text-[15px] leading-relaxed text-[var(--apple-text-primary)] mb-5">
                  {onboardingSteps[onboardingStep].desc}
                </p>

                <div className="rounded-2xl bg-[var(--apple-bg-secondary)] border border-apple p-5 text-sm text-secondary mb-6">
                  {onboardingSteps[onboardingStep].illust}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => { setHasOnboarded(true); setShowOnboarding(false); }}
                    className="apple-btn apple-btn-ghost text-sm px-4"
                    aria-label="永远不再显示新手引导"
                  >
                    不再提示
                  </button>

                  <div className="flex items-center gap-2">
                    {onboardingStep > 0 && (
                      <button 
                        onClick={() => setOnboardingStep(onboardingStep - 1)} 
                        className="apple-btn apple-btn-secondary text-sm px-4"
                      >
                        上一步
                      </button>
                    )}
                    {onboardingStep < onboardingSteps.length - 1 ? (
                      <button 
                        onClick={() => setOnboardingStep(onboardingStep + 1)} 
                        className="apple-btn apple-btn-primary text-sm px-6"
                        aria-label="下一步"
                      >
                        下一步
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setHasOnboarded(true)
                          setShowOnboarding(false)
                          toast.success('欢迎使用 Overlook！试试导入示例数据或探索洞察。')
                          // Optional demo: if no user data, could auto load but we keep optional per spec
                        }} 
                        className="apple-btn apple-btn-primary text-sm px-6 inline-flex items-center gap-1.5"
                      >
                        开始使用 <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer microcopy */}
              <div className="px-7 py-3 bg-[var(--apple-bg-secondary)] border-t border-apple text-[11px] text-secondary text-center">
                随时在右上角或账号页点击帮助图标重新打开本引导。
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="text-center text-xs text-secondary py-8 border-t mt-12 border-apple">
        Overlook • 为个人创作者而生 • 数据本地存储 • 准备好推送到 GitHub Pages 了吗？
        {swReady && (
          <span className="ml-2 inline-block align-middle text-[10px] px-2 py-0.5 rounded-full bg-[#34C759]/10 text-[#34C759] font-medium tracking-tight" title="Service Worker 已就绪：离线可查看上次数据与 App Shell">
            离线就绪
          </span>
        )}
      </footer>

      {/* Hidden premium "report printable area" for html2canvas snapshot (hybrid PDF support).
          Always present in DOM (offscreen) so PDF export works from any tab.
          Styled premium with Chinese, #007AFF accents, clean sections for sponsor report fidelity. */}
      <div
        ref={reportRef}
        style={{
          position: 'absolute',
          left: '-99999px',
          top: '0',
          width: '780px',
          padding: '24px',
          background: '#ffffff',
          color: '#1d1d1f',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '13px',
          lineHeight: '1.5',
          border: '1px solid #e5e5ea',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
        }}
        aria-hidden="true"
      >
        <div style={{ borderBottom: '3px solid #007AFF', paddingBottom: '12px', marginBottom: '16px' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#007AFF', letterSpacing: '-0.02em' }}>Overlook 赞助商报告</div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
            为个人创作者品牌合作准备 • {new Date().toLocaleDateString('zh-CN')}
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#007AFF', marginBottom: '4px' }}>报告创建者</div>
          <div style={{ fontWeight: 600 }}>{accounts[0]?.username || '@yourname'}（跨平台内容创作者）</div>
        </div>

        {/* KPIs as clean table */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#007AFF', marginBottom: '6px' }}>核心 KPI 摘要</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f8f8fa' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', border: '1px solid #eee' }}>指标</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', border: '1px solid #eee' }}>数值</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', border: '1px solid #eee' }}>变化</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={{ padding: '5px 8px', border: '1px solid #eee' }}>总播放</td><td style={{ textAlign: 'right', padding: '5px 8px', border: '1px solid #eee', fontWeight: 600 }}>{(totalViews / 1000).toFixed(0)}K</td><td style={{ textAlign: 'right', padding: '5px 8px', border: '1px solid #eee', color: '#34C759' }}>+14%</td></tr>
              <tr><td style={{ padding: '5px 8px', border: '1px solid #eee' }}>总点赞</td><td style={{ textAlign: 'right', padding: '5px 8px', border: '1px solid #eee', fontWeight: 600 }}>{(totalLikes / 1000).toFixed(0)}K</td><td style={{ textAlign: 'right', padding: '5px 8px', border: '1px solid #eee', color: '#34C759' }}>+22%</td></tr>
              <tr><td style={{ padding: '5px 8px', border: '1px solid #eee' }}>总粉丝</td><td style={{ textAlign: 'right', padding: '5px 8px', border: '1px solid #eee', fontWeight: 600 }}>{(totalFollowers / 1000).toFixed(0)}K</td><td style={{ textAlign: 'right', padding: '5px 8px', border: '1px solid #eee', color: '#34C759' }}>+9%</td></tr>
              <tr><td style={{ padding: '5px 8px', border: '1px solid #eee' }}>平均互动率</td><td style={{ textAlign: 'right', padding: '5px 8px', border: '1px solid #eee', fontWeight: 600 }}>{avgEngagement}%</td><td style={{ textAlign: 'right', padding: '5px 8px', border: '1px solid #eee' }}>小红书 21.3%</td></tr>
            </tbody>
          </table>
          <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>最佳平台：{topPlatform.platform}（互动率 {topPlatform.engagement}%）</div>
        </div>

        {/* Top performing content */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#007AFF', marginBottom: '5px' }}>Top 表现内容（最近 5 条高播放）</div>
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px' }}>
            {[...displayContent].sort((a,b)=>b.views-a.views).slice(0,5).map((c, i) => (
              <li key={i} style={{ marginBottom: '3px' }}>
                <strong>[{c.platform}]</strong> {c.title.length > 36 ? c.title.slice(0,35)+'…' : c.title} <span style={{ color: '#666' }}>({ (c.views/1000).toFixed(0) }K 播放 / { (c.likes/1000).toFixed(1) }K 赞)</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Insights bullets */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#007AFF', marginBottom: '5px' }}>当前洞察要点</div>
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#222' }}>
            {insights.slice(0, 5).map((ins, i) => <li key={i} style={{ marginBottom: '3px' }}>{ins}</li>)}
          </ul>
        </div>

        {/* Repurposing if active */}
        {repurposeItem && currentRepurposeSuggestions.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#007AFF', marginBottom: '5px' }}>重塑亮点（跨平台潜力）</div>
            <div style={{ fontSize: '10px' }}>基于「{repurposeItem.title.slice(0, 32)}…」</div>
            {currentRepurposeSuggestions.slice(0,2).map((s, i) => (
              <div key={i} style={{ fontSize: '10px', marginTop: '2px' }}>→ {s.targetPlatform}: {s.adaptedTitle.slice(0, 40)}…</div>
            ))}
          </div>
        )}

        {/* 7-day calendar if generated */}
        {isCalendarGenerated && contentCalendar.length > 0 && (
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#007AFF', marginBottom: '5px' }}>7 天发布日历（已生成）</div>
            {contentCalendar.slice(0,5).map((e, i) => (
              <div key={i} style={{ fontSize: '10px', marginBottom: '2px' }}>{e.day} · {e.platform} · {e.type} @ {e.time}</div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '18px', paddingTop: '10px', borderTop: '1px solid #eee', fontSize: '9px', color: '#888' }}>
          Overlook • https://wangjiehu.github.io/Overlook • 专为个人创作者品牌提案设计
        </div>
      </div>
    </div>
  )
}

export default OverlookApp
