import { LayoutDashboard, FileText, Users, Clock, Loader2, AlertCircle, CheckCircle, Briefcase } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { jobsAPI, applicationsAPI } from '../../services/api'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalApplications: 0,
    pendingReview: 0,
    recentSubmissions: 0,
    shortlisted: 0,
    hired: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const [jobs, applications] = await Promise.all([
        jobsAPI.getAll(),
        applicationsAPI.getAll(),
      ])

      // ✅ Works now that GetAllApplications preloads Documents
      const pendingDocs = applications.filter(app =>
        app.documents?.some(doc => doc.status === 'pending')
      ).length

      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const recentSubs = applications.filter(app =>
        new Date(app.submitted_at) > oneWeekAgo
      ).length

      const shortlisted = applications.filter(app => app.status === 'shortlisted').length
      const hired = applications.filter(app => app.status === 'hired').length

      setStats({
        totalJobs: jobs.length,
        totalApplications: applications.length,
        pendingReview: pendingDocs,
        recentSubmissions: recentSubs,
        shortlisted,
        hired,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <AlertCircle className="h-5 w-5" />
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats Cards — Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-md">
              <FileText className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total Jobs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalJobs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-md">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total Applications</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalApplications}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-md">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Pending Doc Review</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingReview}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-md">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats.recentSubmissions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards — Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-md">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Shortlisted</p>
              <p className="text-2xl font-bold text-gray-900">{stats.shortlisted}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-md">
              <Briefcase className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Hired</p>
              <p className="text-2xl font-bold text-gray-900">{stats.hired}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/admin/jobs"
            className="flex flex-col sm:flex-row items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-primary-600 mb-2 sm:mb-0 sm:mr-3" />
            <div className="text-center sm:text-left">
              <p className="font-medium text-gray-900">Manage Jobs</p>
              <p className="text-sm text-gray-500">Create, edit, or archive job postings</p>
            </div>
          </Link>
          <Link
            to="/admin/applications"
            className="flex flex-col sm:flex-row items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="h-8 w-8 text-green-600 mb-2 sm:mb-0 sm:mr-3" />
            <div className="text-center sm:text-left">
              <p className="font-medium text-gray-900">Review Applications</p>
              <p className="text-sm text-gray-500">View and verify applicant submissions</p>
            </div>
          </Link>
          <Link
            to="/"
            className="flex flex-col sm:flex-row items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <LayoutDashboard className="h-8 w-8 text-purple-600 mb-2 sm:mb-0 sm:mr-3" />
            <div className="text-center sm:text-left">
              <p className="font-medium text-gray-900">View Portal</p>
              <p className="text-sm text-gray-500">See the public job listing page</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}