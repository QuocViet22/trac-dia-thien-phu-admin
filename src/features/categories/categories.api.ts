import { apiFetch } from '../../lib/api'
import type { Category } from '../../lib/types'
import type { CategoryPayload } from './categoryFields'

export function listCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/api/categories')
}

export function getCategory(id: string): Promise<Category> {
  return apiFetch<Category>(`/api/categories/${id}`)
}

export function createCategory(payload: CategoryPayload): Promise<Category> {
  return apiFetch<Category>('/api/categories', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateCategory(id: string, payload: CategoryPayload): Promise<Category> {
  return apiFetch<Category>(`/api/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteCategory(id: string): Promise<void> {
  return apiFetch<void>(`/api/categories/${id}`, { method: 'DELETE' })
}
