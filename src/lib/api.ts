import type { PageResult, SpringPage } from './types'
import { clearSession, loadSession, refreshSession } from './authSession'

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

export function apiBaseUrl(): string {
  return baseUrl()
}

async function requestWithAuthRefresh(url: string, init?: RequestInit): Promise<Response> {
  const session = loadSession()
  const withAuth: RequestInit = {
    ...init,
    headers: {
      ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...init?.headers,
    },
  }
  const first = await fetch(url, withAuth)
  if (first.status !== 401) return first
  const next = await refreshSession()
  if (!next) {
    clearSession()
    if (typeof window !== 'undefined') window.location.assign('/login')
    return first
  }
  return fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${next.accessToken}`, ...init?.headers },
  })
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await requestWithAuthRefresh(`${apiBaseUrl()}${path}`, {
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

export async function apiForm<T>(path: string, form: FormData): Promise<T> {
  const res = await requestWithAuthRefresh(`${apiBaseUrl()}${path}`, { method: 'POST', body: form })
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

export interface DeleteManyResult {
  deleted: number
  failed: number
  errors: { id: string; error: unknown }[]
}

export async function deleteMany(
  ids: string[],
  remove: (id: string) => Promise<void>,
): Promise<DeleteManyResult> {
  const settled = await Promise.allSettled(ids.map((id) => remove(id)))
  return {
    deleted: settled.filter((r) => r.status === 'fulfilled').length,
    failed: settled.filter((r) => r.status === 'rejected').length,
    errors: settled.flatMap((r, i) =>
      r.status === 'rejected' ? [{ id: ids[i] as string, error: r.reason }] : [],
    ),
  }
}
