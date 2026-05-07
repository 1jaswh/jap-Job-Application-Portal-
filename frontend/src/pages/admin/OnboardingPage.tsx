import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Loader2, AlertCircle, CheckCircle, Circle,
  ChevronDown, ChevronUp, User, Briefcase, Calendar, Building2
} from 'lucide-react'
import { onboardingAPI, Onboarding, OnboardingTask } from '../../services/api'
import toast from 'react-hot-toast'

const statusColors: Record<string, string> = {
  pending:     'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed:   'bg-green-100 text-green-800',
}

export default function OnboardingPage() {
  const [onboardings, setOnboardings] = useState<Onboarding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ department: '', start_date: '' })
  const [savingId, setSavingId] = useState<number | null>(null)
  const [togglingTask, setTogglingTask] = useState<number | null>(null)

  useEffect(() => {
    fetchOnboardings()
  }, [])

  const fetchOnboardings = async () => {
    try {
      setLoading(true)
      const data = await onboardingAPI.getAll()
      setOnboardings(data ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load onboarding records')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleExpand = (id: number) => {
    setExpanded(prev => prev === id ? null : id)
  }

  const handleEditStart = (ob: Onboarding) => {
    setEditingId(ob.id)
    setEditForm({
      department: ob.department || '',
      start_date: ob.start_date ? ob.start_date.split('T')[0] : '',
    })
  }

  const handleEditSave = async (ob: Onboarding) => {
    try {
      setSavingId(ob.id)
      const updated = await onboardingAPI.update(ob.id, {
        department: editForm.department,
        start_date: editForm.start_date || undefined,
      })
      setOnboardings(prev => prev.map(o => o.id === ob.id ? { ...o, ...updated } : o))
      setEditingId(null)
      toast.success('Onboarding details saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingId(null)
    }
  }

  const handleToggleTask = async (onboardingId: number, task: OnboardingTask) => {
    try {
      setTogglingTask(task.id)
      const updated = await onboardingAPI.updateTask(onboardingId, task.id, !task.completed)
      setOnboardings(prev => prev.map(o => {
        if (o.id !== onboardingId) return o
        return {
          ...o,
          tasks: o.tasks?.map(t => t.id === task.id ? updated : t),
        }
      }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update task')
    } finally {
      setTogglingTask(null)
    }
  }

  const getProgress = (tasks?: OnboardingTask[]) => {
    if (!tasks || tasks.length === 0) return 0
    return Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <span className="ml-2 text-gray-600">Loading onboarding records...</span>
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Onboarding</h1>
        <span className="text-sm text-gray-500">{onboardings.length} record{onboardings.length !== 1 ? 's' : ''}</span>
      </div>

      {onboardings.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Briefcase className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No onboarding records yet.</p>
          <p className="text-sm text-gray-400 mt-1">
            Onboarding records are created automatically when an applicant is marked as hired.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {onboardings.map((ob) => {
          const progress = getProgress(ob.tasks)
          const isExpanded = expanded === ob.id
          const isEditing = editingId === ob.id

          return (
            <div key={ob.id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Header row */}
              <div
                className="p-6 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                onClick={() => handleToggleExpand(ob.id)}
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-primary-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-semibold text-gray-900">
                        {ob.applicant?.full_name || `Applicant #${ob.applicant_id}`}
                      </p>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusColors[ob.status] || 'bg-gray-100 text-gray-600'}`}>
                        {ob.status.replace('_', ' ').charAt(0).toUpperCase() + ob.status.replace('_', ' ').slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {ob.job?.title || `Job #${ob.job_id}`}
                      {ob.department && ` · ${ob.department}`}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="hidden md:block w-40">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="ml-4 flex-shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t px-6 py-6 space-y-6">

                  {/* Details section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Onboarding Details</h3>
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
                            <input
                              type="text"
                              value={editForm.department}
                              onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
                              placeholder="e.g. Finance"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                            <input
                              type="date"
                              value={editForm.start_date}
                              onChange={(e) => setEditForm(prev => ({ ...prev, start_date: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditSave(ob)}
                              disabled={savingId === ob.id}
                              className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 disabled:opacity-50"
                            >
                              {savingId === ob.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span>Department: <span className="font-medium text-gray-900">{ob.department || 'Not assigned'}</span></span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>Start Date: <span className="font-medium text-gray-900">
                              {ob.start_date ? new Date(ob.start_date).toLocaleDateString() : 'Not set'}
                            </span></span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <User className="h-4 w-4 text-gray-400" />
                            <span>Email: <span className="font-medium text-gray-900">{ob.applicant?.email || 'N/A'}</span></span>
                          </div>
                          <button
                            onClick={() => handleEditStart(ob)}
                            className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                          >
                            Edit details →
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Links */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Links</h3>
                      <div className="space-y-2">
                        <Link
                          to={`/admin/applications/${ob.application_id}`}
                          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                        >
                          <Briefcase className="h-4 w-4" />
                          View Application
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Tasks */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Onboarding Checklist
                      <span className="ml-2 font-normal text-gray-400">
                        ({ob.tasks?.filter(t => t.completed).length ?? 0}/{ob.tasks?.length ?? 0} completed)
                      </span>
                    </h3>

                    {(!ob.tasks || ob.tasks.length === 0) ? (
                      <p className="text-sm text-gray-400">No tasks defined for this onboarding.</p>
                    ) : (
                      <div className="space-y-2">
                        {ob.tasks.map(task => (
                          <div
                            key={task.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              task.completed
                                ? 'bg-green-50 border-green-200'
                                : 'bg-white border-gray-200 hover:bg-gray-50'
                            }`}
                            onClick={() => togglingTask !== task.id && handleToggleTask(ob.id, task)}
                          >
                            {togglingTask === task.id ? (
                              <Loader2 className="h-5 w-5 animate-spin text-gray-400 flex-shrink-0" />
                            ) : task.completed ? (
                              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                            ) : (
                              <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${task.completed ? 'text-green-800 line-through' : 'text-gray-900'}`}>
                                {task.title}
                              </p>
                              {task.completed && task.completed_at && (
                                <p className="text-xs text-green-600 mt-0.5">
                                  Completed {new Date(task.completed_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}