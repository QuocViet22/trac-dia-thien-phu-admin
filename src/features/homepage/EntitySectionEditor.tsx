import { useEffect, useState } from 'react'
import ErrorPopup from '../../components/ErrorPopup.tsx'
import { listCategories } from '../categories/categories.api'
import { listNews } from '../news/news.api'
import { listProducts } from '../products/products.api'
import { getCategory } from '../categories/categories.api'
import { getNews } from '../news/news.api'
import { getProduct } from '../products/products.api'
import {
  createCollection,
  deleteCollection,
  listCollections,
  updateCollection,
} from './collections.api'
import type { CollectionPayload } from './collections.api'
import type { Collection, CollectionType } from './homepageTypes'

interface Props {
  collectionType: CollectionType
  max: number
  items: Collection[]
  onChanged: () => void
}

interface Candidate {
  id: string
  name: string
}

type EntityKind = 'product' | 'category' | 'news'

function kindOf(collectionType: CollectionType): EntityKind {
  if (collectionType === 'BEST_SELLER_COLLECTION') return 'product'
  if (collectionType === 'NEWS_COLLECTION') return 'news'
  return 'category'
}

function sorted(items: Collection[]): Collection[] {
  return [...items].sort((a, b) => a.orderIndex - b.orderIndex)
}

function toPayload(c: Collection, orderIndex: number): CollectionPayload {
  return {
    name: c.name,
    orderIndex,
    collectionType: c.collectionType,
    referenceId: c.referenceId,
    images: c.images.map((img) => ({
      imageUrl: img.imageUrl,
      name: img.name,
      sortOrder: img.sortOrder,
    })),
  }
}

function isConflictError(err: unknown): boolean {
  return err instanceof Error && 'status' in err && (err as { status: number }).status === 409
}

function isNotFoundError(err: unknown): boolean {
  return err instanceof Error && 'status' in err && (err as { status: number }).status === 404
}

const SWAP_TEMP_OFFSET = 100_000
const PAGE_SIZE = 10

function swapTempIndex(a: Collection, b: Collection): number {
  return Math.max(a.orderIndex, b.orderIndex) + SWAP_TEMP_OFFSET
}

async function swapOrder(a: Collection, b: Collection): Promise<void> {
  const temp = swapTempIndex(a, b)
  await updateCollection(a.id, toPayload(a, temp))
  await updateCollection(b.id, toPayload(b, a.orderIndex))
  await updateCollection(a.id, toPayload(a, b.orderIndex))
}

