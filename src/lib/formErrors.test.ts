import { describe, expect, it } from 'vitest'
import { ApiError } from './api'
import { formErrorForApi, isNotFoundError } from './formErrors'

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
