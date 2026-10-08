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
    expect(result).toEqual({ deleted: 2, failed: 1 })
  })
})

describe('unwrapPage', () => {
  it('maps Spring page fields to items and total', () => {
    const result = unwrapPage({ content: [1, 2], totalElements: 42, number: 1, size: 2 })
    expect(result).toEqual({ items: [1, 2], total: 42, page: 1, size: 2 })
  })
})
