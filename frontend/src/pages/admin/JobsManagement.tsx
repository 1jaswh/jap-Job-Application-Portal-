import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, X, Loader2, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react'
import { jobsAPI, Job } from '../../services/api'

function isExpired(deadline: string): boolean {
  return new Date(deadline) < new Date()
}

export default function JobsManagement() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    description: '',
    location: 'Kampala',
    deadline: '',
    status: 'open' as 'open' | 'closed',
  })

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const data = await jobsAPI.getAll()
      setJobs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingJob(null)
    setFormData({
      title: '',
      department: '',
      description: '',
      location: 'Kampala',
      deadline: '',
      status: 'open',
    })
    setShowModal(true)
  }

  const handleEdit = (job: Job) => {
    setEditingJob(job)
    setFormData({
      title: job.title,
      department: job.department,
      description: job.description,
      location: job.location,
      deadline: job.deadline.split('T')[0],
      status: job.status as 'open' | 'closed',
    })
    setShowModal(true)
  }

  // ✅ Quick toggle open/closed
  const handleToggleStatus = async (job: Job) => {
    const newStatus = job.status === 'open' ? 'closed' : 'open'
    try {
      setTogglingId(job.id)
      await jobsAPI.updateStatus(job.id, newStatus)
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: newStatus } : j))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setTogglingId(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingJob) {
        const updated = await jobsAPI.update(editingJob.id, formData)
        setJobs(jobs.map(j => j.id === updated.id ? updated : j))
      } else {
        const created = await jobsAPI.create(formData)
        setJobs([...jobs, created])
      }
      setShowModal(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save job')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this job?')) return
    try {
      await jobsAPI.delete(id)
      setJobs(jobs.filter(j => j.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete job')
    }
  }

  const getStatusBadge = (job: Job) => {
    if (isExpired(job.deadline) && job.status === 'open') {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">Expired</span>
    }
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
        job.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
      }`}>
        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
      </span>
    )
  }

  // Render job card for mobile view
  const renderJobCard = (job: Job) => (
    <div key={job.id} className={`bg-white rounded-lg shadow p-4 ${isExpired(job.deadline) ? 'bg-orange-50' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
            {getStatusBadge(job)}
          </div>
          <p className="text-sm text-gray-500 mb-1">{job.department}</p>
          <p className="text-sm text-gray-500 mb-2">{job.location}</p>
          <p className={`text-sm ${isExpired(job.deadline) ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
            Deadline: {new Date(job.deadline).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-3 border-t">
        <button
          onClick={() => handleToggleStatus(job)}
          disabled={togglingId === job.id}
          title={job.status === 'open' ? 'Close job' : 'Reopen job'}
          className="text-gray-500 hover:text-gray-700 disabled:opacity-50 p-2"
        >
          {togglingId === job.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : job.status === 'open' ? (
            <ToggleRight className="h-5 w-5 text-green-600" />
          ) : (
            <ToggleLeft className="h-5 w-5 text-gray-400" />
          )}
        </button>
        <button
          onClick={() => handleEdit(job)}
          className="text-primary-600 hover:text-primary-900 p-2"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleDelete(job.id)}
          className="text-red-600 hover:text-red-900 p-2"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Job Management</h1>
        <button
          onClick={handleCreate}
          className="btn-responsive inline-flex items-center border border-transparent font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Job
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-600">Loading jobs...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500">No jobs created yet.</p>
        </div>
      )}

      {/* Desktop Table View */}
      {!loading && !error && jobs.length > 0 && (
        <div className="hidden lg:block">
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deadline</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map((job) => (
                  <tr key={job.id} className={isExpired(job.deadline) ? 'bg-orange-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {job.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(job)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={isExpired(job.deadline) ? 'text-orange-600 font-medium' : ''}>
                        {new Date(job.deadline).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        {/* ✅ Quick toggle open/closed */}
                        <button
                          onClick={() => handleToggleStatus(job)}
                          disabled={togglingId === job.id}
                          title={job.status === 'open' ? 'Close job' : 'Reopen job'}
                          className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                        >
                          {togglingId === job.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : job.status === 'open' ? (
                            <ToggleRight className="h-5 w-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(job)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile Card View */}
      {!loading && !error && jobs.length > 0 && (
        <div className="lg:hidden space-y-4">
          {jobs.map(renderJobCard)}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 sm:top-20 mx-auto p-4 sm:p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white modal-responsive">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingJob ? 'Edit Job' : 'Create Job'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                <input
                  type="text"
                  required
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.deadline}
                    onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'open' | 'closed' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-responsive px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-responsive px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  {editingJob ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}