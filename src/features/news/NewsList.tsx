import { useMemo, useState } from 'react'
import { MOCK_NEWS } from './mockNews'
import type { MockNews } from './mockNews'
import { filterNews, tabCounts } from './newsFilters'
import type { NewsTab } from './newsFilters'

const SIZES = [10, 20, 50]

const TABS: { key: NewsTab; label: string }[] = [
  { key: 'all', label: 'Tất cả bài viết' },
  { key: 'published', label: 'Đã đăng' },
  { key: 'pinned', label: 'Ghim nổi bật' },
  { key: 'draft', label: 'Bản nháp' },
]

const STATUS_LABEL: Record<MockNews['status'], string> = {
  published: 'Đã đăng',
  pinned: 'Ghim',
  draft: 'Nháp',
}

const STATUS_CLASS: Record<MockNews['status'], string> = {
  published: 'badge success',
  pinned: 'badge warning',
  draft: 'badge',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('vi-VN')
}

export default function NewsList() {
  const [tab, setTab] = useState<NewsTab>('all')
  const [query, setQuery] = useState('')
  const [author, setAuthor] = useState('')
  const [time, setTime] = useState<'' | '7d' | '30d'>('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(SIZES[0])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [viewing, setViewing] = useState<MockNews | null>(null)

  const counts = useMemo(() => tabCounts(MOCK_NEWS), [])
  const authors = useMemo(() => [...new Set(MOCK_NEWS.map((n) => n.author))], [])

  const filtered = useMemo(
    () => filterNews(MOCK_NEWS, { tab, query, author, time }),
    [tab, query, author, time],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / size))
  const safePage = Math.min(page, totalPages - 1)
  const visible = filtered.slice(safePage * size, safePage * size + size)

  function resetPage(): void {
    setPage(0)
  }

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div>
      <div className="page-head">
        <h1>Danh sách bài viết</h1>
      </div>

      <div className="card">
        <div className="filterbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={tab === t.key ? 'btn btn-primary' : 'btn btn-default'}
              onClick={() => {
                setTab(t.key)
                resetPage()
              }}
            >
              {t.label} {counts[t.key]}
            </button>
          ))}
        </div>
        <div className="filterbar">
          <input
            type="text"
            placeholder="Tìm kiếm theo tiêu đề"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              resetPage()
            }}
            style={{ maxWidth: 280 }}
          />
          <select
            value={author}
            onChange={(e) => {
              setAuthor(e.target.value)
              resetPage()
            }}
            style={{ maxWidth: 220 }}
          >
            <option value="">Tác giả: Tất cả</option>
            {authors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            value={time}
            onChange={(e) => {
              setTime(e.target.value as '' | '7d' | '30d')
              resetPage()
            }}
            style={{ maxWidth: 180 }}
          >
            <option value="">Thời gian: Mọi lúc</option>
            <option value="7d">7 ngày qua</option>
            <option value="30d">30 ngày qua</option>
          </select>
        </div>

        {visible.length === 0 ? (
          <div className="empty">Không có bài viết nào</div>
        ) : (
          <table className="grid">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả"
                    checked={visible.length > 0 && selected.size === visible.length}
                    onChange={() =>
                      setSelected(
                        selected.size === visible.length
                          ? new Set()
                          : new Set(visible.map((n) => n.id)),
                      )
                    }
                  />
                </th>
                <th>Ảnh</th>
                <th>Tiêu đề bài viết</th>
                <th>Tác giả</th>
                <th>Thẻ (tags)</th>
                <th>Ngày đăng</th>
                <th>Lượt xem</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((n) => (
                <tr key={n.id} className={selected.has(n.id) ? 'selected' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(n.id)}
                      onChange={() => toggle(n.id)}
                    />
                  </td>
                  <td>{n.coverUrl ? <img src={n.coverUrl} alt="" className="thumb" /> : '—'}</td>
                  <td>{n.title}</td>
                  <td>{n.author}</td>
                  <td>
                    <span className="tags">
                      {n.tags.map((t) => (
                        <span key={t} className="badge">
                          {t}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td>{formatDate(n.publishedAt)}</td>
                  <td className="num">{n.views.toLocaleString('vi-VN')}</td>
                  <td>
                    <span className={STATUS_CLASS[n.status]}>{STATUS_LABEL[n.status]}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Xem"
                      onClick={() => setViewing(n)}
                    >
                      👁
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
              resetPage()
            }}
          >
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
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

      {viewing && (
        <div className="modal-backdrop" onClick={() => setViewing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{viewing.title}</h2>
            <p>
              {viewing.author} · {formatDate(viewing.publishedAt)} ·{' '}
              {viewing.views.toLocaleString('vi-VN')} lượt xem
            </p>
            <p style={{ marginTop: 8 }}>
              <span className={STATUS_CLASS[viewing.status]}>{STATUS_LABEL[viewing.status]}</span>
            </p>
            <div className="actions">
              <button type="button" className="btn btn-default" onClick={() => setViewing(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
