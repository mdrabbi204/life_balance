import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const axisProps = { stroke: 'var(--muted-foreground)', fontSize: 11, tickLine: false, axisLine: false } as const
export const gridProps = { stroke: 'var(--border)', strokeDasharray: '3 3', vertical: false } as const
export const tooltipProps = {
  contentStyle: { background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--popover-foreground)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
  labelStyle: { color: 'var(--muted-foreground)', marginBottom: 4 },
  cursor: { fill: 'var(--muted)', opacity: 0.5 },
} as const

export function ChartCard({ title, description, children, action, className }: { title: string; description?: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
