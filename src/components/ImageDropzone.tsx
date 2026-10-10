import { useEffect, useRef, useState } from 'react'
import type { CoverValue } from '../lib/imageUpload'

interface Props {
  value: CoverValue
  onChange: (value: CoverValue) => void
  error?: string
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export default function ImageDropzone({ value, onChange, error }: Props) {
  const [dragActive, setDragActive] = useState(false)
  const [showUrl, setShowUrl] = useState(value?.kind === 'url')
  const [urlDraft, setUrlDraft] = useState(value?.kind === 'url' ? value.url : '')
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    }
  }, [])

  // Sync the preview with file-kind values arriving via props (e.g. a
  // gallery image promoted to cover). Object URLs are external resources,
  // so creating them here keeps render pure.
  useEffect(() => {
    const next = value?.kind === 'file' ? URL.createObjectURL(value.file) : null
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = next
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preview URL must follow the value prop; render cannot create it (impure)
    setPreview(next)
  }, [value])

  function pickFile(file: File): void {
    setShowUrl(false)
    onChange({ kind: 'file', file })
  }

  function clear(): void {
    setUrlDraft('')
    onChange(null)
  }

  function applyUrl(): void {
    const url = urlDraft.trim()
    if (!url) return
    onChange({ kind: 'url', url })
  }

  const urlValue = value?.kind === 'url' ? value.url : null
  const fileValue = value?.kind === 'file' ? value.file : null

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
          const file = e.dataTransfer.files?.[0]
          if (file) pickFile(file)
        }}
      >
        {preview || urlValue ? (
          <div className="dz-preview">
            <img src={preview ?? urlValue ?? ''} alt="" />
            <div className="dz-meta">
              {fileValue ? `${fileValue.name} · ${formatSize(fileValue.size)}` : urlValue}
            </div>
            <button type="button" className="btn btn-default" onClick={clear}>
              Xóa ảnh
            </button>
          </div>
        ) : (
          <div>
            <div>
              <span style={{ fontSize: 20 }}>＋ </span>
              Kéo thả hoặc{' '}
              <button
                type="button"
                className="link-btn"
                onClick={() => setShowUrl((s) => !s)}
              >
                thêm ảnh từ URL
              </button>
            </div>
            <div style={{ marginTop: 4 }}>
              <button type="button" className="link-btn" onClick={() => inputRef.current?.click()}>
                Tải ảnh từ thiết bị
              </button>
            </div>
          </div>
        )}
      </div>

      {showUrl && !preview && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="Dán URL ảnh"
          />
          <button type="button" className="btn btn-default" onClick={applyUrl}>
            Dùng URL
          </button>
        </div>
      )}

      {error && <span className="error">{error}</span>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) pickFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
