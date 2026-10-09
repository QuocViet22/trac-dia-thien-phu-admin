import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import RichText from '../../components/RichText.tsx'
import { apiFetch } from '../../lib/api'
import type { Category, Product } from '../../lib/types'
import { createProduct, getProduct, updateProduct } from './products.api'
import ImageDropzone from '../categories/ImageDropzone.tsx'
import GalleryManager from '../categories/GalleryManager.tsx'
import { resolveGalleryError, validateImageFile } from '../categories/imageUpload'
import type { CoverValue, GalleryItem } from '../categories/imageUpload'
import { deleteUpload, uploadFile } from '../categories/uploads.api'
import {
  formErrorForApi,
  isNotFoundError,
  toProductPayload,
  validateProduct,
} from './productFields'
import type { ProductFormValues } from './productFields'

const UNITS = ['Cái', 'Chiếc', 'Bộ', 'Hộp', 'Kg', 'Lít']

const EMPTY: ProductFormValues = {
  name: '',
  categoryId: '',
  skuCode: '',
  barcode: '',
  measurementUnit: '',
  description: '',
  seoPageTitle: '',
  seoDescriptionTag: '',
  seoAlias: '',
  images: [],
}

function fromProduct(p: Product, clearSlug: boolean): ProductFormValues {
  return {
    name: p.name,
    categoryId: p.categoryId ?? '',
    skuCode: p.skuCode ?? '',
    barcode: p.barcode ?? '',
    measurementUnit: p.measurementUnit ?? '',
    description: p.description ?? '',
    seoPageTitle: p.seoPageTitle ?? '',
    seoDescriptionTag: p.seoDescriptionTag ?? '',
    seoAlias: clearSlug ? '' : (p.seoAlias ?? ''),
    images: [...p.images]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((img) => ({ imageUrl: img.imageUrl }))
      .filter((r) => r.imageUrl.trim().length > 0),
  }
}

function coverOf(rows: { imageUrl: string }[]): CoverValue {
  const first = rows[0]
  return first ? { kind: 'url', url: first.imageUrl } : null
}

function galleryOf(rows: { imageUrl: string }[]): GalleryItem[] {
  return rows.slice(1).map((r): GalleryItem => ({ kind: 'url', url: r.imageUrl }))
}

