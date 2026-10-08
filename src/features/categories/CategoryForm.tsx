import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import RichText from '../../components/RichText.tsx'
import type { Category } from '../../lib/types'
import { formErrorForApi } from '../products/productFields'
import { createCategory, getCategory, listCategories, updateCategory } from './categories.api'
import { toCategoryPayload, validateCategory } from './categoryFields'
import type { CategoryFormValues } from './categoryFields'

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
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formMessage, setFormMessage] = useState('')
  const [loading, setLoading] = useState(!isCreate)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listCategories()
      .then(setParents)
      .catch(() => setParents([]))
  }, [])

  useEffect(() => {
    if (isCreate) return
    getCategory(id ?? '')
      .then((c) => setValues(fromCategory(c)))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [isCreate, id])

  function set<K extends keyof CategoryFormValues>(key: K, value: CategoryFormValues[K]): void {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    const fieldErrors = validateCategory(values)
    if (!isCreate && values.parentCategoryId === id) {
      fieldErrors.parentCategoryId = 'Danh mục cha không thể là chính nó'
    }
    setErrors(fieldErrors)
    setFormMessage('')
    if (Object.keys(fieldErrors).length > 0) return
    setSaving(true)
    try {
      if (isCreate) {
        await createCategory(toCategoryPayload(values))
      } else {
        await updateCategory(id ?? '', toCategoryPayload(values))
      }
      navigate('/categories')
    } catch (err: unknown) {
      const mapped = formErrorForApi(err)
      if (mapped.field) setErrors((prev) => ({ ...prev, [mapped.field as string]: mapped.message }))
      else setFormMessage(mapped.message)
    } finally {
      setSaving(false)
    }
  }

  if (notFound) return <div className="fetch-error">Không tìm thấy danh mục</div>
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
              {values.imageUrl && <img src={values.imageUrl} alt="" className="thumb" />}
              {field(
                'imageUrl',
                'URL ảnh',
                <input
                  type="url"
                  value={values.imageUrl}
                  onChange={(e) => set('imageUrl', e.target.value)}
                  placeholder="Dán URL ảnh"
                />,
              )}
            </div>
          </div>
        </div>

        {formMessage && <div className="fetch-error">{formMessage}</div>}

        <div className="sticky-footer">
          <Link to="/categories" className="btn btn-default">
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
