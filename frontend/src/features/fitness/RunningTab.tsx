import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Footprints, Gauge, Medal, Route } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { LoadingGrid, StatCard } from '@/components/common'
import { axisProps, ChartCard, gridProps, tooltipProps } from '@/components/charts'
import { ResourceTable } from '@/components/ResourceTable'
import { runFields } from '@/features/shared/forms'
import { useApi } from '@/lib/queries'
import { useToday } from '@/hooks/useToday'
import { fmtDate } from '@/lib/date'
import { formatDuration, formatPace } from '@/lib/utils'
import type { RunningLog } from '@/types'

interface RunStats {
  this_week: { km: number; runs: number; avg_pace: number | null }; weekly_goal_km: number
  weeks: { week: string; km: number; runs: number; avg_pace: number | null }[]
  total_km: number; total_runs: number; longest_km: number; best_pace: number | null
}

export function RunningTab() {
  const today = useToday()
  const stats = useApi<RunStats>('running-logs/stats')
  const s = stats.data
  return (
    <div className="space-y-6">
      {!s ? <LoadingGrid /> : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="This week" value={`${s.this_week.km} km`} sub={`${s.this_week.runs} runs · goal ${s.weekly_goal_km} km`} icon={<Footprints />} accent="var(--fitness)" progress={(s.this_week.km / Math.max(1, s.weekly_goal_km)) * 100} />
          <StatCard label="Avg pace (week)" value={formatPace(s.this_week.avg_pace)} sub={`Best ${formatPace(s.best_pace)}`} icon={<Gauge />} accent="var(--career)" />
          <StatCard label="Longest run" value={`${s.longest_km || 0} km`} icon={<Medal />} accent="var(--productivity)" />
          <StatCard label="All time" value={`${s.total_km} km`} sub={`${s.total_runs} runs`} icon={<Route />} accent="var(--deen)" />
        </div>
      )}
      {s && (
        <ChartCard title="Weekly running distance" description="Last 12 weeks (weeks start Saturday)">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.weeks} margin={{ left: -20 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="week" {...axisProps} tickFormatter={(d) => format(parseISO(d), 'd MMM')} />
                <YAxis {...axisProps} />
                <Tooltip {...tooltipProps} labelFormatter={(d) => `Week of ${fmtDate(String(d), 'd MMM')}`} formatter={(v, n) => [n === 'km' ? `${v} km` : v, n === 'km' ? 'Distance' : 'Runs']} />
                <ReferenceLine y={s.weekly_goal_km} stroke="var(--fitness)" strokeDasharray="4 4" />
                <Bar dataKey="km" fill="var(--fitness)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}
      <ResourceTable<RunningLog>
        resource="running-logs" title="Runs" addLabel="Log run" emptyText="Track distance, duration and pace — calories are estimated automatically."
        columns={[
          { header: 'Date', cell: (r) => fmtDate(r.date, 'EEE d MMM yyyy') },
          { header: 'Distance', cell: (r) => <span className="font-medium tabular-nums">{r.distance_km} km</span> },
          { header: 'Duration', cell: (r) => <span className="tabular-nums">{formatDuration(r.duration_seconds)}</span> },
          { header: 'Pace', cell: (r) => <span className="tabular-nums">{formatPace(r.pace_seconds_per_km)}</span> },
          { header: 'Calories', cell: (r) => (r.calories ? `${r.calories} kcal` : '—') },
          { header: 'Notes', cell: (r) => <span className="line-clamp-1 max-w-xs text-muted-foreground">{r.notes || '—'}</span> },
        ]}
        fields={runFields}
        defaults={() => ({ date: today, distance_km: 5, duration_seconds: 1800, calories: '', notes: '' })}
      />
    </div>
  )
}
