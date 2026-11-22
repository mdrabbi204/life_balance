import { Check, Clock, Users, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/common'
import { useAction, useApi, useList } from '@/lib/queries'
import { api } from '@/lib/api'
import { useNow, zonedNow } from '@/hooks/useNow'
import { useTimezone } from '@/hooks/useToday'
import { fmtTime, timeToMinutes } from '@/lib/date'
import { PRAYERS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Prayer, PrayerLog, PrayerStatus, PrayerTimes } from '@/types'

const STATUS: Record<PrayerStatus, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  on_time: { label: 'On time', variant: 'success' },
  delayed: { label: 'Delayed', variant: 'warning' },
  missed: { label: 'Missed', variant: 'destructive' },
}

/** Mark each prayer on-time / delayed / missed. Unlogged prayers show "Not yet due" or "Pending". */
export function PrayerTracker({ date, compact }: { date: string; compact?: boolean }) {
  const tz = useTimezone()
  const now = zonedNow(useNow(30_000), tz)
  const times = useApi<PrayerTimes>('prayer-times', { date })
  const logs = useList<PrayerLog>('prayer-logs', { date })
  const save = useAction((b: { prayer: Prayer; status: PrayerStatus; in_congregation?: boolean }) =>
    api.post('/prayer-logs', { date, ...b, prayed_at: date === now.date && b.status !== 'missed' ? `${String(Math.floor(now.minutes / 60)).padStart(2, '0')}:${String(now.minutes % 60).padStart(2, '0')}` : null }))
  const remove = useAction((id: number) => api.delete(`/prayer-logs/${id}`))

  if (times.isLoading || logs.isLoading) return <div className="space-y-2">{PRAYERS.map((p) => <Skeleton key={p.key} className="h-16 rounded-xl" />)}</div>
  if (times.isError) return <ErrorState error={times.error} onRetry={() => times.refetch()} />
  const t = times.data!
  const byPrayer = Object.fromEntries((logs.data ?? []).map((l) => [l.prayer, l])) as Partial<Record<Prayer, PrayerLog>>
  const isFuture = date > now.date
  const isToday = date === now.date

  /** Suggest on-time if still inside the prayer's window, else delayed. */
  const suggested = (p: Prayer): PrayerStatus => {
    if (!isToday || !t.windows) return 'on_time'
    return now.minutes <= timeToMinutes(t.windows[p][1]) ? 'on_time' : 'delayed'
  }

  return (
    <div className="space-y-2">
      {PRAYERS.map((p) => {
        const log = byPrayer[p.key]
        const due = !isFuture && (!isToday || now.minutes >= timeToMinutes(t.times[p.key]))
        return (
          <Card key={p.key} className={cn('flex flex-col gap-3 p-3 sm:flex-row sm:items-center', log?.status === 'on_time' && 'border-success/30 bg-success/5')}>
            <div className="flex flex-1 items-center gap-3">
              <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold', log ? (log.status === 'missed' ? 'bg-destructive/12 text-destructive' : 'bg-success/15 text-success') : 'bg-muted text-muted-foreground')}>
                {log ? (log.status === 'missed' ? <X className="size-5" /> : <Check className="size-5" />) : <Clock className="size-4" />}
              </div>
              <div className="min-w-0">
                <p className="font-medium">{p.key === 'dhuhr' && new Date(`${date}T12:00:00`).getDay() === 5 ? "Dhuhr / Jumu'ah" : p.name} <span className="ml-1 text-sm text-muted-foreground" dir="rtl">{p.arabic}</span></p>
                <p className="text-xs text-muted-foreground">{fmtTime(t.times[p.key])}{t.windows && !compact && <> – {fmtTime(t.windows[p.key][1])}</>}{log?.prayed_at && <> · prayed {fmtTime(log.prayed_at)}</>}</p>
              </div>
              <div className="ml-auto sm:hidden">
                {log ? <Badge variant={STATUS[log.status].variant}>{STATUS[log.status].label}</Badge> : <Badge variant="secondary">{due ? 'Pending' : 'Not yet due'}</Badge>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="hidden sm:inline-flex">{log ? <Badge variant={STATUS[log.status].variant}>{STATUS[log.status].label}</Badge> : <Badge variant="secondary">{due ? 'Pending' : 'Not yet due'}</Badge>}</span>
              {(Object.keys(STATUS) as PrayerStatus[]).map((s) => (
                <Button key={s} size="sm" variant={log?.status === s ? 'default' : 'outline'} disabled={isFuture || save.isPending}
                  className={cn(!log && s === suggested(p.key) && due && 'ring-2 ring-primary/30')}
                  onClick={() => (log?.status === s ? remove.mutate(log.id) : save.mutate({ prayer: p.key, status: s, in_congregation: log?.in_congregation }))}>
                  {STATUS[s].label}
                </Button>
              ))}
              {log && log.status !== 'missed' && (
                <Button size="icon-sm" variant={log.in_congregation ? 'default' : 'ghost'} title="Prayed in congregation" aria-label="Congregation"
                  onClick={() => save.mutate({ prayer: p.key, status: log.status, in_congregation: !log.in_congregation })}><Users /></Button>
              )}
            </div>
          </Card>
        )
      })}
      {!compact && <p className="px-1 text-xs text-muted-foreground">Times: {t.method} · Asr {t.asr_method} · {t.source === 'aladhan' ? 'Aladhan API' : 'astronomical calculation'} · tap a selected status again to clear it.</p>}
    </div>
  )
}
