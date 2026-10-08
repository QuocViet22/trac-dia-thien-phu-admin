import { apiFetch, unwrapPage } from '../../lib/api'
import type { PageResult, Product, SpringPage } from '../../lib/types'
import type { ProductPayload } from './productFields'

export async function listProducts(
  categoryId: string | undefined,
  page: number,
  size: number,
): Promise<PageResult<Product>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (categoryId) params.set('categoryId', categoryId)
  const data = await apiFetch<SpringPage<Product>>(`/api/products?${params.toString()}`)
  return unwrapPage(data)
}

export function getProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/api/products/${id}`)
}

export function createProduct(payload: ProductPayload): Promise<Product> {
  return apiFetch<Product>('/api/products', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateProduct(id: string, payload: ProductPayload): Promise<Product> {
  return apiFetch<Product>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteProduct(id: string): Promise<void> {
  return apiFetch<void>(`/api/products/${id}`, { method: 'DELETE' })
}
