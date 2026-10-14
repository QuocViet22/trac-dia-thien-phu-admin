import { apiFetch } from '../../lib/api'
import type { Collection, CollectionType } from './homepageTypes'

export interface CollectionImagePayload {
  imageUrl: string
  name?: string | null
  sortOrder?: number | null
}

export interface CollectionPayload {
  name: string
  orderIndex: number
  collectionType: CollectionType
  referenceId: string | null
  images?: CollectionImagePayload[]
}

export function listCollections(collectionType: CollectionType): Promise<Collection[]> {
  return apiFetch<Collection[]>(`/api/collections?collectionType=${collectionType}`)
}

export function createCollection(payload: CollectionPayload): Promise<Collection> {
  return apiFetch<Collection>('/api/collections', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateCollection(id: string, payload: CollectionPayload): Promise<Collection> {
  return apiFetch<Collection>(`/api/collections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteCollection(id: string): Promise<void> {
  return apiFetch<void>(`/api/collections/${id}`, { method: 'DELETE' })
}
