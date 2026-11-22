import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3, Bell, BellOff, Briefcase, CalendarDays, CheckCircle2, Dumbbell, LayoutDashboard, LogOut, Menu, Monitor, Moon, MoonStar, Settings, Sun, SunMedium, X,
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import { NotificationEngine, useNotificationPermission } from './NotificationEngine'

export const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/my-day', label: 'My Day', icon: SunMedium },
  { to: '/islamic', label: 'Islamic Life', icon: MoonStar },
  { to: '/career', label: 'Career', icon: Briefcase },
  { to: '/fitness', label: 'Fitness', icon: Dumbbell },
  { to: '/habits', label: 'Habits', icon: CheckCircle2 },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const MOBILE_NAV = [NAV[0], NAV[1], NAV[2], NAV[5], NAV[6]]

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-emerald-500 text-white shadow-sm">
        <Moon className="size-4" fill="currentColor" />
      </div>
      <div className="leading-tight">
        <p className="text-[15px] font-semibold tracking-tight">LifeBalance</p>
        <p className="text-[11px] text-muted-foreground">Deen · Career · Health</p>
      </div>
    </div>
  )
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate}
          className={({ isActive }) => cn('group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
          <Icon className="size-[18px]" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { permission, request } = useNotificationPermission()

  useEffect(() => setMobileOpen(false), [location.pathname])
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'

  return (
    <div className="min-h-dvh bg-background">
      <NotificationEngine />
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-sidebar px-3 py-5 lg:flex">
        <Brand />
        <div className="mt-7 flex-1 overflow-y-auto scrollbar-thin"><NavItems /></div>
        <div className="mt-4 rounded-xl bg-gradient-to-br from-teal-600/10 to-emerald-500/5 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Balance over intensity</p>
          <p className="mt-1">Small, consistent steps in every area of life.</p>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 animate-in fade-in-0" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar px-3 py-5 shadow-xl animate-in slide-in-from-left">
            <div className="flex items-center justify-between"><Brand /><Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X /></Button></div>
            <div className="mt-6"><NavItems onNavigate={() => setMobileOpen(false)} /></div>
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu /></Button>
          <div className="lg:hidden"><span className="font-semibold">LifeBalance</span></div>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" title={permission === 'granted' ? 'Browser notifications enabled' : 'Enable browser notifications'}
              onClick={() => (permission === 'granted' ? navigate('/settings?tab=notifications') : request())} aria-label="Notifications">
              {permission === 'granted' ? <Bell /> : <BellOff className="text-muted-foreground" />}
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setTheme(nextTheme)} title={`Theme: ${theme}`} aria-label="Toggle theme"><ThemeIcon /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-1 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar src={user?.avatar_url} name={user?.name ?? 'User'} className="size-8" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <p className="truncate text-sm font-medium text-foreground">{user?.name}</p>
                  <p className="truncate text-xs font-normal">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}><Settings /> Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => logout().then(() => navigate('/login'))} className="text-destructive"><LogOut /> Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {MOBILE_NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}>
            <Icon className="size-5" />
            {label === 'Dashboard' ? 'Home' : label === 'Islamic Life' ? 'Islamic' : label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
