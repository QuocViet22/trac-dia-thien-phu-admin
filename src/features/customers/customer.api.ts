import { apiFetch, unwrapPage } from '../../lib/api'
import type { CustomerContact, PageResult, SpringPage } from '../../lib/types'
import type { ContactQuery } from './customerFields'
import { buildListQuery } from './customerFields'

export function listContacts(query: ContactQuery): Promise<PageResult<CustomerContact>> {
  return apiFetch<SpringPage<CustomerContact>>(`/api/customer-contacts?${buildListQuery(query)}`)
    .then(unwrapPage)
}

export function getContact(id: string): Promise<CustomerContact> {
  return apiFetch<CustomerContact>(`/api/customer-contacts/${id}`)
}

export function setProcessed(id: string, processed: boolean): Promise<CustomerContact> {
  return apiFetch<CustomerContact>(`/api/customer-contacts/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ processed }),
  })
}

export function deleteContact(id: string): Promise<void> {
  return apiFetch<void>(`/api/customer-contacts/${id}`, { method: 'DELETE' })
}
