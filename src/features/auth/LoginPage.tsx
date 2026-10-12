import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { loadSession, saveSession } from '../../lib/authSession'
import { ApiError } from '../../lib/api'
import { login } from './auth.api'
import { validateLogin } from './authFields'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
    <div className="auth-wrap">
      <div className="card auth-card">
        <h1>Đăng nhập quản trị</h1>
        <form onSubmit={(e) => void onSubmit(e)}>
          <div className="field">
            <label>Tên đăng nhập *</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              autoComplete="username"
            />
            {errors.username && <span className="error">{errors.username}</span>}
          </div>
          <div className="field">
            <label>Mật khẩu *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
            />
            {errors.password && <span className="error">{errors.password}</span>}
          </div>
          {formMessage && <div className="fetch-error">{formMessage}</div>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
        <Link to="/forgot-password" className="btn btn-default">
          Quên mật khẩu
        </Link>
      </div>
    </div>
  )
}
