import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarCheck, Dumbbell, Pencil, Play, Plus } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { EmptyState, LoadingGrid, StatCard } from '@/components/common'
import { axisProps, ChartCard, gridProps, tooltipProps } from '@/components/charts'
import { ConfirmDelete } from '@/components/ConfirmDelete'
import { useAction, useApi, useList, useResource } from '@/lib/queries'
import { api } from '@/lib/api'
import { useToday } from '@/hooks/useToday'
import { fmtDate } from '@/lib/date'
import { capitalize } from '@/lib/utils'
import type { Workout } from '@/types'
import { WorkoutDialog } from './WorkoutDialog'

interface WorkoutStats { this_week: number; goal_per_week: number; weeks: { week: string; count: number; volume: number }[]; by_type: Record<string, number>; progression: Record<string, { date: string; weight: number }[]> }

export function StrengthTab() {
  const today = useToday()
  const templates = useList<Workout>('workouts', { templates: 1 })
  const history = useList<Workout>('workouts', { templates: 0, per_page: undefined })
  const stats = useApi<WorkoutStats>('workouts/stats')
  const { create, update, remove } = useResource<Workout>('workouts')
  const start = useAction((id: number) => api.post(`/workouts/${id}/duplicate`, { date: today }), 'Workout logged for today')
  const [dialog, setDialog] = useState<{ workout: Workout | null; template: boolean } | null>(null)
  const exercises = useMemo(() => Object.keys(stats.data?.progression ?? {}), [stats.data])
  const [exercise, setExercise] = useState('')
  const ex = exercise || exercises[0] || ''
  const s = stats.data

  return (
    <div className="space-y-6">
      {!s ? <LoadingGrid /> : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="This week" value={`${s.this_week}/${s.goal_per_week}`} sub="sessions" icon={<CalendarCheck />} accent="var(--fitness)" progress={(s.this_week / Math.max(1, s.goal_per_week)) * 100} />
          {['push', 'pull', 'legs'].map((t) => <StatCard key={t} label={`${capitalize(t)} (8 wks)`} value={s.by_type[t] ?? 0} sub="sessions" />)}
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div><CardTitle>Workout plans</CardTitle><p className="mt-1 text-sm text-muted-foreground">Reusable templates — start one to log today's session.</p></div>
          <Button size="sm" onClick={() => setDialog({ workout: null, template: true })}><Plus /> New plan</Button>
        </CardHeader>
        <CardContent>
          {templates.data?.length === 0 ? <EmptyState title="No plans yet" description="Create push, pull, legs or custom plans." /> : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {templates.data?.map((w) => (
                <div key={w.id} className="flex flex-col rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="font-medium">{w.name}</p><Badge variant="secondary" className="mt-1">{capitalize(w.type)}</Badge></div>
                    <div className="flex"><Button variant="ghost" size="icon-sm" onClick={() => setDialog({ workout: w, template: true })} aria-label="Edit"><Pencil /></Button><ConfirmDelete onConfirm={() => remove.mutateAsync(w.id)} label={w.name} /></div>
                  </div>
                  <ul className="mt-3 flex-1 space-y-1 text-xs text-muted-foreground">
                    {w.exercises.map((e) => <li key={e.id} className="flex justify-between gap-2"><span className="truncate">{e.name}</span><span className="tabular-nums">{e.sets}×{e.reps}</span></li>)}
                  </ul>
                  <Button size="sm" className="mt-3" loading={start.isPending && start.variables === w.id} onClick={() => start.mutate(w.id)}><Play /> Start today</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {s && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Workout frequency" description="Sessions per week">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.weeks} margin={{ left: -20 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="week" {...axisProps} tickFormatter={(d) => format(parseISO(d), 'd MMM')} />
                  <YAxis allowDecimals={false} {...axisProps} />
                  <Tooltip {...tooltipProps} labelFormatter={(d) => `Week of ${fmtDate(String(d), 'd MMM')}`} />
                  <Bar dataKey="count" name="Sessions" fill="var(--fitness)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
          <ChartCard title="Weight progression" description="Heaviest set per session" action={exercises.length > 0 ? <Select className="w-44" value={ex} onValueChange={setExercise} options={exercises.map((e) => ({ value: e, label: e }))} /> : undefined}>
            {!ex ? <p className="py-16 text-center text-sm text-muted-foreground">Log workouts with weights to see progression.</p> : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={s.progression[ex]} margin={{ left: -20, right: 8 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="date" {...axisProps} tickFormatter={(d) => format(parseISO(d), 'd MMM')} />
                    <YAxis {...axisProps} domain={['auto', 'auto']} />
                    <Tooltip {...tooltipProps} formatter={(v) => [`${v} kg`, ex]} />
                    <Line type="monotone" dataKey="weight" stroke="var(--fitness)" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Workout history</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setDialog({ workout: null, template: false })}><Plus /> Log custom workout</Button>
        </CardHeader>
        <CardContent>
          {!history.data?.length ? <EmptyState icon={<Dumbbell />} title="No workouts logged" description="Start a plan above or log a custom session." /> : (
            <ul className="divide-y">
              {history.data.slice(0, 30).map((w) => (
                <li key={w.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  <div className="w-28 shrink-0 text-sm text-muted-foreground">{w.date && fmtDate(w.date, 'EEE d MMM')}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{w.name} <Badge variant="secondary" className="ml-1">{capitalize(w.type)}</Badge></p>
                    <p className="truncate text-xs text-muted-foreground">{w.exercises.map((e) => `${e.name} ${e.sets}×${e.reps}${e.weight_kg ? ` @${e.weight_kg}kg` : ''}`).join(' · ')}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {w.duration_minutes && <span className="mr-2 text-xs text-muted-foreground">{w.duration_minutes} min</span>}
                    <Button variant="ghost" size="icon-sm" onClick={() => setDialog({ workout: w, template: false })} aria-label="Edit"><Pencil /></Button>
                    <ConfirmDelete onConfirm={() => remove.mutateAsync(w.id)} label="workout" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {dialog && (
        <WorkoutDialog open onOpenChange={(o) => !o && setDialog(null)} workout={dialog.workout} template={dialog.template} date={today}
          onSubmit={(v) => (dialog.workout ? update.mutateAsync({ ...v, id: dialog.workout.id }) : create.mutateAsync(v))} />
      )}
    </div>
  )
}
