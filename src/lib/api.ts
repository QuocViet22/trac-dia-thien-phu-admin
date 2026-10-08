import type { PageResult, SpringPage } from './types'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface Envelope<T> {
  success: boolean
  message: string
  data: T
}

function baseUrl(): string {
  return import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (res.status === 204) {
    if (!res.ok) throw new ApiError(res.statusText || 'Request failed', res.status)
    return undefined as T
  }
  let body: Envelope<T>
  try {
    body = (await res.json()) as Envelope<T>
  } catch {
    throw new ApiError(res.statusText || 'Request failed', res.status)
  }
  if (!res.ok || !body || body.success === false) {
    throw new ApiError(body?.message || res.statusText || 'Request failed', res.status)
  }
  return body.data
}

export function unwrapPage<T>(page: SpringPage<T>): PageResult<T> {
  return { items: page.content, total: page.totalElements, page: page.number, size: page.size }
}
