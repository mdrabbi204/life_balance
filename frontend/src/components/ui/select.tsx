import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Option { value: string; label: string }

const NONE = '__none__'
const map = (v: string) => (v === '' ? NONE : v)

/** Simple controlled select. Radix disallows empty-string values, so '' is mapped to a sentinel. */
export function Select({ value, onValueChange, options, placeholder, className, disabled }: {
  value: string | null | undefined
  onValueChange: (v: string) => void
  options: Option[]
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  return (
    <SelectPrimitive.Root value={value == null ? undefined : map(value)} onValueChange={(v) => onValueChange(v === NONE ? '' : v)} disabled={disabled}>
      <SelectPrimitive.Trigger className={cn('flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50 data-[placeholder]:text-muted-foreground cursor-pointer [&>span]:truncate', className)}>
        <SelectPrimitive.Value placeholder={placeholder ?? 'Select…'} />
        <SelectPrimitive.Icon asChild><ChevronDown className="size-4 opacity-50 shrink-0" /></SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content position="popper" sideOffset={4} className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <SelectPrimitive.Viewport className="p-1">
            {options.map((o) => (
              <SelectPrimitive.Item key={o.value} value={map(o.value)} className="relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-none data-[highlighted]:bg-accent">
                <span className="absolute left-2 flex size-4 items-center justify-center">
                  <SelectPrimitive.ItemIndicator><Check className="size-4" /></SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
