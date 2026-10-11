import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import ImageDropzone from '../../components/ImageDropzone.tsx'
import HtmlPreview from '../../components/HtmlPreview.tsx'
import type { HtmlFileData } from '../../components/HtmlFile.ts'
import { htmlFileOrNull } from '../../components/HtmlFile.ts'
import { formErrorForApi, isNotFoundError } from '../../lib/formErrors'
import type { CoverValue } from '../../lib/imageUpload'
import { validateImageFile } from '../../lib/imageUpload'
import { deleteUpload, uploadFile } from '../../lib/uploads.api'
import type { NewsDetail } from '../../lib/types'
import { createNews, getNews, updateNews } from './news.api'
import { toNewsPayload, validateNews } from './newsFields'
import type { NewsFormValues } from './newsFields'

const EMPTY: NewsFormValues = {
  title: '',
  author: '',
  status: '',
  newsType: 'NEWS',
  seoPageTitle: '',
  seoDescriptionTag: '',
  seoAlias: '',
  description: '',
  imageUrl: '',
}

function fromDetail(d: NewsDetail): NewsFormValues {
  return {
    title: d.title,
    author: d.author,
    status: d.status,
    newsType: d.newsType,
    seoPageTitle: d.seoPageTitle ?? '',
    seoDescriptionTag: d.seoDescriptionTag ?? '',
    seoAlias: d.seoAlias,
    description: d.description ?? '',
    imageUrl: d.images[0]?.imageUrl ?? '',
  }
}

