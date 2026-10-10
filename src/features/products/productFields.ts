import type { Product } from '../../lib/types'

export interface ImageRow {
  imageUrl: string
}

export interface ProductFormValues {
  name: string
  categoryId: string
  brand: string
  skuCode: string
  barcode: string
  measurementUnit: string
  shortDescription: string
  description: string
  seoPageTitle: string
  seoDescriptionTag: string
  seoAlias: string
  images: ImageRow[]
}

export function fromProduct(p: Product, clearSlug: boolean): ProductFormValues {
  return {
    name: p.name,
    categoryId: p.categoryId ?? '',
    brand: p.brand ?? '',
    skuCode: p.skuCode ?? '',
    barcode: p.barcode ?? '',
    measurementUnit: p.measurementUnit ?? '',
    description: p.description ?? '',
    shortDescription: p.shortDescription ?? '',
    seoPageTitle: p.seoPageTitle ?? '',
    seoDescriptionTag: p.seoDescriptionTag ?? '',
    seoAlias: clearSlug ? '' : (p.seoAlias ?? ''),
    images: clearSlug
      ? []
      : [...p.images]
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((img) => ({ imageUrl: img.imageUrl }))
          .filter((r) => r.imageUrl.trim().length > 0),
  }
}

export interface ImagePayload {
  imageUrl: string
  sortOrder: number
}

const MAX = 256
const TOO_LONG = 'Tối đa 256 ký tự'

function blank(s: string): boolean {
  return s.trim().length === 0
}

function limited(errors: Record<string, string>, key: string, value: string): void {
  if (value.length > MAX) errors[key] = TOO_LONG
}

export function validateProduct(v: ProductFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (blank(v.name)) errors.name = 'Tên sản phẩm là bắt buộc'
  if (blank(v.categoryId)) errors.categoryId = 'Danh mục là bắt buộc'
  if (blank(v.brand)) errors.brand = 'Nhãn hiệu là bắt buộc'
  for (const [key, value] of [
    ['name', v.name],
    ['brand', v.brand],
    ['skuCode', v.skuCode],
    ['barcode', v.barcode],
    ['measurementUnit', v.measurementUnit],
    ['seoPageTitle', v.seoPageTitle],
    ['seoAlias', v.seoAlias],
  ] as const) {
    limited(errors, key, value)
  }
  return errors
}

function nullIfBlank(s: string): string | null {
  return blank(s) ? null : s.trim()
}

export function toImagePayload(rows: ImageRow[]): ImagePayload[] {
  return rows
    .filter((r) => !blank(r.imageUrl))
    .map((r, i) => ({ imageUrl: r.imageUrl.trim(), sortOrder: i }))
}

export interface ProductPayload {
  name: string
  brand: string
  skuCode: string | null
  barcode: string | null
  measurementUnit: string | null
  description: string | null
  shortDescription: string | null
  seoPageTitle: string | null
  seoDescriptionTag: string | null
  seoAlias: string | null
  categoryId: string
  images: ImagePayload[]
}

export function toProductPayload(v: ProductFormValues): ProductPayload {
  return {
    name: v.name.trim(),
    brand: v.brand.trim(),
    skuCode: nullIfBlank(v.skuCode),
    barcode: nullIfBlank(v.barcode),
    measurementUnit: nullIfBlank(v.measurementUnit),
    description: nullIfBlank(v.description),
    shortDescription: nullIfBlank(v.shortDescription),
    seoPageTitle: nullIfBlank(v.seoPageTitle),
    seoDescriptionTag: nullIfBlank(v.seoDescriptionTag),
    seoAlias: nullIfBlank(v.seoAlias),
    categoryId: v.categoryId,
    images: toImagePayload(v.images),
  }
}
