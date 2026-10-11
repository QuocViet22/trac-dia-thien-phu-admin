import { apiFetch, unwrapPage } from '../../lib/api'
import type { News, NewsDetail, NewsStatus, PageResult, SpringPage } from '../../lib/types'

export interface NewsPayload {
  title: string
  description: string | null
  author: string
  status: NewsStatus
  seoPageTitle: string | null
  seoDescriptionTag: string | null
  seoAlias: string
  images: { imageUrl: string; sortOrder: number }[]
}

export async function listNews(
  status: NewsStatus | undefined,
  page: number,
  size: number,
): Promise<PageResult<News>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (status) params.set('status', status)
  const data = await apiFetch<SpringPage<News>>(`/api/news?${params.toString()}`)
  return unwrapPage(data)
}

export function getNews(id: string): Promise<NewsDetail> {
  return apiFetch<NewsDetail>(`/api/news/${id}`)
}

export function createNews(payload: NewsPayload): Promise<News> {
  return apiFetch<News>('/api/news', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateNews(id: string, payload: NewsPayload): Promise<NewsDetail> {
  return apiFetch<NewsDetail>(`/api/news/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteNews(id: string): Promise<void> {
  return apiFetch<void>(`/api/news/${id}`, { method: 'DELETE' })
}
