import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'

const TITLES: Record<string, string> = {
  '/products': 'Sản phẩm',
  '/categories': 'Danh mục',
  '/news': 'Tin tức',
}

function titleFor(pathname: string): string {
  if (pathname.startsWith('/products')) return 'Sản phẩm'
  if (pathname.startsWith('/categories')) return 'Danh mục'
  if (pathname.startsWith('/news')) return 'Tin tức'
  return TITLES[pathname] ?? 'Quản trị'
}

export default function AdminShell() {
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()

  return (
    <div className="shell">
      <aside className={collapsed ? 'sidebar collapsed' : 'sidebar'}>
        <div className="brand">{collapsed ? 'TP' : 'Thiên Phú Admin'}</div>
        <nav>
          <NavLink to="/products">Sản phẩm</NavLink>
          <NavLink to="/categories">Danh mục</NavLink>
          <NavLink to="/news">Tin tức</NavLink>
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button type="button" onClick={() => setCollapsed((c) => !c)} aria-label="Thu gọn menu">
            ☰
          </button>
          <h2>{titleFor(pathname)}</h2>
        </header>
        <main className="canvas">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
