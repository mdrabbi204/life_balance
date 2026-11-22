import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { format, parseISO } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { DateNav, ErrorState, LoadingBlock, StatCard } from '@/components/common'
import { axisProps, ChartCard, gridProps, tooltipProps } from '@/components/charts'
import { useApi } from '@/lib/queries'
import { useToday } from '@/hooks/useToday'
import { fmtTime } from '@/lib/date'
import { PRAYERS } from '@/lib/constants'
import { PrayerTracker } from './PrayerTracker'
import { NextPrayerCard } from './NextPrayer'
import type { PrayerTimes } from '@/types'

interface SalahReport {
  period: string; from: string; to: string
  days: { date: string; on_time: number; delayed: number; missed: number }[]
  by_prayer: { prayer: string; on_time: number; delayed: number; missed: number; congregation: number }[]
  totals: { expected: number; on_time: number; delayed: number; missed: number; unlogged: number; consistency: number; on_time_rate: number }
}

export function SalahTab() {
  const today = useToday()
  const [date, setDate] = useState(today)
  const [period, setPeriod] = useState('week')
  const [month, setMonth] = useState(today.slice(0, 7))
  const times = useApi<PrayerTimes>('prayer-times', { date: today })
  const report = useApi<SalahReport>('reports/salah', { period, date })
  const table = useApi<{ days: { date: string; times: PrayerTimes['times'] }[] }>('prayer-times/month', { month })

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Salah tracker</h3>
          <DateNav value={date} onChange={setDate} max={today} />
        </div>
        <PrayerTracker date={date} />
      </div>
      <div className="space-y-4">
        {times.data && <NextPrayerCard prayer={times.data} />}
        {report.data && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Consistency" value={`${report.data.totals.consistency}%`} sub={`${report.data.totals.on_time + report.data.totals.delayed}/${report.data.totals.expected} prayed`} accent="var(--deen)" progress={report.data.totals.consistency} />
            <StatCard label="On time" value={`${report.data.totals.on_time_rate}%`} sub={`${report.data.totals.missed} missed · ${report.data.totals.unlogged} unlogged`} accent="var(--success)" progress={report.data.totals.on_time_rate} />
          </div>
        )}
      </div>

      <ChartCard className="lg:col-span-2" title="Salah report" description={report.data ? `${format(parseISO(report.data.from), 'd MMM')} – ${format(parseISO(report.data.to), 'd MMM yyyy')}` : undefined}
        action={<Select className="w-32" value={period} onValueChange={setPeriod} options={[{ value: 'day', label: 'Daily' }, { value: 'week', label: 'Weekly' }, { value: 'month', label: 'Monthly' }]} />}>
        {report.isLoading ? <LoadingBlock className="h-60" /> : report.isError ? <ErrorState error={report.error} /> : (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(period === 'day'
                ? report.data!.by_prayer.map((p) => ({ on_time: p.on_time, delayed: p.delayed, missed: p.missed, label: p.prayer }))
                : report.data!.days.map((d) => ({ on_time: d.on_time, delayed: d.delayed, missed: d.missed, label: format(parseISO(d.date), period === 'week' ? 'EEE' : 'd') })))} margin={{ left: -20 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip {...tooltipProps} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="on_time" name="On time" stackId="a" fill="var(--success)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="delayed" name="Delayed" stackId="a" fill="var(--warning)" />
                <Bar dataKey="missed" name="Missed" stackId="a" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <Card>
        <CardHeader><CardTitle>By prayer</CardTitle></CardHeader>
        <CardContent className="px-0">
          <Table>
            <THead><TR><TH>Prayer</TH><TH className="text-right">On time</TH><TH className="text-right">Late</TH><TH className="text-right">Missed</TH><TH className="text-right">Jama'ah</TH></TR></THead>
            <TBody>
              {report.data?.by_prayer.map((p) => (
                <TR key={p.prayer}><TD className="capitalize font-medium">{p.prayer}</TD><TD className="text-right tabular-nums">{p.on_time}</TD><TD className="text-right tabular-nums">{p.delayed}</TD><TD className="text-right tabular-nums">{p.missed}</TD><TD className="text-right tabular-nums">{p.congregation}</TD></TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Monthly prayer timetable</CardTitle>
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm" />
        </CardHeader>
        <CardContent className="px-0">
          {table.isLoading ? <LoadingBlock className="mx-5 h-40 w-auto" /> : (
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              <Table>
                <THead><TR><TH>Date</TH>{PRAYERS.map((p) => <TH key={p.key}>{p.name}</TH>)}<TH>Sunrise</TH></TR></THead>
                <TBody>
                  {table.data?.days.map((d) => (
                    <TR key={d.date} className={d.date === today ? 'bg-primary/8 font-medium' : ''}>
                      <TD className="whitespace-nowrap">{format(parseISO(d.date), 'EEE d')}</TD>
                      {PRAYERS.map((p) => <TD key={p.key} className="tabular-nums whitespace-nowrap">{fmtTime(d.times[p.key])}</TD>)}
                      <TD className="tabular-nums whitespace-nowrap text-muted-foreground">{fmtTime(d.times.sunrise)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
