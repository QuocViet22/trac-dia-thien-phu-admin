export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export type CoverValue =
  | { kind: 'file'; file: File }
  | { kind: 'url'; url: string }
  | null

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Chỉ chấp nhận tệp ảnh'
  if (file.size > MAX_IMAGE_BYTES) return 'Ảnh vượt quá 5MB'
  return null
}
