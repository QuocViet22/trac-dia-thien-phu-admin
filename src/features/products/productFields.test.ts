import { describe, expect, it } from 'vitest'
import { ApiError } from '../../lib/api'
import { formErrorForApi, isNotFoundError, toImagePayload, validateProduct } from './productFields'

const valid = {
  name: 'Máy toàn đạc',
  categoryId: 'cat-1',
  skuCode: '',
  barcode: '',
  measurementUnit: 'Cái',
  description: '<p>desc</p>',
  seoPageTitle: '',
  seoDescriptionTag: '',
  seoAlias: '',
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

describe('isNotFoundError', () => {
  it('is true only for ApiError 404', () => {
    expect(isNotFoundError(new ApiError('nope', 404))).toBe(true)
    expect(isNotFoundError(new ApiError('boom', 500))).toBe(false)
    expect(isNotFoundError(new TypeError('fetch failed'))).toBe(false)
  })
})

describe('formErrorForApi', () => {
  it('maps 409 to the slug field', () => {
    expect(formErrorForApi(new ApiError('seo_alias exists', 409))).toEqual({
      field: 'seoAlias',
      message: 'seo_alias exists',
    })
  })

  it('maps other errors to a generic message', () => {
    expect(formErrorForApi(new ApiError('Boom', 500))).toEqual({ message: 'Boom' })
  })
})
