export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_GALLERY_IMAGES = 10

export type CoverValue =
  | { kind: 'file'; file: File }
  | { kind: 'url'; url: string }
  | null

export type GalleryItem = Exclude<CoverValue, null>

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Chỉ chấp nhận tệp ảnh'
  if (file.size > MAX_IMAGE_BYTES) return 'Ảnh vượt quá 5MB'
  return null
}

export function validateGalleryCount(n: number): string | null {
  if (n > MAX_GALLERY_IMAGES) return `Thư viện tối đa ${MAX_GALLERY_IMAGES} ảnh`
  return null
}

export function resolveGalleryError(items: GalleryItem[]): string | null {
  const countError = validateGalleryCount(items.length)
  if (countError) return countError
  for (const item of items) {
    if (item.kind === 'file') {
      const fileError = validateImageFile(item.file)
      if (fileError) return fileError
    }
  }
  return null
}

export function buildImageUrls(cover: CoverValue, gallery: GalleryItem[]): string[] {
  const urls: string[] = []
  if (cover?.kind === 'url') urls.push(cover.url)
  for (const item of gallery) {
    if (item.kind === 'url') urls.push(item.url)
  }
  return urls
}
