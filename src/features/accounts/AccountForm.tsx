import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { Account } from '../../lib/types'
import { formErrorForApi, isNotFoundError } from '../../lib/formErrors'
import { createAccount, getAccount, updateAccount } from './accounts.api'
import { fieldForConflict, toAccountPayload, validateAccount } from './accountFields'
import type { AccountFormValues } from './accountFields'
import { ApiError } from '../../lib/api'

const EMPTY: AccountFormValues = {
  username: '',
  email: '',
  password: '',
  role: '',
}

function fromAccount(a: Account): AccountFormValues {
  return {
    username: a.username,
    email: a.email,
    password: '',
    role: a.roleType,
  }
}

const ROLE_CONFLICT_TEXT: Record<'username' | 'email', string> = {
  username: 'Tên đăng nhập đã tồn tại',
  email: 'Email đã tồn tại',
}

export default function AccountForm() {
  const { id } = useParams()
  const isCreate = id === undefined
  const navigate = useNavigate()

  const [values, setValues] = useState<AccountFormValues>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formMessage, setFormMessage] = useState('')
  const [loading, setLoading] = useState(!isCreate)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (isCreate) return
    getAccount(id ?? '')
      .then((a) => setValues(fromAccount(a)))
      .catch((e: unknown) => {
        if (isNotFoundError(e)) setNotFound(true)
        else setLoadError(e instanceof Error ? e.message : 'Request failed')
      })
      .finally(() => setLoading(false))
  }, [isCreate, id, nonce])

  function set<K extends keyof AccountFormValues>(key: K, value: AccountFormValues[K]): void {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    const fieldErrors = validateAccount(values)
    setErrors(fieldErrors)
    setFormMessage('')
    if (Object.keys(fieldErrors).length > 0) return
    setSaving(true)
    try {
      const payload = toAccountPayload(values)
      if (isCreate) {
        await createAccount(payload)
      } else {
        await updateAccount(id ?? '', payload)
      }
      navigate('/accounts')
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        const field = fieldForConflict(err.message)
        if (field) setErrors((prev) => ({ ...prev, [field]: ROLE_CONFLICT_TEXT[field] }))
        else setFormMessage(err.message)
      } else {
        const mapped = formErrorForApi(err)
        if (mapped.field) setErrors((prev) => ({ ...prev, [mapped.field as string]: mapped.message }))
        else setFormMessage(mapped.message)
      }
    } finally {
      setSaving(false)
    }
  }

  if (notFound) return <div className="fetch-error">Không tìm thấy tài khoản</div>
  if (loadError)
    return (
      <div className="fetch-error">
        <p>{loadError}</p>
        <button
          type="button"
          className="btn btn-default"
          onClick={() => {
            setLoading(true)
            setLoadError('')
            setNonce((n) => n + 1)
          }}
        >
          Thử lại
        </button>
      </div>
    )
  if (loading) return <div className="loading">Đang tải…</div>

  const field = (key: string, label: string, control: React.ReactNode) => (
    <div className="field">
      <label>{label}</label>
      {control}
      {errors[key] && <span className="error">{errors[key]}</span>}
    </div>
  )

  return (
    <div>
      <div className="page-head">
        <h1>{isCreate ? 'Thêm mới tài khoản' : 'Sửa tài khoản'}</h1>
      </div>

      <form onSubmit={(e) => void onSubmit(e)}>
        <div className="card">
          <h2>Thông tin chung</h2>
          {field(
            'username',
            'Tên đăng nhập *',
            <input
              type="text"
              value={values.username}
              onChange={(e) => set('username', e.target.value)}
              placeholder="Nhập tên đăng nhập"
            />,
          )}
          {field(
            'email',
            'Email *',
            <input
              type="email"
              value={values.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="Nhập email"
            />,
          )}
          {field(
            'role',
            'Vai trò *',
            <select value={values.role} onChange={(e) => set('role', e.target.value as AccountFormValues['role'])}>
              <option value="">Chọn vai trò</option>
              <option value="ADMIN">Quản trị</option>
              <option value="USER">Người dùng</option>
            </select>,
          )}
          {field(
            'password',
            'Mật khẩu *',
            <>
              <input
                type="password"
                value={values.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="Nhập mật khẩu"
                autoComplete="new-password"
              />
              {!isCreate && <span className="hint">Bắt buộc nhập lại mật khẩu khi sửa</span>}
            </>,
          )}
        </div>

        {formMessage && <div className="fetch-error">{formMessage}</div>}

        <div className="sticky-footer">
          <Link to="/accounts" className="btn btn-default">
            Hủy
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Đang lưu…' : '✓ Lưu'}
          </button>
        </div>
      </form>
    </div>
  )
}
