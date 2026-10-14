import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { clearSession, loadSession } from '../lib/authSession'
import { logout } from '../features/auth/auth.api'

const TITLES: Record<string, string> = {
  '/products': 'Sản phẩm',
  '/categories': 'Danh mục',
  '/news': 'Tin tức',
  '/homepage': 'Trang chủ',
  // '/accounts': 'Tài khoản',
}

function titleFor(pathname: string): string {
  if (pathname.startsWith('/products')) return 'Sản phẩm'
  if (pathname.startsWith('/categories')) return 'Danh mục'
  if (pathname.startsWith('/news')) return 'Tin tức'
  if (pathname.startsWith('/homepage')) return 'Trang chủ'
  // if (pathname.startsWith('/accounts')) return 'Tài khoản'
  return TITLES[pathname] ?? 'Quản trị'
}

export default function AdminShell() {
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const session = loadSession()

  async function onLogout(): Promise<void> {
    const refreshToken = loadSession()?.refreshToken
    if (refreshToken) {
      try {
        await logout(refreshToken)
      } catch {
        // best-effort: still clear the local session below
      }
    }
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <div className="shell">
      <aside className={collapsed ? 'sidebar collapsed' : 'sidebar'}>
        <div className="brand">{collapsed ? 'TP' : 'Thiên Phú Admin'}</div>
        <nav>
          <NavLink to="/products">Sản phẩm</NavLink>
          <NavLink to="/categories">Danh mục</NavLink>
          <NavLink to="/news">Tin tức</NavLink>
          <NavLink to="/homepage">Trang chủ</NavLink>
          {/* <NavLink to="/accounts">Tài khoản</NavLink> */}
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button type="button" onClick={() => setCollapsed((c) => !c)} aria-label="Thu gọn menu">
            ☰
          </button>
          <h2>{titleFor(pathname)}</h2>
          <span className="topbar-spacer" />
          {session && <span className="topbar-user">{session.username}</span>}
          <button type="button" className="btn btn-default" onClick={() => void onLogout()}>
            Đăng xuất
          </button>
        </header>
        <main className="canvas">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
