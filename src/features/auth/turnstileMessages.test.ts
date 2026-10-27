import { describe, expect, it } from 'vitest'
import { captchaMessage } from './turnstileMessages'

describe('captchaMessage', () => {
  it('explains a rejected token', () => {
    expect(captchaMessage(403)).toBe('Xác thực bảo mật không hợp lệ. Vui lòng thử lại.')
  })

  it('explains an unavailable verifier', () => {
    expect(captchaMessage(503)).toBe('Dịch vụ xác thực bảo mật tạm thời không khả dụng. Vui lòng thử lại sau.')
  })

  it('leaves every other status to the existing handling', () => {
    expect(captchaMessage(401)).toBeNull()
    expect(captchaMessage(404)).toBeNull()
    expect(captchaMessage(500)).toBeNull()
  })
})
