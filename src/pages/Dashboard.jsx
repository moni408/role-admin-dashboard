import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()

  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPosition, setFilterPosition] = useState('all')
  const [sortOrder, setSortOrder] = useState('newest')

  useEffect(() => {
  if (!role) return

  const fetchApplications = async () => {
    const table = role === 'viewer' ? 'applications_redacted' : 'applications'

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setApplications(data || [])
    }
    setLoading(false)
  }

  fetchApplications()
}, [role])

  const filteredApplications = applications
  .filter((app) => {
    const search = searchTerm.toLowerCase()
    const matchesSearch =
      app.name.toLowerCase().includes(search) ||
      app.email.toLowerCase().includes(search) ||
      (app.position && app.position.toLowerCase().includes(search))

    const matchesPosition =
      filterPosition === 'all' || app.position === filterPosition

    return matchesSearch && matchesPosition
  })
  .sort((a, b) => {
    if (sortOrder === 'name') {
      return a.name.localeCompare(b.name)
    }
    const dateA = new Date(a.created_at)
    const dateB = new Date(b.created_at)
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
  })
  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Applications Dashboard
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Logged in as <strong>{user?.email}</strong> ·{' '}
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  role === 'admin'
                    ? 'bg-red-100 text-red-700'
                    : role === 'judge'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {role}
              </span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
          >
            Logout
          </button>
        </div>

        {/* Role-specific notice */}
        {role === 'viewer' && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg mb-4 text-sm">
            🔒 You are viewing <strong>redacted data</strong>. Email and phone
            are partially hidden for your role.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Filter Bar */}
{!loading && applications.length > 0 && (
  <div className="bg-white rounded-2xl shadow-md p-4 mb-4 flex flex-wrap gap-3 items-center">
    {/* Search */}
    <input
      type="text"
      placeholder="Search by name, email, or position…"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
    />

    {/* Position filter */}
    <select
      value={filterPosition}
      onChange={(e) => setFilterPosition(e.target.value)}
      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
    >
      <option value="all">All positions</option>
      <option value="Frontend Developer">Frontend Developer</option>
      <option value="Backend Developer">Backend Developer</option>
      <option value="UI/UX Designer">UI/UX Designer</option>
    </select>

    {/* Sort */}
    <select
      value={sortOrder}
      onChange={(e) => setSortOrder(e.target.value)}
      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
    >
      <option value="newest">Newest first</option>
      <option value="oldest">Oldest first</option>
      <option value="name">Name (A–Z)</option>
    </select>
  </div>
)}

        {/* Applications Table */}
        {loading ? (
          <p className="text-gray-600">Loading applications…</p>
        ) : filteredApplications.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <p className="text-gray-500">
              {applications.length === 0
                ? 'No applications found.'
                : 'No applications match your search.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                    Name
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                    Email
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                    Position
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => (
                  <tr key={app.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800">{app.name}</td>
                    <td
                      className={`px-4 py-3 ${
                        role === 'viewer'
                          ? 'text-gray-400 italic'
                          : 'text-gray-800'
                      }`}
                    >
                      {app.email}
                    </td>
                    <td
                      className={`px-4 py-3 ${
                        role === 'viewer'
                          ? 'text-gray-400 italic'
                          : 'text-gray-800'
                      }`}
                    >
                      {app.phone || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-800">
                      {app.position}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}