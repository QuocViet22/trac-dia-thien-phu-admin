import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { Account } from '../../lib/types'
import { deleteAccount, listAccounts } from './accounts.api'

export default function AccountList() {
  const navigate = useNavigate()
  const [all, setAll] = useState<Account[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    listAccounts()
      .then((res) => {
        if (cancelled) return
        setAll(res)
        setError('')
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Request failed')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [nonce])

  const q = query.trim().toLowerCase()
  const visible = q
    ? all.filter((a) => [a.username, a.email].some((f) => (f ?? '').toLowerCase().includes(q)))
    : all

  async function confirmDelete(): Promise<void> {
    if (!confirmId) return
    setDeleting(true)
    try {
      await deleteAccount(confirmId)
      setConfirmId(null)
      try {
        setAll(await listAccounts())
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Request failed')
      }
    } catch (e: unknown) {
      setConfirmId(null)
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Tài khoản</h1>
        <Link to="/accounts/new" className="btn btn-primary">
          + Thêm tài khoản
        </Link>
      </div>

      <div className="card">
        <div className="filterbar">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ maxWidth: 320 }}
          />
        </div>

        {loading ? (
          <div className="loading">Đang tải…</div>
        ) : error ? (
          <div className="fetch-error">
            <p>{error}</p>
            <button
              type="button"
              className="btn btn-default"
              onClick={() => {
                setLoading(true)
                setError('')
                setNonce((n) => n + 1)
              }}
            >
              Thử lại
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="empty">Không có tài khoản nào</div>
        ) : (
          <table className="grid">
            <thead>
              <tr>
                <th>Tên đăng nhập</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((a) => (
                <tr key={a.id}>
                  <td>{a.username}</td>
                  <td>{a.email}</td>
                  <td>{a.roleType}</td>
                  <td>{new Date(a.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Sửa"
                      onClick={() => navigate(`/accounts/${a.id}`)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      title="Xóa"
                      onClick={() => setConfirmId(a.id)}
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmId && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Xác nhận xóa tài khoản</h2>
            <p>Xóa tài khoản này? Hành động này không thể hoàn tác.</p>
            <div className="actions">
              <button
                type="button"
                className="btn btn-default"
                disabled={deleting}
                onClick={() => setConfirmId(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-danger solid"
                disabled={deleting}
                onClick={() => void confirmDelete()}
              >
                {deleting ? 'Đang xóa…' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
