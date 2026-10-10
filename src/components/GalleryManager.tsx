import { useEffect, useRef, useState } from 'react'
import { MAX_GALLERY_IMAGES } from '../lib/imageUpload'
import type { GalleryItem } from '../lib/imageUpload'

interface Props {
  items: GalleryItem[]
  onChange: (next: GalleryItem[]) => void
  onPromoteCover: (index: number) => void
  error?: string
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export default function GalleryManager({ items, onChange, onPromoteCover, error }: Props) {
  const [dragActive, setDragActive] = useState(false)
  const [showUrl, setShowUrl] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')
  const [previews, setPreviews] = useState<ReadonlyMap<File, string>>(new Map())
  const inputRef = useRef<HTMLInputElement>(null)
  const previewsRef = useRef(new Map<File, string>())

  useEffect(() => {
    return () => {
      for (const url of previewsRef.current.values()) URL.revokeObjectURL(url)
      previewsRef.current.clear()
    }
  }, [])

  // Sync previews with file-kind items arriving via props (e.g. the old
  // cover swapped back into the gallery). Object URLs are external
  // resources, so syncing them here keeps render pure.
  useEffect(() => {
    const next = new Map<File, string>()
    for (const item of items) {
      if (item.kind !== 'file') continue
      const cached = previewsRef.current.get(item.file)
      next.set(item.file, cached ?? URL.createObjectURL(item.file))
    }
    for (const [file, url] of previewsRef.current) {
      if (!next.has(file)) URL.revokeObjectURL(url)
    }
    previewsRef.current = next
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preview URLs must follow the items prop; render cannot create them (impure)
    setPreviews(next)
  }, [items])

  function addFiles(files: FileList | File[]): void {
    const list = Array.from(files)
    if (list.length === 0) return
    onChange([...items, ...list.map((file): GalleryItem => ({ kind: 'file', file }))])
  }

  function addUrl(): void {
    const url = urlDraft.trim()
    if (!url) return
    setUrlDraft('')
    onChange([...items, { kind: 'url', url }])
  }

  function removeAt(index: number): void {
    onChange(items.filter((_, i) => i !== index))
  }

  function move(index: number, dir: -1 | 1): void {
    const next = index + dir
    if (next < 0 || next >= items.length) return
    const copy = [...items]
    const [item] = copy.splice(index, 1)
    if (item) copy.splice(next, 0, item)
    onChange(copy)
  }

  function thumb(item: GalleryItem): string {
    if (item.kind === 'url') return item.url
    return previews.get(item.file) ?? ''
  }

  return (
    <div>
      <div
        className={dragActive ? 'dropzone active' : 'dropzone'}
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragActive(false)
          if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
        }}
      >
        <div>
          <span style={{ fontSize: 20 }}>＋ </span>
          Kéo thả hoặc{' '}
          <button type="button" className="link-btn" onClick={() => setShowUrl((s) => !s)}>
            thêm ảnh từ URL
          </button>
        </div>
        <div style={{ marginTop: 4 }}>
          <button type="button" className="link-btn" onClick={() => inputRef.current?.click()}>
            Tải ảnh từ thiết bị
          </button>
          <span style={{ marginLeft: 8 }}>
            {items.length}/{MAX_GALLERY_IMAGES}
          </span>
        </div>
      </div>

      {showUrl && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="Dán URL ảnh"
          />
          <button type="button" className="btn btn-default" onClick={addUrl}>
            Dùng URL
          </button>
        </div>
      )}

      {items.length > 0 && (
        <div className="gallery-grid">
          {items.map((item, i) => {
            const meta =
              item.kind === 'file'
                ? `${item.file.name} · ${formatSize(item.file.size)}`
                : item.url
            return (
            <div key={i} className="gallery-thumb">
              <img src={thumb(item)} alt="" />
              <div className="dz-meta" title={meta}>
                {meta}
              </div>
              <div className="gallery-actions">
                <button type="button" className="link-btn" onClick={() => move(i, -1)} disabled={i === 0}>
                  ←
                </button>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                >
                  →
                </button>
                <button type="button" className="link-btn" onClick={() => onPromoteCover(i)}>
                  Đặt làm cover
                </button>
                <button type="button" className="link-btn" onClick={() => removeAt(i)}>
                  Xóa
                </button>
              </div>
            </div>
            )
          })}
        </div>
      )}

      {error && <span className="error">{error}</span>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
