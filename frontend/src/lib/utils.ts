import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n))

export function formatMinutes(min: number | null | undefined): string {
  const m = Math.round(min ?? 0)
  if (m <= 0) return '0m'
  const h = Math.floor(m / 60)
  const r = m % 60
  return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m`
}

export function formatDuration(seconds: number): string {
  const s = Math.round(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

export function formatPace(secondsPerKm: number | null | undefined): string {
  if (!secondsPerKm) return '—'
  const m = Math.floor(secondsPerKm / 60)
  const s = Math.round(secondsPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')} /km`
}

export function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : s
}

export function errorMessage(err: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = err as any
  const data = e?.response?.data
  if (data?.errors) {
    const first = Object.values(data.errors as Record<string, string[]>)[0]
    if (first?.[0]) return first[0]
  }
  return data?.message || e?.message || 'Something went wrong'
}
