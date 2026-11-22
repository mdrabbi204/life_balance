import { Link } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, BedDouble, BookOpen, CheckCircle2, Circle, Code2, Droplets, Dumbbell, Flame, ListChecks, Moon, Plus, Sparkles, Target } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { ErrorState, LoadingBlock, LoadingGrid, ScoreRing, StatCard } from '@/components/common'
import { axisProps, gridProps, tooltipProps } from '@/components/charts'
import { NextPrayerCard } from '@/features/islamic/NextPrayer'
import { useAuth } from '@/hooks/useAuth'
import { useAction, useApi } from '@/lib/queries'
import { api } from '@/lib/api'
import { fmtTime, greeting } from '@/lib/date'
import { SCORE_META } from '@/lib/constants'
import { cn, formatMinutes } from '@/lib/utils'
import type { DayScore, DayTimeline, Habit, ScoreKey } from '@/types'

interface DashboardData {
  date: string
  today: DayScore
  trend: ({ date: string; overall: number | null; discipline: number | null } & Record<ScoreKey, number | null>)[]
  timeline: DayTimeline
  habits: Habit[]
  weights: Record<ScoreKey, number>
}

export default function DashboardPage() {
  const { user } = useAuth()
  const q = useApi<DashboardData>('dashboard', undefined, { refetchInterval: 60_000 })
  const addWater = useAction((ml: number) => api.post('/nutrition-logs', { date: q.data?.date, meal: 'water', water_ml: ml }), 'Water logged')
  const toggleHabit = useAction((h: Habit) => api.post(`/habits/${h.id}/toggle`, { date: q.data?.date }))

  if (q.isLoading) return <div className="space-y-4"><LoadingGrid count={4} /><LoadingBlock /><LoadingGrid count={4} /></div>
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />

  const { today, timeline, trend, habits, weights } = q.data
  const m = today.metrics
  const totalWeight = Object.values(weights).reduce((a, b) => a + Number(b), 0) || 1
  const upcoming = timeline.items.filter((i) => !i.is_past && i.status !== 'rest').slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{format(parseISO(q.data.date), 'EEEE, d MMMM yyyy')}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{greeting()}, {user?.name?.split(' ')[0]}</h1>
        </div>
        <div className="flex items-center gap-2">
          {today.is_rest_day && <Badge variant="secondary"><Moon className="size-3" /> Rest day — recovery counts too</Badge>}
          <Button asChild variant="outline" size="sm"><Link to="/my-day">Open My Day <ArrowRight /></Link></Button>
        </div>
      </div>

      {/* Hero row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <ScoreRing value={today.scores.overall} size={140} stroke={12} label="Life balance" />
            <div className="grid w-full flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
              <MiniStat label="Completion" value={`${today.completion}%`} icon={<Target />} />
              <MiniStat label="Discipline" value={today.discipline === null ? '—' : `${today.discipline}%`} icon={<Flame />} />
              <MiniStat label="Planned" value={timeline.summary.planned} icon={<ListChecks />} />
              <MiniStat label="Completed" value={timeline.summary.completed} icon={<CheckCircle2 />} />
              <MiniStat label="Pending" value={timeline.summary.pending} icon={<Circle />} />
              <MiniStat label="Habits" value={`${m.habits.done}/${m.habits.total}`} icon={<Sparkles />} />
            </div>
          </div>
        </Card>
        <NextPrayerCard prayer={{ ...timeline.prayer_times }} />
      </div>

      {/* Life balance */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Life balance score</CardTitle><p className="text-sm text-muted-foreground">Capped at your targets — rest is never penalised.</p></CardHeader>
          <CardContent className="space-y-4">
            {(Object.keys(SCORE_META) as ScoreKey[]).map((k) => (
              <div key={k}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{SCORE_META[k].label}</span>
                  <span className="text-xs text-muted-foreground">
                    <span className="mr-2">weight {Math.round((Number(weights[k]) / totalWeight) * 100)}%</span>
                    <span className="font-semibold tabular-nums text-foreground">{today.scores[k] ?? '—'}</span>
                  </span>
                </div>
                <Progress value={today.scores[k] ?? 0} color={SCORE_META[k].color} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Last 7 days</CardTitle><p className="text-sm text-muted-foreground">Overall balance and discipline</p></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="date" {...axisProps} tickFormatter={(d) => format(parseISO(d), 'EEE')} />
                  <YAxis domain={[0, 100]} {...axisProps} />
                  <Tooltip {...tooltipProps} labelFormatter={(d) => format(parseISO(String(d)), 'EEE d MMM')} />
                  <Line type="monotone" dataKey="overall" name="Overall" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                  <Line type="monotone" dataKey="discipline" name="Discipline" stroke="var(--career)" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls />
                  <Line type="monotone" dataKey="deen" name="Deen" stroke="var(--deen)" strokeWidth={1.5} dot={false} connectNulls opacity={0.6} />
                  <Line type="monotone" dataKey="fitness" name="Fitness" stroke="var(--fitness)" strokeWidth={1.5} dot={false} connectNulls opacity={0.6} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily progress */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Salah" value={`${m.salah.prayed}/5`} sub={`${m.salah.on_time} on time${m.salah.missed ? ` · ${m.salah.missed} missed` : ''}`} icon={<Moon />} accent="var(--deen)" progress={m.salah.prayed * 20} />
        <StatCard label="Quran" value={m.quran.done ? 'Completed' : 'Pending'} sub={`${m.quran.pages}/${m.quran.goal} pages`} icon={<BookOpen />} accent="var(--deen)" progress={(m.quran.pages / Math.max(1, m.quran.goal)) * 100} />
        <StatCard label="Programming" value={formatMinutes(m.study.minutes)} sub={`Goal ${formatMinutes(m.study.goal)}`} icon={<Code2 />} accent="var(--career)" progress={(m.study.minutes / Math.max(1, m.study.goal)) * 100} />
        <StatCard label="Workout" value={m.workout.done ? 'Completed' : m.workout.rest_day ? 'Rest day' : 'Pending'} sub={m.workout.run_km ? `${m.workout.run_km} km run` : m.workout.workouts ? `${m.workout.workouts} session(s)` : 'Run or strength'} icon={<Dumbbell />} accent="var(--fitness)" progress={m.workout.done ? 100 : 0} />
        <StatCard label="Water" value={`${(m.nutrition.water_ml / 1000).toFixed(1)} L`} sub={`Goal ${(m.nutrition.water_goal / 1000).toFixed(1)} L`} icon={<Droplets />} accent="#0284c7" progress={(m.nutrition.water_ml / Math.max(1, m.nutrition.water_goal)) * 100}>
          <div className="mt-2 flex gap-1">
            {[250, 500].map((ml) => <Button key={ml} size="sm" variant="outline" className="h-7 flex-1 px-1 text-[11px]" loading={addWater.isPending && addWater.variables === ml} onClick={() => addWater.mutate(ml)}><Plus className="size-3" />{ml}</Button>)}
          </div>
        </StatCard>
        <StatCard label="Sleep" value={m.sleep ? formatMinutes(m.sleep.minutes) : '—'} sub={m.sleep ? `Quality ${m.sleep.quality}/5 · ${fmtTime(m.sleep.bedtime)}` : <Link to="/fitness?tab=sleep" className="text-primary hover:underline">Log last night</Link>} icon={<BedDouble />} accent="#7c3aed" progress={m.sleep ? (m.sleep.minutes / 420) * 100 : 0} />
      </div>

      {/* Schedule + habits */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Today's plan</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/my-day">View all <ArrowRight /></Link></Button>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nothing left on today's plan. Alhamdulillah.</p> : (
              <ul className="space-y-1.5">
                {upcoming.map((it) => (
                  <li key={it.key} className={cn('flex items-center gap-3 rounded-lg px-2 py-2', it.is_current && 'bg-primary/8 ring-1 ring-primary/20')}>
                    <span className="w-16 shrink-0 text-xs tabular-nums text-muted-foreground">{fmtTime(it.start)}</span>
                    <span className="size-2 shrink-0 rounded-full" style={{ background: it.is_prayer ? 'var(--deen)' : it.color ?? 'var(--muted-foreground)' }} />
                    <span className={cn('flex-1 truncate text-sm', it.is_prayer && 'font-medium')}>{it.title}</span>
                    {it.is_current && <Badge>Now</Badge>}
                    {it.status === 'done' && <Badge variant="success">Done</Badge>}
                  </li>
                ))}
              </ul>
            )}
            {timeline.conflicts.some((c) => c.type === 'overlap') && <p className="mt-3 rounded-md bg-warning/15 px-3 py-2 text-xs">Some activities overlap — review them in Calendar.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Habits today</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/habits">Manage <ArrowRight /></Link></Button>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-1 sm:grid-cols-2">
              {habits.filter((h) => h.frequency === 'daily').map((h) => (
                <li key={h.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/50">
                  <Checkbox checked={!!h.completed} disabled={h.auto || toggleHabit.isPending} onCheckedChange={() => toggleHabit.mutate(h)} aria-label={h.name} />
                  <span className={cn('flex-1 truncate text-sm', h.completed && 'text-muted-foreground line-through')}>{h.name}</span>
                  {h.auto && <span className="text-[10px] text-muted-foreground" title={h.auto_description ?? ''}>auto</span>}
                  {!!h.current_streak && h.current_streak > 1 && <span className="text-[11px] tabular-nums text-muted-foreground">{h.current_streak}d</span>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MiniStat({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-3.5">{icon}{label}</div>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
