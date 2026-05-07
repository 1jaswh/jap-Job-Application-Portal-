import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/layout/Layout'
import HomePage from './pages/applicant/HomePage'
import JobDetailPage from './pages/applicant/JobDetailPage'
import ApplyPage from './pages/applicant/ApplyPage'
import ConfirmationPage from './pages/applicant/ConfirmationPage'
import AdminLayout from './components/layout/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import JobsManagement from './pages/admin/JobsManagement'
import ApplicationsList from './pages/admin/ApplicationsList'
import ApplicationDetail from './pages/admin/ApplicationDetail'
import ReportsPage from './pages/admin/ReportsPage'
import OnboardingPage from './pages/admin/OnboardingPage'

function App() {
  return (
    <>
      <Toaster />
      <Routes>
        {/* Applicant-facing routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="jobs/:id" element={<JobDetailPage />} />
          <Route path="jobs/:id/apply" element={<ApplyPage />} />
          <Route path="confirmation/:reference" element={<ConfirmationPage />} />
        </Route>

        {/* Admin routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="jobs" element={<JobsManagement />} />
          <Route path="applications" element={<ApplicationsList />} />
          <Route path="applications/:id" element={<ApplicationDetail />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="onboarding" element={<OnboardingPage />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
