export interface ImageDto {
  id: string
  name: string | null
  imageUrl: string
  sortOrder: number | null
}

export interface Product {
  id: string
  name: string
  skuCode: string | null
  barcode: string | null
  measurementUnit: string | null
  description: string | null
  shortDescription: string | null
  seoPageTitle: string | null
  seoDescriptionTag: string | null
  seoAlias: string | null
  brand: string
  categoryId: string | null
  createdAt: string
  updatedAt: string
  images: ImageDto[]
}

export interface Category {
  id: string
  name: string
  description: string | null
  seoPageTitle: string | null
  seoDescription: string | null
  seoAlias: string | null
  parentCategoryId: string | null
  createdAt: string
  updatedAt: string
  images: ImageDto[]
}

export interface SpringPage<T> {
  content: T[]
  totalElements: number
  number: number
  size: number
}

export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  size: number
}
