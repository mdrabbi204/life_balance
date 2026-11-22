import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CheckCircle2, Flame, Leaf, Pencil, Plus, Sparkles } from 'lucide-react'
import { addMonths, format, getDay, parseISO, startOfMonth } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { DateNav, EmptyState, ErrorState, LoadingBlock, PageHeader, StatCard } from '@/components/common'
import { axisProps, ChartCard, gridProps, tooltipProps } from '@/components/charts'
import { ConfirmDelete } from '@/components/ConfirmDelete'
import { FormDialog } from '@/components/FormDialog'
import { useAction, useApi, useResource } from '@/lib/queries'
import { api } from '@/lib/api'
import { useToday } from '@/hooks/useToday'
import { capitalize, cn } from '@/lib/utils'
import type { Habit } from '@/types'

interface HabitStats {
  overall_rate: number | null
  heatmap: { date: string; rate: number | null; done: number; total: number }[]
  habits: { id: number; name: string; category: string; color: string; frequency: string; done: number; eligible: number; missed: number; rate: number | null; current_streak: number; best_streak: number }[]
  most_missed: { id: number; name: string; missed: number; rate: number | null }[]
  weekday_misses: { day: string; missed: number }[]
}

const CATEGORIES = ['deen', 'career', 'fitness', 'productivity', 'personal'].map((v) => ({ value: v, label: v === 'personal' ? 'Personal & family' : capitalize(v) }))
const AUTO_KEYS = [
  { value: '', label: 'Manual check-off' },
  { value: 'salah', label: 'Auto: all 5 prayers logged' }, { value: 'quran', label: 'Auto: Quran reading logged' },
  { value: 'morning_adhkar', label: 'Auto: morning adhkar' }, { value: 'evening_adhkar', label: 'Auto: evening adhkar' },
  { value: 'workout', label: 'Auto: run or workout logged' }, { value: 'study', label: 'Auto: study goal reached' },
  { value: 'water', label: 'Auto: water goal reached' }, { value: 'sleep_on_time', label: 'Auto: in bed on time' },
]

