import { useState } from 'react'
import { AlertTriangle, BedDouble, BookOpen, Check, Clock, Code2, Droplets, Footprints, MoreHorizontal, Moon, RotateCcw, SkipForward, SunMedium, Utensils } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { DateNav, ErrorState, LoadingBlock, PageHeader } from '@/components/common'
import { FormDialog, type Field } from '@/components/FormDialog'
import { PrayerTracker } from '@/features/islamic/PrayerTracker'
import { nutritionFields, quranFields, runFields, sessionFields, sleepFields } from '@/features/shared/forms'
import { useAction, useApi, useList, useResource } from '@/lib/queries'
import { api } from '@/lib/api'
import { useToday } from '@/hooks/useToday'
import { fmtDate, fmtTime } from '@/lib/date'
import { CATEGORY_COLORS } from '@/lib/constants'
import { cn, formatMinutes } from '@/lib/utils'
import type { DayTimeline, LearningTopic, TimelineItem } from '@/types'

type QuickKind = 'quran' | 'study' | 'run' | 'meal' | 'sleep'

export default function MyDayPage() {
  const today = useToday()
  const [date, setDate] = useState(today)
  const q = useApi<DayTimeline>('schedule/day', { date })
  const topics = useList<LearningTopic>('learning-topics')
  const occurrence = useAction((b: { id: number; status?: string; start_time?: string | null; end_time?: string | null }) => api.post(`/schedules/${b.id}/occurrence`, { date, ...b }))
  const restDay = useAction((v: boolean) => api.post('/schedule/rest-day', { date, is_rest_day: v }), 'Day updated')
  const [quick, setQuick] = useState<QuickKind | null>(null)
  const [moving, setMoving] = useState<TimelineItem | null>(null)

  const resources = { quran: useResource('quran-logs'), study: useResource('learning-sessions'), run: useResource('running-logs'), meal: useResource('nutrition-logs'), sleep: useResource('sleep-logs') }
  const quickConfig: Record<QuickKind, { title: string; fields: Field[]; initial: Record<string, unknown> }> = {
    quran: { title: 'Log Quran reading', fields: quranFields, initial: { date, pages_read: 4, minutes: 15 } },
    study: { title: 'Log study session', fields: sessionFields(topics.data ?? []), initial: { date, minutes: 60, challenges_solved: 0 } },
    run: { title: 'Log a run', fields: runFields, initial: { date, distance_km: 5, duration_seconds: 1800 } },
    meal: { title: 'Log a meal', fields: nutritionFields, initial: { date, meal: 'breakfast', calories: '', protein_g: '', water_ml: '' } },
    sleep: { title: 'Log sleep', fields: sleepFields, initial: { date, bedtime: '22:00', wake_time: '05:30', quality: '4' } },
  }

  return (
    <>
      <PageHeader title="My Day" description={fmtDate(date, 'EEEE, d MMMM yyyy')} icon={<SunMedium />} actions={<DateNav value={date} onChange={setDate} />} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {q.isLoading ? <LoadingBlock className="h-96" /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
            <>
              <Card className="flex flex-wrap items-center gap-4 p-4">
                <div className="flex flex-1 flex-wrap gap-4 text-sm">
                  <span><b className="tabular-nums">{q.data!.summary.planned}</b> <span className="text-muted-foreground">planned</span></span>
                  <span><b className="tabular-nums text-success">{q.data!.summary.completed}</b> <span className="text-muted-foreground">done</span></span>
                  <span><b className="tabular-nums">{q.data!.summary.pending}</b> <span className="text-muted-foreground">pending</span></span>
                  <span><b className="tabular-nums">{q.data!.summary.skipped}</b> <span className="text-muted-foreground">skipped</span></span>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Moon className="size-4 text-muted-foreground" /> Rest day
                  <Switch checked={q.data!.is_rest_day} onCheckedChange={(v) => restDay.mutate(v)} />
                </label>
              </Card>

              {q.data!.conflicts.length > 0 && (
                <Card className="border-warning/40 bg-warning/5 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium"><AlertTriangle className="size-4 text-warning" /> Adjusted for Salah & conflicts</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {[...new Set(q.data!.conflicts.map((c) => `${c.title}: ${c.message}`))].slice(0, 8).map((m) => <li key={m}>• {m}</li>)}
                  </ul>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle>Timeline</CardTitle><p className="text-sm text-muted-foreground">Salah blocks come from today's calculated prayer times; activities adapt around them.</p></CardHeader>
                <CardContent>
                  <ol className="relative space-y-1 border-l border-border pl-5">
                    {q.data!.items.map((it) => (
                      <li key={it.key} className="relative">
                        <span className={cn('absolute -left-[27px] top-3.5 size-3 rounded-full border-2 border-background', it.is_current && 'ring-4 ring-primary/20')} style={{ background: it.is_prayer ? 'var(--deen)' : it.color ?? CATEGORY_COLORS[it.category] }} />
                        <div className={cn('flex flex-col gap-2 rounded-lg px-3 py-2.5 sm:flex-row sm:items-center', it.is_current && 'bg-primary/8', it.is_prayer && 'bg-deen/5', (it.status === 'rest' || it.status === 'skipped') && 'opacity-55')}>
                          <div className="w-32 shrink-0 text-xs tabular-nums text-muted-foreground">{fmtTime(it.start)} – {fmtTime(it.end)}</div>
                          <div className="min-w-0 flex-1">
                            <p className={cn('flex flex-wrap items-center gap-2 text-sm font-medium', it.status === 'done' && 'line-through decoration-muted-foreground/50')}>
                              {it.is_prayer && <Moon className="size-3.5 text-deen" />}{it.title}
                              {it.segment > 0 && <span className="text-xs font-normal text-muted-foreground">(continued)</span>}
                              {it.is_current && <Badge>Now</Badge>}
                              {it.rescheduled && <Badge variant="outline">Rescheduled</Badge>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {it.is_prayer ? statusLabel(it.status) : `${it.category} · ${formatMinutes(it.duration)}`}
                              {it.adjustment && it.segment === 0 && <span className="ml-1 text-warning">· {it.adjustment.split(';')[0]}</span>}
                            </p>
                          </div>
                          {!it.is_prayer && it.status !== 'rest' && it.segment === 0 && (
                            <div className="flex items-center gap-1">
                              {it.status === 'done' ? <Badge variant="success"><Check className="size-3" /> Done</Badge> : it.status === 'skipped' ? <Badge variant="secondary">Skipped</Badge> : null}
                              {it.status !== 'done' && <Button size="sm" variant="outline" onClick={() => occurrence.mutate({ id: it.schedule_id!, status: 'done' })}><Check /> Done</Button>}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost" aria-label="More actions"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {it.status !== 'skipped' && <DropdownMenuItem onClick={() => occurrence.mutate({ id: it.schedule_id!, status: 'skipped' })}><SkipForward /> Skip today</DropdownMenuItem>}
                                  {it.status !== 'pending' && <DropdownMenuItem onClick={() => occurrence.mutate({ id: it.schedule_id!, status: 'pending' })}><RotateCcw /> Reset status</DropdownMenuItem>}
                                  <DropdownMenuItem onClick={() => setMoving(it)}><Clock /> Reschedule today</DropdownMenuItem>
                                  {it.rescheduled && <DropdownMenuItem onClick={() => occurrence.mutate({ id: it.schedule_id!, start_time: null, end_time: null })}><RotateCcw /> Restore original time</DropdownMenuItem>}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                          {it.status === 'rest' && <Badge variant="secondary">Rest day</Badge>}
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Quick log</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <QuickButton icon={<BookOpen />} label="Quran" onClick={() => setQuick('quran')} />
              <QuickButton icon={<Code2 />} label="Study" onClick={() => setQuick('study')} />
              <QuickButton icon={<Footprints />} label="Run" onClick={() => setQuick('run')} />
              <QuickButton icon={<Utensils />} label="Meal" onClick={() => setQuick('meal')} />
              <QuickButton icon={<BedDouble />} label="Sleep" onClick={() => setQuick('sleep')} />
              <QuickButton icon={<Droplets />} label="+250 ml water" onClick={() => resources.meal.create.mutate({ date, meal: 'water', water_ml: 250 })} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Salah</CardTitle></CardHeader>
            <CardContent><PrayerTracker date={date} compact /></CardContent>
          </Card>
        </div>
      </div>

      {quick && (
        <FormDialog open onOpenChange={(o) => !o && setQuick(null)} title={quickConfig[quick].title} fields={quickConfig[quick].fields} initial={quickConfig[quick].initial}
          onSubmit={(v) => resources[quick].create.mutateAsync(v)} />
      )}
      {moving && (
        <FormDialog open onOpenChange={(o) => !o && setMoving(null)} title={`Reschedule "${moving.title}"`} description="Only affects this date. The recurring plan stays unchanged."
          fields={[{ name: 'start_time', label: 'Start', type: 'time', required: true }, { name: 'end_time', label: 'End', type: 'time', required: true }]}
          initial={{ start_time: moving.original_start, end_time: moving.original_end }}
          onSubmit={(v) => occurrence.mutateAsync({ id: moving.schedule_id!, start_time: v.start_time as string, end_time: v.end_time as string })} />
      )}
    </>
  )
}

function statusLabel(s: string) {
  return { on_time: 'Prayed on time', delayed: 'Prayed (delayed)', missed: 'Missed', pending: 'Pending', upcoming: 'Not yet due' }[s] ?? s
}

function QuickButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border bg-card p-3 text-xs font-medium transition hover:border-primary/40 hover:bg-primary/5 [&_svg]:size-5 [&_svg]:text-primary">
      {icon}{label}
    </button>
  )
}
