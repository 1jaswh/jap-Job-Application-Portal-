import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Briefcase, MapPin, Clock, Calendar, Loader2, AlertCircle, XCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { jobsAPI, Job } from '../../services/api'

function isExpired(deadline: string): boolean {
  return new Date(deadline) < new Date()
}

function isJobOpen(job: Job): boolean {
  return job.status === 'open' && !isExpired(job.deadline)
}

export default function JobDetailPage() {
  const { id } = useParams()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchJob = async () => {
      if (!id) return
      try {
        const data = await jobsAPI.getById(Number(id))
        setJob(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load job')
      } finally {
        setLoading(false)
      }
    }
    fetchJob()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5" />
          <p>{error || 'Job not found'}</p>
        </div>
      </div>
    )
  }

  const open = isJobOpen(job)
  const expired = isExpired(job.deadline)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Link>

        {/* Closed / Expired banner */}
        {!open && (
          <div className={`mb-6 flex items-center gap-3 p-4 rounded-lg border ${
            expired
              ? 'bg-orange-50 border-orange-200 text-orange-800'
              : 'bg-gray-50 border-gray-200 text-gray-700'
          }`}>
            <XCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">
                {expired ? 'This position has expired!' : 'This position is closed'}
              </p>
              <p className="text-sm mt-0.5">
                {expired
                  ? `The deadline was ${new Date(job.deadline).toLocaleDateString()}. Applications are no longer accepted!`
                  : 'This job is no longer accepting applications.'}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                open
                  ? 'bg-green-100 text-green-800'
                  : expired
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {open ? 'Open' : expired ? 'Expired' : 'Closed'}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Briefcase className="h-4 w-4" />
                {job.department}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {job.location}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Posted: {new Date(job.created_at).toLocaleDateString()}
              </span>
              <span className={`flex items-center gap-1 ${!open ? 'text-red-500 font-medium' : ''}`}>
                <Clock className="h-4 w-4" />
                Deadline: {new Date(job.deadline).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="prose max-w-none mb-8">
            <h2 className="text-xl font-semibold mb-3">Job Description</h2>
            <div className="text-gray-700 whitespace-pre-line">{job.description}</div>
          </div>

          {job.requirements && job.requirements.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Requirements</h2>
              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                {job.requirements
                  .sort((a, b) => a.order - b.order)
                  .map((req) => (
                    <li key={req.id}>
                      <span className="font-medium">{req.label}</span>
                      {req.required && <span className="text-red-500 ml-1">*</span>}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <div className="border-t pt-6">
            {open ? (
              // Show apply button only when job is open
              <Link
                to={`/jobs/${id}/apply`}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Apply Now
              </Link>
            ) : (
              // Show disabled state for closed jobs
              <div className="flex items-center gap-4">
                <button
                  disabled
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-400 cursor-not-allowed"
                >
                  Applications Closed
                </button>
                <Link to="/" className="text-sm text-primary-600 hover:text-primary-700">
                  View other openings →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}