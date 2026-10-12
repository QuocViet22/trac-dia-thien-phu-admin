import { apiFetch } from '../../lib/api'
import type { Account } from '../../lib/types'
import type { AccountPayload } from './accountFields'

export function listAccounts(): Promise<Account[]> {
  return apiFetch<Account[]>('/api/accounts')
}

export function getAccount(id: string): Promise<Account> {
  return apiFetch<Account>(`/api/accounts/${id}`)
}

export function createAccount(payload: AccountPayload): Promise<Account> {
  return apiFetch<Account>('/api/accounts', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateAccount(id: string, payload: AccountPayload): Promise<Account> {
  return apiFetch<Account>(`/api/accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteAccount(id: string): Promise<void> {
  return apiFetch<void>(`/api/accounts/${id}`, { method: 'DELETE' })
}
