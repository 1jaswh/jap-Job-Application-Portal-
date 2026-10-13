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
      <div className="bg-primary-600 text-white py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
            Find Your Dream Job with us in Uganda
          </h1>
          <p className="text-base sm:text-xl text-primary-100 leading-relaxed">
            Browse the latest job openings and start your career today
          </p>
        </div>
      </div>

      {/* Job Listings */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            <span className="ml-2 text-gray-600">Loading jobs...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Open Positions */}
            <div className="mb-8 sm:mb-12">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Open Positions
                  <span className="ml-2 text-sm font-normal text-gray-500">({openJobs.length})</span>
                </h2>
              </div>

              {openJobs.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg shadow-md">
                  <p className="text-gray-500">No open positions available at the moment.</p>
                </div>
              )}

              <div className="space-y-4">
                {openJobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">{job.title}</h3>
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 whitespace-nowrap flex-shrink-0">
                            Open
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 sm:gap-4 text-sm text-gray-500 mb-3">
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{job.department}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{job.location}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4 flex-shrink-0" />
                            <span className="whitespace-nowrap">Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
                          </span>
                        </div>
                        <p className="text-gray-600 line-clamp-2">{job.description}</p>
                      </div>
                      <Link
                        to={`/jobs/${job.id}`}
                        className="flex items-center text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap sm:ml-4 mt-2 sm:mt-0"
                      >
                        View Details
                        <ChevronRight className="h-5 w-5 ml-1 flex-shrink-0" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Closed / Expired Positions */}
            {closedJobs.length > 0 && (
              <div>
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
                        className="bg-white rounded-lg shadow-md p-4 sm:p-6 opacity-60"
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-700 truncate">{job.title}</h3>
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${
                                expired ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'
                              }`}>
                                <XCircle className="h-3 w-3" />
                                {expired ? 'Expired' : 'Closed'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-3 sm:gap-4 text-sm text-gray-400 mb-3">
                              <span className="flex items-center gap-1">
                                <Briefcase className="h-4 w-4 flex-shrink-0" />
                                {job.department}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4 flex-shrink-0" />
                                {job.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4 flex-shrink-0" />
                                Deadline: {new Date(job.deadline).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-gray-400 line-clamp-2">{job.description}</p>
                          </div>
                          {/* Link to closed page instead of detail page */}
                          <Link
                            to={`/jobs/${job.id}`}
                            className="flex items-center text-gray-400 font-medium text-sm whitespace-nowrap sm:ml-4 mt-2 sm:mt-0"
                          >
                            View Details
                            <ChevronRight className="h-5 w-5 ml-1 flex-shrink-0" />
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}