import { Navigate, Outlet } from 'react-router'
import { loadSession } from '../../lib/authSession'

export default function RequireAuth() {
  if (!loadSession()?.accessToken) return <Navigate to="/login" replace />
  return <Outlet />
}
