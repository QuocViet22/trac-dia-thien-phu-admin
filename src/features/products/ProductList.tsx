import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { apiFetch } from '../../lib/api'
import type { Category, Product } from '../../lib/types'
import { deleteProduct, listProducts } from './products.api'

const SIZES = [20, 50, 100]

export default function ProductList() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(SIZES[0])
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    apiFetch<Category[]>('/api/categories')
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    listProducts(categoryId || undefined, page, size)
      .then((res) => {
        if (cancelled) return
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
  }, [categoryId, page, size, nonce])

  const catNames = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories])

  const q = query.trim().toLowerCase()
  const visible = q
    ? items.filter((p) =>
        [p.name, p.skuCode, p.barcode].some((f) => (f ?? '').toLowerCase().includes(q)),
      )
    : items

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
      prev.size === visible.length ? new Set() : new Set(visible.map((p) => p.id)),
    )
  }

  async function confirmDelete(): Promise<void> {
    if (!confirmIds) return
    setDeleting(true)
    try {
      for (const id of confirmIds) {
        await deleteProduct(id)
      }
      setConfirmIds(null)
      setSelected(new Set())
      const res = await listProducts(categoryId || undefined, page, size)
      setItems(res.items)
      setTotal(res.total)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed')
      setConfirmIds(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Danh sách sản phẩm</h1>
        <Link to="/products/new" className="btn btn-primary">
          + Thêm sản phẩm
        </Link>
      </div>

      <div className="card">
        <div className="filterbar">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, SKU, mã vạch"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ maxWidth: 320 }}
          />
          <select
            value={categoryId}
            onChange={(e) => {
              setLoading(true)
              setCategoryId(e.target.value)
              setPage(0)
            }}
            style={{ maxWidth: 240 }}
          >
            <option value="">Danh mục: Tất cả</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
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
        ) : visible.length === 0 ? (
          <div className="empty">Không có sản phẩm nào</div>
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
                <th>Tên sản phẩm</th>
                <th>Mã SKU</th>
                <th>Mã vạch</th>
                <th>Danh mục</th>
                <th>ĐVT</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id} className={selected.has(p.id) ? 'selected' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                    />
                  </td>
                  <td>
                    {p.images[0] ? (
                      <img src={p.images[0].imageUrl} alt="" className="thumb" />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{p.name}</td>
                  <td>{p.skuCode ?? '—'}</td>
                  <td>{p.barcode ?? '—'}</td>
                  <td>{p.categoryId ? (catNames.get(p.categoryId) ?? '—') : '—'}</td>
                  <td>{p.measurementUnit ?? '—'}</td>
                  <td>—</td>
                  <td>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Sửa"
                      onClick={() => navigate(`/products/${p.id}`)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Nhân bản"
                      onClick={() => navigate('/products/new', { state: { clone: p } })}
                    >
                      ⧉
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      title="Xóa"
                      onClick={() => setConfirmIds([p.id])}
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
            <p>Xóa {confirmIds.length} sản phẩm đã chọn? Hành động này không thể hoàn tác.</p>
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
