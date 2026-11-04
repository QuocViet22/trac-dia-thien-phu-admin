import { describe, expect, it } from 'vitest'
import { PICKER_LIMIT, pickCandidates } from './picker'

function makeCandidates(count: number) {
  return Array.from({ length: count }, (_, i) => ({ id: String(i), name: `Mục ${i}` }))
}

describe('pickCandidates', () => {
  it('caps the visible list at 20 rows', () => {
    const result = pickCandidates(makeCandidates(25), '')

    expect(result.visible).toHaveLength(PICKER_LIMIT)
    expect(result.matchedCount).toBe(25)
  })

  it('searches the full list before capping', () => {
    const result = pickCandidates(makeCandidates(25), 'mục 24')

    expect(result.visible.map((c) => c.id)).toEqual(['24'])
    expect(result.matchedCount).toBe(1)
  })

  it('trims the query and ignores case', () => {
    const candidates = [{ id: '1', name: 'Danh Mục Nổi Bật' }]

    expect(pickCandidates(candidates, '  mục nổi  ').visible).toEqual(candidates)
  })

  it('returns exactly 20 matches without truncating them', () => {
    const result = pickCandidates(makeCandidates(20), '')

    expect(result.visible).toHaveLength(20)
    expect(result.matchedCount).toBe(20)
  })
})
