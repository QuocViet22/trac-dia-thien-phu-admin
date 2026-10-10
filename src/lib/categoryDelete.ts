import { ApiError } from './api'

export const PRODUCTS_CONFLICT_TEXT = 'Đang có sản phẩm thuộc danh mục này!'

export function isProductsConflictError(err: unknown): boolean {
  return (
    err instanceof ApiError && err.status === 409 && err.message.includes('has products')
  )
}

export function productsBlockedText(deleted: number, total: number, blocked: number): string {
  return `Đã xóa ${deleted}/${total}. ${blocked} danh mục không xóa được: ${PRODUCTS_CONFLICT_TEXT}`
}
