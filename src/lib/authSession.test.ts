import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession, loadSession, refreshSession, saveSession } from './authSession'
import type { AuthSession } from './authSession'

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

const session: AuthSession = {
  accessToken: 'a',
  refreshToken: 'r',
  username: 'alice',
  role: 'ADMIN',
}

function pairResponse(accessToken = 'a2', refreshToken = 'r2'): Response {
  return new Response(
    JSON.stringify({
      success: true,
      message: 'OK',
      data: { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: 900, username: 'alice', roleType: 'ADMIN' },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
})

describe('session storage', () => {
  it('round-trips a session and clears it', () => {
    saveSession(session)
    expect(loadSession()).toEqual(session)
    clearSession()
    expect(loadSession()).toBeNull()
  })

  it('treats corrupt storage as logged out', () => {
    localStorage.setItem('tp_admin_auth', '{broken')
    expect(loadSession()).toBeNull()
  })
})

describe('refreshSession', () => {
  it('persists the rotated pair on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => pairResponse()))
    saveSession(session)

    const next = await refreshSession()

    expect(next?.accessToken).toBe('a2')
    expect(loadSession()?.refreshToken).toBe('r2')
  })

  it('issues one refresh for concurrent callers (single-flight)', async () => {
    const fetchMock = vi.fn(async () => pairResponse())
    vi.stubGlobal('fetch', fetchMock)
    saveSession(session)

    const [a, b] = await Promise.all([refreshSession(), refreshSession()])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(a?.accessToken).toBe('a2')
    expect(b?.accessToken).toBe('a2')
  })

  it('clears storage and returns null when the refresh token is dead', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ success: false, message: 'invalid refresh token', data: null }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    )
    saveSession(session)

    await expect(refreshSession()).resolves.toBeNull()
    expect(loadSession()).toBeNull()
  })

  it('returns null without network when no session exists', async () => {
    const fetchMock = vi.fn(async () => pairResponse())
    vi.stubGlobal('fetch', fetchMock)
    clearSession()

    await expect(refreshSession()).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
