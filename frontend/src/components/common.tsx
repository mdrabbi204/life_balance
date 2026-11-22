import { type ReactNode } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, RefreshCw } from 'lucide-react'
import { addDays, format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { cn, errorMessage } from '@/lib/utils'
import { toISODate } from '@/lib/date'

export function PageHeader({ title, description, actions, icon }: { title: string; description?: string; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-3">
        {icon && <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:size-5">{icon}</div>}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({ label, value, sub, icon, accent, progress, className, children }: {
  label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; accent?: string; progress?: number; className?: string; children?: ReactNode
}) {
  return (
    <Card className={cn('relative overflow-hidden p-4 transition-shadow hover:shadow-md', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
          {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
        </div>
        {icon && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-[18px]" style={{ background: `color-mix(in oklch, ${accent ?? 'var(--primary)'} 14%, transparent)`, color: accent ?? 'var(--primary)' }}>
            {icon}
          </div>
        )}
      </div>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, progress))}%`, background: accent ?? 'var(--primary)' }} />
        </div>
      )}
      {children}
    </Card>
  )
}

export function ScoreRing({ value, size = 120, stroke = 10, color = 'var(--primary)', label, sub }: { value: number | null; size?: number; stroke?: number; color?: string; label?: string; sub?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = value ?? 0
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * Math.min(100, v)) / 100} style={{ transition: 'stroke-dashoffset 900ms ease-out' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-semibold tabular-nums tracking-tight" style={{ fontSize: size * 0.24 }}>{value === null ? '—' : v}</span>
        {label && <span className="text-[11px] font-medium text-muted-foreground">{label}</span>}
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </div>
    </div>
  )
}

export function EmptyState({ title, description, action, icon, className }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center', className)}>
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5">{icon ?? <Inbox />}</div>
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Card className="border-destructive/30">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <AlertTriangle className="size-8 text-destructive" />
        <div>
          <p className="font-medium">Couldn't load this section</p>
          <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
        </div>
        {onRetry && <Button variant="outline" size="sm" onClick={onRetry}><RefreshCw /> Try again</Button>}
      </CardContent>
    </Card>
  )
}

export function LoadingGrid({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {Array.from({ length: count }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
    </div>
  )
}

export function LoadingBlock({ className }: { className?: string }) {
  return <Skeleton className={cn('h-64 w-full rounded-xl', className)} />
}

export function DateNav({ value, onChange, max }: { value: string; onChange: (d: string) => void; max?: string }) {
  const d = parseISO(value)
  const today = toISODate(new Date())
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon-sm" onClick={() => onChange(toISODate(addDays(d, -1)))} aria-label="Previous day"><ChevronLeft /></Button>
      <Input type="date" value={value} max={max} onChange={(e) => e.target.value && onChange(e.target.value)} className="h-8 w-[150px]" />
      <Button variant="outline" size="icon-sm" disabled={!!max && value >= max} onClick={() => onChange(toISODate(addDays(d, 1)))} aria-label="Next day"><ChevronRight /></Button>
      {value !== (max ?? today) && <Button variant="ghost" size="sm" onClick={() => onChange(max ?? today)}>Today</Button>}
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{children}</h2>
      {action}
    </div>
  )
}

export const shortDate = (iso: string) => format(parseISO(iso), 'd MMM')