export default function NewsForm() {
  const { id } = useParams()
  const isCreate = id === undefined
  const navigate = useNavigate()

  const [values, setValues] = useState<NewsFormValues>(EMPTY)
  const [cover, setCover] = useState<CoverValue>(null)
  const [coverError, setCoverError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formMessage, setFormMessage] = useState('')
  const [loading, setLoading] = useState(!isCreate)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [nonce, setNonce] = useState(0)
  const [richTextData, setRichTextData] = useState<HtmlFileData | null>(null)

  useEffect(() => {
    if (isCreate) return
    getNews(id ?? '')
      .then((d) => {
        const v = fromDetail(d)
        setValues(v)
        setRichTextData(htmlFileOrNull(v.description))
        setCover(v.imageUrl ? { kind: 'url', url: v.imageUrl } : null)
      })
      .catch((e: unknown) => {
        if (isNotFoundError(e)) setNotFound(true)
        else setLoadError(e instanceof Error ? e.message : 'Request failed')
      })
      .finally(() => setLoading(false))
  }, [isCreate, id, nonce])

  function set<K extends keyof NewsFormValues>(key: K, value: NewsFormValues[K]): void {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function onCoverChange(next: CoverValue): void {
    setCover(next)
    setCoverError('')
    set('imageUrl', next?.kind === 'url' ? next.url : '')
  }

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    const fieldErrors = validateNews(values)
    setErrors(fieldErrors)
    setFormMessage('')
    if (Object.keys(fieldErrors).length > 0) return

    let coverUrl = cover?.kind === 'url' ? cover.url : ''
    const uploadedKeys: string[] = []
    setSaving(true)
    if (cover?.kind === 'file') {
      const fileError = validateImageFile(cover.file)
      if (fileError) {
        setCoverError(fileError)
        setSaving(false)
        return
      }
      setUploading(true)
      try {
        const uploaded = await uploadFile(cover.file)
        coverUrl = uploaded.url
        uploadedKeys.push(uploaded.key)
      } catch (err: unknown) {
        setCoverError(err instanceof Error ? err.message : 'Tải ảnh thất bại')
        setUploading(false)
        setSaving(false)
        return
      }
      setUploading(false)
    }

    try {
      const payload = toNewsPayload({
        ...values,
        description: richTextData?.html ?? values.description,
        imageUrl: coverUrl,
      })
      if (isCreate) {
        await createNews(payload)
      } else {
        await updateNews(id ?? '', payload)
      }
      navigate('/news')
    } catch (err: unknown) {
      const orphans: string[] = []
      for (const key of uploadedKeys) {
        try {
          await deleteUpload(key)
        } catch {
          orphans.push(key)
        }
      }
      const mapped = formErrorForApi(err)
      if (mapped.field) setErrors((prev) => ({ ...prev, [mapped.field as string]: mapped.message }))
      else setFormMessage(mapped.message)
      if (orphans.length > 0) {
        const orphanNote = `(Ảnh đã tải lên chưa được xóa: ${orphans.join(', ')})`
        setFormMessage((prev) => (prev ? `${prev} ${orphanNote}` : orphanNote))
      }
    } finally {
      setSaving(false)
    }
  }

  if (notFound) return <div className="fetch-error">Không tìm thấy bài viết</div>
  if (loadError)
    return (
      <div className="fetch-error">
        <p>{loadError}</p>
        <button
          type="button"
          className="btn btn-default"
          onClick={() => {
            setLoading(true)
            setLoadError('')
            setNonce((n) => n + 1)
          }}
        >
          Thử lại
        </button>
      </div>
    )
  if (loading) return <div className="loading">Đang tải…</div>

  const field = (key: string, label: string, control: React.ReactNode) => (
    <div className="field">
      <label>{label}</label>
      {control}
      {errors[key] && <span className="error">{errors[key]}</span>}
    </div>
  )

  return (
    <div>
      <div className="page-head">
        <h1>{isCreate ? 'Thêm bài viết mới' : 'Sửa bài viết'}</h1>
      </div>

      <form onSubmit={(e) => void onSubmit(e)}>
        <div className="form-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <h2>Thông tin chung</h2>
              {field(
                'title',
                'Tiêu đề *',
                <input
                  type="text"
                  value={values.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="Nhập tiêu đề bài viết"
                />,
              )}
              {field(
                'author',
                'Tác giả *',
                <input
                  type="text"
                  value={values.author}
                  onChange={(e) => set('author', e.target.value)}
                  placeholder="Nhập tên tác giả"
                />,
              )}
              {field(
                'status',
                'Trạng thái *',
                <select value={values.status} onChange={(e) => set('status', e.target.value as NewsFormValues['status'])}>
                  <option value="">Chọn trạng thái</option>
                  <option value="PUBLISHED">Đã đăng</option>
                  <option value="DRAFT">Nháp</option>
                </select>,
              )}
              {field(
                'newsType',
                'Loại tin *',
                <select value={values.newsType} onChange={(e) => set('newsType', e.target.value as NewsFormValues['newsType'])}>
                  <option value="">Chọn loại tin</option>
                  <option value="NEWS">Tin tức</option>
                  <option value="HIRING_PRODUCT">Thuê sản phẩm</option>
                </select>,
              )}
              {field(
                'description',
                'Mô tả chi tiết',
                <HtmlPreview
                  key={`${id ?? 'new'}-${nonce}`}
                  initialValue={richTextData}
                  onLoad={setRichTextData}
                  onClear={() => {
                    setRichTextData(null)
                    set('description', '')
                  }}
                />,
              )}
            </div>

            <div className="card">
              <h2>Tối ưu SEO</h2>
              {field(
                'seoPageTitle',
                'Tiêu đề trang (SEO)',
                <input
                  type="text"
                  value={values.seoPageTitle}
                  onChange={(e) => set('seoPageTitle', e.target.value)}
                />,
              )}
              {field(
                'seoDescriptionTag',
                'Thẻ mô tả (SEO)',
                <textarea
                  value={values.seoDescriptionTag}
                  onChange={(e) => set('seoDescriptionTag', e.target.value)}
                />,
              )}
              {field(
                'seoAlias',
                'Đường dẫn (slug) *',
                <input
                  type="text"
                  value={values.seoAlias}
                  onChange={(e) => set('seoAlias', e.target.value)}
                  placeholder="duong-dan-bai-viet"
                />,
              )}
            </div>
          </div>

          <div className="rail">
            <div className="card">
              <h2>Ảnh bìa</h2>
              <ImageDropzone value={cover} onChange={onCoverChange} error={coverError} />
            </div>
          </div>
        </div>

        {formMessage && <div className="fetch-error">{formMessage}</div>}

        <div className="sticky-footer">
          <Link to="/news" className="btn btn-default">
            Hủy
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? (uploading ? 'Đang tải ảnh…' : 'Đang lưu…') : '✓ Lưu'}
          </button>
        </div>
      </form>
    </div>
  )
}
