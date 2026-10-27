const REJECTED = 'Xác thực bảo mật không hợp lệ. Vui lòng thử lại.'
const UNAVAILABLE = 'Dịch vụ xác thực bảo mật tạm thời không khả dụng. Vui lòng thử lại sau.'

export function captchaMessage(status: number): string | null {
  if (status === 403) return REJECTED
  if (status === 503) return UNAVAILABLE
  return null
}
