import { Outlet } from 'react-router-dom'
import Header from './Header'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      <footer className="bg-white border-t mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © 2026 Job Application Portal. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
