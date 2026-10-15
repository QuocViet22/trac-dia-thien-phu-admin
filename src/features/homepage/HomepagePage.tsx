import { useEffect, useState } from 'react'
import { listCollections } from './collections.api'
import EntitySectionEditor from './EntitySectionEditor'
import HomepagePreview from './HomepagePreview'
import type { PreviewSectionData } from './HomepagePreview'
import ImageSectionEditor from './ImageSectionEditor'
import { HOMEPAGE_SECTIONS } from './homepageTypes'
import type { Collection, CollectionType } from './homepageTypes'

export default function HomepagePage() {
  const [selectedType, setSelectedType] = useState<CollectionType>('HERO_SLIDER_COLLECTION')
  const [items, setItems] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nonce, setNonce] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewSectionData[]>([])

  const section = HOMEPAGE_SECTIONS.find((s) => s.type === selectedType) ?? HOMEPAGE_SECTIONS[0]

  useEffect(() => {
    let cancelled = false
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

  async function openPreview(): Promise<void> {
    setPreviewOpen(true)
    setPreviewLoading(true)
    try {
      const all = await Promise.all(
        HOMEPAGE_SECTIONS.map(async (s) => ({
          section: s,
          items: s.type === selectedType ? items : await listCollections(s.type),
        })),
      )
      setPreviewData(all)
    } catch {
      setPreviewData(
        HOMEPAGE_SECTIONS.map((s) => ({
          section: s,
          items: s.type === selectedType ? items : [],
        })),
      )
    } finally {
      setPreviewLoading(false)
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Trang chủ</h1>
        <span>
          {items.length}/{section.max}
        </span>
        <button type="button" className="btn btn-default" onClick={() => void openPreview()}>
          Xem trước
        </button>
      </div>

      <div className="card">
        <div className="filterbar">
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value as CollectionType)
              setLoading(true)
              setError('')
            }}
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
          <ImageSectionEditor
            key={section.type}
            collectionType={section.type}
            max={section.max}
            items={items}
            onChanged={() => setNonce((n) => n + 1)}
          />
        ) : (
          <EntitySectionEditor
            key={section.type}
            collectionType={section.type}
            max={section.max}
            items={items}
            onChanged={() => setNonce((n) => n + 1)}
          />
        )}
      </div>
      {previewOpen && (
        <HomepagePreview
          data={previewData}
          loading={previewLoading}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  )
}
