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
