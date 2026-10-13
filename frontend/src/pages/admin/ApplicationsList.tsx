import { Link } from 'react-router-dom'
import { Search, Loader2, AlertCircle, X, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { applicationsAPI, jobsAPI, Application, Job } from '../../services/api'

const statusColors: Record<string, string> = {
  applied:     'bg-blue-100 text-blue-800',
  shortlisted: 'bg-yellow-100 text-yellow-800',
  interview:   'bg-purple-100 text-purple-800',
  hired:       'bg-green-100 text-green-800',
  rejected:    'bg-red-100 text-red-800',
}

export default function ApplicationsList() {
  const [applications, setApplications] = useState<Application[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [jobFilter, setJobFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchData()
  }, [jobFilter, statusFilter])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [appsData, jobsData] = await Promise.all([
        applicationsAPI.getAll({
          job_id: jobFilter ? Number(jobFilter) : undefined,
          status: statusFilter || undefined,
        }),
        jobsAPI.getAll(),
      ])
      setApplications(appsData ?? [])
      setJobs(jobsData ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  //  Client-side search + date filtering (runs on already-fetched data)
  const filtered = useMemo(() => {
    return applications.filter(app => {
      // Search — matches name or email
      if (search.trim()) {
        const q = search.toLowerCase()
        const name = app.applicant?.full_name?.toLowerCase() ?? ''
        const email = app.applicant?.email?.toLowerCase() ?? ''
        if (!name.includes(q) && !email.includes(q)) return false
      }

      // Date from
      if (dateFrom) {
        if (new Date(app.submitted_at) < new Date(dateFrom)) return false
      }

      // Date to
      if (dateTo) {
        if (new Date(app.submitted_at) > new Date(dateTo + 'T23:59:59')) return false
      }

      return true
    })
  }, [applications, search, dateFrom, dateTo])

  const hasActiveFilters = search || jobFilter || statusFilter || dateFrom || dateTo

  const clearFilters = () => {
    setSearch('')
    setJobFilter('')
    setStatusFilter('')
    setDateFrom('')
    setDateTo('')
  }

  // Render application card for mobile view
  const renderAppCard = (app: Application) => (
    <Link
      key={app.id}
      to={`/admin/applications/${app.id}`}
      className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{app.applicant?.full_name || 'N/A'}</p>
          <p className="text-sm text-gray-500 truncate">{app.applicant?.email || 'N/A'}</p>
        </div>
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[app.status] || 'bg-gray-100 text-gray-800'} flex-shrink-0`}>
          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-2 truncate">{app.job?.title || 'N/A'}</p>
      <div className="flex items-center justify-between pt-3 border-t">
        <p className="text-sm text-gray-500">{new Date(app.submitted_at).toLocaleDateString()}</p>
        <span className="text-primary-600 hover:text-primary-700 text-sm font-medium">View Details</span>
      </div>
    </Link>
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        {/* Filter Toggle Button (Mobile) */}
        <button
          className="lg:hidden flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary-100 text-primary-700">
              {(
                (search ? 1 : 0) +
                (jobFilter ? 1 : 0) +
                (statusFilter ? 1 : 0) +
                (dateFrom ? 1 : 0) +
                (dateTo ? 1 : 0)
              )}
            </span>
          )}
          {showFilters ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
        </button>

        {/* Filters Content */}
        <div className={`lg:block ${showFilters ? 'block' : 'hidden'} mt-4 lg:mt-0`}>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
                />
              </div>
            </div>

            {/* Job filter */}
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
            >
              <option value="">All Jobs</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
            >
              <option value="">All Statuses</option>
              <option value="applied">Applied</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="interview">Interview</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Date from */}
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
              title="From date"
            />

            {/* Date to */}
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
              title="To date"
            />

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>

          {/* Result count */}
          {!loading && (
            <p className="mt-3 text-sm text-gray-500">
              Showing <span className="font-medium text-gray-900">{filtered.length}</span> of{' '}
              <span className="font-medium text-gray-900">{applications.length}</span> applications
            </p>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-600">Loading applications...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500">
            {hasActiveFilters ? 'No applications match your filters.' : 'No applications found.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-2 text-sm text-primary-600 hover:text-primary-700"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Desktop Table View */}
      {!loading && !error && filtered.length > 0 && (
        <div className="hidden lg:block">
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applicant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {app.applicant?.full_name || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {app.applicant?.email || 'N/A'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {app.job?.title || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[app.status] || 'bg-gray-100 text-gray-800'}`}>
                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(app.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/admin/applications/${app.id}`}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile Card View */}
      {!loading && !error && filtered.length > 0 && (
        <div className="lg:hidden space-y-4">
          {filtered.map(renderAppCard)}
        </div>
      )}
    </div>
  )
}