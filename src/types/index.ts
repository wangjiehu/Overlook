export const PLATFORMS = ['Bilibili', 'Xiaohongshu', 'Douyin'] as const

export type Platform = (typeof PLATFORMS)[number]

export type ViewKey = 'overview' | 'content' | 'planner' | 'benchmarks' | 'accounts'

export type AccountStatus = 'connected' | 'manual' | 'missing'

export type ContentIntent = 'growth' | 'save' | 'trust' | 'conversion'

export interface ContentItem {
  id: string
  platform: Platform
  title: string
  type: string
  publishedAt: string
  hour: number
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  followersGained: number
  pillar: string
  campaign: string
  tags: string[]
  audience: string
  hook: string
  intent: ContentIntent
}

export interface Account {
  platform: Platform
  handle: string
  status: AccountStatus
  followers: number
  lastSync: string
}

export interface Goal {
  month: string
  targetViews: number
  targetFollowers: number
  targetSponsorLeads: number
}

export interface Competitor {
  id: string
  platform: Platform
  name: string
  followers: number
  avgViews: number
  engagementRate: number
  angle: string
}

export interface CompetitorSnapshot {
  id: string
  competitorId: string
  date: string
  capturedAt?: string
  followers: number
  avgViews: number
  engagementRate: number
}

export interface CalendarItem {
  id: string
  day: string
  platform: Platform
  title: string
  format: string
  time: string
  objective: string
  status: 'draft' | 'scheduled' | 'done'
  sourceId?: string
  experiment?: string
  metric?: string
}

export interface PlatformSummary {
  platform: Platform
  posts: number
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  followersGained: number
  interactions: number
  engagementRate: number
  avgViews: number
  topContent?: ContentItem
}
