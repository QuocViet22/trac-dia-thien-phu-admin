import type { NewsStatus, NewsType } from '../../lib/types'
import type { NewsPayload } from './news.api'

export interface NewsFormValues {
  title: string
  author: string
  status: '' | NewsStatus
  newsType: '' | NewsType
  location: string
  seoPageTitle: string
  seoDescriptionTag: string
  seoAlias: string
  description: string
  imageUrl: string
}

const MAX = 256

function blank(s: string): boolean {
  return s.trim().length === 0
}

export function validateNews(v: NewsFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (blank(v.title)) errors.title = 'Tiêu đề là bắt buộc'
  if (blank(v.author)) errors.author = 'Tác giả là bắt buộc'
  if (blank(v.seoAlias)) errors.seoAlias = 'Đường dẫn (slug) là bắt buộc'
  if (!v.status) errors.status = 'Trạng thái là bắt buộc'
  if (!v.newsType) errors.newsType = 'Loại tin là bắt buộc'
  if (v.newsType === 'CUSTOMER_NEWS') {
    if (blank(v.location)) errors.location = 'Địa điểm là bắt buộc với tin Khách hàng'
    else if (v.location.length > MAX) errors.location = 'Tối đa 256 ký tự'
  }
  for (const [key, value] of [
    ['title', v.title],
    ['author', v.author],
    ['seoPageTitle', v.seoPageTitle],
    ['seoAlias', v.seoAlias],
  ] as const) {
    if (value.length > MAX) errors[key] = 'Tối đa 256 ký tự'
  }
  return errors
}

function nullIfBlank(s: string): string | null {
  return blank(s) ? null : s.trim()
}

export function toNewsPayload(v: NewsFormValues): NewsPayload {
  return {
    title: v.title.trim(),
    description: nullIfBlank(v.description),
    author: v.author.trim(),
    status: v.status as NewsStatus,
    newsType: v.newsType as NewsType,
    location: v.newsType === 'CUSTOMER_NEWS' ? nullIfBlank(v.location) : null,
    seoPageTitle: nullIfBlank(v.seoPageTitle),
    seoDescriptionTag: nullIfBlank(v.seoDescriptionTag),
    seoAlias: v.seoAlias.trim(),
    images: blank(v.imageUrl) ? [] : [{ imageUrl: v.imageUrl.trim(), sortOrder: 0 }],
  }
}
