import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth()

  // session check চলছে — spinner দেখাও
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading…</p>
      </div>
    )
  }

  // user login করে না — login page এ পাঠাও
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // user login করেছে, কিন্তু role allowed না — Access Denied
  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-md max-w-md text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            Your role (<strong>{role}</strong>) doesn't have permission to view
            this page.
          </p>
        </div>
      </div>
    )
  }

  // সব ঠিক — children render করো
  return children
}
