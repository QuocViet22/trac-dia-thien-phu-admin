import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { loadSession, saveSession } from '../../lib/authSession'
import { ApiError } from '../../lib/api'
import { login } from './auth.api'
import { validateLogin } from './authFields'
import './LoginPage.css'

function UserIcon() {
  return (
    <svg className="login-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  )
}

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

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formMessage, setFormMessage] = useState('')
  const [saving, setSaving] = useState(false)

  if (loadSession()?.accessToken) return <Navigate to="/products" replace />

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    const fieldErrors = validateLogin({ username, password })
    setErrors(fieldErrors)
    setFormMessage('')
    if (Object.keys(fieldErrors).length > 0) return
    setSaving(true)
    try {
      const pair = await login({ username: username.trim(), password })
      saveSession({ accessToken: pair.accessToken, refreshToken: pair.refreshToken, username: pair.username, role: pair.roleType })
      navigate('/products', { replace: true })
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) setFormMessage('Sai tên đăng nhập hoặc mật khẩu')
      else setFormMessage(err instanceof Error ? err.message : 'Không kết nối được máy chủ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="login-wrap">
      <main className="login-card">
        <div className="login-badge">
          <LockIcon className="" size={22} />
        </div>
        <h1 className="login-title">Đăng nhập quản trị</h1>
        <p className="login-sub">Vui lòng nhập thông tin tài khoản quản trị để tiếp tục.</p>

        {formMessage && (
          <div className="login-alert" role="alert">
            {formMessage}
          </div>
        )}

        <form onSubmit={(e) => void onSubmit(e)} noValidate>
          <div className="login-field">
            <label htmlFor="login-username">
              Tên đăng nhập <span className="login-req">*</span>
            </label>
            <div className="login-input">
              <UserIcon />
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={errors.username ? true : undefined}
                aria-describedby={errors.username ? 'login-username-err' : undefined}
              />
            </div>
            <span className="login-error" id="login-username-err">
              {errors.username}
            </span>
          </div>

          <div className="login-field">
            <label htmlFor="login-password">
              Mật khẩu <span className="login-req">*</span>
            </label>
            <div className="login-input login-input-pw">
              <LockIcon />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? 'login-password-err' : undefined}
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                <EyeIcon off={showPassword} />
              </button>
            </div>
            <span className="login-error" id="login-password-err">
              {errors.password}
            </span>
          </div>

          <div className="login-row">
            <Link to="/forgot-password" className="login-link">
              Quên mật khẩu?
            </Link>
          </div>

          <button type="submit" className="login-btn" disabled={saving}>
            {saving ? (
              <>
                <span className="login-spin" aria-hidden="true" />
                Đang đăng nhập…
              </>
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>
      </main>
    </div>
  )
}
