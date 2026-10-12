export interface LoginValues {
  username: string
  password: string
}

export interface ForgotValues {
  username: string
  email: string
}

export interface ResetValues {
  newPassword: string
  confirm: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function blank(s: string): boolean {
  return s.trim().length === 0
}

export function validateLogin(v: LoginValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (blank(v.username)) errors.username = 'Tên đăng nhập là bắt buộc'
  if (blank(v.password)) errors.password = 'Mật khẩu là bắt buộc'
  return errors
}

export function validateForgot(v: ForgotValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (blank(v.username)) errors.username = 'Tên đăng nhập là bắt buộc'
  if (blank(v.email)) errors.email = 'Email là bắt buộc'
  else if (!EMAIL_RE.test(v.email.trim())) errors.email = 'Email không hợp lệ'
  return errors
}

export function validateReset(v: ResetValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (blank(v.newPassword)) errors.newPassword = 'Mật khẩu mới là bắt buộc'
  else if (v.newPassword.length < 8) errors.newPassword = 'Mật khẩu tối thiểu 8 ký tự'
  if (v.confirm !== v.newPassword) errors.confirm = 'Nhập lại mật khẩu không khớp'
  return errors
}
