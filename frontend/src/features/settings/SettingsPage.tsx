import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Bell, Clock, Database, Download, LocateFixed, MapPin, Monitor, Moon, Palette, Pencil, Plus, Settings, Sun, Target, Upload, User as UserIcon } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/common'
import { ConfirmDelete } from '@/components/ConfirmDelete'
import { FormDialog, TagInput } from '@/components/FormDialog'
import { useNotificationPermission } from '@/components/layout/NotificationEngine'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useApi, useList, useResource } from '@/lib/queries'
import { api } from '@/lib/api'
import { fmtTime } from '@/lib/date'
import { PRAYERS, SCORE_META, WEEKDAYS } from '@/lib/constants'
import { cn, errorMessage } from '@/lib/utils'
import type { Profile, PrayerTimes, Reminder, ScoreKey } from '@/types'

type Draft = Partial<Profile> & { name?: string; email?: string }

function useProfileForm() {
  const { user, setUser } = useAuth()
  const qc = useQueryClient()
  const initial = useMemo<Draft>(() => ({ ...(user?.profile ?? {}), name: user?.name, email: user?.email }), [user])
  const [draft, setDraft] = useState<Draft>(initial)
  const [saving, setSaving] = useState(false)
  useEffect(() => setDraft(initial), [initial])
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const save = async (keys: (keyof Draft)[]) => {
    setSaving(true)
    try {
      const payload = Object.fromEntries(keys.map((k) => {
        const v = draft[k]
        return [k, typeof v === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(v) ? v.slice(0, 5) : v]
      }))
      const { data } = await api.put('/profile', payload)
      setUser(data.user)
      qc.invalidateQueries()
      toast.success('Settings saved')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally { setSaving(false) }
  }
  return { draft, set, save, saving, user }
}

function Field({ label, children, help, className }: { label: string; children: ReactNode; help?: string; className?: string }) {
  return <div className={cn('grid gap-1.5', className)}><Label>{label}</Label>{children}{help && <p className="text-xs text-muted-foreground">{help}</p>}</div>
}

function Section({ title, description, children, onSave, saving }: { title: string; description?: string; children: ReactNode; onSave?: () => void; saving?: boolean }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader>
      <CardContent className="space-y-5">
        {children}
        {onSave && <div className="flex justify-end border-t pt-4"><Button onClick={onSave} loading={saving}>Save changes</Button></div>}
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState(params.get('tab') ?? 'profile')
  return (
    <>
      <PageHeader title="Settings" description="Your profile, routine, prayer configuration and data." icon={<Settings />} />
      <Tabs value={tab} onValueChange={(v) => { setTab(v); setParams({ tab: v }, { replace: true }) }}>
        <TabsList>
          <TabsTrigger value="profile"><UserIcon /> Profile</TabsTrigger>
          <TabsTrigger value="routine"><Clock /> Routine</TabsTrigger>
          <TabsTrigger value="prayer"><MapPin /> Location & prayer</TabsTrigger>
          <TabsTrigger value="goals"><Target /> Goals & scores</TabsTrigger>
          <TabsTrigger value="notifications"><Bell /> Notifications</TabsTrigger>
          <TabsTrigger value="appearance"><Palette /> Appearance</TabsTrigger>
          <TabsTrigger value="data"><Database /> Data</TabsTrigger>
        </TabsList>
        <TabsContent value="profile"><ProfileTab /></TabsContent>
        <TabsContent value="routine"><RoutineTab /></TabsContent>
        <TabsContent value="prayer"><PrayerTab /></TabsContent>
        <TabsContent value="goals"><GoalsTab /></TabsContent>
        <TabsContent value="notifications"><NotificationsTab /></TabsContent>
        <TabsContent value="appearance"><AppearanceTab /></TabsContent>
        <TabsContent value="data"><DataTab /></TabsContent>
      </Tabs>
    </>
  )
}

function ProfileTab() {
  const { draft, set, save, saving, user } = useProfileForm()
  const { setUser } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const upload = async (f: File) => {
    const fd = new FormData(); fd.append('avatar', f)
    setUploading(true)
    try { const { data } = await api.post('/profile/avatar', fd); setUser(data.user); toast.success('Photo updated') } catch (e) { toast.error(errorMessage(e)) } finally { setUploading(false) }
  }
  return (
    <Section title="User profile" description="How LifeBalance knows you." onSave={() => save(['name', 'email', 'career_title', 'bio', 'tech_interests'])} saving={saving}>
      <div className="flex items-center gap-4">
        <Avatar src={user?.avatar_url} name={user?.name ?? ''} className="size-16 text-lg" />
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <Button variant="outline" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}><Upload /> Upload photo</Button>
          {user?.avatar_url && <Button variant="ghost" size="sm" onClick={async () => { const { data } = await api.delete('/profile/avatar'); setUser(data.user) }}>Remove</Button>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name"><Input value={draft.name ?? ''} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={draft.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Career"><Input value={draft.career_title ?? ''} onChange={(e) => set('career_title', e.target.value)} /></Field>
        <Field label="About you" className="sm:col-span-2"><Textarea value={draft.bio ?? ''} onChange={(e) => set('bio', e.target.value)} placeholder="Practicing Muslim, software engineer, runner…" /></Field>
        <Field label="Technical interests" className="sm:col-span-2"><TagInput value={draft.tech_interests ?? []} onChange={(v) => set('tech_interests', v)} /></Field>
      </div>
    </Section>
  )
}

function RoutineTab() {
  const { draft, set, save, saving } = useProfileForm()
  const t = (k: keyof Profile) => <Input type="time" value={String(draft[k] ?? '').slice(0, 5)} onChange={(e) => set(k, e.target.value as never)} />
  const rest = draft.rest_days ?? []
  return (
    <Section title="Daily routine" description="Used for reminders, sleep tracking and scoring. Edit time blocks in Calendar." onSave={() => save(['wake_time', 'sleep_time', 'office_start', 'office_end', 'commute_minutes', 'transport', 'morning_activity', 'rest_days'])} saving={saving}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Wake-up time">{t('wake_time')}</Field>
        <Field label="Planned sleep time">{t('sleep_time')}</Field>
        <Field label="Office starts">{t('office_start')}</Field>
        <Field label="Office ends">{t('office_end')}</Field>
        <Field label="Commute (minutes each way)"><Input type="number" min={0} value={draft.commute_minutes ?? 0} onChange={(e) => set('commute_minutes', Number(e.target.value))} /></Field>
        <Field label="Transport"><Input value={draft.transport ?? ''} onChange={(e) => set('transport', e.target.value)} /></Field>
        <Field label="Morning activity" className="sm:col-span-2"><Input value={draft.morning_activity ?? ''} onChange={(e) => set('morning_activity', e.target.value)} /></Field>
      </div>
      <Field label="Weekly rest days" help="Rest days skip workouts and study targets without lowering your scores. You can also toggle a single day in My Day.">
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((d, i) => (
            <button key={d} type="button" onClick={() => set('rest_days', rest.includes(i) ? rest.filter((x) => x !== i) : [...rest, i])}
              className={cn('h-8 w-12 cursor-pointer rounded-md border text-xs font-medium', rest.includes(i) ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent')}>{d}</button>
          ))}
        </div>
      </Field>
    </Section>
  )
}

function PrayerTab() {
  const { draft, set, save, saving } = useProfileForm()
  const opts = useApi<{ options: { prayer_methods: { value: string; label: string }[]; asr_methods: { value: string; label: string }[]; high_lat_rules: string[] } }>('profile')
  const preview = useApi<PrayerTimes>('prayer-times')
  const zones = useMemo(() => { try { return Intl.supportedValuesOf('timeZone') } catch { return ['Asia/Dhaka', 'UTC'] } }, [])
  const adj = draft.prayer_adjustments ?? {}
  const locate = () => {
    if (!navigator.geolocation) return toast.error('Geolocation is not supported by this browser')
    navigator.geolocation.getCurrentPosition(
      (p) => { set('latitude', +p.coords.latitude.toFixed(5)); set('longitude', +p.coords.longitude.toFixed(5)); set('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone); toast.success('Location detected — remember to save') },
      () => toast.error('Could not get your location. Enter coordinates manually.'),
    )
  }
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Section title="Location & prayer calculation" description="Prayer times are calculated for your coordinates and date — never hard-coded."
          onSave={() => save(['city', 'country', 'latitude', 'longitude', 'timezone', 'prayer_method', 'asr_method', 'high_lat_rule', 'prayer_provider', 'prayer_adjustments', 'prayer_duration_minutes', 'jumuah_duration_minutes'])} saving={saving}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City"><Input value={draft.city ?? ''} onChange={(e) => set('city', e.target.value)} /></Field>
            <Field label="Country"><Input value={draft.country ?? ''} onChange={(e) => set('country', e.target.value)} /></Field>
            <Field label="Latitude"><Input type="number" step="0.0001" value={draft.latitude ?? ''} onChange={(e) => set('latitude', Number(e.target.value))} /></Field>
            <Field label="Longitude"><Input type="number" step="0.0001" value={draft.longitude ?? ''} onChange={(e) => set('longitude', Number(e.target.value))} /></Field>
            <div className="sm:col-span-2"><Button variant="outline" size="sm" onClick={locate}><LocateFixed /> Use my current location</Button></div>
            <Field label="Timezone"><Select value={draft.timezone} onValueChange={(v) => set('timezone', v)} options={zones.map((z) => ({ value: z, label: z }))} /></Field>
            <Field label="Calculation method"><Select value={draft.prayer_method} onValueChange={(v) => set('prayer_method', v)} options={opts.data?.options.prayer_methods ?? []} /></Field>
            <Field label="Asr juristic method"><Select value={draft.asr_method} onValueChange={(v) => set('asr_method', v)} options={opts.data?.options.asr_methods ?? []} /></Field>
            <Field label="High-latitude rule"><Select value={draft.high_lat_rule} onValueChange={(v) => set('high_lat_rule', v)} options={(opts.data?.options.high_lat_rules ?? []).map((r) => ({ value: r, label: r }))} /></Field>
            <Field label="Source" help="Aladhan uses the online API (cached daily) and falls back to local calculation when offline. Your coordinates are sent to api.aladhan.com.">
              <Select value={draft.prayer_provider} onValueChange={(v) => set('prayer_provider', v)} options={[{ value: 'local', label: 'Local astronomical calculation' }, { value: 'aladhan', label: 'Aladhan API' }]} />
            </Field>
            <Field label="Salah block length (min)"><Input type="number" min={5} max={90} value={draft.prayer_duration_minutes ?? 20} onChange={(e) => set('prayer_duration_minutes', Number(e.target.value))} /></Field>
            <Field label="Jumu'ah block length (min)"><Input type="number" min={15} max={180} value={draft.jumuah_duration_minutes ?? 60} onChange={(e) => set('jumuah_duration_minutes', Number(e.target.value))} /></Field>
          </div>
          <Field label="Minute adjustments" help="Fine-tune to match your local mosque (−60 to +60 minutes).">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {[...PRAYERS.map((p) => ({ key: p.key, name: p.name })), { key: 'sunrise', name: 'Sunrise' }].map((p) => (
                <div key={p.key}><p className="mb-1 text-xs text-muted-foreground">{p.name}</p><Input type="number" min={-60} max={60} value={adj[p.key] ?? 0} onChange={(e) => set('prayer_adjustments', { ...adj, [p.key]: Number(e.target.value) })} /></div>
              ))}
            </div>
          </Field>
        </Section>
      </div>
      <Card className="h-fit">
        <CardHeader><CardTitle>Today's times</CardTitle><CardDescription>{preview.data ? `${preview.data.method} · ${preview.data.source}` : 'Loading…'}</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {preview.data && [...PRAYERS.slice(0, 1), { key: 'sunrise' as const, name: 'Sunrise', arabic: '' }, ...PRAYERS.slice(1)].map((p) => (
            <div key={p.key} className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"><span>{p.name}</span><span className="font-medium tabular-nums">{fmtTime(preview.data!.times[p.key])}</span></div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

const GOALS: { key: string; label: string; unit: string }[] = [
  { key: 'quran_pages', label: 'Quran pages / day', unit: 'pages' }, { key: 'study_minutes', label: 'Programming study / day', unit: 'min' },
  { key: 'islamic_learning_minutes_week', label: 'Islamic learning / week', unit: 'min' }, { key: 'water_ml', label: 'Water / day', unit: 'ml' },
  { key: 'sleep_hours', label: 'Sleep / night', unit: 'hours' }, { key: 'protein_g', label: 'Protein / day', unit: 'g' }, { key: 'calories', label: 'Calories / day', unit: 'kcal' },
  { key: 'weekly_run_km', label: 'Running / week', unit: 'km' }, { key: 'workouts_per_week', label: 'Strength workouts / week', unit: 'sessions' }, { key: 'body_weight_kg', label: 'Body weight (for calorie estimates)', unit: 'kg' },
]

function GoalsTab() {
  const { draft, set, save, saving } = useProfileForm()
  const goals = draft.goals ?? {}
  const weights = draft.score_weights ?? {}
  const total = (Object.keys(SCORE_META) as ScoreKey[]).reduce((a, k) => a + Number(weights[k] ?? 0), 0) || 1
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Goals" description="Targets cap your scores — exceeding them never inflates the score." onSave={() => save(['goals'])} saving={saving}>
        <div className="grid gap-4 sm:grid-cols-2">
          {GOALS.map((g) => (
            <Field key={g.key} label={g.label}>
              <div className="relative"><Input type="number" min={0} step="any" value={goals[g.key] ?? ''} onChange={(e) => set('goals', { ...goals, [g.key]: Number(e.target.value) })} className="pr-16" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{g.unit}</span></div>
            </Field>
          ))}
        </div>
      </Section>
      <Section title="Life balance weights" description="How much each area contributes to your overall score. Areas that don't apply on a given day (e.g. rest days) are excluded automatically." onSave={() => save(['score_weights'])} saving={saving}>
        {(Object.keys(SCORE_META) as ScoreKey[]).map((k) => (
          <div key={k}>
            <div className="mb-1.5 flex justify-between text-sm"><span className="font-medium">{SCORE_META[k].label}</span><span className="tabular-nums text-muted-foreground">{Math.round((Number(weights[k] ?? 0) / total) * 100)}%</span></div>
            <input type="range" min={0} max={50} value={weights[k] ?? 0} onChange={(e) => set('score_weights', { ...weights, [k]: Number(e.target.value) })} className="w-full cursor-pointer" style={{ accentColor: SCORE_META[k].color }} />
          </div>
        ))}
      </Section>
    </div>
  )
}

const REMINDER_TYPES = ['salah', 'quran', 'running', 'study', 'water', 'sleep', 'schedule', 'custom'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))

function NotificationsTab() {
  const { permission, request, supported } = useNotificationPermission()
  const list = useList<Reminder>('reminders')
  const { create, update, remove } = useResource<Reminder>('reminders')
  const [editing, setEditing] = useState<Reminder | null>(null)
  const [open, setOpen] = useState(false)
  const describe = (r: Reminder) => r.type === 'salah' ? `${r.minutes_before ?? 10} min before each prayer` : r.type === 'schedule' ? 'Activities with a reminder set in Calendar' : r.interval_minutes ? `Every ${r.interval_minutes} min, ${r.window_start?.slice(0, 5)}–${r.window_end?.slice(0, 5)}` : r.time ? `At ${fmtTime(r.time)}${r.days_of_week?.length ? ` · ${r.days_of_week.map((d) => WEEKDAYS[d]).join(', ')}` : ' · daily'}` : '—'
  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
        <Bell className="size-8 text-primary" />
        <div className="flex-1">
          <p className="font-medium">Browser notifications</p>
          <p className="text-sm text-muted-foreground">{!supported ? 'Not supported in this browser — reminders will appear inside the app.' : permission === 'granted' ? 'Enabled. Reminders fire while LifeBalance is open in a tab.' : permission === 'denied' ? 'Blocked. Allow notifications for this site in your browser settings.' : 'Allow notifications to get reminders even when the tab is in the background.'}</p>
        </div>
        {supported && permission !== 'granted' && <Button onClick={request} disabled={permission === 'denied'}>Enable notifications</Button>}
        {permission === 'granted' && <Badge variant="success">Enabled</Badge>}
      </Card>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle>Reminders</CardTitle><Button size="sm" onClick={() => { setEditing(null); setOpen(true) }}><Plus /> Custom reminder</Button></CardHeader>
        <CardContent>
          <ul className="divide-y">
            {list.data?.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3">
                <Switch checked={r.enabled} onCheckedChange={(v) => update.mutate({ id: r.id, enabled: v })} aria-label={`Toggle ${r.title}`} />
                <div className="min-w-0 flex-1"><p className="text-sm font-medium">{r.title} <Badge variant="secondary" className="ml-1">{r.type}</Badge></p><p className="text-xs text-muted-foreground">{describe(r)}</p></div>
                <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(r); setOpen(true) }} aria-label="Edit"><Pencil /></Button>
                <ConfirmDelete onConfirm={() => remove.mutateAsync(r.id)} label={r.title} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <FormDialog open={open} onOpenChange={setOpen} title={editing ? 'Edit reminder' : 'Custom reminder'}
        fields={[
          { name: 'title', label: 'Title', required: true },
          { name: 'type', label: 'Type', type: 'select', options: REMINDER_TYPES },
          { name: 'message', label: 'Message', full: true },
          { name: 'minutes_before', label: 'Minutes before prayer', type: 'number', min: 0, hidden: (v) => v.type !== 'salah' },
          { name: 'time', label: 'Time', type: 'time', hidden: (v) => v.type === 'salah' || v.type === 'schedule' || !!v.interval_minutes },
          { name: 'interval_minutes', label: 'Repeat every (min)', type: 'number', min: 15, hidden: (v) => v.type === 'salah' || v.type === 'schedule', help: 'Optional: repeat within a time window' },
          { name: 'window_start', label: 'From', type: 'time', hidden: (v) => !v.interval_minutes },
          { name: 'window_end', label: 'Until', type: 'time', hidden: (v) => !v.interval_minutes },
          { name: 'days_of_week', label: 'Days (none = every day)', type: 'days', hidden: (v) => v.type === 'salah' || v.type === 'schedule' },
          { name: 'enabled', label: 'Enabled', type: 'switch' },
        ]}
        initial={editing ? { ...editing, days_of_week: editing.days_of_week ?? [] } : { title: '', type: 'custom', message: '', time: '12:00', interval_minutes: '', days_of_week: [], enabled: true }}
        onSubmit={(v) => (editing ? update.mutateAsync({ ...v, id: editing.id }) : create.mutateAsync(v))} />
    </div>
  )
}

function AppearanceTab() {
  const { theme, setTheme } = useTheme()
  const { set, save } = useProfileForm()
  const choose = (t: 'light' | 'dark' | 'system') => { setTheme(t); set('theme', t); api.put('/profile', { theme: t }).catch(() => {}) }
  void save
  return (
    <Section title="Theme" description="Choose how LifeBalance looks on this device.">
      <div className="grid gap-3 sm:grid-cols-3">
        {([['light', 'Light', Sun], ['dark', 'Dark', Moon], ['system', 'System', Monitor]] as const).map(([v, label, Icon]) => (
          <button key={v} onClick={() => choose(v)} className={cn('flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-5 transition', theme === v ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:bg-accent')}>
            <Icon className="size-6" /><span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </Section>
  )
}

function DataTab() {
  const qc = useQueryClient()
  const { refresh } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<File | null>(null)
  const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' })
  const backup = async () => {
    setBusy(true)
    try {
      const { data } = await api.get('/backup', { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const a = document.createElement('a'); a.href = url; a.download = `lifebalance-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click()
      URL.revokeObjectURL(url)
    } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }
  const restore = async () => {
    if (!pending) return
    const fd = new FormData(); fd.append('backup', pending)
    setBusy(true)
    try { const { data } = await api.post('/restore', fd); toast.success(data.message); setPending(null); await refresh(); qc.invalidateQueries() } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }
  const changePw = async () => {
    try { await api.put('/auth/password', pw); toast.success('Password updated'); setPw({ current_password: '', password: '', password_confirmation: '' }) } catch (e) { toast.error(errorMessage(e)) }
  }
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Backup & restore" description="Download all your data as JSON, or restore from a previous backup.">
        <Button onClick={backup} loading={busy && !pending}><Download /> Download backup</Button>
        <div className="rounded-lg border border-dashed p-4">
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => setPending(e.target.files?.[0] ?? null)} />
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload /> Choose backup file</Button>
          {pending && (
            <div className="mt-3 rounded-md bg-destructive/10 p-3 text-sm">
              <p>Restoring <b>{pending.name}</b> will <b>replace all current data</b> in your account.</p>
              <div className="mt-2 flex gap-2"><Button size="sm" variant="destructive" loading={busy} onClick={restore}>Replace my data</Button><Button size="sm" variant="ghost" onClick={() => setPending(null)}>Cancel</Button></div>
            </div>
          )}
        </div>
      </Section>
      <Section title="Change password" onSave={changePw}>
        <Field label="Current password"><Input type="password" autoComplete="current-password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} /></Field>
        <Field label="New password" help="At least 8 characters"><Input type="password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} /></Field>
        <Field label="Confirm new password"><Input type="password" autoComplete="new-password" value={pw.password_confirmation} onChange={(e) => setPw({ ...pw, password_confirmation: e.target.value })} /></Field>
      </Section>
    </div>
  )
}
