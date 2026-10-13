import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertCircle, BarChart3, Briefcase, CheckCircle, Clock, Loader2, XCircle } from 'lucide-react'
import { reportsAPI, ReportSummary, ApplicationsPerJobReport, RejectionRatesReport, TimeToHireReport } from '../../services/api'

export default function ReportsPage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [applicationsPerJob, setApplicationsPerJob] = useState<ApplicationsPerJobReport[]>([])
  const [rejectionRates, setRejectionRates] = useState<RejectionRatesReport | null>(null)
  const [timeToHire, setTimeToHire] = useState<TimeToHireReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const [summaryData, perJobData, rejectionData, timeData] = await Promise.all([
        reportsAPI.summary(),
        reportsAPI.applicationsPerJob(),
        reportsAPI.rejectionRates(),
        reportsAPI.timeToHire(),
      ])
      setSummary(summaryData)
      setApplicationsPerJob(perJobData ?? [])
      setRejectionRates(rejectionData)
      setTimeToHire(timeData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <span className="ml-2 text-gray-600">Loading reports...</span>
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

  // ✅ Safe fallbacks — backend returns null instead of [] when no data
  const hires = timeToHire?.hires ?? []
  const byJob = rejectionRates?.by_job ?? []

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <MetricCard
          icon={<Clock className="h-6 w-6 text-primary-600" />}
          label="Avg. Time to Hire"
          value={`${timeToHire?.average_days_to_hire ?? 0} days`}
          tone="bg-primary-100"
        />
        <MetricCard
          icon={<CheckCircle className="h-6 w-6 text-blue-600" />}
          label="Shortlisted"
          value={summary?.shortlisted ?? 0}
          tone="bg-blue-100"
        />
        <MetricCard
          icon={<Briefcase className="h-6 w-6 text-green-600" />}
          label="Hired"
          value={summary?.hired ?? 0}
          tone="bg-green-100"
        />
        <MetricCard
          icon={<XCircle className="h-6 w-6 text-red-600" />}
          label="Rejection Rate"
          value={`${rejectionRates?.overall_rejection_rate ?? summary?.rejection_rate ?? 0}%`}
          tone="bg-red-100"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Applications per Job */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 sm:p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary-600" />
              Applications per Job
            </h2>
          </div>
          <div className="table-responsive">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Applications</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applicationsPerJob.length > 0 ? applicationsPerJob.map(row => (
                  <tr key={row.job_id}>
                    <td className="px-4 sm:px-6 py-3 text-sm font-medium text-gray-900">{row.job_title}</td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-gray-500">{row.department}</td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-gray-900 text-right">{row.applications}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="px-4 sm:px-6 py-8 text-center text-sm text-gray-500">
                      No data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rejection Rates by Job */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 sm:p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Rejection Rates by Job</h2>
          </div>
          <div className="table-responsive">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job</th>
                  <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rejected</th>
                  <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {byJob.length > 0 ? byJob.map(row => (
                  <tr key={row.job_id}>
                    <td className="px-4 sm:px-6 py-3 text-sm font-medium text-gray-900">{row.job_title}</td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-gray-900 text-right">{row.rejected} / {row.applications}</td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-gray-900 text-right">{row.rejection_rate}%</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="px-4 sm:px-6 py-8 text-center text-sm text-gray-500">
                      No data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Time to Hire */}
      <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Recent Hires and Time to Hire</h2>
        </div>
        <div className="table-responsive">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hired</th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {hires.length > 0 ? hires.map(row => (
                <tr key={row.application_id}>
                  <td className="px-4 sm:px-6 py-3 text-sm font-medium text-gray-900">{row.applicant_name}</td>
                  <td className="px-4 sm:px-6 py-3 text-sm text-gray-500">{row.job_title}</td>
                  <td className="px-4 sm:px-6 py-3 text-sm text-gray-500">{new Date(row.hired_at).toLocaleDateString()}</td>
                  <td className="px-4 sm:px-6 py-3 text-sm text-gray-900 text-right">{row.days_to_hire}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-4 sm:px-6 py-8 text-center text-sm text-gray-500">
                    No hired applications yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string | number; tone: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <div className="flex items-center">
        <div className={`p-2 rounded-md ${tone}`}>{icon}</div>
        <div className="ml-4">
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  )
}