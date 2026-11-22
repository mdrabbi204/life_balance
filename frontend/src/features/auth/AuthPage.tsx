import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErrors({})
    try {
      if (mode === 'login') await login(form.email, form.password)
      else await register(form)
      navigate('/')
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (err as any)?.response?.data
      if (data?.errors) setErrors(Object.fromEntries(Object.entries(data.errors as Record<string, string[]>).map(([k, v]) => [k, v[0]])))
      else setErrors({ general: data?.message ?? 'Unable to reach the server. Is the API running?' })
    } finally { setBusy(false) }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-500 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-white/15"><Moon className="size-5" fill="currentColor" /></div>
          <span className="text-lg font-semibold">LifeBalance</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">A better Muslim, a better engineer, a stronger body.</h1>
          <p className="mt-4 text-white/80">Plan your day around Salah, track your learning and training, and build habits that last — without sacrificing one part of life for another.</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          {['Salah-aware schedule', 'Life balance score', 'Habits without guilt'].map((t) => <div key={t} className="rounded-xl bg-white/10 p-3 backdrop-blur">{t}</div>)}
        </div>
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" />
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-sm border-0 p-0 shadow-none sm:border sm:p-8 sm:shadow-sm">
          <div className="mb-6">
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground lg:hidden"><Moon className="size-5" fill="currentColor" /></div>
            <h2 className="text-2xl font-semibold tracking-tight">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{mode === 'login' ? 'Sign in to continue your journey.' : 'Your default routine, habits and roadmap are set up for you.'}</p>
          </div>
          <form onSubmit={submit} className="grid gap-4" noValidate>
            {mode === 'register' && (
              <div className="grid gap-1.5"><Label htmlFor="name">Name</Label><Input id="name" value={form.name} onChange={set('name')} autoComplete="name" required />{errors.name && <p className="text-xs text-destructive">{errors.name}</p>}</div>
            )}
            <div className="grid gap-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />{errors.email && <p className="text-xs text-destructive">{errors.email}</p>}</div>
            <div className="grid gap-1.5"><Label htmlFor="password">Password</Label><Input id="password" type="password" value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />{errors.password && <p className="text-xs text-destructive">{errors.password}</p>}</div>
            {mode === 'register' && (
              <div className="grid gap-1.5"><Label htmlFor="pc">Confirm password</Label><Input id="pc" type="password" value={form.password_confirmation} onChange={set('password_confirmation')} autoComplete="new-password" required /></div>
            )}
            {errors.general && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{errors.general}</p>}
            <Button type="submit" loading={busy} className="mt-1 w-full">{mode === 'login' ? 'Sign in' : 'Create account'}</Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === 'login' ? <>New here? <Link to="/register" className="font-medium text-primary hover:underline">Create an account</Link></> : <>Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link></>}
          </p>
        </Card>
      </div>
    </div>
  )
}
