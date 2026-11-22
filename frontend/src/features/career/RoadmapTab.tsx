import { useMemo, useState } from 'react'
import { CalendarClock, Pencil, Plus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { EmptyState, ErrorState, LoadingGrid, StatCard } from '@/components/common'
import { ConfirmDelete } from '@/components/ConfirmDelete'
import { FormDialog } from '@/components/FormDialog'
import { useList, useResource } from '@/lib/queries'
import { fmtDate } from '@/lib/date'
import { formatMinutes } from '@/lib/utils'
import type { LearningTopic, TopicStatus } from '@/types'

export const TOPIC_STATUS: Record<TopicStatus, { label: string; variant: 'secondary' | 'default' | 'warning' | 'success' }> = {
  not_started: { label: 'Not started', variant: 'secondary' },
  learning: { label: 'Learning', variant: 'default' },
  practicing: { label: 'Practicing', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
}
const statusOptions = Object.entries(TOPIC_STATUS).map(([value, v]) => ({ value, label: v.label }))

export function RoadmapTab() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const list = useList<LearningTopic>('learning-topics')
  const { create, update, remove } = useResource<LearningTopic>('learning-topics')
  const [editing, setEditing] = useState<LearningTopic | null>(null)
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => (list.data ?? []).filter((t) => (!status || t.status === status) && (!q || `${t.name} ${t.category}`.toLowerCase().includes(q.toLowerCase()))), [list.data, q, status])
  const groups = useMemo(() => filtered.reduce<Record<string, LearningTopic[]>>((acc, t) => { (acc[t.category] ??= []).push(t); return acc }, {}), [filtered])
  const all = list.data ?? []
  const avg = all.length ? Math.round(all.reduce((a, t) => a + t.progress, 0) / all.length) : 0

  return (
    <div className="space-y-6">
      {list.isLoading ? <LoadingGrid /> : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Overall progress" value={`${avg}%`} sub={`${all.length} topics`} accent="var(--career)" progress={avg} />
          {(['learning', 'practicing', 'completed'] as TopicStatus[]).map((s) => <StatCard key={s} label={TOPIC_STATUS[s].label} value={all.filter((t) => t.status === s).length} sub="topics" />)}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative"><Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search topics…" className="h-9 w-56 pl-8" /></div>
        <Select className="w-40" value={status} onValueChange={setStatus} options={[{ value: '', label: 'All statuses' }, ...statusOptions]} />
        <Button className="ml-auto" onClick={() => { setEditing(null); setOpen(true) }}><Plus /> Add topic</Button>
      </div>
      {list.isError ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : !list.isLoading && filtered.length === 0 ? <EmptyState title="No topics found" description="Add a topic to your learning roadmap." /> : (
        <div className="space-y-6">
          {Object.entries(groups).map(([cat, topics]) => (
            <div key={cat}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{cat}</h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {topics.map((t) => (
                  <Card key={t.id} className="group p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{t.name}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          {t.minutes_total ? <span>{formatMinutes(Number(t.minutes_total))} studied</span> : <span>No sessions yet</span>}
                          {t.target_date && <span className="inline-flex items-center gap-1"><CalendarClock className="size-3" />{fmtDate(t.target_date, 'd MMM yyyy')}</span>}
                        </p>
                      </div>
                      <div className="flex opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                        <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(t); setOpen(true) }} aria-label="Edit"><Pencil /></Button>
                        <ConfirmDelete onConfirm={() => remove.mutateAsync(t.id)} label={t.name} />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Select className="h-8 w-36 text-xs" value={t.status} onValueChange={(v) => update.mutate({ id: t.id, status: v })} options={statusOptions} />
                      <Badge variant={TOPIC_STATUS[t.status].variant} className="ml-auto">{t.progress}%</Badge>
                    </div>
                    <input type="range" min={0} max={100} step={5} defaultValue={t.progress} key={t.progress} aria-label="Progress"
                      onMouseUp={(e) => update.mutate({ id: t.id, progress: Number((e.target as HTMLInputElement).value) })}
                      onTouchEnd={(e) => update.mutate({ id: t.id, progress: Number((e.target as HTMLInputElement).value) })}
                      onKeyUp={(e) => update.mutate({ id: t.id, progress: Number((e.target as HTMLInputElement).value) })}
                      className="mt-3 w-full cursor-pointer accent-[var(--career)]" />
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <FormDialog open={open} onOpenChange={setOpen} title={editing ? 'Edit topic' : 'Add topic'}
        fields={[
          { name: 'name', label: 'Topic', required: true },
          { name: 'category', label: 'Category', placeholder: 'e.g. Backend' },
          { name: 'status', label: 'Status', type: 'select', options: statusOptions },
          { name: 'progress', label: 'Progress (%)', type: 'number', min: 0, max: 100 },
          { name: 'target_date', label: 'Target date', type: 'date' },
          { name: 'notes', label: 'Notes / resources', type: 'textarea' },
        ]}
        initial={editing ? { ...editing } : { name: '', category: '', status: 'not_started', progress: 0, target_date: '', notes: '' }}
        onSubmit={(v) => (editing ? update.mutateAsync({ ...v, id: editing.id }) : create.mutateAsync(v))} />
    </div>
  )
}
