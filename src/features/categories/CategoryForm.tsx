import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import RichText from '../../components/RichText.tsx'
import type { Category } from '../../lib/types'
import { formErrorForApi, isNotFoundError } from '../products/productFields'
import { createCategory, getCategory, listCategories, updateCategory } from './categories.api'
import { toCategoryPayloadFromUrls, validateCategory } from './categoryFields'
import type { CategoryFormValues } from './categoryFields'
import ImageDropzone from './ImageDropzone.tsx'
import GalleryManager from './GalleryManager.tsx'
import { resolveGalleryError, validateImageFile } from './imageUpload'
import type { CoverValue, GalleryItem } from './imageUpload'
import { deleteUpload, uploadFile } from './uploads.api'

const EMPTY: CategoryFormValues = {
  name: '',
  description: '',
  seoPageTitle: '',
  seoDescription: '',
  seoAlias: '',
  parentCategoryId: '',
  imageUrl: '',
}

function fromCategory(c: Category): CategoryFormValues {
  return {
    name: c.name,
    description: c.description ?? '',
    seoPageTitle: c.seoPageTitle ?? '',
    seoDescription: c.seoDescription ?? '',
    seoAlias: c.seoAlias ?? '',
    parentCategoryId: c.parentCategoryId ?? '',
    imageUrl: c.images[0]?.imageUrl ?? '',
  }
}

export default function CategoryForm() {
  const { id } = useParams()
  const isCreate = id === undefined
  const navigate = useNavigate()

  const [parents, setParents] = useState<Category[]>([])
  const [values, setValues] = useState<CategoryFormValues>(EMPTY)
  const [cover, setCover] = useState<CoverValue>(null)
  const [coverError, setCoverError] = useState('')
  const [gallery, setGallery] = useState<GalleryItem[]>([])
  const [galleryError, setGalleryError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formMessage, setFormMessage] = useState('')
  const [loading, setLoading] = useState(!isCreate)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    listCategories()
      .then(setParents)
      .catch(() => setParents([]))
  }, [])

  useEffect(() => {
    if (isCreate) return
    getCategory(id ?? '')
      .then((c) => {
        const v = fromCategory(c)
        setValues(v)
        setCover(v.imageUrl ? { kind: 'url', url: v.imageUrl } : null)
        setGallery(c.images.slice(1).map((img): GalleryItem => ({ kind: 'url', url: img.imageUrl })))
      })
      .catch((e: unknown) => {
        if (isNotFoundError(e)) setNotFound(true)
        else setLoadError(e instanceof Error ? e.message : 'Request failed')
      })
      .finally(() => setLoading(false))
  }, [isCreate, id, nonce])

  function set<K extends keyof CategoryFormValues>(key: K, value: CategoryFormValues[K]): void {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function onCoverChange(next: CoverValue): void {
    setCover(next)
    setCoverError('')
    set('imageUrl', next?.kind === 'url' ? next.url : '')
  }

  function onGalleryChange(next: GalleryItem[]): void {
    setGallery(next)
    setGalleryError('')
  }

  function onPromoteCover(index: number): void {
    const item = gallery[index]
    if (!item) return
    if (cover) {
      setCover(item)
      setGallery((g) => g.map((gItem, i) => (i === index ? cover : gItem)))
      set('imageUrl', item.kind === 'url' ? item.url : '')
    } else {
      setCover(item)
      setGallery((g) => g.filter((_, i) => i !== index))
      set('imageUrl', item.kind === 'url' ? item.url : '')
    }
    setCoverError('')
    setGalleryError('')
  }

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    const fieldErrors = validateCategory(values)
    if (!isCreate && values.parentCategoryId === id) {
      fieldErrors.parentCategoryId = 'Danh mục cha không thể là chính nó'
    }
    setErrors(fieldErrors)
    setFormMessage('')
    const galleryErr = resolveGalleryError(gallery)
    if (galleryErr) setGalleryError(galleryErr)
    if (Object.keys(fieldErrors).length > 0 || galleryErr) return

    let coverUrl = cover?.kind === 'url' ? cover.url : ''
    const galleryUrls: string[] = gallery.map((g) => (g.kind === 'url' ? g.url : ''))
    const uploadedKeys: string[] = []
    setSaving(true)
    const needsUpload = cover?.kind === 'file' || gallery.some((g) => g.kind === 'file')
    if (needsUpload) {
      if (cover?.kind === 'file') {
        const fileError = validateImageFile(cover.file)
        if (fileError) {
          setCoverError(fileError)
          setSaving(false)
          return
        }
      }
      setUploading(true)
      if (cover?.kind === 'file') {
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
      }
      for (let i = 0; i < gallery.length; i++) {
        const g = gallery[i]
        if (g?.kind === 'file') {
          try {
            const uploaded = await uploadFile(g.file)
            galleryUrls[i] = uploaded.url
            uploadedKeys.push(uploaded.key)
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Tải ảnh thất bại'
            setGalleryError(`Ảnh ${i + 1}: ${message}`)
            setUploading(false)
            setSaving(false)
            return
          }
        }
      }
      setUploading(false)
    }

    try {
      const urls = [...(coverUrl ? [coverUrl] : []), ...galleryUrls.filter((u) => u)]
      const payload = toCategoryPayloadFromUrls(values, urls)
      if (isCreate) {
        await createCategory(payload)
      } else {
        await updateCategory(id ?? '', payload)
      }
      navigate('/categories')
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

  if (notFound) return <div className="fetch-error">Không tìm thấy danh mục</div>
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

  const options = isCreate ? parents : parents.filter((p) => p.id !== id)

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
        <h1>{isCreate ? 'Thêm mới danh mục sản phẩm' : 'Sửa danh mục sản phẩm'}</h1>
      </div>

      <form onSubmit={(e) => void onSubmit(e)}>
        <div className="form-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <h2>Thông tin chung</h2>
              {field(
                'name',
                'Tên danh mục *',
                <input
                  type="text"
                  value={values.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Nhập tên danh mục"
                />,
              )}
              {field(
                'description',
                'Mô tả chi tiết',
                <RichText initialValue={values.description} onChange={(html) => set('description', html)} />,
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
                'seoDescription',
                'Mô tả SEO',
                <textarea
                  value={values.seoDescription}
                  onChange={(e) => set('seoDescription', e.target.value)}
                />,
              )}
              {field(
                'seoAlias',
                'Đường dẫn (slug)',
                <input
                  type="text"
                  value={values.seoAlias}
                  onChange={(e) => set('seoAlias', e.target.value)}
                  placeholder="duong-dan-danh-muc"
                />,
              )}
            </div>
          </div>

          <div className="rail">
            <div className="card">
              <h2>Phân cấp danh mục</h2>
              {field(
                'parentCategoryId',
                'Danh mục cha',
                <select
                  value={values.parentCategoryId}
                  onChange={(e) => set('parentCategoryId', e.target.value)}
                >
                  <option value="">Không có (danh mục gốc)</option>
                  {options.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>,
              )}
            </div>
            <div className="card">
              <h2>Ảnh danh mục</h2>
              <ImageDropzone value={cover} onChange={onCoverChange} error={coverError} />
            </div>
            <div className="card">
              <h2>Thư viện ảnh</h2>
              <GalleryManager
                items={gallery}
                onChange={onGalleryChange}
                onPromoteCover={onPromoteCover}
                error={galleryError}
              />
            </div>
          </div>
        </div>

        {formMessage && <div className="fetch-error">{formMessage}</div>}

        <div className="sticky-footer">
          <Link to="/categories" className="btn btn-default">
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
