import { describe, expect, it } from 'vitest'
import { filterNews, tabCounts } from './newsFilters'
import type { MockNews } from './mockNews'

const rows: MockNews[] = [
  { id: '1', coverUrl: '', title: 'Máy toàn đạc mới', author: 'Trang', tags: ['thiết bị'], publishedAt: '2026-09-01', views: 10, status: 'published' },
  { id: '2', coverUrl: '', title: 'Hướng dẫn RTK', author: 'Quân', tags: ['hướng dẫn'], publishedAt: '2026-09-20', views: 5, status: 'draft' },
  { id: '3', coverUrl: '', title: 'Khuyến mãi GPS', author: 'Trang', tags: ['khuyến mãi'], publishedAt: '2026-10-01', views: 99, status: 'pinned' },
]

describe('tabCounts', () => {
  it('counts all rows and each status', () => {
    expect(tabCounts(rows)).toEqual({ all: 3, published: 1, draft: 1, pinned: 1 })
  })
})

describe('filterNews', () => {
  it('filters by tab', () => {
    expect(filterNews(rows, { tab: 'draft', query: '', author: '', time: '' }).map((r) => r.id)).toEqual(['2'])
  })

  it('searches title case-insensitively', () => {
    expect(filterNews(rows, { tab: 'all', query: 'rtk', author: '', time: '' }).map((r) => r.id)).toEqual(['2'])
  })

  it('filters by author and by recent time window', () => {
    expect(filterNews(rows, { tab: 'all', query: '', author: 'Trang', time: '' })).toHaveLength(2)
    const recent = filterNews(rows, { tab: 'all', query: '', author: '', time: '30d' })
    expect(recent.map((r) => r.id).sort()).toEqual(['2', '3'])
  })
})
