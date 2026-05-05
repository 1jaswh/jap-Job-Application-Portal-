import { useParams, Link } from 'react-router-dom'
import { CheckCircle, Home, FileText } from 'lucide-react'

export default function ConfirmationPage() {
  const { reference } = useParams()

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-6">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Application Submitted Successfully!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Thank you for applying. Your application has been received and is under review.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">Your Reference Number</p>
            <p className="text-2xl font-mono font-bold text-primary-600">{reference}</p>
            <p className="text-xs text-gray-500 mt-2">
              Please save this reference number for future tracking
            </p>
          </div>

          <div className="space-y-3">
            <Link
              to="/"
              className="flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <Home className="h-5 w-5 mr-2" />
              Browse More Jobs
            </Link>
            <Link
              to="/admin"
              className="flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <FileText className="h-5 w-5 mr-2" />
              View All Applications (Admin)
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
