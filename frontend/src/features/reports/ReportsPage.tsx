import { useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, BedDouble, BookOpen, Code2, Download, FileText, Footprints, Moon, Scale, Target, Dumbbell } from 'lucide-react'
import { addDays, format, parseISO, startOfMonth } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { ErrorState, LoadingBlock, LoadingGrid, PageHeader, StatCard } from '@/components/common'
import { axisProps, ChartCard, gridProps, tooltipProps } from '@/components/charts'
import { useApi } from '@/lib/queries'
import { useToday } from '@/hooks/useToday'
import { toISODate } from '@/lib/date'
import { exportCsv, exportPdf } from '@/lib/export'
import { SCORE_META } from '@/lib/constants'
import { capitalize, formatMinutes } from '@/lib/utils'
import { TOPIC_STATUS } from '@/features/career/RoadmapTab'
import type { ScoreKey, TopicStatus } from '@/types'

interface DayRow {
  date: string; is_future: boolean; is_rest_day: boolean; overall: number | null; deen: number | null; career: number | null; fitness: number | null; productivity: number | null; family: number | null
  discipline: number | null; completion: number | null; salah_on_time: number; salah_delayed: number; salah_missed: number; salah_prayed: number
  quran_pages: number; quran_minutes: number; study_minutes: number; challenges: number; run_km: number; workouts: number
  sleep_minutes: number | null; sleep_quality: number | null; water_ml: number; protein_g: number; calories: number; habits_done: number; habits_total: number
}
interface Summary {
  from: string; to: string; days: DayRow[]
  totals: Record<string, number | null>
  salah_by_prayer: { prayer: string; on_time: number; delayed: number; missed: number }[]
  learning: { topics: number; by_status: Record<TopicStatus, number>; avg_progress: number; items: { id: number; name: string; status: TopicStatus; progress: number }[] }
  habits: { overall_rate: number | null; habits: { id: number; name: string; color: string; rate: number | null; current_streak: number; best_streak: number }[] }
}

const CSV_COLUMNS = [
  ['date', 'Date'], ['overall', 'Overall score'], ['deen', 'Deen'], ['career', 'Career'], ['fitness', 'Fitness'], ['productivity', 'Productivity'], ['family', 'Personal & family'],
  ['discipline', 'Discipline'], ['completion', 'Completion %'], ['salah_on_time', 'Salah on time'], ['salah_delayed', 'Salah delayed'], ['salah_missed', 'Salah missed'],
  ['quran_pages', 'Quran pages'], ['study_minutes', 'Study minutes'], ['challenges', 'Challenges'], ['run_km', 'Run km'], ['workouts', 'Workouts'],
  ['sleep_minutes', 'Sleep minutes'], ['sleep_quality', 'Sleep quality'], ['water_ml', 'Water ml'], ['protein_g', 'Protein g'], ['calories', 'Calories'], ['habits_done', 'Habits done'], ['habits_total', 'Habits planned'],
].map(([key, label]) => ({ key, label }))

