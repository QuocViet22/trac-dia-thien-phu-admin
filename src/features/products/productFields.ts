export interface ImageRow {
  imageUrl: string
}

export interface ProductFormValues {
  name: string
  categoryId: string
  skuCode: string
  barcode: string
  measurementUnit: string
  description: string
  seoPageTitle: string
  seoDescriptionTag: string
  seoAlias: string
  images: ImageRow[]
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
  for (const [key, value] of [
    ['name', v.name],
    ['skuCode', v.skuCode],
    ['barcode', v.barcode],
    ['measurementUnit', v.measurementUnit],
    ['seoPageTitle', v.seoPageTitle],
    ['seoDescriptionTag', v.seoDescriptionTag],
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
  skuCode: string | null
  barcode: string | null
  measurementUnit: string | null
  description: string | null
  seoPageTitle: string | null
  seoDescriptionTag: string | null
  seoAlias: string | null
  categoryId: string
  images: ImagePayload[]
}

export function toProductPayload(v: ProductFormValues): ProductPayload {
  return {
    name: v.name.trim(),
    skuCode: nullIfBlank(v.skuCode),
    barcode: nullIfBlank(v.barcode),
    measurementUnit: nullIfBlank(v.measurementUnit),
    description: nullIfBlank(v.description),
    seoPageTitle: nullIfBlank(v.seoPageTitle),
    seoDescriptionTag: nullIfBlank(v.seoDescriptionTag),
    seoAlias: nullIfBlank(v.seoAlias),
    categoryId: v.categoryId,
    images: toImagePayload(v.images),
  }
}

export interface FormApiError {
  field?: string
  message: string
}

export function isNotFoundError(err: unknown): boolean {
  return err instanceof Error && 'status' in err && (err as { status: number }).status === 404
}

export function formErrorForApi(err: unknown): FormApiError {
  if (err instanceof Error && 'status' in err && (err as { status: number }).status === 409) {
    return { field: 'seoAlias', message: err.message }
  }
  return { message: err instanceof Error ? err.message : 'Request failed' }
}
