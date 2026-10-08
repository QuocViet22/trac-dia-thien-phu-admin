import type { MockNews, NewsStatus } from './mockNews'

export type NewsTab = 'all' | NewsStatus

export interface NewsFilter {
  tab: NewsTab
  query: string
  author: string
  time: '' | '7d' | '30d'
}

export function tabCounts(rows: MockNews[]): Record<NewsTab, number> {
  return {
    all: rows.length,
    published: rows.filter((r) => r.status === 'published').length,
    draft: rows.filter((r) => r.status === 'draft').length,
    pinned: rows.filter((r) => r.status === 'pinned').length,
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

export function filterNews(rows: MockNews[], f: NewsFilter): MockNews[] {
  const q = f.query.trim().toLowerCase()
  const windowMs = f.time === '7d' ? 7 * DAY_MS : f.time === '30d' ? 30 * DAY_MS : 0
  const now = Date.now()
  return rows.filter((r) => {
    if (f.tab !== 'all' && r.status !== f.tab) return false
    if (q && !r.title.toLowerCase().includes(q)) return false
    if (f.author && r.author !== f.author) return false
    if (windowMs > 0 && now - new Date(r.publishedAt).getTime() > windowMs) return false
    return true
  })
}
