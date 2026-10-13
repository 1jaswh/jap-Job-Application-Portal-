import { useParams, Link } from 'react-router-dom'
import { CheckCircle, Home, Clock, Mail } from 'lucide-react'

export default function ConfirmationPage() {
  const { reference } = useParams()

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 text-center">

          {/* Success Icon */}
          <div className="mb-4 sm:mb-6">
            <CheckCircle className="mx-auto h-12 sm:h-16 w-12 sm:w-16 text-green-500" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Application Submitted Successfully!
          </h1>
          <p className="text-gray-600 mb-6">
            Thank you for applying. Your application has been received and is currently under review.
          </p>

          {/* Reference Number */}
          <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <p className="text-sm text-gray-500 mb-1">Your Reference Number</p>
            <p className="text-xl sm:text-2xl font-mono font-bold text-primary-600">{reference}</p>
            <p className="text-xs text-gray-500 mt-2">
              Please save this reference number for future correspondence
            </p>
          </div>

          {/* What happens next */}
          <div className="text-left mb-6 sm:mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">What happens next?</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <p className="font-medium text-gray-900">Application Review</p>
                  <p className="text-sm text-gray-500">Our team will review your application and uploaded documents.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p className="font-medium text-gray-900">Shortlisting</p>
                  <p className="text-sm text-gray-500">Shortlisted candidates will be contacted via email for next steps.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <p className="font-medium text-gray-900">Interview</p>
                  <p className="text-sm text-gray-500">Selected applicants will be invited for an interview.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Info notes */}
          <div className="flex flex-col gap-2 text-sm text-gray-500 mb-6 sm:mb-8">
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Review typically takes 5–10 business days</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Mail className="h-4 w-4" />
              <span>You will be notified by email if shortlisted</span>
            </div>
          </div>

          {/* Actions */}
          <Link
            to="/"
            className="btn-responsive btn-full-mobile inline-flex items-center justify-center border border-transparent font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <Home className="h-5 w-5 mr-2" />
            Browse More Jobs
          </Link>
        </div>
      </div>
    </div>
  )
}