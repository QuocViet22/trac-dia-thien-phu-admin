import { describe, expect, it } from 'vitest'
import { toImagePayload, validateProduct } from './productFields'

const valid = {
  name: 'Máy toàn đạc',
  categoryId: 'cat-1',
  brand: 'Acme',
  skuCode: '',
  barcode: '',
  measurementUnit: 'Cái',
  shortDescription: '',
  description: '<p>desc</p>',
  seoPageTitle: '',
  seoDescriptionTag: '',
  seoAlias: 'may-toan-dac',
  images: [] as { imageUrl: string }[],
}

describe('validateProduct', () => {
  it('accepts a valid form', () => {
    expect(validateProduct(valid)).toEqual({})
  })

  it('rejects blank name and missing category', () => {
    const errors = validateProduct({ ...valid, name: '  ', categoryId: '' })
    expect(errors.name).toBeTruthy()
    expect(errors.categoryId).toBeTruthy()
  })

  it('rejects blank brand', () => {
    expect(validateProduct({ ...valid, brand: '  ' }).brand).toBeTruthy()
  })

  it('rejects blank seoAlias', () => {
    expect(validateProduct({ ...valid, seoAlias: '  ' }).seoAlias).toBeTruthy()
  })

  it('rejects fields longer than 256 characters', () => {
    const errors = validateProduct({ ...valid, name: 'x'.repeat(257) })
    expect(errors.name).toBeTruthy()
  })
})

describe('toImagePayload', () => {
  it('drops blank urls and assigns sortOrder by position', () => {
    const payload = toImagePayload([
      { imageUrl: 'http://a/1.png' },
      { imageUrl: '  ' },
      { imageUrl: 'http://a/2.png' },
    ])
    expect(payload).toEqual([
      { imageUrl: 'http://a/1.png', sortOrder: 0 },
      { imageUrl: 'http://a/2.png', sortOrder: 1 },
    ])
  })
})
