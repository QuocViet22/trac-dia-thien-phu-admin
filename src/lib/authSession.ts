import { apiBaseUrl } from './api'
import type { RoleName, TokenResponse } from './types'

export interface AuthSession {
  accessToken: string
  refreshToken: string
  username: string
  role: RoleName
}

const KEY = 'tp_admin_auth'

function storage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage
}

export function loadSession(): AuthSession | null {
  try {
    const raw = storage()?.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AuthSession>
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.username || !parsed.role) return null
    return parsed as AuthSession
  } catch {
    return null
  }
}

export function saveSession(session: AuthSession): void {
  storage()?.setItem(KEY, JSON.stringify(session))
}

export function clearSession(): void {
  storage()?.removeItem(KEY)
}

let inflight: Promise<AuthSession | null> | null = null

export function refreshSession(): Promise<AuthSession | null> {
  if (inflight) return inflight
  inflight = (async (): Promise<AuthSession | null> => {
    const current = loadSession()
    if (!current) return null
    try {
      const res = await fetch(`${apiBaseUrl()}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      })
      const body = (await res.json()) as { success: boolean; data: TokenResponse }
      if (!res.ok || !body.success) throw new Error('refresh failed')
      const next: AuthSession = {
        accessToken: body.data.accessToken,
        refreshToken: body.data.refreshToken,
        username: body.data.username,
        role: body.data.roleType,
      }
      saveSession(next)
      return next
    } catch {
      clearSession()
      return null
    } finally {
      inflight = null
    }
  })()
  return inflight
}
