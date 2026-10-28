import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import type { CustomerContact } from '../../lib/types'
import { deleteContact, listContacts } from './customer.api'
import type { StatusFilter } from './customerFields'
import { emptyListMessage, statusOf, toProcessed } from './customerFields'

const SIZES = [10, 20, 50]

const TABS: { key: StatusFilter; label: string }[] = [
  { key: '', label: 'Tất cả' },
  { key: 'new', label: 'Mới' },
  { key: 'done', label: 'Đã xử lý' },
]

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('vi-VN')
}

export default function CustomerList() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<StatusFilter>('')
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(SIZES[0] as number)
  const [items, setItems] = useState<CustomerContact[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    listContacts({ page, size, q, processed: toProcessed(status) })
      .then((res) => {
        if (cancelled) return
        const lastPage = Math.max(0, Math.ceil(res.total / size) - 1)
        if (page > lastPage) {
          setPage(lastPage)
          return
        }
        setItems(res.items)
        setTotal(res.total)
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
  }, [status, q, page, size, nonce])

  const totalPages = Math.max(1, Math.ceil(total / size))

  function onSearch(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setLoading(true)
    setQ(search.trim())
    setPage(0)
    setNonce((n) => n + 1)
  }

  async function confirmDelete(): Promise<void> {
    if (!confirm) return
    setDeleting(true)
    try {
      await deleteContact(confirm.id)
      setConfirm(null)
      setLoading(true)
      setNonce((n) => n + 1)
    } catch (e: unknown) {
      setConfirm(null)
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Tin nhắn liên hệ</h1>
      </div>

      <div className="card">
        <div className="filterbar">
          {TABS.map((t) => (
            <button
              key={t.label}
              type="button"
              className={status === t.key ? 'btn btn-primary' : 'btn btn-default'}
              onClick={() => {
                setLoading(true)
                setStatus(t.key)
                setPage(0)
                setNonce((n) => n + 1)
              }}
            >
              {t.label}
            </button>
          ))}
          <form onSubmit={onSearch} style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, email, số điện thoại"
              aria-label="Tìm kiếm tin nhắn"
            />
            <button type="submit" className="btn btn-default">
              Tìm
            </button>
          </form>
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
        ) : items.length === 0 ? (
          <div className="empty">{emptyListMessage(q)}</div>
        ) : (
          <table className="grid">
            <thead>
              <tr>
                <th>Tên</th>
                <th>Điện thoại</th>
                <th>Email</th>
                <th>Ngày gửi</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const badge = statusOf(c)
                return (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.phone}</td>
                    <td>{c.email}</td>
                    <td>{formatDate(c.createdAt)}</td>
                    <td>
                      <span className={badge.className}>{badge.label}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="icon-btn"
                        title="Xem chi tiết"
                        onClick={() => navigate(`/customer-contact/${c.id}`)}
                      >
                        👁
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        title="Xóa"
                        onClick={() => setConfirm({ id: c.id, name: c.name })}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        <div className="pager">
          <select
            value={size}
            onChange={(e) => {
              setLoading(true)
              setSize(Number(e.target.value))
              setPage(0)
            }}
          >
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={page === 0}
            onClick={() => {
              setLoading(true)
              setPage(page - 1)
            }}
          >
            ‹
          </button>
          <span>
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page + 1 >= totalPages}
            onClick={() => {
              setLoading(true)
              setPage(page + 1)
            }}
          >
            ›
          </button>
        </div>
      </div>

      {confirm && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Xác nhận xóa</h2>
            <p>Xóa tin nhắn của {confirm.name}? Hành động này không thể hoàn tác.</p>
            <div className="actions">
              <button
                type="button"
                className="btn btn-default"
                disabled={deleting}
                onClick={() => setConfirm(null)}
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
