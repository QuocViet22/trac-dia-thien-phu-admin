import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { isNotFoundError } from '../../lib/formErrors'
import type { CustomerContact } from '../../lib/types'
import { deleteContact, getContact, setProcessed } from './customer.api'
import { statusOf } from './customerFields'

export default function CustomerDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [contact, setContact] = useState<CustomerContact | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    getContact(id)
      .then((c) => {
        if (cancelled) return
        setContact(c)
        setError('')
        setNotFound(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        if (isNotFoundError(e)) {
          setNotFound(true)
        } else {
          setError(e instanceof Error ? e.message : 'Request failed')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, nonce])

  async function toggle(): Promise<void> {
    if (!contact) return
    setBusy(true)
    setActionError('')
    try {
      setContact(await setProcessed(contact.id, !contact.processed))
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  async function remove(): Promise<void> {
    if (!contact) return
    setBusy(true)
    setActionError('')
    try {
      await deleteContact(contact.id)
      navigate('/khach-hang')
    } catch (e: unknown) {
      setConfirming(false)
      setActionError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="loading">Đang tải…</div>

  if (notFound) {
    return (
      <div className="empty">
        Không tìm thấy tin nhắn
        <div style={{ marginTop: 12 }}>
          <Link to="/khach-hang">← Danh sách</Link>
        </div>
      </div>
    )
  }

  if (error) {
    return (
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
    )
  }

  if (!contact) return null

  const badge = statusOf(contact)

  return (
    <div>
      <div className="page-head">
        <h1>Chi tiết tin nhắn</h1>
      </div>

      <p style={{ marginBottom: 12 }}>
        <Link to="/khach-hang">← Danh sách</Link>
      </p>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <span className={badge.className}>{badge.label}</span>
          <span>Ngày gửi: {new Date(contact.createdAt).toLocaleString('vi-VN')}</span>
        </div>

        <div className="field">
          <label>Tên</label>
          <div>{contact.name}</div>
        </div>
        <div className="field">
          <label>Email</label>
          <div>{contact.email}</div>
        </div>
        <div className="field">
          <label>Điện thoại</label>
          <div>{contact.phone}</div>
        </div>
        <div className="field">
          <label>Địa chỉ</label>
          <div>{contact.address ?? '—'}</div>
        </div>
        <div className="field">
          <label>Nội dung</label>
          <div
            style={{
              border: '1px solid var(--card-border)',
              borderRadius: 8,
              padding: 12,
              whiteSpace: 'pre-wrap',
            }}
          >
            {contact.message ?? '—'}
          </div>
        </div>

        {actionError && (
          <div className="fetch-error">
            <p>{actionError}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void toggle()}
          >
            {contact.processed ? 'Đánh dấu là Mới' : 'Đánh dấu đã xử lý'}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={busy}
            onClick={() => setConfirming(true)}
          >
            Xóa
          </button>
        </div>
      </div>

      {confirming && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Xác nhận xóa</h2>
            <p>Xóa tin nhắn của {contact.name}? Hành động này không thể hoàn tác.</p>
            <div className="actions">
              <button
                type="button"
                className="btn btn-default"
                disabled={busy}
                onClick={() => setConfirming(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-danger solid"
                disabled={busy}
                onClick={() => void remove()}
              >
                {busy ? 'Đang xóa…' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
