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

export type NewsStatus = 'PUBLISHED' | 'DRAFT'

export type NewsType =
  | 'NEWS'
  | 'HIRING_PRODUCT'
  | 'CUSTOMER_NEWS'
  | 'REPAIR_AND_INSPECTION_NEWS'

export interface News {
  id: string
  title: string
  author: string
  status: NewsStatus
  newsType: NewsType
  location: string | null
  seoAlias: string
  createdAt: string
  updatedAt: string
  seoDescriptionTag: string | null
  images: ImageDto[]
}

export interface NewsDetail {
  id: string
  title: string
  description: string | null
  author: string
  status: NewsStatus
  newsType: NewsType
  location: string | null
  seoPageTitle: string | null
  seoDescriptionTag: string | null
  seoAlias: string
  createdAt: string
  updatedAt: string
  images: ImageDto[]
}

export type RoleName = 'ADMIN' | 'USER'

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  username: string
  roleType: RoleName
}

export interface Account {
  id: string
  username: string
  email: string
  roleType: RoleName
  createdAt: string
  updatedAt: string
}