export default function HabitsPage() {
  const today = useToday()
  const [date, setDate] = useState(today)
  const [month, setMonth] = useState(today.slice(0, 7))
  const list = useApi<{ data: Habit[] }>('habits', { date })
  const stats = useApi<HabitStats>('habits/stats', { month })
  const { create, update, remove } = useResource<Habit>('habits')
  const toggle = useAction((h: Habit) => api.post(`/habits/${h.id}/toggle`, { date }))
  const [editing, setEditing] = useState<Habit | null>(null)
  const [open, setOpen] = useState(false)

  const habits = list.data?.data ?? []
  const active = habits.filter((h) => h.is_active)
  const daily = active.filter((h) => h.frequency === 'daily')
  const doneToday = daily.filter((h) => h.completed).length

  return (
    <>
      <PageHeader title="Habits" description="Sustainable consistency — progress, not perfection." icon={<CheckCircle2 />}
        actions={<><DateNav value={date} onChange={setDate} max={today} /><Button onClick={() => { setEditing(null); setOpen(true) }}><Plus /> New habit</Button></>} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={date === today ? 'Today' : 'Selected day'} value={`${doneToday}/${daily.length}`} sub="daily habits done" icon={<CheckCircle2 />} accent="var(--primary)" progress={daily.length ? (doneToday / daily.length) * 100 : 0} />
        <StatCard label="This month" value={stats.data?.overall_rate != null ? `${stats.data.overall_rate}%` : '—'} sub="average consistency" icon={<Sparkles />} accent="var(--productivity)" />
        <StatCard label="Longest current streak" value={`${Math.max(0, ...active.map((h) => h.current_streak ?? 0))} days`} sub={active.slice().sort((a, b) => (b.current_streak ?? 0) - (a.current_streak ?? 0))[0]?.name} icon={<Flame />} accent="var(--fitness)" />
        <StatCard label="Active habits" value={active.length} sub={`${habits.length - active.length} paused`} icon={<Leaf />} accent="var(--deen)" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Daily checklist & weekly calendar</CardTitle><p className="text-sm text-muted-foreground">Auto habits tick themselves from your logs. Rest-day-exempt habits never break a streak.</p></CardHeader>
          <CardContent>
            {list.isLoading ? <LoadingBlock className="h-72" /> : list.isError ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : habits.length === 0 ? (
              <EmptyState title="No habits yet" action={<Button onClick={() => setOpen(true)}><Plus /> New habit</Button>} />
            ) : (
              <ul className="divide-y">
                {habits.map((h) => (
                  <li key={h.id} className={cn('flex flex-wrap items-center gap-3 py-2.5', !h.is_active && 'opacity-50')}>
                    <Checkbox checked={!!h.completed} disabled={h.auto || !h.is_active || toggle.isPending} onCheckedChange={() => toggle.mutate(h)} aria-label={h.name} />
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: h.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{h.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {CATEGORIES.find((c) => c.value === h.category)?.label}
                        {h.frequency === 'weekly' && ` · ${h.target_per_week}×/week`}
                        {h.auto && <span title={h.auto_description ?? ''}> · auto</span>}
                        {!h.is_active && ' · paused'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1" aria-label="Last 7 days">
                      {h.week?.map((d) => (
                        <span key={d.date} title={`${format(parseISO(d.date), 'EEE d MMM')}${d.rest ? ' (rest day)' : ''}`}
                          className={cn('flex size-6 items-center justify-center rounded-md text-[10px] font-medium', d.completed ? 'text-white' : d.rest ? 'bg-muted/40 text-muted-foreground/50' : 'bg-muted text-muted-foreground')}
                          style={d.completed ? { background: h.color } : undefined}>
                          {format(parseISO(d.date), 'EEEEE')}
                        </span>
                      ))}
                    </div>
                    <span className="w-14 text-right text-xs tabular-nums text-muted-foreground" title={`Best ${h.best_streak} days`}>{h.current_streak ? <><Flame className="mr-0.5 inline size-3 text-fitness" />{h.current_streak}d</> : '—'}</span>
                    <div className="flex">
                      <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(h); setOpen(true) }} aria-label="Edit"><Pencil /></Button>
                      <ConfirmDelete onConfirm={() => remove.mutateAsync(h.id)} label={h.name} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Monthly heatmap</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => setMonth(format(addMonths(parseISO(`${month}-01`), -1), 'yyyy-MM'))} aria-label="Previous month">‹</Button>
              <span className="w-24 text-center text-sm font-medium">{format(parseISO(`${month}-01`), 'MMM yyyy')}</span>
              <Button variant="ghost" size="icon-sm" disabled={month >= today.slice(0, 7)} onClick={() => setMonth(format(addMonths(parseISO(`${month}-01`), 1), 'yyyy-MM'))} aria-label="Next month">›</Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats.isLoading ? <LoadingBlock className="h-56" /> : stats.data && <Heatmap month={month} data={stats.data.heatmap} onPick={setDate} selected={date} />}
          </CardContent>
        </Card>
      </div>

      {stats.data && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Consistency by habit</CardTitle><p className="text-sm text-muted-foreground">{format(parseISO(`${month}-01`), 'MMMM yyyy')} — today is never counted as missed until it ends.</p></CardHeader>
            <CardContent className="px-0">
              <Table>
                <THead><TR><TH>Habit</TH><TH>Completion</TH><TH className="text-right">Done</TH><TH className="text-right">Streak</TH><TH className="text-right">Best</TH></TR></THead>
                <TBody>
                  {stats.data.habits.map((h) => (
                    <TR key={h.id}>
                      <TD><span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: h.color }} />{h.name}</span></TD>
                      <TD className="min-w-36"><div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${h.rate ?? 0}%`, background: h.color }} /></div><span className="w-9 text-right text-xs tabular-nums">{h.rate ?? '—'}{h.rate != null && '%'}</span></div></TD>
                      <TD className="text-right tabular-nums">{h.done}/{h.eligible}</TD>
                      <TD className="text-right tabular-nums">{h.current_streak}</TD>
                      <TD className="text-right tabular-nums">{h.best_streak}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardContent>
          </Card>
          <div className="space-y-6">
            <ChartCard title="Missed by weekday" description="Spot the days that need a gentler plan">
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.data.weekday_misses} margin={{ left: -25 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="day" {...axisProps} />
                    <YAxis allowDecimals={false} {...axisProps} />
                    <Tooltip {...tooltipProps} />
                    <Bar dataKey="missed" name="Missed" fill="var(--productivity)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            <Card>
              <CardHeader><CardTitle>Missed habit analysis</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {stats.data.most_missed.length === 0 ? <p className="text-muted-foreground">Nothing stands out — beautiful consistency this month.</p> : stats.data.most_missed.map((h) => (
                  <div key={h.id} className="rounded-lg bg-muted/50 p-3">
                    <p className="font-medium">{h.name} <Badge variant="secondary" className="ml-1">{h.rate ?? 0}%</Badge></p>
                    <p className="mt-1 text-xs text-muted-foreground">Missed {h.missed} day(s). Try making it smaller, pairing it with an existing routine, or scheduling it in My Day.</p>
                  </div>
                ))}
                {(() => { const worst = [...stats.data.weekday_misses].sort((a, b) => b.missed - a.missed)[0]; return worst?.missed ? <p className="text-xs text-muted-foreground">{worst.day} is your hardest day — consider lighter targets or marking it as a rest day.</p> : null })()}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <FormDialog open={open} onOpenChange={setOpen} title={editing ? 'Edit habit' : 'New habit'}
        fields={[
          { name: 'name', label: 'Habit', required: true, full: true },
          { name: 'category', label: 'Life area', type: 'select', options: CATEGORIES },
          { name: 'color', label: 'Colour', type: 'color' },
          { name: 'frequency', label: 'Frequency', type: 'select', options: [{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly target' }] },
          { name: 'target_per_week', label: 'Times per week', type: 'number', min: 1, max: 7, hidden: (v) => v.frequency !== 'weekly' },
          { name: 'system_key', label: 'Tracking', type: 'select', options: AUTO_KEYS, full: true, help: 'Auto habits are completed from your logs — no double entry.' },
          { name: 'rest_day_exempt', label: 'Skip on rest days', type: 'switch' },
          { name: 'is_active', label: 'Active', type: 'switch' },
        ]}
        initial={editing ? { ...editing, system_key: editing.system_key ?? '' } : { name: '', category: 'personal', color: '#0f766e', frequency: 'daily', target_per_week: 3, system_key: '', rest_day_exempt: false, is_active: true }}
        onSubmit={(v) => (editing ? update.mutateAsync({ ...v, id: editing.id }) : create.mutateAsync(v))} />
    </>
  )
}

function Heatmap({ month, data, onPick, selected }: { month: string; data: HabitStats['heatmap']; onPick: (d: string) => void; selected: string }) {
  const lead = getDay(startOfMonth(parseISO(`${month}-01`)))
  const color = (r: number | null) => (r == null ? 'var(--muted)' : `color-mix(in oklch, var(--primary) ${Math.max(12, r)}%, var(--muted))`)
  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted-foreground">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {Array.from({ length: lead }).map((_, i) => <span key={`l${i}`} />)}
        {data.map((d) => (
          <button key={d.date} onClick={() => d.rate != null && onPick(d.date)} title={`${format(parseISO(d.date), 'EEE d MMM')}: ${d.rate == null ? 'no data' : `${d.done}/${d.total} (${d.rate}%)`}`}
            className={cn('aspect-square rounded-md text-[10px] font-medium transition hover:scale-110', d.rate == null ? 'cursor-default text-muted-foreground/40' : 'cursor-pointer', (d.rate ?? 0) > 60 && 'text-primary-foreground', selected === d.date && 'ring-2 ring-foreground/60')}
            style={{ background: color(d.rate) }}>
            {Number(d.date.slice(8))}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">Less {[10, 35, 60, 85, 100].map((r) => <span key={r} className="size-3 rounded-sm" style={{ background: color(r) }} />)} More</div>
    </div>
  )
}
