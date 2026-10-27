import { lazy, Suspense } from 'react'
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router'
import AdminShell from './components/AdminShell.tsx'
import RequireAuth from './features/auth/RequireAuth.tsx'

const ProductList = lazy(() => import('./features/products/ProductList.tsx'))
const ProductForm = lazy(() => import('./features/products/ProductForm.tsx'))
const CategoryList = lazy(() => import('./features/categories/CategoryList.tsx'))
const CategoryForm = lazy(() => import('./features/categories/CategoryForm.tsx'))
const NewsList = lazy(() => import('./features/news/NewsList.tsx'))
const NewsForm = lazy(() => import('./features/news/NewsForm.tsx'))
const HomepagePage = lazy(() => import('./features/homepage/HomepagePage.tsx'))
const CustomerList = lazy(() => import('./features/customers/CustomerList.tsx'))
const LoginPage = lazy(() => import('./features/auth/LoginPage.tsx'))
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage.tsx'))
const ResetPasswordPage = lazy(() => import('./features/auth/ResetPasswordPage.tsx'))

function Placeholder({ name }: { name: string }) {
  return <div className="empty">{name} — sắp có</div>
}

function lazyPage(element: React.ReactNode) {
  return <Suspense fallback={<div className="loading">Đang tải…</div>}>{element}</Suspense>
}

const router = createBrowserRouter([
  { path: '/login', element: lazyPage(<LoginPage />) },
  { path: '/forgot-password', element: lazyPage(<ForgotPasswordPage />) },
  { path: '/reset-password', element: lazyPage(<ResetPasswordPage />) },
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        element: <AdminShell />,
        children: [
      { index: true, element: <Navigate to="/products" replace /> },
      { path: 'products', element: <Suspense fallback={<div className="loading">Đang tải…</div>}><ProductList /></Suspense> },
      { path: 'products/new', element: <Suspense fallback={<div className="loading">Đang tải…</div>}><ProductForm /></Suspense> },
      { path: 'products/:id', element: <Suspense fallback={<div className="loading">Đang tải…</div>}><ProductForm /></Suspense> },
      { path: 'categories', element: <Suspense fallback={<div className="loading">Đang tải…</div>}><CategoryList /></Suspense> },
      { path: 'categories/new', element: <Suspense fallback={<div className="loading">Đang tải…</div>}><CategoryForm /></Suspense> },
      { path: 'categories/:id', element: <Suspense fallback={<div className="loading">Đang tải…</div>}><CategoryForm /></Suspense> },
      { path: 'news', element: <Suspense fallback={<div className="loading">Đang tải…</div>}><NewsList /></Suspense> },
      { path: 'news/new', element: <Suspense fallback={<div className="loading">Đang tải…</div>}><NewsForm /></Suspense> },
      { path: 'news/:id', element: <Suspense fallback={<div className="loading">Đang tải…</div>}><NewsForm /></Suspense> },
      { path: 'homepage', element: <Suspense fallback={<div className="loading">Đang tải…</div>}><HomepagePage /></Suspense> },
      { path: 'khach-hang', element: <Suspense fallback={<div className="loading">Đang tải…</div>}><CustomerList /></Suspense> },
      // { path: 'accounts', element: <Suspense fallback={<div className="loading">Đang tải…</div>}><AccountList /></Suspense> },
      // { path: 'accounts/new', element: <Suspense fallback={<div className="loading">Đang tải…</div>}><AccountForm /></Suspense> },
      // { path: 'accounts/:id', element: <Suspense fallback={<div className="loading">Đang tải…</div>}><AccountForm /></Suspense> },
      { path: '*', element: <Placeholder name="Không tìm thấy trang" /> },
        ],
      },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
