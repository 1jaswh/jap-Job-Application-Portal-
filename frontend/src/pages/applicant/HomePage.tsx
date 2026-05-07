import { Link } from 'react-router-dom'
import { Briefcase, MapPin, Clock, ChevronRight, Loader2, AlertCircle, XCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { jobsAPI, Job } from '../../services/api'

// Check if a job is past its deadline
function isExpired(deadline: string): boolean {
  return new Date(deadline) < new Date()
}

function isJobOpen(job: Job): boolean {
  return job.status === 'open' && !isExpired(job.deadline)
}

export default function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        // Fetch all jobs so we can show closed/expired ones too
        const data = await jobsAPI.getAll()
        setJobs(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load jobs')
      } finally {
        setLoading(false)
      }
    }
    fetchJobs()
  }, [])

  const openJobs = jobs.filter(isJobOpen)
  const closedJobs = jobs.filter(j => !isJobOpen(j))

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-primary-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">Find Your Dream Job with us in Uganda</h1>
          <p className="text-xl text-primary-100">
            Browse the latest job openings and start your career today
          </p>
        </div>
      </div>

      {/* Job Listings */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

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

        {!loading && !error && (
          <>
            {/* Open Positions */}
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Open Positions
              <span className="ml-2 text-sm font-normal text-gray-500">({openJobs.length})</span>
            </h2>

            {openJobs.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg shadow-md mb-8">
                <p className="text-gray-500">No open positions available at the moment.</p>
              </div>
            )}

            <div className="space-y-4 mb-12">
              {openJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Open
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {job.department}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Deadline: {new Date(job.deadline).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-600 line-clamp-2">{job.description}</p>
                    </div>
                    <Link
                      to={`/jobs/${job.id}`}
                      className="ml-4 flex items-center text-primary-600 hover:text-primary-700 font-medium"
                    >
                      View Details
                      <ChevronRight className="h-5 w-5 ml-1" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Closed / Expired Positions */}
            {closedJobs.length > 0 && (
              <>
                <h2 className="text-xl font-bold text-gray-500 mb-4">
                  Closed Positions
                  <span className="ml-2 text-sm font-normal">({closedJobs.length})</span>
                </h2>
                <div className="space-y-4">
                  {closedJobs.map((job) => {
                    const expired = isExpired(job.deadline)
                    return (
                      <div
                        key={job.id}
                        className="bg-white rounded-lg shadow-md p-6 opacity-60"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-700">{job.title}</h3>
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full flex items-center gap-1 ${
                                expired ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'
                              }`}>
                                <XCircle className="h-3 w-3" />
                                {expired ? 'Expired' : 'Closed'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-3">
                              <span className="flex items-center gap-1">
                                <Briefcase className="h-4 w-4" />
                                {job.department}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {job.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Deadline: {new Date(job.deadline).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-gray-400 line-clamp-2">{job.description}</p>
                          </div>
                          {/* Link to closed page instead of detail page */}
                          <Link
                            to={`/jobs/${job.id}`}
                            className="ml-4 flex items-center text-gray-400 font-medium text-sm"
                          >
                            View Details
                            <ChevronRight className="h-5 w-5 ml-1" />
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}