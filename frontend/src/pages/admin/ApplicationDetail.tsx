import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, FileText, CheckCircle, XCircle, User, Mail, Phone, Loader2, AlertCircle, Download, Clock, Briefcase, ClipboardCheck } from 'lucide-react'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { applicationsAPI, Application, verificationAPI, onboardingAPI, Onboarding } from '../../services/api'

const statusColors: Record<string, string> = {
  pending:     'bg-yellow-100 text-yellow-800',
  verified:    'bg-green-100 text-green-800',
  rejected:    'bg-red-100 text-red-800',
  applied:     'bg-gray-100 text-gray-800',
  shortlisted: 'bg-blue-100 text-blue-800',
  interview:   'bg-purple-100 text-purple-800',
  hired:       'bg-green-100 text-green-800',
}

// Contextual next actions based on current status
const statusActions: Record<string, { label: string; value: string; color: string }[]> = {
  applied: [
    { label: 'Shortlist Applicant', value: 'shortlisted', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
    { label: 'Reject Application',  value: 'rejected',    color: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300' },
  ],
  shortlisted: [
    { label: 'Invite to Interview', value: 'interview',   color: 'bg-purple-600 hover:bg-purple-700 text-white' },
    { label: 'Reject Application',  value: 'rejected',    color: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300' },
  ],
  interview: [
    { label: 'Mark as Hired',      value: 'hired',       color: 'bg-green-600 hover:bg-green-700 text-white' },
    { label: 'Reject Application', value: 'rejected',    color: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300' },
  ],
  hired:     [],
  rejected:  [],
}

export default function ApplicationDetail() {
  const { id } = useParams()
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [verifyingDocId, setVerifyingDocId] = useState<number | null>(null)
  const [rejectingDocId, setRejectingDocId] = useState<number | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null)
  const [onboardingForm, setOnboardingForm] = useState({ department: '', start_date: '' })
  const [savingOnboarding, setSavingOnboarding] = useState(false)

  useEffect(() => {
    if (id) fetchApplication()
  }, [id])

  const fetchApplication = async () => {
    if (!id) return
    try {
      const data = await applicationsAPI.getById(Number(id))
      setApplication(data)
      if (data.status === 'hired') {
        if (data.onboarding) {
          setOnboarding(data.onboarding)
          setOnboardingForm({
            department: data.onboarding.department || '',
            start_date: data.onboarding.start_date ? data.onboarding.start_date.slice(0, 10) : '',
          })
        } else {
          await fetchOnboarding(data.id)
        }
      } else {
        setOnboarding(null)
        setOnboardingForm({ department: '', start_date: '' })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load application')
    } finally {
      setLoading(false)
    }
  }

  const fetchOnboarding = async (applicationId: number) => {
    try {
      const records = await onboardingAPI.getAll({ application_id: applicationId })
      const record = records[0] || null
      setOnboarding(record)
      setOnboardingForm({
        department: record?.department || '',
        start_date: record?.start_date ? record.start_date.slice(0, 10) : '',
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load onboarding')
    }
  }

  const handleVerify = async (docId: number) => {
    try {
      setVerifyingDocId(docId)
      const updated = await verificationAPI.verify(docId, notes[docId] || undefined)
      setApplication(prev => prev ? {
        ...prev,
        documents: prev.documents?.map(d => d.id === docId ? updated : d),
      } : null)
      toast.success('Document verified successfully')
      setNotes(prev => ({ ...prev, [docId]: '' }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to verify document')
    } finally {
      setVerifyingDocId(null)
    }
  }

  const handleReject = async (docId: number) => {
    if (!notes[docId]?.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }
    try {
      setRejectingDocId(docId)
      const updated = await verificationAPI.reject(docId, notes[docId])
      setApplication(prev => prev ? {
        ...prev,
        documents: prev.documents?.map(d => d.id === docId ? updated : d),
      } : null)
      toast.success('Document rejected')
      setNotes(prev => ({ ...prev, [docId]: '' }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject document')
    } finally {
      setRejectingDocId(null)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!id) return
    try {
      const updated = await applicationsAPI.updateStatus(Number(id), newStatus)
      setApplication(prev => prev ? { ...prev, ...updated, status: newStatus as any } : updated)
      if (newStatus === 'hired') {
        if (updated.onboarding) {
          setOnboarding(updated.onboarding)
          setOnboardingForm({
            department: updated.onboarding.department || '',
            start_date: updated.onboarding.start_date ? updated.onboarding.start_date.slice(0, 10) : '',
          })
        } else {
          await fetchOnboarding(Number(id))
        }
      } else {
        setOnboarding(null)
        setOnboardingForm({ department: '', start_date: '' })
      }
      toast.success('Application status updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  const handleOnboardingSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onboarding) return
    try {
      setSavingOnboarding(true)
      const updated = await onboardingAPI.update(onboarding.id, onboardingForm)
      setOnboarding(updated)
      setOnboardingForm({
        department: updated.department,
        start_date: updated.start_date ? updated.start_date.slice(0, 10) : '',
      })
      toast.success('Onboarding updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update onboarding')
    } finally {
      setSavingOnboarding(false)
    }
  }

  const handleTaskToggle = async (taskId: number, completed: boolean) => {
    if (!onboarding) return
    try {
      const updatedTask = await onboardingAPI.updateTask(onboarding.id, taskId, completed)
      setOnboarding(prev => prev ? {
        ...prev,
        tasks: prev.tasks?.map(task => task.id === taskId ? updatedTask : task),
      } : null)
      toast.success('Checklist updated')
      await fetchOnboarding(onboarding.application_id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update checklist')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5" />
          <p>{error || 'Application not found'}</p>
        </div>
      </div>
    )
  }

  const currentActions = statusActions[application.status] ?? []

  return (
    <div>
      <Link
        to="/admin/applications"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4 sm:mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Applications
      </Link>

      <div className="space-y-6 lg:grid lg:grid-cols-3 lg:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Applicant Info */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Applicant Information</h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium">{application.applicant?.full_name || 'N/A'}</span>
              </div>
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                <span className="text-gray-600">Email:</span>
                <span className="ml-2 font-medium">{application.applicant?.email || 'N/A'}</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                <span className="text-gray-600">Phone:</span>
                <span className="ml-2 font-medium">{application.applicant?.phone || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Submitted Responses */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Details</h2>
            {application.responses && application.responses.length > 0 ? (
              <div className="space-y-4">
                {application.responses.map((resp, idx) => (
                  <div key={resp.id || idx} className="p-3 bg-gray-50 rounded-lg">
                    <dt className="text-sm font-medium text-gray-500 mb-1">{resp.field_name}</dt>
                    <dd className="text-sm text-gray-900">{resp.field_value || 'N/A'}</dd>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No additional responses submitted.</p>
            )}
          </div>

          {/* Documents */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Documents</h2>
            {application.documents && application.documents.length > 0 ? (
              <div className="space-y-3">
                {application.documents.map((doc) => (
                  <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-3">
                    <div className="flex items-center flex-1 min-w-0">
                      <FileText className="h-8 w-8 text-gray-400 mr-3 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {doc.doc_type.replace(/_/g, ' ').toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {doc.file_name} · {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[doc.status] || 'bg-gray-100 text-gray-800'}`}>
                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                      </span>
                      <a
                        href={`http://localhost:8080/uploads/${doc.stored_name}`}
                        download={doc.file_name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 p-2"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No documents uploaded.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* Application Status */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Status</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Current Status</p>
                <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${statusColors[application.status] || 'bg-gray-100 text-gray-800'}`}>
                  {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Submitted</p>
                <p className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4 text-gray-400" />
                  {new Date(application.submitted_at).toLocaleString()}
                </p>
              </div>

              {/* Contextual status buttons */}
              {currentActions.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Next Step</p>
                  <div className="space-y-2">
                    {currentActions.map(action => (
                      <button
                        key={action.value}
                        onClick={() => handleStatusUpdate(action.value)}
                        className={`w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md ${action.color}`}
                      >
                        {action.value === 'rejected'
                          ? <XCircle className="h-4 w-4 mr-2" />
                          : <CheckCircle className="h-4 w-4 mr-2" />}
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Terminal states */}
              {application.status === 'hired' && (
                <div className="p-3 bg-green-50 rounded-lg text-green-700 text-sm font-medium text-center">
                  ✓ Applicant has been hired
                </div>
              )}
              {application.status === 'rejected' && (
                <div className="p-3 bg-red-50 rounded-lg text-red-700 text-sm font-medium text-center">
                  ✗ Application has been rejected
                </div>
              )}
            </div>
          </div>

          {/* Document Verification */}
          {application.documents && application.documents.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Verification</h2>
              <div className="space-y-3">
                {application.documents.map((doc) => (
                  <div key={doc.id} className="border rounded-lg p-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                      <span className="font-medium text-sm">
                        {doc.doc_type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[doc.status] || 'bg-gray-100 text-gray-800'}`}>
                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                      </span>
                    </div>
                    {doc.status === 'pending' && (
                      <div className="space-y-2">
                        <textarea
                          placeholder="Notes (required for rejection)"
                          value={notes[doc.id] || ''}
                          onChange={(e) => setNotes(prev => ({ ...prev, [doc.id]: e.target.value }))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white text-gray-900"
                          rows={2}
                        />
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => handleVerify(doc.id)}
                            disabled={verifyingDocId === doc.id}
                            className="flex-1 flex items-center justify-center px-2 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {verifyingDocId === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Verify'}
                          </button>
                          <button
                            onClick={() => handleReject(doc.id)}
                            disabled={rejectingDocId === doc.id}
                            className="flex-1 flex items-center justify-center px-2 py-1 text-xs font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            {rejectingDocId === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Reject'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Job Info */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Position</h2>
            <div className="space-y-2">
              <p className="font-medium flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-gray-400" />
                {application.job?.title || 'N/A'}
              </p>
              <p className="text-sm text-gray-500">{application.job?.department || 'N/A'}</p>
              <Link
                to={`/jobs/${application.job_id}`}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                View Job Posting →
              </Link>
            </div>
          </div>

          {application.status === 'hired' && (
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-green-600" />
                Onboarding
              </h2>
              {onboarding ? (
                <div className="space-y-4">
                  <form onSubmit={handleOnboardingSave} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        value={onboardingForm.department}
                        onChange={(e) => setOnboardingForm(prev => ({ ...prev, department: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={onboardingForm.start_date}
                        onChange={(e) => setOnboardingForm(prev => ({ ...prev, start_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingOnboarding}
                      className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      {savingOnboarding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Onboarding'}
                    </button>
                  </form>

                  <div className="border-t pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                      <p className="text-sm font-medium text-gray-700">Checklist</p>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[onboarding.status] || 'bg-gray-100 text-gray-800'}`}>
                        {onboarding.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {onboarding.tasks?.map(task => (
                        <label key={task.id} className="flex items-start gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={(e) => handleTaskToggle(task.id, e.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 flex-shrink-0"
                          />
                          <span className={task.completed ? 'line-through text-gray-500' : ''}>
                            {task.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Onboarding is being prepared.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
