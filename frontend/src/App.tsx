import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthPage } from '@/features/auth/AuthPage'

const Dashboard = lazy(() => import('@/features/dashboard/DashboardPage'))
const MyDay = lazy(() => import('@/features/myday/MyDayPage'))
const Islamic = lazy(() => import('@/features/islamic/IslamicPage'))
const Career = lazy(() => import('@/features/career/CareerPage'))
const Fitness = lazy(() => import('@/features/fitness/FitnessPage'))
const Habits = lazy(() => import('@/features/habits/HabitsPage'))
const Calendar = lazy(() => import('@/features/calendar/CalendarPage'))
const Reports = lazy(() => import('@/features/reports/ReportsPage'))
const Settings = lazy(() => import('@/features/settings/SettingsPage'))

function FullScreenLoader() {
  return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="size-6 animate-spin text-primary" /></div>
}

function Protected() {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  return <AppLayout />
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  return user ? <Navigate to="/" replace /> : <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<FullScreenLoader />}>
        <Routes>
          <Route path="/login" element={<GuestOnly><AuthPage mode="login" /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><AuthPage mode="register" /></GuestOnly>} />
          <Route element={<Protected />}>
            <Route index element={<Dashboard />} />
            <Route path="my-day" element={<MyDay />} />
            <Route path="islamic" element={<Islamic />} />
            <Route path="career" element={<Career />} />
            <Route path="fitness" element={<Fitness />} />
            <Route path="habits" element={<Habits />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
