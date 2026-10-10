import { describe, expect, it } from 'vitest'
import { ApiError } from './api'
import { isProductsConflictError, productsBlockedText } from './categoryDelete'

describe('isProductsConflictError', () => {
  it('is true for the products-conflict 409', () => {
    expect(
      isProductsConflictError(new ApiError('Category has products and cannot be deleted', 409)),
    ).toBe(true)
  })

  it('is false for other 409s', () => {
    expect(
      isProductsConflictError(new ApiError('Category has children and cannot be deleted', 409)),
    ).toBe(false)
  })

  it('is false for non-409 errors', () => {
    expect(isProductsConflictError(new ApiError('nope', 404))).toBe(false)
    expect(isProductsConflictError(new TypeError('fetch failed'))).toBe(false)
  })
})

describe('productsBlockedText', () => {
  it('formats deleted/total/blocked counts', () => {
    expect(productsBlockedText(2, 3, 1)).toBe(
      'Đã xóa 2/3. 1 danh mục không xóa được: Đang có sản phẩm thuộc danh mục này!',
    )
  })
})
