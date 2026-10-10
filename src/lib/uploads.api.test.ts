import { afterEach, describe, expect, it, vi } from 'vitest'
import { deleteUpload, uploadFile } from './uploads.api'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('uploadFile', () => {
  it('posts the file as multipart form data', async () => {
    const seen: { url: string; init: RequestInit }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        seen.push({ url, init })
        return jsonResponse({ success: true, message: 'OK', data: { key: 'k', url: 'u' } }, 201)
      }),
    )
    const res = await uploadFile(new File(['x'], 'a.png', { type: 'image/png' }))
    expect(res).toEqual({ key: 'k', url: 'u' })
    expect(seen).toHaveLength(1)
    expect(seen[0].url.endsWith('/api/uploads')).toBe(true)
    expect(seen[0].init.method).toBe('POST')
    expect(seen[0].init.body).toBeInstanceOf(FormData)
    const headers = new Headers(seen[0].init.headers)
    expect(headers.get('Content-Type')).toBeNull()
  })
})

describe('deleteUpload', () => {
  it('deletes by encoded key', async () => {
    const seen: { url: string; init: RequestInit }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        seen.push({ url, init })
        return new Response(null, { status: 204 })
      }),
    )
    await deleteUpload('a/b')
    expect(seen).toHaveLength(1)
    expect(seen[0].url.endsWith('/api/uploads/a%2Fb')).toBe(true)
    expect(seen[0].init.method).toBe('DELETE')
  })
})
