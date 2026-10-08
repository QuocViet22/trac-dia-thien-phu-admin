import { lazy, Suspense } from 'react'
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router'
import AdminShell from './components/AdminShell.tsx'

const ProductList = lazy(() => import('./features/products/ProductList.tsx'))
const ProductForm = lazy(() => import('./features/products/ProductForm.tsx'))

function Placeholder({ name }: { name: string }) {
  return <div className="empty">{name} — sắp có</div>
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AdminShell />,
    children: [
      { index: true, element: <Navigate to="/products" replace /> },
      { path: 'products', element: <Suspense fallback={<div className="loading">Đang tải…</div>}><ProductList /></Suspense> },
      { path: 'products/new', element: <Suspense fallback={<div className="loading">Đang tải…</div>}><ProductForm /></Suspense> },
      { path: 'products/:id', element: <Suspense fallback={<div className="loading">Đang tải…</div>}><ProductForm /></Suspense> },
      { path: 'categories', element: <Placeholder name="Danh sách danh mục" /> },
      { path: 'categories/new', element: <Placeholder name="Thêm danh mục" /> },
      { path: 'categories/:id', element: <Placeholder name="Sửa danh mục" /> },
      { path: 'news', element: <Placeholder name="Danh sách bài viết" /> },
      { path: '*', element: <Placeholder name="Không tìm thấy trang" /> },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