export default function EntitySectionEditor({ collectionType, max, items, onChanged }: Props) {
  const kind = kindOf(collectionType)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [total, setTotal] = useState(0)
  const [pickerLoading, setPickerLoading] = useState(true)
  const [pickerError, setPickerError] = useState('')
  const [missingIds, setMissingIds] = useState<Set<string>>(new Set())
  const [formMessage, setFormMessage] = useState('')
  const [popup, setPopup] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const rows = sorted(items)
  const full = rows.length >= max
  const maxMessage = `Đã đạt tối đa ${max} mục`
  const selectedIds = new Set(rows.map((r) => r.referenceId).filter((id) => id !== null))

  useEffect(() => {
    let cancelled = false
    const load = async (): Promise<void> => {
      if (kind === 'category') {
        const res = await listCategories()
        if (cancelled) return
        setCandidates(res.map((c) => ({ id: c.id, name: c.name })))
        setTotal(res.length)
      } else if (kind === 'product') {
        const res = await listProducts(undefined, page, PAGE_SIZE)
        if (cancelled) return
        setCandidates(res.items.map((p) => ({ id: p.id, name: p.name })))
        setTotal(res.total)
      } else {
        const res = await listNews(undefined, undefined, page, PAGE_SIZE)
        if (cancelled) return
        setCandidates(res.items.map((n) => ({ id: n.id, name: n.title })))
        setTotal(res.total)
      }
    }
    load()
      .catch((e: unknown) => {
        if (!cancelled) setPickerError(e instanceof Error ? e.message : 'Request failed')
      })
      .finally(() => {
        if (!cancelled) setPickerLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [kind, page, reloadNonce])

  // Verify selected references still exist; dangling ones render a removable placeholder row.
  useEffect(() => {
    let cancelled = false
    const known = new Set(candidates.map((c) => c.id))
    const unverified = rows.filter((r) => r.referenceId && !known.has(r.referenceId))
    if (unverified.length === 0) return
    const check = async (): Promise<void> => {
      const gone: string[] = []
      await Promise.all(
        unverified.map(async (row) => {
          const refId = row.referenceId as string
          try {
            if (kind === 'product') await getProduct(refId)
            else if (kind === 'news') await getNews(refId)
            else await getCategory(refId)
          } catch (e: unknown) {
            if (isNotFoundError(e)) gone.push(refId)
          }
        }),
      )
      if (!cancelled && gone.length > 0) {
        setMissingIds((prev) => new Set([...prev, ...gone]))
      }
    }
    void check()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, candidates, items])

  const normalizedQuery = query.trim().toLowerCase()
  const filtered =
    normalizedQuery === ''
      ? candidates
      : candidates.filter((c) => c.name.toLowerCase().includes(normalizedQuery))
  const pageCount = kind === 'category' ? 1 : Math.max(1, Math.ceil(total / PAGE_SIZE))

  async function onAdd(candidate: Candidate): Promise<void> {
    if (full) {
      setPopup(maxMessage)
      return
    }
    if (selectedIds.has(candidate.id)) {
      setFormMessage('Mục này đã được chọn')
      return
    }
    setAddingId(candidate.id)
    setFormMessage('')
    try {
      const nextIndex =
        rows.length === 0 ? 0 : Math.max(...rows.map((r) => r.orderIndex)) + 1
      await createCollection({
        name: candidate.name,
        orderIndex: nextIndex,
        collectionType,
        referenceId: candidate.id,
      })
      onChanged()
    } catch (err: unknown) {
      if (isConflictError(err)) {
        setPopup(maxMessage)
      } else {
        setFormMessage(err instanceof Error ? err.message : 'Request failed')
      }
    } finally {
      setAddingId(null)
    }
  }

  async function move(index: number, dir: -1 | 1): Promise<void> {
    const a = rows[index]
    const b = rows[index + dir]
    if (!a || !b) return
    setMovingId(a.id)
    setFormMessage('')
    try {
      try {
        await swapOrder(a, b)
      } catch (err: unknown) {
        if (!isConflictError(err)) throw err
        const fresh = await listCollections(collectionType)
        const fa = fresh.find((c) => c.id === a.id)
        const fb = fresh.find((c) => c.id === b.id)
        if (!fa || !fb) {
          onChanged()
          return
        }
        await swapOrder(fa, fb)
      }
      onChanged()
    } catch (err: unknown) {
      setFormMessage(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setMovingId(null)
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!confirmId) return
    setDeleting(true)
    try {
      await deleteCollection(confirmId)
      setConfirmId(null)
      onChanged()
    } catch (err: unknown) {
      setFormMessage(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setDeleting(false)
    }
  }

  const confirmItem = confirmId ? rows.find((r) => r.id === confirmId) : undefined

  return (
    <div>
      {rows.length === 0 ? (
        <div className="empty">Chưa có mục nào</div>
      ) : (
        <table className="grid">
          <thead>
            <tr>
              <th>Tên</th>
              <th>Thứ tự</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const dangling = row.referenceId !== null && missingIds.has(row.referenceId)
              return (
                <tr key={row.id}>
                  <td>{dangling ? <span className="error">Muc da bi xoa</span> : row.name}</td>
                  <td>{row.orderIndex}</td>
                  <td>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Lên"
                      disabled={movingId !== null || index === 0}
                      onClick={() => void move(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Xuống"
                      disabled={movingId !== null || index === rows.length - 1}
                      onClick={() => void move(index, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      title="Xóa"
                      onClick={() => setConfirmId(row.id)}
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

      <div className="card" style={{ margin: '10px' }}>
        <h2 style={{ margin: '10px' }}>Thêm mục mới</h2>
        {full && <p className="error">{maxMessage}</p>}
        <div className="field" style={{ margin: '10px' }}>
          <label>Tìm kiếm</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập tên để tìm"
          />
        </div>
        {pickerLoading ? (
          <div className="loading">Đang tải…</div>
        ) : pickerError ? (
          <div className="fetch-error">
            <p>{pickerError}</p>
            <button
              type="button"
              className="btn btn-default"
              onClick={() => {
                setPickerLoading(true)
                setPickerError('')
                setReloadNonce((n) => n + 1)
              }}
            >
              Thử lại
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">Không tìm thấy mục nào</div>
        ) : (
          <table className="grid">
            <thead>
              <tr>
                <th>Tên</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const already = selectedIds.has(c.id)
                return (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-default"
                        disabled={full || already || addingId !== null}
                        title={already ? 'Đã được chọn' : 'Thêm'}
                        onClick={() => void onAdd(c)}
                      >
                        {addingId === c.id ? 'Đang thêm…' : already ? 'Đã chọn' : '+ Thêm'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {kind !== 'category' && pageCount > 1 && (
          <div className="actions" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-default"
              disabled={page === 0 || pickerLoading}
              onClick={() => {
                setPickerLoading(true)
                setPickerError('')
                setPage((p) => p - 1)
              }}
            >
              ← Trước
            </button>
            <span>
              {page + 1}/{pageCount}
            </span>
            <button
              type="button"
              className="btn btn-default"
              disabled={page + 1 >= pageCount || pickerLoading}
              onClick={() => {
                setPickerLoading(true)
                setPickerError('')
                setPage((p) => p + 1)
              }}
            >
              Sau →
            </button>
          </div>
        )}
        {formMessage && <div className="fetch-error">{formMessage}</div>}
      </div>

      {confirmId && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Xác nhận xóa</h2>
            <p>
              Xóa {confirmItem ? `“${confirmItem.name}”` : 'mục đã chọn'}? Hành động này không thể
              hoàn tác.
            </p>
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

      {popup && <ErrorPopup title="Không thể thêm" message={popup} onClose={() => setPopup(null)} />}
    </div>
  )
}