export default function ReportsPage() {
  const today = useToday()
  const [preset, setPreset] = useState('30')
  const [custom, setCustom] = useState({ from: toISODate(addDays(parseISO(today), -29)), to: today })
  const range = useMemo(() => {
    if (preset === 'custom') return custom
    if (preset === 'month') return { from: toISODate(startOfMonth(parseISO(today))), to: today }
    return { from: toISODate(addDays(parseISO(today), -(Number(preset) - 1))), to: today }
  }, [preset, custom, today])
  const q = useApi<Summary>('reports/summary', range)
  const data = q.data
  const days = useMemo(() => (data?.days ?? []).filter((d) => !d.is_future).map((d) => ({ ...d, label: format(parseISO(d.date), data && data.days.length > 40 ? 'd/M' : 'd MMM'), study_hours: +(d.study_minutes / 60).toFixed(2), sleep_hours: d.sleep_minutes ? +(d.sleep_minutes / 60).toFixed(2) : null, habit_rate: d.habits_total ? Math.round((d.habits_done / d.habits_total) * 100) : null })), [data])
  const weekly = useMemo(() => {
    const out: { week: string; overall: number | null; study_hours: number; run_km: number; salah: number }[] = []
    for (let i = 0; i < days.length; i += 7) {
      const chunk = days.slice(i, i + 7)
      const scores = chunk.map((c) => c.overall).filter((x): x is number => x !== null)
      out.push({ week: chunk[0].label, overall: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null, study_hours: +chunk.reduce((a, c) => a + c.study_hours, 0).toFixed(1), run_km: +chunk.reduce((a, c) => a + c.run_km, 0).toFixed(1), salah: chunk.reduce((a, c) => a + c.salah_prayed, 0) })
    }
    return out
  }, [days])

  const t = data?.totals ?? {}
  const salahPct = t.salah_expected ? Math.round((((t.salah_on_time ?? 0) + (t.salah_delayed ?? 0)) / (t.salah_expected ?? 1)) * 100) : 0
  const rangeLabel = `${format(parseISO(range.from), 'd MMM yyyy')} – ${format(parseISO(range.to), 'd MMM yyyy')}`

  const onCsv = () => data && exportCsv(data.days.filter((d) => !d.is_future) as unknown as Record<string, unknown>[], CSV_COLUMNS, `lifebalance-report-${range.from}-to-${range.to}.csv`)
  const onPdf = () => data && exportPdf({
    title: 'LifeBalance Report', subtitle: rangeLabel, filename: `lifebalance-report-${range.from}-to-${range.to}.pdf`,
    summary: [
      ['Average life balance score', String(t.overall_avg ?? '—')], ['Average discipline', `${t.discipline_avg ?? '—'}%`],
      ['Salah consistency', `${salahPct}% (${t.salah_on_time} on time, ${t.salah_delayed} delayed, ${t.salah_missed} missed)`],
      ['Quran pages', `${t.quran_pages} pages on ${t.quran_days} days`], ['Programming', formatMinutes(t.study_minutes ?? 0)], ['Coding challenges', String(t.challenges)],
      ['Running', `${t.run_km} km over ${t.run_days} runs`], ['Strength workouts', String(t.workouts)], ['Average sleep', t.sleep_avg_minutes ? formatMinutes(t.sleep_avg_minutes) : '—'],
      ['Habit consistency', `${data.habits.overall_rate ?? '—'}%`], ['Learning roadmap progress', `${data.learning.avg_progress}%`],
    ],
    sections: [
      { title: 'Daily performance', columns: ['Date', 'Overall', 'Deen', 'Career', 'Fitness', 'Prod.', 'Family', 'Salah', 'Quran', 'Study', 'Run km', 'Sleep'], rows: data.days.filter((d) => !d.is_future).map((d) => [d.date, d.overall ?? '—', d.deen ?? '—', d.career ?? '—', d.fitness ?? '—', d.productivity ?? '—', d.family ?? '—', `${d.salah_prayed}/5`, d.quran_pages, formatMinutes(d.study_minutes), d.run_km, d.sleep_minutes ? formatMinutes(d.sleep_minutes) : '—']) },
      { title: 'Habit consistency', columns: ['Habit', 'Completion', 'Current streak', 'Best streak'], rows: data.habits.habits.map((h) => [h.name, h.rate == null ? '—' : `${h.rate}%`, h.current_streak, h.best_streak]) },
      { title: 'Learning roadmap', columns: ['Topic', 'Status', 'Progress'], rows: data.learning.items.map((i) => [i.name, TOPIC_STATUS[i.status].label, `${i.progress}%`]) },
    ],
  })

  return (
    <>
      <PageHeader title="Reports & Analytics" description={rangeLabel} icon={<BarChart3 />}
        actions={<>
          <Select className="w-40" value={preset} onValueChange={setPreset} options={[{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: 'month', label: 'This month' }, { value: '90', label: 'Last 90 days' }, { value: 'custom', label: 'Custom range' }]} />
          {preset === 'custom' && <><Input type="date" className="w-[150px]" value={custom.from} max={custom.to} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} /><Input type="date" className="w-[150px]" value={custom.to} min={custom.from} max={today} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} /></>}
          <Button variant="outline" onClick={onCsv} disabled={!data}><Download /> CSV</Button>
          <Button variant="outline" onClick={onPdf} disabled={!data}><FileText /> PDF</Button>
        </>} />

      {q.isLoading ? <div className="space-y-4"><LoadingGrid count={8} /><LoadingBlock /></div> : q.isError || !data ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Avg balance score" value={t.overall_avg ?? '—'} sub={`Discipline ${t.discipline_avg ?? '—'}%`} icon={<Scale />} accent="var(--primary)" progress={t.overall_avg ?? 0} />
            <StatCard label="Salah consistency" value={`${salahPct}%`} sub={`${t.salah_on_time} on time · ${t.salah_missed} missed`} icon={<Moon />} accent="var(--deen)" progress={salahPct} />
            <StatCard label="Quran" value={`${t.quran_pages} pages`} sub={`read on ${t.quran_days}/${t.days} days`} icon={<BookOpen />} accent="var(--deen)" />
            <StatCard label="Programming" value={formatMinutes(t.study_minutes ?? 0)} sub={`${t.challenges} challenges solved`} icon={<Code2 />} accent="var(--career)" />
            <StatCard label="Running" value={`${t.run_km} km`} sub={`${t.run_days} runs`} icon={<Footprints />} accent="var(--fitness)" />
            <StatCard label="Workouts" value={t.workouts ?? 0} sub={`${t.active_days} active days`} icon={<Dumbbell />} accent="var(--fitness)" />
            <StatCard label="Avg sleep" value={t.sleep_avg_minutes ? formatMinutes(t.sleep_avg_minutes) : '—'} icon={<BedDouble />} accent="#7c3aed" />
            <StatCard label="Habit consistency" value={data.habits.overall_rate != null ? `${data.habits.overall_rate}%` : '—'} sub={`Roadmap ${data.learning.avg_progress}%`} icon={<Target />} accent="var(--productivity)" progress={data.habits.overall_rate ?? 0} />
          </div>

          <ChartCard title="Daily performance" description="Life balance score per area">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={days} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" {...axisProps} minTickGap={16} />
                  <YAxis domain={[0, 100]} {...axisProps} />
                  <Tooltip {...tooltipProps} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line dataKey="overall" name="Overall" stroke="var(--primary)" strokeWidth={3} dot={false} connectNulls />
                  {(Object.keys(SCORE_META) as ScoreKey[]).map((k) => <Line key={k} dataKey={k} name={SCORE_META[k].label} stroke={SCORE_META[k].color} strokeWidth={1.5} dot={false} connectNulls opacity={0.75} />)}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Weekly performance" description="Average score and weekly totals">
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekly} margin={{ left: -20 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="week" {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip {...tooltipProps} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="overall" name="Avg score" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="study_hours" name="Study h" fill="var(--career)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="run_km" name="Run km" fill="var(--fitness)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            <ChartCard title="Salah consistency" description="Prayers per day">
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={days} margin={{ left: -25 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="label" {...axisProps} minTickGap={16} />
                    <YAxis domain={[0, 5]} allowDecimals={false} {...axisProps} />
                    <Tooltip {...tooltipProps} />
                    <Bar dataKey="salah_on_time" name="On time" stackId="s" fill="var(--success)" />
                    <Bar dataKey="salah_delayed" name="Delayed" stackId="s" fill="var(--warning)" />
                    <Bar dataKey="salah_missed" name="Missed" stackId="s" fill="var(--destructive)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            <ChartCard title="Quran reading" description="Pages per day">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={days} margin={{ left: -25 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="label" {...axisProps} minTickGap={16} />
                    <YAxis allowDecimals={false} {...axisProps} />
                    <Tooltip {...tooltipProps} />
                    <Area dataKey="quran_pages" name="Pages" stroke="var(--deen)" fill="var(--deen)" fillOpacity={0.2} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            <ChartCard title="Programming hours" description="Daily study time">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={days} margin={{ left: -25 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="label" {...axisProps} minTickGap={16} />
                    <YAxis {...axisProps} />
                    <Tooltip {...tooltipProps} formatter={(v) => [`${v} h`, 'Study']} />
                    <Bar dataKey="study_hours" fill="var(--career)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            <ChartCard title="Running distance & workouts" description="km per day, strength sessions">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={days} margin={{ left: -25 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="label" {...axisProps} minTickGap={16} />
                    <YAxis {...axisProps} />
                    <Tooltip {...tooltipProps} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="run_km" name="Run km" fill="var(--fitness)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="workouts" name="Workouts" fill="var(--career)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            <ChartCard title="Sleep trend" description="Hours and quality">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={days} margin={{ left: -25 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="label" {...axisProps} minTickGap={16} />
                    <YAxis yAxisId="h" domain={[0, 10]} {...axisProps} />
                    <YAxis yAxisId="q" orientation="right" domain={[0, 5]} {...axisProps} hide />
                    <Tooltip {...tooltipProps} />
                    <Line yAxisId="h" dataKey="sleep_hours" name="Hours" stroke="#7c3aed" strokeWidth={2} dot={false} connectNulls />
                    <Line yAxisId="q" dataKey="sleep_quality" name="Quality" stroke="var(--productivity)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader><CardTitle>Salah by prayer</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {data.salah_by_prayer.map((p) => {
                  const total = Math.max(1, t.days ?? 1)
                  return (
                    <div key={p.prayer}>
                      <div className="mb-1 flex justify-between text-sm"><span className="capitalize">{p.prayer}</span><span className="text-xs text-muted-foreground">{p.on_time} on time · {p.delayed} late · {p.missed} missed</span></div>
                      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                        <div className="bg-success" style={{ width: `${(p.on_time / total) * 100}%` }} /><div className="bg-warning" style={{ width: `${(p.delayed / total) * 100}%` }} /><div className="bg-destructive" style={{ width: `${(p.missed / total) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Habit consistency</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {data.habits.habits.map((h) => (
                  <div key={h.id}>
                    <div className="mb-1 flex justify-between text-sm"><span className="truncate">{h.name}</span><span className="text-xs tabular-nums text-muted-foreground">{h.rate ?? '—'}{h.rate != null && '%'}</span></div>
                    <Progress value={h.rate ?? 0} color={h.color} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Learning roadmap progress</CardTitle><p className="text-sm text-muted-foreground">{Object.entries(data.learning.by_status).map(([k, v]) => `${v} ${TOPIC_STATUS[k as TopicStatus].label.toLowerCase()}`).join(' · ')}</p></CardHeader>
              <CardContent className="max-h-80 space-y-3 overflow-y-auto scrollbar-thin">
                {data.learning.items.map((i) => (
                  <div key={i.id}>
                    <div className="mb-1 flex justify-between text-sm"><span className="truncate">{i.name}</span><span className="text-xs text-muted-foreground">{capitalize(i.status)} · {i.progress}%</span></div>
                    <Progress value={i.progress} color="var(--career)" className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
