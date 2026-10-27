import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CustomerContact } from '../../lib/types'
import { deleteContact, getContact, listContacts, setProcessed } from './customer.api'

const contact: CustomerContact = {
  id: 'abc', name: 'Nguyễn Văn A', email: 'a@example.com', address: null,
  phone: '0901', message: null, processed: false, createdAt: '2026-10-27T15:00:00Z',
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

afterEach(() => vi.unstubAllGlobals())

describe('customer api', () => {
  it('lists with the built query and unwraps the page', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      success: true, message: 'OK',
      data: { content: [contact], totalElements: 1, number: 0, size: 20 },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await listContacts({ page: 0, size: 20, processed: false })

    expect(fetchMock.mock.calls[0]![0]).toContain('/api/customer-contacts?page=0&size=20&processed=false')
    expect(result.total).toBe(1)
    expect(result.items[0]!.name).toBe('Nguyễn Văn A')
  })

  it('sends PUT processed and DELETE by id', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'OK', data: { ...contact, processed: true } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    expect((await setProcessed('abc', true)).processed).toBe(true)
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ method: 'PUT', body: '{"processed":true}' })
    await expect(deleteContact('abc')).resolves.toBeUndefined()
    expect(fetchMock.mock.calls[1]![1]).toMatchObject({ method: 'DELETE' })
  })

  it('propagates ApiError with the backend message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ success: false, message: 'Contact message not found: abc', data: null }, 404),
    ))

    await expect(getContact('abc')).rejects.toMatchObject({ status: 404, message: 'Contact message not found: abc' })
  })
})
