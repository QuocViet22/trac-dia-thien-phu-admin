import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ApiError } from '../../lib/api'
import { resetPassword } from './auth.api'
import { validateReset } from './authFields'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
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
    <div className="auth-wrap">
      <div className="card auth-card">
        <h1>Đặt lại mật khẩu</h1>
        {invalid ? (
          <p>Liên kết đã hết hạn hoặc không hợp lệ</p>
        ) : done ? (
          <p>
            Đặt lại mật khẩu thành công.{' '}
            <Link to="/login">Quay lại đăng nhập</Link>
          </p>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)}>
            <div className="field">
              <label>Mật khẩu mới *</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
                autoComplete="new-password"
              />
              {errors.newPassword && <span className="error">{errors.newPassword}</span>}
            </div>
            <div className="field">
              <label>Nhập lại mật khẩu *</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                autoComplete="new-password"
              />
              {errors.confirm && <span className="error">{errors.confirm}</span>}
            </div>
            {formMessage && <div className="fetch-error">{formMessage}</div>}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Đang lưu…' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
