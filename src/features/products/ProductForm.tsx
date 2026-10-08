import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import RichText from '../../components/RichText.tsx'
import { apiFetch } from '../../lib/api'
import type { Category, Product } from '../../lib/types'
import { createProduct, getProduct, updateProduct } from './products.api'
import {
  formErrorForApi,
  isNotFoundError,
  toProductPayload,
  validateProduct,
} from './productFields'
import type { ImageRow, ProductFormValues } from './productFields'

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
      .map((img, i) => ({ imageUrl: img.imageUrl, name: img.name ?? '', primary: i === 0 })),
  }
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
  const [nonce, setNonce] = useState(0)
  const [newImageUrl, setNewImageUrl] = useState('')

  useEffect(() => {
    apiFetch<Category[]>('/api/categories')
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    if (isCreate || clone) return
    getProduct(id ?? '')
      .then((p) => setValues(fromProduct(p, false)))
      .catch((e: unknown) => {
        if (isNotFoundError(e)) setNotFound(true)
        else setLoadError(e instanceof Error ? e.message : 'Request failed')
      })
      .finally(() => setLoading(false))
  }, [isCreate, clone, id, nonce])

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]): void {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function setImage(index: number, patch: Partial<ImageRow>): void {
    setValues((v) => ({
      ...v,
      images: v.images.map((img, i) => (i === index ? { ...img, ...patch } : img)),
    }))
  }

  function starImage(index: number): void {
    setValues((v) => ({
      ...v,
      images: v.images.map((img, i) => ({ ...img, primary: i === index })),
    }))
  }

  function moveImage(index: number, dir: -1 | 1): void {
    setValues((v) => {
      const images = [...v.images]
      const j = index + dir
      if (j < 0 || j >= images.length) return v
      ;[images[index], images[j]] = [images[j], images[index]]
      return { ...v, images }
    })
  }

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    const fieldErrors = validateProduct(values)
    setErrors(fieldErrors)
    setFormMessage('')
    if (Object.keys(fieldErrors).length > 0) return
    setSaving(true)
    try {
      if (isCreate) {
        await createProduct(toProductPayload(values))
      } else {
        await updateProduct(id ?? '', toProductPayload(values))
      }
      navigate('/products')
    } catch (err: unknown) {
      const mapped = formErrorForApi(err)
      if (mapped.field) setErrors((prev) => ({ ...prev, [mapped.field as string]: mapped.message }))
      else setFormMessage(mapped.message)
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

            <div className="card">
              <h2>Ảnh sản phẩm</h2>
              <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Dán URL ảnh rồi bấm Thêm"
                />
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => {
                    if (newImageUrl.trim()) {
                      set('images', [
                        ...values.images,
                        { imageUrl: newImageUrl.trim(), name: '', primary: values.images.length === 0 },
                      ])
                      setNewImageUrl('')
                    }
                  }}
                >
                  Thêm
                </button>
              </div>
              {values.images.map((img, i) => (
                <div key={`${img.imageUrl}-${i}`} className="image-row">
                  {img.imageUrl && <img src={img.imageUrl} alt="" />}
                  <div className="grow">
                    <input
                      type="url"
                      value={img.imageUrl}
                      onChange={(e) => setImage(i, { imageUrl: e.target.value })}
                      placeholder="URL ảnh"
                    />
                  </div>
                  <button
                    type="button"
                    className={`icon-btn${img.primary ? ' starred' : ''}`}
                    title="Đặt làm ảnh chính"
                    onClick={() => starImage(i)}
                  >
                    ★
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Lên"
                    onClick={() => moveImage(i, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Xuống"
                    onClick={() => moveImage(i, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    title="Xóa ảnh"
                    onClick={() => set('images', values.images.filter((_, j) => j !== i))}
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rail">
            <div className="card">
              <h2>Danh mục *</h2>
              {categories.length === 0 ? (
                <p className="hint" style={{ marginTop: 8 }}>
                  Chưa có danh mục nào — hãy tạo danh mục trước.
                </p>
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
          </div>
        </div>

        {formMessage && <div className="fetch-error">{formMessage}</div>}

        <div className="sticky-footer">
          <Link to="/products" className="btn btn-default">
            Hủy
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Đang lưu…' : '✓ Lưu'}
          </button>
        </div>
      </form>
    </div>
  )
}
