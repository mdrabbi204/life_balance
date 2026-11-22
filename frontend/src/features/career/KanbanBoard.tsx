import { useState } from 'react'
import { CalendarDays, GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { FormDialog } from '@/components/FormDialog'
import { useAction, useResource } from '@/lib/queries'
import { api } from '@/lib/api'
import { fmtDate } from '@/lib/date'
import { PRIORITY_VARIANT } from '@/lib/constants'
import { capitalize, cn } from '@/lib/utils'
import type { Project, ProjectTask, TaskStatus } from '@/types'

const COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'todo', label: 'To do', color: '#94a3b8' },
  { key: 'in_progress', label: 'In progress', color: '#4f46e5' },
  { key: 'review', label: 'Review', color: '#ca8a04' },
  { key: 'done', label: 'Done', color: '#16a34a' },
]

export function KanbanBoard({ project }: { project: Project }) {
  const tasks = project.tasks ?? []
  const { create, update, remove } = useResource<ProjectTask>('project-tasks')
  const move = useAction((b: { id: number; status: TaskStatus; position: number }) => api.patch(`/project-tasks/${b.id}/move`, b))
  const [dragId, setDragId] = useState<number | null>(null)
  const [over, setOver] = useState<{ col: TaskStatus; index: number } | null>(null)
  const [editing, setEditing] = useState<ProjectTask | null>(null)
  const [newIn, setNewIn] = useState<TaskStatus | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  const drop = (col: TaskStatus) => {
    if (dragId != null && over) move.mutate({ id: dragId, status: col, position: over.index })
    setDragId(null); setOver(null)
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((c) => {
          const items = tasks.filter((t) => t.status === c.key).sort((a, b) => a.position - b.position)
          return (
            <div key={c.key} onDragOver={(e) => { e.preventDefault(); if (!over || over.col !== c.key) setOver({ col: c.key, index: items.length }) }} onDrop={() => drop(c.key)}
              className={cn('flex min-h-48 flex-col rounded-xl bg-muted/50 p-2.5 transition', over?.col === c.key && 'ring-2 ring-primary/30')}>
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="flex items-center gap-2 text-sm font-semibold"><span className="size-2 rounded-full" style={{ background: c.color }} />{c.label}<span className="text-xs font-normal text-muted-foreground">{items.length}</span></span>
                <Button variant="ghost" size="icon-sm" onClick={() => setNewIn(c.key)} aria-label={`Add task to ${c.label}`}><Plus /></Button>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                {items.map((t, i) => (
                  <div key={t.id} draggable onDragStart={() => setDragId(t.id)} onDragEnd={() => { setDragId(null); setOver(null) }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setOver({ col: c.key, index: i }) }}
                    className={cn('group cursor-grab rounded-lg border bg-card p-3 shadow-xs transition active:cursor-grabbing', dragId === t.id && 'opacity-40', over?.col === c.key && over.index === i && dragId !== t.id && 'border-t-2 border-t-primary')}>
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
                      <p className={cn('flex-1 text-sm font-medium', t.status === 'done' && 'text-muted-foreground line-through')}>{t.title}</p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><button className="cursor-pointer rounded p-0.5 text-muted-foreground hover:bg-accent" aria-label="Task actions"><MoreHorizontal className="size-4" /></button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditing(t)}><Pencil /> Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Move to</DropdownMenuLabel>
                          {COLUMNS.filter((x) => x.key !== t.status).map((x) => <DropdownMenuItem key={x.key} onClick={() => move.mutate({ id: t.id, status: x.key, position: 999 })}>{x.label}</DropdownMenuItem>)}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => remove.mutate(t.id)}><Trash2 /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {t.description && <p className="mt-1 line-clamp-2 pl-5 text-xs text-muted-foreground">{t.description}</p>}
                    <div className="mt-2 flex items-center gap-1.5 pl-5">
                      <Badge variant={PRIORITY_VARIANT[t.priority]}>{capitalize(t.priority)}</Badge>
                      {t.due_date && <span className={cn('ml-auto flex items-center gap-1 text-[11px]', t.due_date < today && t.status !== 'done' ? 'text-destructive' : 'text-muted-foreground')}><CalendarDays className="size-3" />{fmtDate(t.due_date, 'd MMM')}</span>}
                    </div>
                  </div>
                ))}
                {items.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Drop tasks here</p>}
              </div>
            </div>
          )
        })}
      </div>
      <FormDialog open={!!editing || !!newIn} onOpenChange={(o) => { if (!o) { setEditing(null); setNewIn(null) } }} title={editing ? 'Edit task' : 'New task'}
        fields={[
          { name: 'title', label: 'Title', required: true, full: true },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'status', label: 'Status', type: 'select', options: COLUMNS.map((c) => ({ value: c.key, label: c.label })) },
          { name: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'urgent'].map((v) => ({ value: v, label: capitalize(v) })) },
          { name: 'due_date', label: 'Due date', type: 'date' },
        ]}
        initial={editing ? { ...editing } : { title: '', description: '', status: newIn ?? 'todo', priority: 'medium', due_date: '' }}
        onSubmit={(v) => (editing ? update.mutateAsync({ ...v, id: editing.id }) : create.mutateAsync({ ...v, project_id: project.id }))} />
    </>
  )
}
