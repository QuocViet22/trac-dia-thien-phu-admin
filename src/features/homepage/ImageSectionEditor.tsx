import { useState } from 'react'
import ErrorPopup from '../../components/ErrorPopup.tsx'
import ImageDropzone from '../../components/ImageDropzone.tsx'
import { validateImageFile } from '../../lib/imageUpload'
import type { CoverValue } from '../../lib/imageUpload'
import { deleteUpload, uploadFile } from '../../lib/uploads.api'
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

const SWAP_TEMP_OFFSET = 100_000

function swapTempIndex(a: Collection, b: Collection): number {
  return Math.max(a.orderIndex, b.orderIndex) + SWAP_TEMP_OFFSET
}

async function swapOrder(a: Collection, b: Collection): Promise<void> {
  const temp = swapTempIndex(a, b)
  await updateCollection(a.id, toPayload(a, temp))
  await updateCollection(b.id, toPayload(b, a.orderIndex))
  await updateCollection(a.id, toPayload(a, b.orderIndex))
}

export default function ImageSectionEditor({ collectionType, max, items, onChanged }: Props) {
  const [name, setName] = useState('')
  const [cover, setCover] = useState<CoverValue>(null)
  const [nameError, setNameError] = useState('')
  const [coverError, setCoverError] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [popup, setPopup] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const rows = sorted(items)
  const full = rows.length >= max
  const maxMessage = `Da dat toi da ${max} muc`

  function onCoverChange(next: CoverValue): void {
    setCover(next)
    setCoverError('')
  }

  async function onAdd(): Promise<void> {
    if (full) {
      setPopup(maxMessage)
      return
    }
    const trimmed = name.trim()
    let hasError = false
    if (!trimmed) {
      setNameError('Vui lòng nhập tên')
      hasError = true
    }
    if (!cover) {
      setCoverError('Vui lòng chọn ảnh')
      hasError = true
    }
    if (cover?.kind === 'file') {
      const fileError = validateImageFile(cover.file)
      if (fileError) {
        setCoverError(fileError)
        hasError = true
      }
    }
    if (hasError || !cover) return

    setAdding(true)
    setFormMessage('')
    let uploadedKey: string | null = null
    let imageUrl: string | null = cover.kind === 'url' ? cover.url : null
    try {
      if (cover.kind === 'file') {
        try {
          const uploaded = await uploadFile(cover.file)
          imageUrl = uploaded.url
          uploadedKey = uploaded.key
        } catch (err: unknown) {
          setCoverError(err instanceof Error ? err.message : 'Tải ảnh thất bại')
          return
        }
      }
      if (!imageUrl) {
        setCoverError('Vui lòng chọn ảnh')
        return
      }
      const nextIndex =
        rows.length === 0 ? 0 : Math.max(...rows.map((r) => r.orderIndex)) + 1
      await createCollection({
        name: trimmed,
        orderIndex: nextIndex,
        collectionType,
        referenceId: null,
        images: [{ imageUrl, name: trimmed, sortOrder: null }],
      })
      setName('')
      setCover(null)
      setNameError('')
      setCoverError('')
      onChanged()
    } catch (err: unknown) {
      if (uploadedKey) {
        try {
          await deleteUpload(uploadedKey)
        } catch {
          // Orphan upload noted below; the create error is the primary message.
        }
      }
      if (isConflictError(err)) {
        setPopup(maxMessage)
      } else {
        setFormMessage(err instanceof Error ? err.message : 'Request failed')
      }
    } finally {
      setAdding(false)
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
              <th>Ảnh</th>
              <th>Tên</th>
              <th>Thứ tự</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id}>
                <td>
                  {row.images[0] ? (
                    <img src={row.images[0].imageUrl} alt="" className="thumb" />
                  ) : (
                    '—'
                  )}
                </td>
                <td>{row.name}</td>
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
            ))}
          </tbody>
        </table>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Thêm mục mới</h2>
        {full && <p className="error">{maxMessage}</p>}
        <div className="field">
          <label>Tên *</label>
          <input
            type="text"
            value={name}
            disabled={full}
            onChange={(e) => {
              setName(e.target.value)
              setNameError('')
            }}
            placeholder="Nhập tên mục"
          />
          {nameError && <span className="error">{nameError}</span>}
        </div>
        <div className="field">
          <label>Ảnh *</label>
          <ImageDropzone value={cover} onChange={onCoverChange} error={coverError} />
        </div>
        {formMessage && <div className="fetch-error">{formMessage}</div>}
        <button
          type="button"
          className="btn btn-primary"
          disabled={full || adding}
          onClick={() => void onAdd()}
        >
          {adding ? 'Đang thêm…' : '+ Thêm'}
        </button>
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
