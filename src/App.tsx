import { Navigate, RouterProvider, createBrowserRouter } from 'react-router'
import AdminShell from './components/AdminShell.tsx'

function Placeholder({ name }: { name: string }) {
  return <div className="empty">{name} — sắp có</div>
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AdminShell />,
    children: [
      { index: true, element: <Navigate to="/products" replace /> },
      { path: 'products', element: <Placeholder name="Danh sách sản phẩm" /> },
      { path: 'products/new', element: <Placeholder name="Thêm sản phẩm" /> },
      { path: 'products/:id', element: <Placeholder name="Sửa sản phẩm" /> },
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
