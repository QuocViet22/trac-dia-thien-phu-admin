import { apiFetch, apiForm } from './api'

export interface UploadResult {
  key: string
  url: string
}

export function uploadFile(file: File): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file, file.name)
  return apiForm<UploadResult>('/api/uploads', form)
}

export function deleteUpload(key: string): Promise<void> {
  return apiFetch<void>(`/api/uploads/${encodeURIComponent(key)}`, { method: 'DELETE' })
}
