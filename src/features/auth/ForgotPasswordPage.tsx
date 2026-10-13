import { useState } from 'react'
import { Link } from 'react-router'
import { ApiError } from '../../lib/api'
import { requestPasswordReset } from './auth.api'
import { validateForgot } from './authFields'

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formMessage, setFormMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    const fieldErrors = validateForgot({ username, email })
    setErrors(fieldErrors)
    setFormMessage('')
    if (Object.keys(fieldErrors).length > 0) return
    setSaving(true)
    try {
      await requestPasswordReset({ username: username.trim(), email: email.trim() })
      setSent(true)
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 404)) setSent(true)
      else setFormMessage(err instanceof Error ? err.message : 'Không kết nối được máy chủ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="auth-badge" aria-hidden="true">
          🔒
        </div>
        <h1>Quên mật khẩu</h1>
        <p className="auth-sub">Nhập thông tin tài khoản để nhận liên kết đặt lại.</p>
        {sent ? (
          <p>Nếu tài khoản tồn tại, liên kết đặt lại đã được gửi</p>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)}>
            <div className="field">
              <label>Tên đăng nhập *</label>
              <div className="input-wrap">
                <span className="input-icon" aria-hidden="true">
                  👤
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập"
                  autoComplete="username"
                />
              </div>
              {errors.username && <span className="error">{errors.username}</span>}
            </div>
            <div className="field">
              <label>Email *</label>
              <div className="input-wrap">
                <span className="input-icon" aria-hidden="true">
                  ✉️
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email"
                  autoComplete="email"
                />
              </div>
              {errors.email && <span className="error">{errors.email}</span>}
            </div>
            {formMessage && <div className="fetch-error">{formMessage}</div>}
            <button type="submit" className="btn btn-primary auth-submit" disabled={saving}>
              {saving ? 'Đang gửi…' : 'Gửi liên kết đặt lại'}
            </button>
          </form>
        )}
        <div className="auth-link-row">
          <Link to="/login" className="auth-link">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  )
}
