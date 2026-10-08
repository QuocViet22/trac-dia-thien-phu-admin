import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { deleteMany } from '../../lib/api'
import type { Category } from '../../lib/types'
import { deleteCategory, listCategories } from './categories.api'

const SIZES = [20, 50, 100]

export default function CategoryList() {
  const navigate = useNavigate()
  const [all, setAll] = useState<Category[]>([])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(SIZES[0])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    listCategories()
      .then((res) => {
        if (cancelled) return
        setAll(res)
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
  }, [nonce])

  const names = useMemo(() => new Map(all.map((c) => [c.id, c.name])), [all])

  const q = query.trim().toLowerCase()
  const filtered = q
    ? all.filter((c) => [c.name, c.seoAlias].some((f) => (f ?? '').toLowerCase().includes(q)))
    : all

  const totalPages = Math.max(1, Math.ceil(filtered.length / size))
  const safePage = Math.min(page, totalPages - 1)
  const visible = filtered.slice(safePage * size, safePage * size + size)

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
      prev.size === visible.length ? new Set() : new Set(visible.map((c) => c.id)),
    )
  }

  async function confirmDelete(): Promise<void> {
    if (!confirmIds) return
    const ids = confirmIds
    setDeleting(true)
    try {
      const result = await deleteMany(ids, deleteCategory)
      setConfirmIds(null)
      setSelected(new Set())
      try {
        setAll(await listCategories())
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
        <h1>Danh mục sản phẩm</h1>
        <Link to="/categories/new" className="btn btn-primary">
          + Thêm danh mục
        </Link>
      </div>

      <div className="card">
        <div className="filterbar">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, đường dẫn SEO"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(0)
            }}
            style={{ maxWidth: 320 }}
          />
        </div>

        {selected.size > 0 && (
          <div className="bulkbar">
            <span>Đã chọn {selected.size}</span>
            <button type="button" className="btn btn-default" onClick={() => setSelected(new Set())}>
              Hủy chọn
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
        ) : visible.length === 0 ? (
          <div className="empty">Không có danh mục nào</div>
        ) : (
          <table className="grid">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả"
                    checked={visible.length > 0 && selected.size === visible.length}
                    onChange={toggleAll}
                  />
                </th>
                <th>Ảnh</th>
                <th>Tên danh mục</th>
                <th>Danh mục cha</th>
                <th>Đường dẫn SEO</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id} className={selected.has(c.id) ? 'selected' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                    />
                  </td>
                  <td>
                    {c.images[0] ? <img src={c.images[0].imageUrl} alt="" className="thumb" /> : '—'}
                  </td>
                  <td>{c.name}</td>
                  <td>{c.parentCategoryId ? (names.get(c.parentCategoryId) ?? '—') : '—'}</td>
                  <td>{c.seoAlias ?? '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Sửa"
                      onClick={() => navigate(`/categories/${c.id}`)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      title="Xóa"
                      onClick={() => setConfirmIds([c.id])}
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
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
          >
            ‹
          </button>
          <span>
            {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage + 1 >= totalPages}
            onClick={() => setPage(safePage + 1)}
          >
            ›
          </button>
        </div>
      </div>

      {confirmIds && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Xác nhận xóa danh mục</h2>
            <p>Xóa {confirmIds.length} danh mục đã chọn? Hành động này không thể hoàn tác.</p>
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
