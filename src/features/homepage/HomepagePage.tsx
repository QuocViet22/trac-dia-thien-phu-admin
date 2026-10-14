import { useEffect, useState } from 'react'
import { listCollections } from './collections.api'
import { HOMEPAGE_SECTIONS } from './homepageTypes'
import type { Collection, CollectionType } from './homepageTypes'

export default function HomepagePage() {
  const [selectedType, setSelectedType] = useState<CollectionType>('HERO_SLIDER_COLLECTION')
  const [items, setItems] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nonce, setNonce] = useState(0)

  const section = HOMEPAGE_SECTIONS.find((s) => s.type === selectedType) ?? HOMEPAGE_SECTIONS[0]

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    listCollections(selectedType)
      .then((res) => {
        if (cancelled) return
        setItems(res)
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
  }, [selectedType, nonce])

  if (!section) return <div className="empty">Không có chuyên mục nào</div>

  return (
    <div>
      <div className="page-head">
        <h1>Trang chủ</h1>
        <span>
          {items.length}/{section.max}
        </span>
      </div>

      <div className="card">
        <div className="filterbar">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as CollectionType)}
          >
            {HOMEPAGE_SECTIONS.map((s) => (
              <option key={s.type} value={s.type}>
                {s.label}
              </option>
            ))}
          </select>
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
        ) : section.mode === 'image' ? (
          <div className="empty">Trình chỉnh sửa ảnh — sắp có (Tasks 4)</div>
        ) : (
          <div className="empty">Trình chọn thực thể — sắp có (Tasks 5)</div>
        )}
      </div>
    </div>
  )
}
