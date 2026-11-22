import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, type Option } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { WEEKDAYS } from '@/lib/constants'

export type FieldType = 'text' | 'number' | 'date' | 'time' | 'textarea' | 'select' | 'switch' | 'tags' | 'days' | 'color' | 'duration'

export interface Field {
  name: string
  label: string
  type?: FieldType
  options?: Option[]
  required?: boolean
  placeholder?: string
  step?: string
  min?: number
  max?: number
  help?: string
  full?: boolean
  hidden?: (values: Record<string, unknown>) => boolean
}

type Values = Record<string, unknown>

/**
 * Configuration-driven form dialog used across modules. Displays server-side
 * validation errors (422) next to the relevant field.
 */
export function FormDialog({ open, onOpenChange, title, description, fields, initial, onSubmit, submitLabel = 'Save', children, extra }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: string
  fields: Field[]
  initial: Values
  onSubmit: (values: Values) => Promise<unknown>
  submitLabel?: string
  children?: ReactNode
  extra?: (values: Values, set: (name: string, v: unknown) => void) => ReactNode
}) {
  const [values, setValues] = useState<Values>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [general, setGeneral] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) { setValues(initial); setErrors({}); setGeneral(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = (name: string, v: unknown) => setValues((s) => ({ ...s, [name]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const missing: Record<string, string> = {}
    for (const f of fields) {
      if (f.hidden?.(values)) continue
      const v = values[f.name]
      if (f.required && (v === '' || v === null || v === undefined || (Array.isArray(v) && v.length === 0))) missing[f.name] = `${f.label} is required.`
    }
    if (Object.keys(missing).length) { setErrors(missing); return }
    setSaving(true); setErrors({}); setGeneral(null)
    try {
      const payload: Values = {}
      for (const [k, v] of Object.entries(values)) {
        const f = fields.find((x) => x.name === k)
        if (f?.hidden?.(values)) continue
        payload[k] = f?.type === 'number' ? (v === '' || v === null || v === undefined ? null : Number(v)) : v === '' ? null : v
      }
      await onSubmit(payload)
      onOpenChange(false)
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (err as any)?.response?.data
      if (data?.errors) {
        const mapped: Record<string, string> = {}
        for (const [k, msgs] of Object.entries(data.errors as Record<string, string[]>)) mapped[k.split('.')[0]] = msgs[0]
        setErrors(mapped)
        if (!fields.some((f) => mapped[f.name])) setGeneral(Object.values(mapped)[0])
      } else setGeneral(data?.message ?? 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.filter((f) => !f.hidden?.(values)).map((f) => (
              <div key={f.name} className={cn('grid gap-1.5', (f.full || f.type === 'textarea' || f.type === 'days' || f.type === 'tags') && 'sm:col-span-2', f.type === 'switch' && 'self-end')}>
                {f.type !== 'switch' && <Label htmlFor={f.name}>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>}
                <FieldInput field={f} value={values[f.name]} onChange={(v) => set(f.name, v)} />
                {f.help && !errors[f.name] && <p className="text-xs text-muted-foreground">{f.help}</p>}
                {errors[f.name] && <p className="text-xs text-destructive">{errors[f.name]}</p>}
              </div>
            ))}
          </div>
          {extra?.(values, set)}
          {children}
          {general && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{general}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FieldInput({ field: f, value, onChange }: { field: Field; value: unknown; onChange: (v: unknown) => void }) {
  switch (f.type) {
    case 'textarea':
      return <Textarea id={f.name} value={(value as string) ?? ''} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} rows={3} />
    case 'select':
      return <Select value={value == null ? '' : String(value)} onValueChange={onChange} options={f.options ?? []} placeholder={f.placeholder} />
    case 'switch':
      return (
        <label className="flex h-9 cursor-pointer items-center gap-2.5 text-sm">
          <Switch checked={!!value} onCheckedChange={onChange} />
          <span>{f.label}</span>
        </label>
      )
    case 'days': {
      const arr = (value as number[]) ?? []
      return (
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((d, i) => {
            const on = arr.includes(i)
            return (
              <button type="button" key={d} onClick={() => onChange(on ? arr.filter((x) => x !== i) : [...arr, i].sort())}
                className={cn('h-8 w-11 rounded-md border text-xs font-medium transition cursor-pointer', on ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent')}>
                {d}
              </button>
            )
          })}
        </div>
      )
    }
    case 'tags':
      return <TagInput value={(value as string[]) ?? []} onChange={onChange} placeholder={f.placeholder} />
    case 'color':
      return (
        <div className="flex items-center gap-2">
          <input type="color" value={(value as string) || '#0f766e'} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border bg-transparent p-1" />
          <Input value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} className="font-mono" />
        </div>
      )
    case 'duration': {
      const total = Number(value ?? 0)
      const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60
      const upd = (hh: number, mm: number, ss: number) => onChange(hh * 3600 + mm * 60 + ss)
      return (
        <div className="flex items-center gap-1.5">
          <Input type="number" min={0} value={h} onChange={(e) => upd(Number(e.target.value), m, s)} className="w-16" aria-label="hours" /><span className="text-xs text-muted-foreground">h</span>
          <Input type="number" min={0} max={59} value={m} onChange={(e) => upd(h, Number(e.target.value), s)} className="w-16" aria-label="minutes" /><span className="text-xs text-muted-foreground">m</span>
          <Input type="number" min={0} max={59} value={s} onChange={(e) => upd(h, m, Number(e.target.value))} className="w-16" aria-label="seconds" /><span className="text-xs text-muted-foreground">s</span>
        </div>
      )
    }
    default:
      return (
        <Input id={f.name} type={f.type ?? 'text'} step={f.step} min={f.min} max={f.max} placeholder={f.placeholder}
          value={value == null ? '' : f.type === 'time' ? String(value).slice(0, 5) : String(value)}
          onChange={(e) => onChange(e.target.value)} />
      )
  }
}

export function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const t = draft.trim().replace(/,$/, '')
    if (t && !value.includes(t)) onChange([...value, t])
    setDraft('')
  }
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input px-2 py-1.5">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs">
          {t}
          <button type="button" className="cursor-pointer opacity-60 hover:opacity-100" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`}>×</button>
        </span>
      ))}
      <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={add} placeholder={placeholder ?? 'Type and press Enter'}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1)) }}
        className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
    </div>
  )
}
