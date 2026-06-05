import { useState, useMemo, useRef } from 'react'
import Papa from 'papaparse'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'
import { 
  Users, Eye, Heart, MessageCircle, TrendingUp, Calendar, Download, Upload, 
  Plus, Settings, BarChart3, Lightbulb, User 
} from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocalStorage } from './hooks/useLocalStorage'
import type { PlatformData, ContentItem, Account, Platform } from './types'
import { mockPlatformData, mockContent, COLORS } from './utils/mockData'
import { KPICard } from './components/KPICard'
import { Navbar } from './components/Navbar'

// Apple-inspired Overlook - Unified Creator Insights for Personal Creators
// Platforms: Bilibili, Xiaohongshu (Little Red Book), Douyin

interface PlatformData {
  platform: string
  views: number
  likes: number
  comments: number
  shares: number
  followers: number
  engagement: number
  topContent: string
  growth: number
}

interface ContentItem {
  id: number
  platform: string
  title: string
  views: number
  likes: number
  date: string
  type: string
}

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

  const [showAddAccount, setShowAddAccount] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [platformFilter, setPlatformFilter] = useState<'all' | Platform>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Calculate totals (use displayContent for personal stats too, but keep platform aggregates)
  const totalViews = mockPlatformData.reduce((sum, p) => sum + p.views, 0)
  const totalLikes = mockPlatformData.reduce((sum, p) => sum + p.likes, 0)
  const totalFollowers = mockPlatformData.reduce((sum, p) => sum + p.followers, 0)
  const avgEngagement = (mockPlatformData.reduce((sum, p) => sum + p.engagement, 0) / mockPlatformData.length).toFixed(1)

  const topPlatform = [...mockPlatformData].sort((a, b) => b.engagement - a.engagement)[0]

  // Personal stats from imported + mock content
  const personalTotalViews = displayContent.reduce((sum, c) => sum + c.views, 0)
  const personalTotalLikes = displayContent.reduce((sum, c) => sum + c.likes, 0)

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

  const displayContent = [...mockContent, ...userContent]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesPlatform = platformFilter === 'all' || item.platform === platformFilter
      const itemDate = item.date
      const matchesFrom = !dateFrom || itemDate >= dateFrom
      const matchesTo = !dateTo || itemDate <= dateTo
      return matchesSearch && matchesPlatform && matchesFrom && matchesTo
    })

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

    if (topContentByPlatform.length > 0) {
      const topBili = topContentByPlatform.find(c => c.platform === 'Bilibili')
      if (topBili) {
        insights.push(`B站爆款「${topBili.title}」建议改编为小红书笔记：提取3个核心观点 + 配图 + 个人经验。`)
      }
      const topXhs = topContentByPlatform.find(c => c.platform === 'Xiaohongshu')
      if (topXhs) {
        insights.push(`小红书高互动笔记可转成抖音短视频脚本：用前15秒钩子讲痛点，结尾引导关注。`)
      }
    }

    // Add data-driven
    const avgViews = displayContent.length > 0 ? displayContent.reduce((s, c) => s + c.views, 0) / displayContent.length : 0
    if (avgViews > 30000) {
      insights.push('你的平均播放量不错！尝试固定系列内容（如每周一「工具推荐」），提升粉丝粘性。')
    } else {
      insights.push('播放量有提升空间：分析标题党 vs 价值党，测试A/B标题在不同平台。')
    }

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

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
      <Toaster position="top-center" richColors closeButton />

      <Navbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExport={handleExport}
        onImportClick={() => fileInputRef.current?.click()}
        onDownloadSample={handleDownloadSample}
        onClearImported={clearImportedData}
        hasImported={userContent.length > 0}
        onThemeToggle={handleThemeToggle}
      />

      <div className="max-w-7xl mx-auto px-8 py-10">
        {/* Hero Header - Apple clean */}
        <div className="mb-10">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="apple-h1">Overlook</h1>
              <p className="apple-body mt-2 max-w-md">
                专为个人创作者打造的一站式数据看板。B站 · 小红书 · 抖音，全部数据，一目了然。
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-[#86868B]">最后同步</div>
              <div className="font-medium">刚刚 · 2026年6月</div>
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
                    <p className="text-sm text-[#86868B]">过去30天数据</p>
                  </div>
                  <button onClick={() => setActiveTab('platforms')} className="apple-btn apple-btn-ghost text-sm">
                    查看详情 →
                  </button>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8E8ED" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="views" fill="#007AFF" radius={6} name="播放量 (千)" />
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
                      <p className="text-sm text-[#86868B]">各平台总互动贡献占比</p>
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
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E8E8ED',
                            borderRadius: '10px',
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                            fontSize: '13px'
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={32}
                          iconType="circle"
                          iconSize={8}
                          formatter={(value) => (
                            <span style={{ color: '#1D1D1F', fontSize: '13px', fontWeight: 500 }}>{value}</span>
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
                      <p className="text-sm text-[#86868B]">过去30天每日互动量（模拟数据）</p>
                    </div>
                  </div>
                  <div className="h-72 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={growthTrendData}>
                        <CartesianGrid strokeDasharray="2 2" stroke="#E8E8ED" />
                        <XAxis 
                          dataKey="day" 
                          tick={{ fontSize: 10, fill: '#86868B' }} 
                          interval={5}
                          tickLine={{ stroke: '#E8E8ED' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 10, fill: '#86868B' }} 
                          tickLine={{ stroke: '#E8E8ED' }}
                          tickFormatter={(v) => `${Math.round(v / 1000)}K`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E8E8ED',
                            borderRadius: '10px',
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                            fontSize: '13px'
                          }}
                          formatter={(value) => [`${(value / 1000).toFixed(1)}K`, '互动']}
                        />
                        <Line 
                          type="natural" 
                          dataKey="value" 
                          stroke="#007AFF" 
                          strokeWidth={2.5} 
                          dot={false} 
                          activeDot={{ r: 4.5, fill: '#007AFF', stroke: '#fff', strokeWidth: 2 }} 
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
                    <div key={i} className="insight-card p-5 rounded-2xl text-[15px] leading-relaxed border-l-4 border-[#007AFF]">
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
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="搜索内容标题..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 rounded-full border border-[#E8E8ED] bg-white text-sm w-full sm:w-64 focus:outline-none focus:border-[#007AFF]"
                  />
                  <select
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value as any)}
                    className="px-4 py-2 rounded-full border border-[#E8E8ED] bg-white text-sm focus:outline-none focus:border-[#007AFF]"
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
                    className="px-3 py-2 rounded-full border border-[#E8E8ED] bg-white text-sm focus:outline-none focus:border-[#007AFF]"
                    title="开始日期"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-3 py-2 rounded-full border border-[#E8E8ED] bg-white text-sm focus:outline-none focus:border-[#007AFF]"
                    title="结束日期"
                  />
                  {(searchTerm || platformFilter !== 'all' || dateFrom || dateTo) && (
                    <button
                      onClick={() => { setSearchTerm(''); setPlatformFilter('all'); setDateFrom(''); setDateTo(''); }}
                      className="apple-btn apple-btn-ghost text-sm px-3"
                    >
                      清除筛选
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {mockPlatformData.map((data, index) => (
                  <div key={index} className="apple-card p-7">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="font-semibold text-2xl">{data.platform}</div>
                        <div className="text-[#86868B] text-sm">@{accounts.find(a => a.platform === data.platform)?.username || 'yourname'}</div>
                      </div>
                      <div className={`text-sm px-3 py-1 rounded-full ${data.growth > 10 ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-[#FF9500]/10 text-[#FF9500]'}`}>
                        +{data.growth}% 本月
                      </div>
                    </div>

                    <div className="space-y-4 text-sm">
                      <div className="flex justify-between"><span className="text-[#86868B]">播放量</span><span className="font-medium">{(data.views / 1000).toFixed(0)}K</span></div>
                      <div className="flex justify-between"><span className="text-[#86868B]">点赞</span><span className="font-medium">{(data.likes / 1000).toFixed(1)}K</span></div>
                      <div className="flex justify-between"><span className="text-[#86868B]">评论</span><span className="font-medium">{data.comments}</span></div>
                      <div className="flex justify-between"><span className="text-[#86868B]">互动率</span><span className="font-medium">{data.engagement}%</span></div>
                      <div className="flex justify-between"><span className="text-[#86868B]">粉丝</span><span className="font-medium">{(data.followers / 1000).toFixed(1)}K</span></div>
                    </div>

                    <div className="mt-6 pt-6 border-t text-sm">
                      <div className="text-[#86868B] mb-1">本月爆款</div>
                      <div className="font-medium leading-tight">“{data.topContent}”</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Content Table */}
              <div className="apple-card p-7 mt-6">
                <h3 className="apple-h3 mb-4">你的内容表现（示例 + 导入的CSV数据）</h3>
                <table className="apple-table">
                  <thead>
                    <tr>
                      <th>平台</th>
                      <th>标题</th>
                      <th>播放</th>
                      <th>点赞</th>
                      <th>日期</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayContent.map(item => (
                      <tr key={item.id}>
                        <td><span className="font-medium">{item.platform}</span>{item.id > 1000 && <span className="ml-1 text-[10px] px-1 py-0.5 bg-[#007AFF] text-white rounded">导入</span>}</td>
                        <td className="max-w-xs truncate">{item.title}</td>
                        <td>{(item.views / 1000).toFixed(0)}K</td>
                        <td>{(item.likes / 1000).toFixed(1)}K</td>
                        <td className="text-[#86868B]">{item.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* INSIGHTS TAB - AI powered */}
          {activeTab === 'insights' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl">
              <h2 className="apple-h2 mb-2">AI 增长洞察</h2>
              <p className="apple-body mb-8">基于你的跨平台数据，Overlook 给出 actionable 建议（未来可直接接入 Claude 获得更智能分析）。</p>

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
                <p className="text-xs text-[#86868B] mt-2">这些建议根据你的高表现内容自动生成。持续输入数据，建议会更准。</p>
              </div>

              <div className="mt-8 text-xs text-[#86868B] border-t pt-4">
                提示：连接真实账号后，这里会显示基于 Claude 等模型的个性化建议。目前为演示数据。
              </div>
            </motion.div>
          )}

          {/* ACCOUNTS TAB */}
          {activeTab === 'accounts' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="apple-h2">已连接账号</h2>
                <button 
                  onClick={() => setShowAddAccount(true)} 
                  className="apple-btn apple-btn-primary text-sm"
                >
                  <Plus className="w-4 h-4" /> 添加平台账号
                </button>
              </div>

              <div className="apple-card divide-y">
                {accounts.map((acc, i) => (
                  <div key={i} className="px-7 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 bg-[#007AFF] rounded-2xl flex items-center justify-center text-white text-xs font-medium">
                        {acc.platform.slice(0,2)}
                      </div>
                      <div>
                        <div className="font-medium">{acc.platform}</div>
                        <div className="text-sm text-[#86868B]">{acc.username}</div>
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

              <p className="text-xs text-[#86868B] mt-4">支持导入官方导出的 CSV（B站/小红书/抖音创作者中心）。数据会与示例合并显示并可导出。</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Account Modal - Apple clean */}
      <AnimatePresence>
        {showAddAccount && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowAddAccount(false)}>
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="apple-card w-full max-w-sm p-7 mx-4"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="apple-h3 mb-6">添加平台账号</h3>
              <div className="space-y-3">
                {PLATFORMS.filter(p => !accounts.find(a => a.platform === p)).map(platform => (
                  <button 
                    key={platform}
                    onClick={() => addMockAccount(platform)}
                    className="w-full apple-btn apple-btn-secondary justify-start px-5 py-3 text-left"
                  >
                    {platform}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowAddAccount(false)} className="mt-6 w-full apple-btn apple-btn-secondary">取消</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="text-center text-xs text-[#86868B] py-8 border-t mt-12">
        Overlook • 为个人创作者而生 • 数据本地存储 • 准备好推送到 GitHub Pages 了吗？
      </footer>
    </div>
  )
}

export default OverlookApp
