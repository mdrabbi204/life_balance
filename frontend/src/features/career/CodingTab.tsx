import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Clock, Code2, FolderCheck, GitCommitHorizontal, Puzzle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { LoadingGrid, StatCard } from '@/components/common'
import { axisProps, ChartCard, gridProps, tooltipProps } from '@/components/charts'
import { ResourceTable } from '@/components/ResourceTable'
import { sessionFields } from '@/features/shared/forms'
import { useApi, useList } from '@/lib/queries'
import { useAuth } from '@/hooks/useAuth'
import { useToday } from '@/hooks/useToday'
import { fmtDate } from '@/lib/date'
import { formatMinutes } from '@/lib/utils'
import type { LearningSession, LearningTopic } from '@/types'

interface CodingStats {
  today_minutes: number; week_minutes: number; month_minutes: number; challenges_month: number; contributions_month: number; projects_completed: number
  daily: { date: string; minutes: number }[]; by_topic: { topic: string; minutes: number }[]
}

export function CodingTab() {
  const today = useToday()
  const { user } = useAuth()
  const goal = user?.profile?.goals?.study_minutes ?? 60
  const stats = useApi<CodingStats>('learning-sessions/stats')
  const topics = useList<LearningTopic>('learning-topics')
  const s = stats.data

  return (
    <div className="space-y-6">
      {!s ? <LoadingGrid count={5} className="lg:grid-cols-5" /> : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard label="Today" value={formatMinutes(s.today_minutes)} sub={`Goal ${formatMinutes(goal)}`} icon={<Clock />} accent="var(--career)" progress={(s.today_minutes / goal) * 100} />
          <StatCard label="This week" value={formatMinutes(s.week_minutes)} sub="last 7 days" icon={<Code2 />} accent="var(--career)" />
          <StatCard label="Challenges" value={s.challenges_month} sub="last 30 days" icon={<Puzzle />} accent="var(--productivity)" />
          <StatCard label="Contributions" value={s.contributions_month} sub="last 30 days" icon={<GitCommitHorizontal />} accent="var(--fitness)" />
          <StatCard label="Projects completed" value={s.projects_completed} sub="all time" icon={<FolderCheck />} accent="var(--success)" />
        </div>
      )}
      {s && (
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard className="lg:col-span-2" title="Programming hours" description="Last 14 days">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.daily.map((d) => ({ ...d, hours: +(d.minutes / 60).toFixed(2) }))} margin={{ left: -20 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="date" {...axisProps} tickFormatter={(d) => format(parseISO(d), 'd MMM')} />
                  <YAxis {...axisProps} />
                  <Tooltip {...tooltipProps} labelFormatter={(d) => fmtDate(String(d), 'EEE d MMM')} formatter={(v) => [`${v} h`, 'Study']} />
                  <Bar dataKey="hours" fill="var(--career)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
          <ChartCard title="Time by topic" description="Last 30 days">
            {s.by_topic.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No sessions yet.</p> : (
              <ul className="space-y-3">
                {s.by_topic.map((t) => (
                  <li key={t.topic}>
                    <div className="mb-1 flex justify-between text-sm"><span className="truncate">{t.topic}</span><span className="tabular-nums text-muted-foreground">{formatMinutes(t.minutes)}</span></div>
                    <div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-career" style={{ width: `${(t.minutes / s.by_topic[0].minutes) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>
        </div>
      )}
      <ResourceTable<LearningSession>
        resource="learning-sessions" title="Study sessions" addLabel="Log session"
        emptyText="Log programming study, challenges solved and technical notes."
        columns={[
          { header: 'Date', cell: (r) => fmtDate(r.date, 'EEE d MMM') },
          { header: 'Time', cell: (r) => formatMinutes(r.minutes) },
          { header: 'Topic', cell: (r) => <div><p className="font-medium">{r.topic?.name ?? 'General'}</p>{r.topics_studied && <p className="text-xs text-muted-foreground">{r.topics_studied}</p>}</div> },
          { header: 'Challenges', cell: (r) => r.challenges_solved || '—' },
          { header: 'Commits', cell: (r) => r.github_contributions || '—' },
          { header: 'Notes', cell: (r) => <span className="line-clamp-2 max-w-xs text-muted-foreground">{r.notes || '—'}</span> },
        ]}
        fields={sessionFields(topics.data ?? [])}
        defaults={() => ({ date: today, minutes: 60, learning_topic_id: '', topics_studied: '', challenges_solved: 0, github_contributions: 0, notes: '' })}
        toForm={(r) => ({ ...r, learning_topic_id: r.learning_topic_id ? String(r.learning_topic_id) : '' })}
      />
    </div>
  )
}
