export interface AccountFormValues {
  username: string
  email: string
  password: string
  role: '' | 'ADMIN' | 'USER'
}

const MAX = 256
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function blank(s: string): boolean {
  return s.trim().length === 0
}

export function validateAccount(v: AccountFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (blank(v.username)) errors.username = 'Tên đăng nhập là bắt buộc'
  if (blank(v.email)) errors.email = 'Email là bắt buộc'
  else if (!EMAIL_RE.test(v.email.trim())) errors.email = 'Email không hợp lệ'
  if (blank(v.password)) errors.password = 'Mật khẩu là bắt buộc'
  else if (v.password.length < 8) errors.password = 'Mật khẩu tối thiểu 8 ký tự'
  if (v.role === '') errors.role = 'Vai trò là bắt buộc'
  if (v.username.length > MAX) errors.username = 'Tối đa 256 ký tự'
  if (v.email.length > MAX) errors.email = 'Tối đa 256 ký tự'
  return errors
}

export interface AccountPayload {
  username: string
  email: string
  password: string
  roleType: 'ADMIN' | 'USER'
}

export function toAccountPayload(v: AccountFormValues): AccountPayload {
  if (v.role === '') throw new Error('role is required')
  return {
    username: v.username.trim(),
    email: v.email.trim(),
    password: v.password,
    roleType: v.role,
  }
}

export function fieldForConflict(message: string): 'username' | 'email' | null {
  const lower = message.toLowerCase()
  if (lower.includes('username')) return 'username'
  if (lower.includes('email')) return 'email'
  return null
}
