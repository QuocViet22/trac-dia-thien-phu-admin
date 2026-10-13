import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ApiError } from '../../lib/api'
import { resetPassword } from './auth.api'
import { validateReset } from './authFields'
import './LoginPage.css'

function LockIcon({ className = 'login-icon', size = 18 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {off ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4-.9" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </>
      ) : (
        <>
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  )
}

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formMessage, setFormMessage] = useState('')
  const [invalid, setInvalid] = useState(token === '')
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    const fieldErrors = validateReset({ newPassword, confirm })
    setErrors(fieldErrors)
    setFormMessage('')
    if (Object.keys(fieldErrors).length > 0) return
    setSaving(true)
    try {
      await resetPassword({ token, newPassword })
      setDone(true)
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) setInvalid(true)
      else setFormMessage(err instanceof Error ? err.message : 'Không kết nối được máy chủ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="login-wrap">
      <main className="login-card">
        <div className="login-badge" aria-hidden="true">
          <LockIcon className="" size={22} />
        </div>
        <h1 className="login-title">Đặt lại mật khẩu</h1>
        <p className="login-sub">Nhập mật khẩu mới cho tài khoản của bạn.</p>

        {invalid ? (
          <>
            <div className="login-alert" role="alert">
              Liên kết đã hết hạn hoặc không hợp lệ.
            </div>
            <div className="login-back">
              <Link to="/forgot-password" className="login-link">
                Yêu cầu liên kết mới
              </Link>
            </div>
          </>
        ) : done ? (
          <div className="login-alert login-alert-ok" role="status">
            Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.
          </div>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)} noValidate>
            {formMessage && (
              <div className="login-alert" role="alert">
                {formMessage}
              </div>
            )}

            <div className="login-field">
              <label htmlFor="reset-new">
                Mật khẩu mới <span className="login-req">*</span>
              </label>
              <div className="login-input login-input-pw">
                <LockIcon />
                <input
                  id="reset-new"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  autoComplete="new-password"
                  aria-invalid={errors.newPassword ? true : undefined}
                  aria-describedby={errors.newPassword ? 'reset-new-err' : undefined}
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setShowNew((v) => !v)}
                  aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <EyeIcon off={showNew} />
                </button>
              </div>
              <span className="login-error" id="reset-new-err">
                {errors.newPassword}
              </span>
            </div>

            <div className="login-field">
              <label htmlFor="reset-confirm">
                Nhập lại mật khẩu <span className="login-req">*</span>
              </label>
              <div className="login-input login-input-pw">
                <LockIcon />
                <input
                  id="reset-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  autoComplete="new-password"
                  aria-invalid={errors.confirm ? true : undefined}
                  aria-describedby={errors.confirm ? 'reset-confirm-err' : undefined}
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <EyeIcon off={showConfirm} />
                </button>
              </div>
              <span className="login-error" id="reset-confirm-err">
                {errors.confirm}
              </span>
            </div>

            <button type="submit" className="login-btn" disabled={saving}>
              {saving ? (
                <>
                  <span className="login-spin" aria-hidden="true" />
                  Đang lưu…
                </>
              ) : (
                'Đặt lại mật khẩu'
              )}
            </button>
          </form>
        )}

        {!invalid && (
          <div className="login-back">
            <Link to="/login" className="login-link">
              Quay lại đăng nhập
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
