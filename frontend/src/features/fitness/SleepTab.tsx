import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BedDouble, Moon, Star, Sunrise } from 'lucide-react'
import { addDays, format, parseISO } from 'date-fns'
import { StatCard } from '@/components/common'
import { axisProps, ChartCard, gridProps, tooltipProps } from '@/components/charts'
import { ResourceTable } from '@/components/ResourceTable'
import { sleepFields } from '@/features/shared/forms'
import { useList } from '@/lib/queries'
import { useAuth } from '@/hooks/useAuth'
import { useToday } from '@/hooks/useToday'
import { fmtDate, fmtTime, toISODate } from '@/lib/date'
import { formatMinutes } from '@/lib/utils'
import type { SleepLog } from '@/types'

export function SleepTab() {
  const today = useToday()
  const { user } = useAuth()
  const goalH = user?.profile?.goals?.sleep_hours ?? 7
  const from = toISODate(addDays(parseISO(today), -13))
  const recent = useList<SleepLog>('sleep-logs', { from, to: today })
  const logs = recent.data ?? []
  const byDate = Object.fromEntries(logs.map((l) => [l.date, l]))
  const chart = Array.from({ length: 14 }, (_, i) => {
    const d = toISODate(addDays(parseISO(from), i))
    const l = byDate[d]
    return { date: d, hours: l ? +(l.duration_minutes / 60).toFixed(2) : null, quality: l?.quality ?? null }
  })
  const week = logs.filter((l) => l.date > toISODate(addDays(parseISO(today), -7)))
  const avg = week.length ? week.reduce((a, l) => a + l.duration_minutes, 0) / week.length : 0
  const avgQ = week.length ? week.reduce((a, l) => a + l.quality, 0) / week.length : 0
  const last = logs[0]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Last night" value={last ? formatMinutes(last.duration_minutes) : '—'} sub={last ? `${fmtTime(last.bedtime)} → ${fmtTime(last.wake_time)}` : 'No log yet'} icon={<BedDouble />} accent="#7c3aed" />
        <StatCard label="7-day average" value={week.length ? formatMinutes(avg) : '—'} sub={`Goal ${goalH} h`} icon={<Moon />} accent="#7c3aed" progress={(avg / 60 / goalH) * 100} />
        <StatCard label="Avg quality" value={week.length ? `${avgQ.toFixed(1)}/5` : '—'} icon={<Star />} accent="var(--productivity)" />
        <StatCard label="Planned" value={fmtTime(user?.profile?.sleep_time)} sub={`Wake ${fmtTime(user?.profile?.wake_time)}`} icon={<Sunrise />} accent="var(--deen)" />
      </div>
      <ChartCard title="Sleep chart" description="Hours slept (bars) and quality (line), last 14 days">
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart} margin={{ left: -20, right: -10 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="date" {...axisProps} tickFormatter={(d) => format(parseISO(d), 'd/M')} />
              <YAxis yAxisId="h" domain={[0, 10]} {...axisProps} />
              <YAxis yAxisId="q" orientation="right" domain={[0, 5]} {...axisProps} />
              <Tooltip {...tooltipProps} labelFormatter={(d) => fmtDate(String(d), 'EEE d MMM')} />
              <ReferenceLine yAxisId="h" y={goalH} stroke="#7c3aed" strokeDasharray="4 4" />
              <Bar yAxisId="h" dataKey="hours" name="Hours" fill="#7c3aed" radius={[4, 4, 0, 0]} opacity={0.85} />
              <Line yAxisId="q" dataKey="quality" name="Quality" stroke="var(--productivity)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
      <ResourceTable<SleepLog>
        resource="sleep-logs" title="Sleep log" addLabel="Log sleep" emptyText="Log bedtime and wake-up time; total sleep is calculated for you."
        columns={[
          { header: 'Date', cell: (r) => fmtDate(r.date, 'EEE d MMM yyyy') },
          { header: 'Bedtime', cell: (r) => fmtTime(r.bedtime) },
          { header: 'Wake', cell: (r) => fmtTime(r.wake_time) },
          { header: 'Total', cell: (r) => <span className="font-medium">{formatMinutes(r.duration_minutes)}</span> },
          { header: 'Quality', cell: (r) => '★'.repeat(r.quality) + '☆'.repeat(5 - r.quality) },
        ]}
        fields={sleepFields}
        defaults={() => ({ date: today, bedtime: (user?.profile?.sleep_time ?? '22:00').slice(0, 5), wake_time: (user?.profile?.wake_time ?? '05:30').slice(0, 5), quality: '4', notes: '' })}
        toForm={(r) => ({ ...r, quality: String(r.quality), bedtime: r.bedtime.slice(0, 5), wake_time: r.wake_time.slice(0, 5) })}
      />
    </div>
  )
}
