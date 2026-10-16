import type { ImageDto } from '../../lib/types'

export const COLLECTION_TYPES = {
  HERO_SLIDER: 'HERO_SLIDER_COLLECTION',
  PROMO_CARD: 'PROMO_CARD_COLLECTION',
  FEATURED_CATEGORY: 'FEATURED_CATEGORY_COLLECTION',
  BEST_SELLER: 'BEST_SELLER_COLLECTION',
  CATEGORY_DISPLAY: 'CATEGORY_COLLECTION',
  SERVICE_BANNER: 'SERVICE_BANNER_COLLECTION',
  NEWS: 'NEWS_COLLECTION',
} as const

export type CollectionType =
  | 'HERO_SLIDER_COLLECTION'
  | 'PROMO_CARD_COLLECTION'
  | 'FEATURED_CATEGORY_COLLECTION'
  | 'BEST_SELLER_COLLECTION'
  | 'CATEGORY_COLLECTION'
  | 'SERVICE_BANNER_COLLECTION'
  | 'NEWS_COLLECTION'

export type HomepageSectionMode = 'image' | 'entity'

export interface HomepageSection {
  type: CollectionType
  label: string
  max: number
  mode: HomepageSectionMode
}

export const HOMEPAGE_SECTIONS: HomepageSection[] = [
  { type: 'HERO_SLIDER_COLLECTION', label: 'Quản lý Slider', max: 5, mode: 'image' },
  { type: 'PROMO_CARD_COLLECTION', label: 'Quản lý quảng cáo', max: 3, mode: 'image' },
  { type: 'FEATURED_CATEGORY_COLLECTION', label: 'Danh mục nổi bật', max: 6, mode: 'entity' },
  { type: 'BEST_SELLER_COLLECTION', label: 'Sản phẩm bán chạy', max: 10, mode: 'entity' },
  { type: 'CATEGORY_COLLECTION', label: 'Hiển thị danh mục', max: 4, mode: 'entity' },
  { type: 'SERVICE_BANNER_COLLECTION', label: 'Dịch vụ', max: 3, mode: 'image' },
  { type: 'NEWS_COLLECTION', label: 'Tin tức', max: 3, mode: 'entity' },
]

export interface Collection {
  id: string
  name: string
  orderIndex: number
  collectionType: CollectionType
  referenceId: string | null
  createdAt: string
  updatedAt: string
  images: ImageDto[]
}
