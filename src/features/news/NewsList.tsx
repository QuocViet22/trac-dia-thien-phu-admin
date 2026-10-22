import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { deleteMany } from '../../lib/api'
import type { News, NewsStatus, NewsType } from '../../lib/types'
import { deleteNews, listNews } from './news.api'

const SIZES = [10, 20, 50]

const TABS: { key: '' | NewsStatus; label: string }[] = [
  { key: '', label: 'Tất cả' },
  { key: 'PUBLISHED', label: 'Đã đăng' },
  { key: 'DRAFT', label: 'Nháp' },
]

const STATUS_LABEL: Record<NewsStatus, string> = {
  PUBLISHED: 'Đã đăng',
  DRAFT: 'Nháp',
}

const STATUS_CLASS: Record<NewsStatus, string> = {
  PUBLISHED: 'badge success',
  DRAFT: 'badge',
}

const NEWS_TYPE_LABEL: Record<NewsType, string> = {
  NEWS: 'Tin tức',
  HIRING_PRODUCT: 'Thuê sản phẩm',
  CUSTOMER_NEWS: 'Khách hàng',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('vi-VN')
}

export default function NewsList() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'' | NewsStatus>('')
  const [newsType, setNewsType] = useState<'' | NewsType>('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(SIZES[0] as number)
  const [items, setItems] = useState<News[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    listNews(status || undefined, newsType || undefined, page, size)
      .then((res) => {
        if (cancelled) return
        const lastPage = Math.max(0, Math.ceil(res.total / size) - 1)
        if (page > lastPage) {
          setPage(lastPage)
          return
        }
        setItems(res.items)
        setTotal(res.total)
        setSelected(new Set())
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
  }, [status, newsType, page, size, nonce])

  const totalPages = Math.max(1, Math.ceil(total / size))

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll(): void {
    setSelected((prev) =>
      prev.size === items.length ? new Set() : new Set(items.map((n) => n.id)),
    )
  }

  async function confirmDelete(): Promise<void> {
    if (!confirmIds) return
    const ids = confirmIds
    setDeleting(true)
    try {
      const result = await deleteMany(ids, deleteNews)
      setConfirmIds(null)
      setSelected(new Set())
      try {
        const res = await listNews(status || undefined, newsType || undefined, page, size)
        setItems(res.items)
        setTotal(res.total)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Request failed')
        return
      }
      if (result.failed > 0) {
        setError(`Đã xóa ${result.deleted}/${ids.length}, ${result.failed} thất bại`)
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Danh sách bài viết</h1>
        <Link to="/news/new" className="btn btn-primary">
          + Thêm bài viết
        </Link>
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
              }}
            >
              {t.label}
            </button>
          ))}
          <select
            value={newsType}
            onChange={(e) => {
              setLoading(true)
              setNewsType(e.target.value as '' | NewsType)
              setPage(0)
            }}
            style={{ maxWidth: 220 }}
          >
            <option value="">Loại: Tất cả</option>
            <option value="NEWS">Tin tức</option>
            <option value="HIRING_PRODUCT">Thuê sản phẩm</option>
            <option value="CUSTOMER_NEWS">Khách hàng</option>
          </select>
        </div>

        {selected.size > 0 && (
          <div className="bulkbar">
            <span>Đã chọn {selected.size}</span>
            <button type="button" className="btn btn-default" onClick={() => setSelected(new Set())}>
              Bỏ chọn
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setConfirmIds([...selected])}
            >
              Xóa đã chọn
            </button>
          </div>
        )}

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
          <div className="empty">Không có bài viết nào</div>
        ) : (
          <table className="grid">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả"
                    checked={items.length > 0 && selected.size === items.length}
                    onChange={toggleAll}
                  />
                </th>
                <th>Ảnh</th>
                <th>Tiêu đề bài viết</th>
                <th>Tác giả</th>
                <th>Loại</th>
                <th>Địa điểm</th>
                <th>Đường dẫn SEO</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((n) => (
                <tr key={n.id} className={selected.has(n.id) ? 'selected' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(n.id)}
                      onChange={() => toggle(n.id)}
                    />
                  </td>
                  <td>
                    {n.images[0] ? (
                      <img src={n.images[0].imageUrl} alt="" className="thumb" />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{n.title}</td>
                  <td>{n.author}</td>
                  <td>
                    <span className="badge">{NEWS_TYPE_LABEL[n.newsType]}</span>
                  </td>
                  <td>{n.location ?? '—'}</td>
                  <td>{n.seoAlias ?? '—'}</td>
                  <td>
                    <span className={STATUS_CLASS[n.status]}>{STATUS_LABEL[n.status]}</span>
                  </td>
                  <td>{formatDate(n.createdAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Sửa"
                      onClick={() => navigate(`/news/${n.id}`)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      title="Xóa"
                      onClick={() => setConfirmIds([n.id])}
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
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

      {confirmIds && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Xác nhận xóa</h2>
            <p>Xóa {confirmIds.length} bài viết đã chọn? Hành động này không thể hoàn tác.</p>
            <div className="actions">
              <button
                type="button"
                className="btn btn-default"
                disabled={deleting}
                onClick={() => setConfirmIds(null)}
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
