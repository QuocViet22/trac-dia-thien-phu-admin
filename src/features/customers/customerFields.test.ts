import { describe, expect, it } from 'vitest'
import type { CustomerContact } from '../../lib/types'
import { buildListQuery, statusOf, toProcessed } from './customerFields'

const contact = (processed: boolean): CustomerContact => ({
  id: 'id-1',
  name: 'Nguyễn Văn A',
  email: 'a@example.com',
  address: null,
  phone: '0901',
  message: null,
  processed,
  createdAt: '2026-10-27T15:00:00Z',
})

describe('buildListQuery', () => {
  it('omits blank q and undefined processed', () => {
    expect(buildListQuery({ page: 0, size: 20, q: '   ' })).toBe('page=0&size=20')
  })

  it('trims q and serialises the tri-state filter', () => {
    expect(buildListQuery({ page: 2, size: 10, q: ' 0901 ', processed: false }))
      .toBe('page=2&size=10&q=0901&processed=false')
    expect(buildListQuery({ page: 0, size: 20, processed: true }))
      .toBe('page=0&size=20&processed=true')
  })
})

describe('toProcessed', () => {
  it('maps the three tabs', () => {
    expect(toProcessed('')).toBeUndefined()
    expect(toProcessed('new')).toBe(false)
    expect(toProcessed('done')).toBe(true)
  })
})

describe('statusOf', () => {
  it('labels and classes both states', () => {
    expect(statusOf(contact(false))).toEqual({ label: 'Mới', className: 'badge warning' })
    expect(statusOf(contact(true))).toEqual({ label: 'Đã xử lý', className: 'badge success' })
  })
})
