import type { CustomerContact } from '../../lib/types'

export interface ContactQuery {
  page: number
  size: number
  q?: string
  processed?: boolean
}

export type StatusFilter = '' | 'new' | 'done'

export function toProcessed(filter: StatusFilter): boolean | undefined {
  switch (filter) {
    case 'new':
      return false
    case 'done':
      return true
    default:
      return undefined
  }
}

export function statusOf(contact: CustomerContact): { label: string; className: string } {
  return contact.processed
    ? { label: 'Đã xử lý', className: 'badge success' }
    : { label: 'Mới', className: 'badge warning' }
}

export function buildListQuery(query: ContactQuery): string {
  const params = new URLSearchParams({ page: String(query.page), size: String(query.size) })
  const q = query.q?.trim()
  if (q) params.set('q', q)
  if (query.processed !== undefined) params.set('processed', String(query.processed))
  return params.toString()
}

export function emptyListMessage(q: string): string {
  const term = q.trim()
  return term ? `Không tìm thấy tin nhắn phù hợp với “${term}”` : 'Không có tin nhắn nào'
}
