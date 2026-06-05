export interface PlatformData {
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

export interface ContentItem {
  id: number
  platform: string
  title: string
  views: number
  likes: number
  date: string
  type: string
}

export interface Account {
  platform: string
  username: string
  connected: boolean
}

export const PLATFORMS = ['Bilibili', 'Xiaohongshu', 'Douyin'] as const
export type Platform = typeof PLATFORMS[number]

export interface Goal {
  targetViews: number
  targetFollowers: number
}
