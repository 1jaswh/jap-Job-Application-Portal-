import { useParams, Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Briefcase, MapPin, Upload, Loader2, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { jobsAPI, Job, documentsAPI, applicationsAPI, SubmitApplicationRequest, aiAPI, AIParsedCVResponse } from '../../services/api'

type FormData = Record<string, string | File>

export default function ApplyPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm<FormData>()

  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fileInputs, setFileInputs] = useState<Record<string, File | null>>({})
  const [cvParsing, setCVParsing] = useState<Record<string, boolean>>({})
  const [cvParseResults, setCVParseResults] = useState<Record<string, AIParsedCVResponse | null>>({})
  const [cvParseErrors, setCVParseErrors] = useState<Record<string, string>>({})

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

  const handleFileChange = (fieldName: string, file: File | null) => {
    setFileInputs(prev => ({ ...prev, [fieldName]: file }))
    if (file) {
      setValue(fieldName, file, { shouldValidate: true })
    }
  }

  const onSubmit = async (data: FormData) => {
    if (!job || !id) return

    try {
      // Step 1: Build responses — exclude file fields and applicant fields
      const responses = Object.entries(data)
        .filter(([key]) => {
          // ✅ Skip all applicant-level fields
          if (['Full Name', 'Email', 'Phone Number', 'full_name', 'email', 'phone'].includes(key)) return false
          // ✅ Skip file fields using requirements list
          const req = requirements.find(r => r.field_name === key)
          if (req?.field_type === 'file') return false
          return true
        })
        // ✅ Only include string values — File objects become {} in JSON
        .filter(([_, value]) => typeof value === 'string' && value !== '')
        .map(([fieldName, fieldValue]) => ({
          field_name: fieldName,
          field_value: fieldValue as string,
        }))

      const applicationData: SubmitApplicationRequest = {
        applicant: {
          full_name: data['Full Name'] as string,
          email: data['Email'] as string,         // ✅ matches field_name 'Email'
          phone: data['Phone Number'] as string,
        },
        job_id: Number(id),
        responses,
        documents: [],
      }

      // Step 2: Submit application first to get real ID
      const result = await applicationsAPI.submit(applicationData)
      const applicationId = result.application.id

       // Step 3: Upload files with the real application ID
       const fileEntries = Object.entries(fileInputs).filter(([_, file]) => file !== null)

       for (const [fieldName, file] of fileEntries) {
         if (!file) continue

         let docType: 'cv' | 'national_id' | 'transcript' = 'cv'
         const lowerField = fieldName.toLowerCase()
         if (lowerField.includes('national') || lowerField.includes('id')) {
           docType = 'national_id'
         } else if (lowerField.includes('transcript')) {
           docType = 'transcript'
         }

         const formData = new FormData()
         formData.append('file', file)
         formData.append('doc_type', docType)
         formData.append('application_id', String(applicationId))

         const uploadResult = await documentsAPI.upload(formData)
         
         // Trigger CV parsing for CV documents
         if (docType === 'cv') {
           setCVParsing(prev => ({ ...prev, [fieldName]: true }))
           setCVParseErrors(prev => ({ ...prev, [fieldName]: '' }))
           try {
             const parsedResult = await aiAPI.parseCV(uploadResult.id)
             setCVParseResults(prev => ({ ...prev, [fieldName]: parsedResult }))
             setCVParsing(prev => ({ ...prev, [fieldName]: false }))
           } catch (parseError) {
             console.error('CV parsing failed:', parseError)
             setCVParseErrors(prev => ({ ...prev, [fieldName]: 'CV parsing failed. You may need to enter some details manually.' }))
             setCVParsing(prev => ({ ...prev, [fieldName]: false }))
           }
         }
       }

      toast.success('Application submitted successfully!')
      navigate(`/confirmation/${result.reference}`)
    } catch (error) {
      console.error('Submission error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit application. Please try again.')
    }
  }

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

  const requirements = job.requirements && job.requirements.length > 0
    ? job.requirements
    : [
        { id: '1', field_name: 'Full Name', field_type: 'text' as const, label: 'Full Name', required: true, order: 1 },
        { id: '2', field_name: 'Email', field_type: 'text' as const, label: 'Email Address', required: true, order: 2 }, // ✅ added
        { id: '3', field_name: 'Phone Number', field_type: 'text' as const, label: 'Phone Number', required: true, order: 3 },
        { id: '4', field_name: 'National ID Number', field_type: 'text' as const, label: 'National ID Number', required: true, order: 4 },
        { id: '5', field_name: 'CV/Resume', field_type: 'file' as const, label: 'CV/Resume', required: true, order: 5 },
        { id: '6', field_name: 'National ID', field_type: 'file' as const, label: 'National ID (Scan)', required: true, order: 6 },
        { id: '7', field_name: 'Academic Transcripts', field_type: 'file' as const, label: 'Academic Transcripts', required: false, order: 7 },
      ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to={`/jobs/${id}`}
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
        >
          ← Back to Job Details
        </Link>

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Apply for {job.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Briefcase className="h-4 w-4" />
                {job.department}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {job.location}
              </span>
              <span className="text-sm text-gray-500">
                Deadline: {new Date(job.deadline).toLocaleDateString()}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {requirements
              .sort((a, b) => a.order - b.order)
              .map((req) => {
                const fieldRegistration = req.field_type === 'file'
                  ? register(req.field_name, {
                      validate: () => {
                        if (req.required && !fileInputs[req.field_name]) {
                          return `${req.label} is required`
                        }
                        return true
                      }
                    })
                  : register(req.field_name, {
                      required: req.required && `${req.label} is required`
                    })

                return (
                  <div key={req.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {req.label}
                      {req.required && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {req.field_type === 'text' && (
                      <input
                        type="text"
                        {...fieldRegistration}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
                        placeholder={`Enter ${req.label.toLowerCase()}`}
                      />
                    )}

                    {req.field_type === 'number' && (
                      <input
                        type="number"
                        {...fieldRegistration}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
                        placeholder={`Enter ${req.label.toLowerCase()}`}
                      />
                    )}

                    {req.field_type === 'file' && (
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500">
                              <span>Upload a file</span>
                              <input
                                type="file"
                                {...fieldRegistration}
                                className="sr-only"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  fieldRegistration.onChange(e)
                                  const file = e.target.files?.[0] || null
                                  handleFileChange(req.field_name, file)
                                }}
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            PDF, JPG, PNG up to 5MB
                          </p>
                          {fileInputs[req.field_name] && (
                            <p className="text-sm text-primary-600 font-medium">
                              ✓ {fileInputs[req.field_name]?.name}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {errors[req.field_name] && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {String(errors[req.field_name]?.message)}
                      </p>
                    )}
                  </div>
                )
              })}

             {/* CV Parsing Results */}
             {Object.keys(cvParseResults).map(fieldName => {
               const result = cvParseResults[fieldName];
               const isParsing = cvParsing[fieldName];
               const error = cvParseErrors[fieldName];
               
               if (!result && !isParsing && !error) return null;
               
               return (
                 <div key={fieldName} className="mt-6 p-4 bg-blue-50 rounded-lg">
                   {isParsing && (
                     <div className="flex items-center space-x-3 mb-2">
                       <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                       <span className="text-sm text-blue-600">Parsing CV...</span>
                     </div>
                   )}
                   {!isParsing && error && (
                     <div className="text-sm text-red-600">
                       {error}
                     </div>
                   )}
                   {!isParsing && result && (
                     <>
                       <div className="flex items-center space-x-3 mb-2">
                         <Briefcase className="h-4 w-4 text-blue-500" />
                         <span className="font-medium text-blue-800">CV Parsing Results</span>
                       </div>
                       <div className="space-y-2 text-sm">
                         <div className="flex items-center">
                           <span className="w-20 font-medium text-gray-600">Name:</span>
                           <span className="text-gray-800">{result.parsed_json.full_name || 'N/A'}</span>
                         </div>
                         <div className="flex items-center">
                           <span className="w-20 font-medium text-gray-600">Email:</span>
                           <span className="text-gray-800">{result.parsed_json.email || 'N/A'}</span>
                         </div>
                         <div className="flex items-center">
                           <span className="w-20 font-medium text-gray-600">Phone:</span>
                           <span className="text-gray-800">{result.parsed_json.phone || 'N/A'}</span>
                         </div>
                         <div className="flex items-center">
                           <span className="w-20 font-medium text-gray-600">Experience:</span>
                           <span className="text-gray-800">
                             {(result.experience_years ?? 0)} years
                           </span>
                         </div>
                         <div className="flex items-center">
                           <span className="w-20 font-medium text-gray-600">Skills:</span>
                           <span className="text-gray-800">
                             {result.skills.length > 0 ? result.skills.join(', ') : 'None detected'}
                           </span>
                         </div>
                         <div className="flex items-center">
                           <span className="w-20 font-medium text-gray-600">Confidence:</span>
                           <span className="text-gray-800">
                             {((result.confidence_score ?? 0) * 100).toFixed(0)}%
                           </span>
                         </div>
                       </div>
                     </>
                   )}
                 </div>
               );
             })}
             
             <div className="flex items-center justify-between pt-4 border-t">
               <Link
                 to={`/jobs/${id}`}
                 className="text-gray-600 hover:text-gray-900"
               >
                 Cancel
               </Link>
               <button
                 type="submit"
                 disabled={isSubmitting}
                 className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isSubmitting ? (
                   <>
                     <Loader2 className="animate-spin h-4 w-4 mr-2" />
                     Submitting...
                   </>
                 ) : 'Submit Application'}
               </button>
             </div>
          </form>
        </div>
      </div>
    </div>
  )
}