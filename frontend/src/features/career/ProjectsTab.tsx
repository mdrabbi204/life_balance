import { useState } from 'react'
import { ArrowLeft, CalendarDays, FolderKanban, Pencil, Plus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { EmptyState, ErrorState, LoadingGrid } from '@/components/common'
import { ConfirmDelete } from '@/components/ConfirmDelete'
import { FormDialog, type Field } from '@/components/FormDialog'
import { useApi, useList, useResource } from '@/lib/queries'
import { fmtDate } from '@/lib/date'
import { PRIORITY_VARIANT } from '@/lib/constants'
import { capitalize } from '@/lib/utils'
import type { Project } from '@/types'
import { KanbanBoard } from './KanbanBoard'

const PRIORITIES = ['low', 'medium', 'high', 'urgent'].map((v) => ({ value: v, label: capitalize(v) }))
const STATUSES = ['planning', 'active', 'on_hold', 'completed'].map((v) => ({ value: v, label: capitalize(v) }))

const projectFields: Field[] = [
  { name: 'name', label: 'Project name', required: true, full: true },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'technologies', label: 'Technologies', type: 'tags', placeholder: 'Laravel, React… press Enter' },
  { name: 'start_date', label: 'Start date', type: 'date' },
  { name: 'target_date', label: 'Target completion', type: 'date' },
  { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES },
  { name: 'status', label: 'Status', type: 'select', options: STATUSES },
  { name: 'progress', label: 'Progress % (used when the project has no tasks)', type: 'number', min: 0, max: 100, full: true },
]

export function ProjectsTab() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [editing, setEditing] = useState<Project | null>(null)
  const [open, setOpen] = useState(false)
  const list = useList<Project>('projects', { q, status })
  const { create, update, remove } = useResource<Project>('projects')

  const form = (
    <FormDialog open={open} onOpenChange={setOpen} title={editing ? 'Edit project' : 'New project'} fields={projectFields}
      initial={editing ? { ...editing, technologies: editing.technologies ?? [] } : { name: '', description: '', technologies: [], start_date: new Date().toISOString().slice(0, 10), target_date: '', priority: 'medium', status: 'planning', progress: 0 }}
      onSubmit={(v) => (editing ? update.mutateAsync({ ...v, id: editing.id }) : create.mutateAsync(v))} />
  )

  if (selected) return <><ProjectDetail id={selected} onBack={() => setSelected(null)} onEdit={(p) => { setEditing(p); setOpen(true) }} />{form}</>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative"><Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects…" className="h-9 w-56 pl-8" /></div>
        <Select className="w-40" value={status} onValueChange={setStatus} options={[{ value: '', label: 'All statuses' }, ...STATUSES]} />
        <Button className="ml-auto" onClick={() => { setEditing(null); setOpen(true) }}><Plus /> New project</Button>
      </div>
      {list.isLoading ? <LoadingGrid count={3} className="lg:grid-cols-3" /> : list.isError ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : !list.data?.length ? (
        <EmptyState icon={<FolderKanban />} title={q || status ? 'No matching projects' : 'No projects yet'} description="Create a project and break it into tasks on a Kanban board." action={<Button onClick={() => { setEditing(null); setOpen(true) }}><Plus /> New project</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.data.map((p) => (
            <Card key={p.id} className="group flex cursor-pointer flex-col p-5 transition hover:border-primary/40 hover:shadow-md" onClick={() => setSelected(p.id)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5"><Badge variant="outline">{capitalize(p.status)}</Badge><Badge variant={PRIORITY_VARIANT[p.priority]}>{capitalize(p.priority)}</Badge></div>
                </div>
                <div className="flex" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(p); setOpen(true) }} aria-label="Edit"><Pencil /></Button>
                  <ConfirmDelete onConfirm={() => remove.mutateAsync(p.id)} label={p.name} />
                </div>
              </div>
              {p.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
              <div className="mt-3 flex flex-wrap gap-1">{p.technologies?.map((t) => <span key={t} className="rounded bg-secondary px-1.5 py-0.5 text-[11px]">{t}</span>)}</div>
              <div className="mt-auto pt-4">
                <div className="mb-1.5 flex justify-between text-xs text-muted-foreground"><span>{p.tasks_count ? `${p.done_tasks_count}/${p.tasks_count} tasks` : 'No tasks'}</span><span className="font-medium text-foreground">{p.progress}%</span></div>
                <Progress value={p.progress} color="var(--career)" />
                {p.target_date && <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="size-3" /> Target {fmtDate(p.target_date, 'd MMM yyyy')}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}
      {form}
    </div>
  )
}

function ProjectDetail({ id, onBack, onEdit }: { id: number; onBack: () => void; onEdit: (p: Project) => void }) {
  const q = useApi<{ data: Project }>(`projects/${id}`)
  const p = q.data?.data
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft /> All projects</Button>
      {q.isLoading ? <LoadingGrid count={1} className="lg:grid-cols-1" /> : q.isError || !p ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <>
          <Card className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{p.name}</h2>
                {p.description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{p.description}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="outline">{capitalize(p.status)}</Badge><Badge variant={PRIORITY_VARIANT[p.priority]}>{capitalize(p.priority)}</Badge>
                  {p.technologies?.map((t) => <span key={t} className="rounded bg-secondary px-1.5 py-0.5 text-[11px]">{t}</span>)}
                </div>
              </div>
              <div className="w-full shrink-0 md:w-64">
                <div className="mb-1 flex justify-between text-sm"><span className="text-muted-foreground">Progress</span><span className="font-semibold">{p.progress}%</span></div>
                <Progress value={p.progress} color="var(--career)" />
                <p className="mt-2 text-xs text-muted-foreground">{p.start_date ? fmtDate(p.start_date, 'd MMM yyyy') : '—'} → {p.target_date ? fmtDate(p.target_date, 'd MMM yyyy') : 'no target'}</p>
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => onEdit(p)}><Pencil /> Edit project</Button>
              </div>
            </div>
          </Card>
          <KanbanBoard project={p} />
        </>
      )}
    </div>
  )
}

export function useProjectTasks(projectId: number) {
  return useList('project-tasks', { project_id: projectId })
}
