import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch, deleteMany, unwrapPage } from './api'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiFetch', () => {
  it('unwraps the data field of a successful envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ success: true, message: 'OK', data: { id: 1 } })),
    )
    const data = await apiFetch<{ id: number }>('/api/products')
    expect(data).toEqual({ id: 1 })
  })

  it('throws ApiError with the backend message when success is false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ success: false, message: 'Not found', data: null }, 404)),
    )
    const err = await apiFetch('/api/products/nope').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(404)
    expect((err as ApiError).message).toBe('Not found')
  })

  it('resolves undefined on 204 success and throws ApiError on empty error bodies', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })))
    await expect(apiFetch('/api/products/x', { method: 'DELETE' })).resolves.toBeUndefined()

    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 500, statusText: 'Server Error' })))
    const err = await apiFetch('/api/products').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(500)
  })
})

describe('deleteMany', () => {
  it('attempts every id and reports deleted/failed counts', async () => {
    const calls: string[] = []
    const remove = (id: string): Promise<void> => {
      calls.push(id)
      return id === 'bad' ? Promise.reject(new Error('gone')) : Promise.resolve()
    }
    const result = await deleteMany(['a', 'bad', 'c'], remove)
    expect(calls).toEqual(['a', 'bad', 'c'])
    expect(result.deleted).toBe(2)
    expect(result.failed).toBe(1)
    expect(result.errors).toEqual([{ id: 'bad', error: new Error('gone') }])
  })
})

describe('unwrapPage', () => {
  it('maps Spring page fields to items and total', () => {
    const result = unwrapPage({ content: [1, 2], totalElements: 42, number: 1, size: 2 })
    expect(result).toEqual({ items: [1, 2], total: 42, page: 1, size: 2 })
  })
})

function memoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size
    },
  }
}

function seedSession(): void {
  vi.stubGlobal('localStorage', memoryStorage())
  localStorage.setItem(
    'tp_admin_auth',
    JSON.stringify({ accessToken: 'a1', refreshToken: 'r1', username: 'alice', role: 'ADMIN' }),
  )
}

describe('auth transport', () => {
  it('attaches the bearer token when a session exists', async () => {
    seedSession()
    const seen: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: unknown, init?: RequestInit) => {
        seen.push((init?.headers as Record<string, string>)['Authorization'] ?? '')
        return jsonResponse({ success: true, message: 'OK', data: [] })
      }),
    )

    await apiFetch('/api/categories')

    expect(seen).toEqual(['Bearer a1'])
  })

  it('refreshes once and retries the request after a 401', async () => {
    seedSession()
    let calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown) => {
        calls += 1
        const target = String(url)
        if (target.endsWith('/api/auth/refresh')) {
          return jsonResponse({
            success: true,
            message: 'OK',
            data: { accessToken: 'a2', refreshToken: 'r2', tokenType: 'Bearer', expiresIn: 900, username: 'alice', roleType: 'ADMIN' },
          })
        }
        if (calls === 1) return jsonResponse({ success: false, message: 'auth', data: null }, 401)
        return jsonResponse({ success: true, message: 'OK', data: [] })
      }),
    )

    const data = await apiFetch('/api/categories')

    expect(data).toEqual([])
    expect(calls).toBe(3)
    expect(JSON.parse(localStorage.getItem('tp_admin_auth') ?? '{}').accessToken).toBe('a2')
  })

  it('clears storage and redirects to login when refresh is dead', async () => {
    seedSession()
    const assign = vi.fn()
    vi.stubGlobal('window', { location: { assign } })
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown) =>
        String(url).endsWith('/api/auth/refresh')
          ? jsonResponse({ success: false, message: 'invalid refresh token', data: null }, 401)
          : jsonResponse({ success: false, message: 'auth', data: null }, 401),
      ),
    )

    await expect(apiFetch('/api/categories')).rejects.toBeInstanceOf(ApiError)
    expect(localStorage.getItem('tp_admin_auth')).toBeNull()
    expect(assign).toHaveBeenCalledWith('/login')
  })

  it('does not refresh or redirect on a 401 when no session exists', async () => {
    vi.stubGlobal('localStorage', memoryStorage())
    const assign = vi.fn()
    vi.stubGlobal('window', { location: { assign } })
    let calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1
        return jsonResponse({ success: false, message: 'invalid username or password', data: null }, 401)
      }),
    )

    const err = await apiFetch('/api/auth/login', { method: 'POST' }).catch((e: unknown) => e)

    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(401)
    expect(calls).toBe(1)
    expect(assign).not.toHaveBeenCalled()
  })
})
