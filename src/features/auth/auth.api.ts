import { apiFetch } from '../../lib/api'
import type { TokenResponse } from '../../lib/types'

export function login(payload: { username: string; password: string }): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) })
}

export function requestPasswordReset(payload: { username: string; email: string }): Promise<string> {
  return apiFetch<string>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) })
}

export function resetPassword(payload: { token: string; newPassword: string }): Promise<string> {
  return apiFetch<string>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) })
}

export function logout(refreshToken: string): Promise<void> {
  return apiFetch<void>('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) })
}
