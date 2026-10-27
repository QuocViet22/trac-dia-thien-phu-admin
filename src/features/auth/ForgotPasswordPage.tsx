import { useState } from 'react'
import { Link } from 'react-router'
import { ApiError } from '../../lib/api'
import { requestPasswordReset } from './auth.api'
import { validateForgot } from './authFields'
import { captchaMessage } from './turnstileMessages'
import TurnstileWidget from './TurnstileWidget'
import './LoginPage.css'

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formMessage, setFormMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    const fieldErrors = validateForgot({ username, email })
    setErrors(fieldErrors)
    setFormMessage('')
    if (Object.keys(fieldErrors).length > 0) return
    if (!token) {
      setFormMessage('Vui lòng hoàn tất xác thực bảo mật.')
      return
    }
    setSaving(true)
    try {
      await requestPasswordReset({ username: username.trim(), email: email.trim(), turnstileToken: token })
      setSent(true)
    } catch (err: unknown) {
      setResetKey((k) => k + 1)
      const captcha = err instanceof ApiError ? captchaMessage(err.status) : null
      if (captcha) setFormMessage(captcha)
      else if (err instanceof ApiError && (err.status === 401 || err.status === 404)) setSent(true)
      else setFormMessage(err instanceof Error ? err.message : 'Không kết nối được máy chủ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="login-wrap">
      <main className="login-card">
        <div className="login-badge" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </div>
        <h1 className="login-title">Quên mật khẩu</h1>
        <p className="login-sub">Nhập thông tin tài khoản để nhận liên kết đặt lại mật khẩu.</p>

        {sent && (
          <div className="login-alert login-alert-ok" role="status">
            Nếu tài khoản tồn tại, liên kết đặt lại đã được gửi. Vui lòng kiểm tra email của bạn.
          </div>
        )}
        {formMessage && (
          <div className="login-alert" role="alert">
            {formMessage}
          </div>
        )}

        {!sent && (
          <form onSubmit={(e) => void onSubmit(e)} noValidate>
            <div className="login-field">
              <label htmlFor="forgot-username">
                Tên đăng nhập <span className="login-req">*</span>
              </label>
              <div className="login-input">
                <svg className="login-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
                <input
                  id="forgot-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={errors.username ? true : undefined}
                  aria-describedby={errors.username ? 'forgot-username-err' : undefined}
                />
              </div>
              <span className="login-error" id="forgot-username-err">
                {errors.username}
              </span>
            </div>

            <div className="login-field">
              <label htmlFor="forgot-email">
                Email <span className="login-req">*</span>
              </label>
              <div className="login-input">
                <svg className="login-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? 'forgot-email-err' : undefined}
                />
              </div>
              <span className="login-error" id="forgot-email-err">
                {errors.email}
              </span>
            </div>

            <TurnstileWidget action="password-reset" onToken={setToken} resetKey={resetKey} />

            <button type="submit" className="login-btn" disabled={saving}>
              {saving ? (
                <>
                  <span className="login-spin" aria-hidden="true" />
                  Đang gửi…
                </>
              ) : (
                'Gửi liên kết đặt lại'
              )}
            </button>
          </form>
        )}

        <div className="login-back">
          <Link to="/login" className="login-link">
            Quay lại đăng nhập
          </Link>
        </div>
      </main>
    </div>
  )
}
