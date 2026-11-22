import { Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useNow, zonedNow } from '@/hooks/useNow'
import { useTimezone } from '@/hooks/useToday'
import { countdown, fmtTime, timeToMinutes } from '@/lib/date'
import { PRAYERS } from '@/lib/constants'
import type { PrayerTimes } from '@/types'

// eslint-disable-next-line react-refresh/only-export-components
export function nextPrayer(times: PrayerTimes['times'], tomorrowFajr: string | undefined, secondsNow: number) {
  for (const p of PRAYERS) {
    const s = timeToMinutes(times[p.key]) * 60
    if (s > secondsNow) return { ...p, time: times[p.key], seconds: s - secondsNow, tomorrow: false }
  }
  const f = tomorrowFajr ?? times.fajr
  return { ...PRAYERS[0], time: f, seconds: 86400 - secondsNow + timeToMinutes(f) * 60, tomorrow: true }
}

export function NextPrayerCard({ prayer, compact }: { prayer: PrayerTimes; compact?: boolean }) {
  const tz = useTimezone()
  const now = useNow(1000)
  const z = zonedNow(now, tz)
  const next = nextPrayer(prayer.times, prayer.tomorrow_fajr, z.seconds)
  const current = [...PRAYERS].reverse().find((p) => timeToMinutes(prayer.times[p.key]) * 60 <= z.seconds)

  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-teal-700 to-emerald-600 p-5 text-white shadow-md">
      <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-white/75"><Clock className="size-3.5" /> Next Salah{next.tomorrow ? ' · tomorrow' : ''}</div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-2xl font-semibold">{next.name} <span className="font-normal text-white/70" dir="rtl">{next.arabic}</span></p>
            <p className="text-sm text-white/80">at {fmtTime(next.time)}</p>
          </div>
          <p className="text-3xl font-semibold tabular-nums tracking-tight">{countdown(next.seconds * 1000)}</p>
        </div>
        {!compact && (
          <div className="mt-4 grid grid-cols-5 gap-1 text-center text-[11px]">
            {PRAYERS.map((p) => (
              <div key={p.key} className={`rounded-md py-1.5 ${current?.key === p.key ? 'bg-white/25 font-semibold' : 'bg-white/10'}`}>
                <div>{p.name}</div>
                <div className="tabular-nums text-white/80">{fmtTime(prayer.times[p.key]).replace(/ (AM|PM)/, '')}</div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-[11px] text-white/60">{prayer.location?.city ? `${prayer.location.city} · ` : ''}{prayer.method} · Asr {prayer.asr_method}</p>
      </div>
    </Card>
  )
}
