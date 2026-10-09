export interface CategoryFormValues {
  name: string
  description: string
  seoPageTitle: string
  seoDescription: string
  seoAlias: string
  parentCategoryId: string
  imageUrl: string
}

const MAX = 256

function blank(s: string): boolean {
  return s.trim().length === 0
}

export function validateCategory(v: CategoryFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (blank(v.name)) errors.name = 'Tên danh mục là bắt buộc'
  for (const [key, value] of [
    ['name', v.name],
    ['seoPageTitle', v.seoPageTitle],
    ['seoDescription', v.seoDescription],
    ['seoAlias', v.seoAlias],
  ] as const) {
    if (value.length > MAX) errors[key] = 'Tối đa 256 ký tự'
  }
  return errors
}

export interface CategoryPayload {
  name: string
  description: string | null
  seoPageTitle: string | null
  seoDescription: string | null
  seoAlias: string | null
  parentCategoryId: string | null
  images: { imageUrl: string; sortOrder: number }[]
}

function nullIfBlank(s: string): string | null {
  return blank(s) ? null : s.trim()
}

export function toCategoryPayload(v: CategoryFormValues): CategoryPayload {
  return toCategoryPayloadFromUrls(v, blank(v.imageUrl) ? [] : [v.imageUrl.trim()])
}

export function toCategoryPayloadFromUrls(
  v: CategoryFormValues,
  urls: string[],
): CategoryPayload {
  return {
    name: v.name.trim(),
    description: nullIfBlank(v.description),
    seoPageTitle: nullIfBlank(v.seoPageTitle),
    seoDescription: nullIfBlank(v.seoDescription),
    seoAlias: nullIfBlank(v.seoAlias),
    parentCategoryId: nullIfBlank(v.parentCategoryId),
    images: urls.map((imageUrl, index) => ({ imageUrl, sortOrder: index })),
  }
}