export default function ProductForm() {
  const { id } = useParams()
  const isCreate = id === undefined
  const navigate = useNavigate()
  const location = useLocation()
  const clone = (location.state as { clone?: Product } | null)?.clone

  const [categories, setCategories] = useState<Category[]>([])
  const [values, setValues] = useState<ProductFormValues>(() =>
    clone ? fromProduct(clone, true) : EMPTY,
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formMessage, setFormMessage] = useState('')
  const [loading, setLoading] = useState(!isCreate && !clone)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [nonce, setNonce] = useState(0)
  const [cover, setCover] = useState<CoverValue>(() => coverOf(values.images))
  const [coverError, setCoverError] = useState('')
  const [gallery, setGallery] = useState<GalleryItem[]>(() => galleryOf(values.images))
  const [galleryError, setGalleryError] = useState('')

  useEffect(() => {
    apiFetch<Category[]>('/api/categories')
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    if (isCreate || clone) return
    getProduct(id ?? '')
      .then((p) => {
        const v = fromProduct(p, false)
        setValues(v)
        setCover(coverOf(v.images))
        setGallery(galleryOf(v.images))
      })
      .catch((e: unknown) => {
        if (isNotFoundError(e)) setNotFound(true)
        else setLoadError(e instanceof Error ? e.message : 'Request failed')
      })
      .finally(() => setLoading(false))
  }, [isCreate, clone, id, nonce])

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]): void {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function onCoverChange(next: CoverValue): void {
    setCover(next)
    setCoverError('')
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
    } else {
      setCover(item)
      setGallery((g) => g.filter((_, i) => i !== index))
    }
    setCoverError('')
    setGalleryError('')
  }

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    const fieldErrors = validateProduct(values)
    setErrors(fieldErrors)
    setFormMessage('')
    const galleryErr = resolveGalleryError(gallery)
    if (galleryErr) setGalleryError(galleryErr)
    if (Object.keys(fieldErrors).length > 0 || galleryErr) return

    let coverUrl = cover?.kind === 'url' ? cover.url : ''
    const galleryUrls: string[] = gallery.map((g) => (g.kind === 'url' ? g.url : ''))
    const uploadedKeys: string[] = []
    setSaving(true)
    if (cover?.kind === 'file') {
      const fileError = validateImageFile(cover.file)
      if (fileError) {
        setCoverError(fileError)
        setSaving(false)
        return
      }
    }
    if (cover?.kind === 'file' || gallery.some((g) => g.kind === 'file')) {
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
            const orphans: string[] = []
            for (const key of uploadedKeys) {
              try {
                await deleteUpload(key)
              } catch {
                orphans.push(key)
              }
            }
            setGalleryError(
              `Ảnh ${i + 1}: ${message}${orphans.length > 0 ? ` (Ảnh đã tải lên chưa được xóa: ${orphans.join(', ')})` : ''}`,
            )
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
      const payload = toProductPayload({ ...values, images: urls.map((imageUrl) => ({ imageUrl })) })
      if (isCreate) {
        await createProduct(payload)
      } else {
        await updateProduct(id ?? '', payload)
      }
      navigate('/products')
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

  if (notFound) return <div className="fetch-error">Không tìm thấy sản phẩm</div>
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

  const field = (key: string, label: string, control: React.ReactNode, hint?: string) => (
    <div className="field">
      <label>{label}</label>
      {control}
      {hint && !errors[key] && <span className="hint">{hint}</span>}
      {errors[key] && <span className="error">{errors[key]}</span>}
    </div>
  )

  return (
    <div>
      <div className="page-head">
        <h1>{isCreate ? 'Thêm sản phẩm mới' : 'Sửa sản phẩm'}</h1>
      </div>

      <form onSubmit={(e) => void onSubmit(e)}>
        <div className="form-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <h2>Thông tin chung</h2>
              {field(
                'name',
                'Tên sản phẩm *',
                <input
                  type="text"
                  value={values.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Nhập tên sản phẩm"
                />,
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {field(
                  'skuCode',
                  'Mã SKU',
                  <input
                    type="text"
                    value={values.skuCode}
                    onChange={(e) => set('skuCode', e.target.value)}
                    placeholder="Để trống nếu chưa có"
                  />,
                )}
                {field(
                  'barcode',
                  'Mã vạch / Barcode',
                  <input
                    type="text"
                    value={values.barcode}
                    onChange={(e) => set('barcode', e.target.value)}
                  />,
                )}
              </div>
              {field(
                'measurementUnit',
                'Đơn vị tính',
                <select
                  value={values.measurementUnit}
                  onChange={(e) => set('measurementUnit', e.target.value)}
                >
                  <option value="">— Chọn —</option>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>,
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
                'Tiêu đề trang',
                <input
                  type="text"
                  value={values.seoPageTitle}
                  onChange={(e) => set('seoPageTitle', e.target.value)}
                />,
              )}
              {field(
                'seoDescriptionTag',
                'Thẻ mô tả',
                <textarea
                  value={values.seoDescriptionTag}
                  onChange={(e) => set('seoDescriptionTag', e.target.value)}
                />,
              )}
              {field(
                'seoAlias',
                'Đường dẫn (slug)',
                <input
                  type="text"
                  value={values.seoAlias}
                  onChange={(e) => set('seoAlias', e.target.value)}
                  placeholder="duong-dan-san-pham"
                />,
              )}
            </div>
          </div>

          <div className="rail">
            <div className="card">
              <h2>Danh mục *</h2>
              {categories.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  <span className="badge warning">Chưa có danh mục</span>
                  <span className="hint">Hãy tạo danh mục trước khi thêm sản phẩm.</span>
                  <Link to="/categories/new" className="btn btn-default">
                    Tạo danh mục mới
                  </Link>
                </div>
              ) : (
                field(
                  'categoryId',
                  '',
                  <select value={values.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                    <option value="">— Chọn danh mục —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>,
                )
              )}
              {errors.categoryId && categories.length > 0 && (
                <span className="error">{errors.categoryId}</span>
              )}
            </div>
            <div className="card">
              <h2>Ảnh chính</h2>
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
          <Link to="/products" className="btn btn-default">
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
