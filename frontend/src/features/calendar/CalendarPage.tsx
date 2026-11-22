import { useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Moon, Pencil, Plus, Repeat } from 'lucide-react'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { EmptyState, ErrorState, LoadingBlock, PageHeader } from '@/components/common'
import { ConfirmDelete } from '@/components/ConfirmDelete'
import { FormDialog, type Field } from '@/components/FormDialog'
import { useApi, useList, useResource } from '@/lib/queries'
import { api } from '@/lib/api'
import { useToday } from '@/hooks/useToday'
import { fmtTime, toISODate } from '@/lib/date'
import { CATEGORY_COLORS, WEEKDAYS } from '@/lib/constants'
import { capitalize, cn } from '@/lib/utils'
import type { DayTimeline, Schedule, TimelineItem } from '@/types'

const CATS = ['deen', 'career', 'fitness', 'work', 'commute', 'family', 'personal', 'rest', 'other'].map((v) => ({ value: v, label: capitalize(v) }))
const START_HOUR = 4
const END_HOUR = 23
const PX_PER_MIN = 0.9

const scheduleFields: Field[] = [
  { name: 'title', label: 'Activity', required: true, full: true },
  { name: 'category', label: 'Category', type: 'select', options: CATS },
  { name: 'color', label: 'Colour', type: 'color' },
  { name: 'start_time', label: 'Start', type: 'time', required: true },
  { name: 'end_time', label: 'End', type: 'time', required: true },
  { name: 'is_recurring', label: 'Recurring', type: 'switch' },
  { name: 'is_flexible', label: 'Flexible (shift after Salah instead of splitting)', type: 'switch' },
  { name: 'days_of_week', label: 'Repeats on', type: 'days', required: true, hidden: (v) => !v.is_recurring },
  { name: 'date', label: 'Date', type: 'date', required: true, hidden: (v) => !!v.is_recurring },
  { name: 'skip_on_rest_day', label: 'Skip on rest days', type: 'switch' },
  { name: 'is_active', label: 'Active', type: 'switch' },
  { name: 'reminder_minutes', label: 'Reminder (minutes before)', type: 'number', min: 0, help: 'Leave empty for no reminder' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

export default function CalendarPage() {
  const today = useToday()
  const [weekStart, setWeekStart] = useState(() => toISODate(startOfWeek(parseISO(today), { weekStartsOn: 6 })))
  const weekEnd = toISODate(addDays(parseISO(weekStart), 6))
  const range = useApi<{ days: DayTimeline[] }>('schedule/range', { from: weekStart, to: weekEnd })
  const schedules = useList<Schedule>('schedules')
  const { create, update, remove } = useResource<Schedule>('schedules')
  const [editing, setEditing] = useState<Schedule | null>(null)
  const [open, setOpen] = useState(false)
  const [prefill, setPrefill] = useState<Partial<Schedule> | null>(null)
  const confirmedOverlap = useRef<string | null>(null)

  const save = async (v: Record<string, unknown>) => {
    const sig = JSON.stringify([v.start_time, v.end_time, v.days_of_week, v.date])
    if (confirmedOverlap.current !== sig) {
      const { data } = await api.post('/schedule/check-overlap', { start_time: v.start_time, end_time: v.end_time, days_of_week: v.is_recurring ? v.days_of_week : null, date: v.is_recurring ? null : v.date, ignore_id: editing?.id })
      if (data.overlaps.length) {
        confirmedOverlap.current = sig
        throw { response: { data: { message: `Overlaps with ${data.overlaps.map((o: Schedule) => `"${o.title}" (${o.start_time.slice(0, 5)}–${o.end_time.slice(0, 5)})`).join(', ')}. Press Save again to keep both.` } } }
      }
    }
    confirmedOverlap.current = null
    return editing ? update.mutateAsync({ ...v, id: editing.id }) : create.mutateAsync(v)
  }

  const openNew = (p?: Partial<Schedule>) => { setEditing(null); setPrefill(p ?? null); confirmedOverlap.current = null; setOpen(true) }
  const hours = useMemo(() => Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i), [])

  return (
    <>
      <PageHeader title="Calendar" description="Time-blocking that bends around Salah — never the other way round." icon={<CalendarDays />}
        actions={<Button onClick={() => openNew()}><Plus /> Add activity</Button>} />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" onClick={() => setWeekStart(toISODate(addDays(parseISO(weekStart), -7)))} aria-label="Previous week"><ChevronLeft /></Button>
            <Button variant="outline" size="icon-sm" onClick={() => setWeekStart(toISODate(addDays(parseISO(weekStart), 7)))} aria-label="Next week"><ChevronRight /></Button>
            <Button variant="ghost" size="sm" onClick={() => setWeekStart(toISODate(startOfWeek(parseISO(today), { weekStartsOn: 6 })))}>This week</Button>
          </div>
          <p className="text-sm font-medium">{format(parseISO(weekStart), 'd MMM')} – {format(parseISO(weekEnd), 'd MMM yyyy')}</p>
          <div className="hidden items-center gap-3 text-xs text-muted-foreground md:flex"><span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-deen" /> Salah</span><span className="flex items-center gap-1"><span className="size-2.5 rounded-sm border border-dashed border-warning" /> Adjusted</span></div>
        </div>
        {range.isLoading ? <LoadingBlock className="h-[500px] rounded-none" /> : range.isError ? <div className="p-4"><ErrorState error={range.error} onRetry={() => range.refetch()} /></div> : (
          <>
            {/* Desktop week grid */}
            <div className="hidden overflow-x-auto md:block">
              <div className="grid min-w-[860px]" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
                <div />
                {range.data!.days.map((d) => (
                  <div key={d.date} className={cn('border-l px-2 py-2 text-center', d.date === today && 'bg-primary/5')}>
                    <p className="text-xs text-muted-foreground">{format(parseISO(d.date), 'EEE')}</p>
                    <p className={cn('text-sm font-semibold', d.date === today && 'text-primary')}>{format(parseISO(d.date), 'd')}</p>
                    {d.is_rest_day && <Badge variant="secondary" className="mt-0.5 text-[10px]"><Moon className="size-2.5" /> Rest</Badge>}
                  </div>
                ))}
                <div className="relative" style={{ height: (END_HOUR - START_HOUR) * 60 * PX_PER_MIN }}>
                  {hours.map((h) => <span key={h} className="absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground" style={{ top: (h - START_HOUR) * 60 * PX_PER_MIN }}>{h % 12 || 12}{h < 12 ? 'a' : 'p'}</span>)}
                </div>
                {range.data!.days.map((d) => (
                  <div key={d.date} className={cn('relative border-l', d.date === today && 'bg-primary/[0.03]')} style={{ height: (END_HOUR - START_HOUR) * 60 * PX_PER_MIN }}>
                    {hours.map((h) => <div key={h} className="absolute inset-x-0 border-t border-border/50" style={{ top: (h - START_HOUR) * 60 * PX_PER_MIN }} />)}
                    {d.items.map((it) => <Block key={it.key} it={it} onClick={() => { const s = schedules.data?.find((x) => x.id === it.schedule_id); if (s) { setEditing(s); setPrefill(null); setOpen(true) } }} />)}
                  </div>
                ))}
              </div>
            </div>
            {/* Mobile agenda */}
            <div className="divide-y md:hidden">
              {range.data!.days.map((d) => (
                <div key={d.date} className="p-3">
                  <p className={cn('mb-2 text-sm font-semibold', d.date === today && 'text-primary')}>{format(parseISO(d.date), 'EEEE d MMM')} {d.is_rest_day && <Badge variant="secondary">Rest</Badge>}</p>
                  <ul className="space-y-1">
                    {d.items.filter((i) => i.status !== 'rest').map((it) => (
                      <li key={it.key} className="flex items-center gap-2 text-xs">
                        <span className="w-20 tabular-nums text-muted-foreground">{fmtTime(it.start)}</span>
                        <span className="size-2 rounded-full" style={{ background: it.is_prayer ? 'var(--deen)' : it.color ?? CATEGORY_COLORS[it.category] }} />
                        <span className={cn(it.is_prayer && 'font-medium')}>{it.title}{it.segment > 0 && ' (cont.)'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><Repeat className="size-4" /> Activities</CardTitle><p className="text-sm text-muted-foreground">Recurring and one-off blocks. Salah times are added automatically each day.</p></CardHeader>
        <CardContent className="px-0">
          {schedules.isLoading ? <LoadingBlock className="mx-5 h-40 w-auto" /> : !schedules.data?.length ? <div className="px-5"><EmptyState title="No activities" action={<Button onClick={() => openNew()}><Plus /> Add activity</Button>} /></div> : (
            <Table>
              <THead><TR><TH>Activity</TH><TH>Time</TH><TH>Repeats</TH><TH>Options</TH><TH className="text-center">Active</TH><TH className="text-right">Actions</TH></TR></THead>
              <TBody>
                {schedules.data.map((s) => (
                  <TR key={s.id} className={cn(!s.is_active && 'opacity-50')}>
                    <TD><span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: s.color ?? CATEGORY_COLORS[s.category] }} /><span className="font-medium">{s.title}</span><span className="text-xs text-muted-foreground">{capitalize(s.category)}</span></span></TD>
                    <TD className="whitespace-nowrap tabular-nums">{fmtTime(s.start_time)} – {fmtTime(s.end_time)}</TD>
                    <TD className="text-xs">{s.is_recurring ? (s.days_of_week?.length === 7 ? 'Every day' : s.days_of_week?.map((d) => WEEKDAYS[d]).join(', ')) : s.date}</TD>
                    <TD><div className="flex flex-wrap gap-1">{s.is_flexible && <Badge variant="outline">Flexible</Badge>}{s.skip_on_rest_day && <Badge variant="outline">Rest-day skip</Badge>}{s.reminder_minutes != null && <Badge variant="outline">⏰ {s.reminder_minutes}m</Badge>}</div></TD>
                    <TD className="text-center"><Switch checked={s.is_active} onCheckedChange={(v) => update.mutate({ id: s.id, is_active: v })} /></TD>
                    <TD className="whitespace-nowrap text-right">
                      <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(s); setPrefill(null); confirmedOverlap.current = null; setOpen(true) }} aria-label="Edit"><Pencil /></Button>
                      <ConfirmDelete onConfirm={() => remove.mutateAsync(s.id)} label={s.title} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <FormDialog open={open} onOpenChange={setOpen} title={editing ? 'Edit activity' : 'Add activity'} description="Prayer blocks always take priority; fixed activities are split around Salah, flexible ones move after it."
        fields={scheduleFields}
        initial={editing ? { ...editing, start_time: editing.start_time.slice(0, 5), end_time: editing.end_time.slice(0, 5), days_of_week: editing.days_of_week ?? [], color: editing.color ?? '' } : { title: '', category: 'personal', color: '', start_time: '09:00', end_time: '10:00', is_recurring: true, days_of_week: [0, 1, 2, 3, 4, 5, 6], date: today, is_flexible: true, skip_on_rest_day: false, is_active: true, reminder_minutes: '', notes: '', ...prefill }}
        onSubmit={save} />
    </>
  )
}

function Block({ it, onClick }: { it: TimelineItem; onClick: () => void }) {
  const top = Math.max(0, (it.start_min - START_HOUR * 60) * PX_PER_MIN)
  const height = Math.max(14, it.duration * PX_PER_MIN - 2)
  if (it.end_min <= START_HOUR * 60) return null
  const color = it.is_prayer ? 'var(--deen)' : it.color ?? CATEGORY_COLORS[it.category] ?? '#64748b'
  return (
    <button onClick={it.is_prayer ? undefined : onClick} title={`${it.title} ${fmtTime(it.start)}–${fmtTime(it.end)}${it.adjustment ? `\n${it.adjustment}` : ''}`}
      className={cn('absolute inset-x-1 overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[10px] leading-tight transition hover:z-10 hover:shadow-md', it.is_prayer ? 'z-[5] cursor-default font-semibold text-white' : 'cursor-pointer', it.status === 'rest' && 'opacity-40', it.adjustment && !it.is_prayer && 'border border-dashed border-warning', it.status === 'done' && 'opacity-60')}
      style={{ top, height, background: it.is_prayer ? color : `color-mix(in srgb, ${color} 16%, var(--card))`, borderLeft: it.is_prayer ? undefined : `3px solid ${color}` }}>
      <span className="block truncate">{it.title}</span>
      {height > 24 && <span className="block truncate opacity-75">{fmtTime(it.start)}</span>}
    </button>
  )
}
