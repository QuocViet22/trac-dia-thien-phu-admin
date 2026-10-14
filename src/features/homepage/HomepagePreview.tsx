import type { Collection, HomepageSection } from './homepageTypes'

export interface PreviewSectionData {
  section: HomepageSection
  items: Collection[]
}

interface Props {
  data: PreviewSectionData[]
  loading: boolean
  onClose: () => void
}

function sorted(items: Collection[]): Collection[] {
  return [...items].sort((a, b) => a.orderIndex - b.orderIndex)
}

export default function HomepagePreview({ data, loading, onClose }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 720, maxHeight: '80vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Xem truoc</h2>
        {loading ? (
          <div className="loading">Đang tải…</div>
        ) : (
          data.map(({ section, items }) => {
            const rows = sorted(items)
            return (
              <div key={section.type} className="card" style={{ marginTop: 12 }}>
                <h2>
                  {section.label} ({rows.length}/{section.max})
                </h2>
                {rows.length === 0 ? (
                  <div className="empty">Chưa có mục nào</div>
                ) : section.mode === 'image' ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {rows.map((row) => (
                      <div key={row.id} style={{ width: 120, textAlign: 'center' }}>
                        {row.images[0] ? (
                          <img
                            src={row.images[0].imageUrl}
                            alt=""
                            className="thumb"
                            style={{ width: '100%', height: 72, objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="empty">Không ảnh</div>
                        )}
                        <div>{row.name}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul>
                    {rows.map((row) => (
                      <li key={row.id}>{row.name}</li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })
        )}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="button" className="btn btn-default" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
