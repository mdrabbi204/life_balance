import { format, parseISO } from 'date-fns'

export const toISODate = (d: Date) => format(d, 'yyyy-MM-dd')
export const today = () => toISODate(new Date())
export const fmtDate = (iso: string, f = 'EEE, d MMM yyyy') => format(parseISO(iso), f)

/** "HH:mm" or "HH:mm:ss" -> "h:mm AM" */
export function fmtTime(t: string | null | undefined): string {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh = h % 12 || 12
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
}

export const timeToMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function greeting(d = new Date()) {
  const h = d.getHours()
  if (h < 5) return 'Peaceful night'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

export function countdown(ms: number) {
  if (ms <= 0) return 'now'
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`
}
