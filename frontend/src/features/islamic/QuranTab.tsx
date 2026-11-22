import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BookOpen, Flame, Trophy } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { StatCard, LoadingGrid } from '@/components/common'
import { axisProps, ChartCard, gridProps, tooltipProps } from '@/components/charts'
import { ResourceTable } from '@/components/ResourceTable'
import { useApi } from '@/lib/queries'
import { useToday } from '@/hooks/useToday'
import { SURAHS, surahOptions } from '@/lib/constants'
import { fmtDate } from '@/lib/date'
import type { QuranLog } from '@/types'

interface QuranStats {
  streak: number; best_streak: number; goal: number; today_pages: number; total_pages_30: number; total_pages_year: number
  history: { date: string; pages: number; goal_met: boolean }[]
  last_position: { surah_number: number; ayah_to: number | null; date: string } | null
}

export function QuranTab() {
  const today = useToday()
  const stats = useApi<QuranStats>('quran-logs/stats')
  const s = stats.data
  return (
    <div className="space-y-6">
      {!s ? <LoadingGrid /> : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Today" value={`${s.today_pages}/${s.goal}`} sub="pages read" icon={<BookOpen />} accent="var(--deen)" progress={(s.today_pages / Math.max(1, s.goal)) * 100} />
          <StatCard label="Reading streak" value={`${s.streak} days`} sub={`Best ${s.best_streak} days`} icon={<Flame />} accent="var(--fitness)" />
          <StatCard label="Last 30 days" value={`${s.total_pages_30} pages`} sub={`${s.history.filter((h) => h.goal_met).length} days met target`} icon={<Trophy />} accent="var(--productivity)" />
          <StatCard label="Where you left off" value={s.last_position ? SURAHS[s.last_position.surah_number - 1] : '—'} sub={s.last_position ? `${s.last_position.ayah_to ? `Ayah ${s.last_position.ayah_to} · ` : ''}${fmtDate(s.last_position.date, 'd MMM')}` : 'Log a surah to track position'} />
        </div>
      )}
      {s && (
        <ChartCard title="Daily completion history" description="Pages per day — the dashed line is your daily target">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.history} margin={{ left: -20 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" {...axisProps} tickFormatter={(d) => format(parseISO(d), 'd')} interval={2} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip {...tooltipProps} labelFormatter={(d) => fmtDate(String(d), 'EEE d MMM')} />
                <ReferenceLine y={s.goal} stroke="var(--deen)" strokeDasharray="4 4" />
                <Bar dataKey="pages" name="Pages" fill="var(--deen)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}
      <ResourceTable<QuranLog>
        resource="quran-logs" title="Quran reading log" addLabel="Log reading"
        emptyText="Record the pages you read, the surah and reflections."
        columns={[
          { header: 'Date', cell: (r) => fmtDate(r.date, 'EEE d MMM yyyy') },
          { header: 'Pages', cell: (r) => <span className="tabular-nums">{r.pages_read}</span> },
          { header: 'Surah', cell: (r) => (r.surah_number ? `${SURAHS[r.surah_number - 1]}${r.ayah_from ? ` ${r.ayah_from}–${r.ayah_to ?? ''}` : ''}` : '—') },
          { header: 'Minutes', cell: (r) => r.minutes || '—' },
          { header: 'Notes', cell: (r) => <span className="line-clamp-1 max-w-xs text-muted-foreground">{r.notes || '—'}</span> },
        ]}
        fields={[
          { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'pages_read', label: 'Pages read', type: 'number', required: true, min: 0 },
          { name: 'surah_number', label: 'Surah', type: 'select', options: surahOptions, placeholder: 'Select surah' },
          { name: 'minutes', label: 'Minutes', type: 'number', min: 0 },
          { name: 'ayah_from', label: 'From ayah', type: 'number', min: 1 },
          { name: 'ayah_to', label: 'To ayah', type: 'number', min: 1 },
          { name: 'notes', label: 'Reflections / notes', type: 'textarea' },
        ]}
        defaults={() => ({ date: today, pages_read: s?.goal ?? 4, surah_number: s?.last_position ? String(s.last_position.surah_number) : '', minutes: '', ayah_from: '', ayah_to: '', notes: '' })}
        toForm={(r) => ({ ...r, surah_number: r.surah_number ? String(r.surah_number) : '' })}
      />
    </div>
  )
}
