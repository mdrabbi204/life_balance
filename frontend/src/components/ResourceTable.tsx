import { useState, type ReactNode } from 'react'
import { Pencil, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/common'
import { ConfirmDelete } from '@/components/ConfirmDelete'
import { FormDialog, type Field } from '@/components/FormDialog'
import { useList, useResource, type Params } from '@/lib/queries'

export interface Column<T> { header: string; cell: (row: T) => ReactNode; className?: string }

/**
 * Searchable, date-filterable CRUD table for a REST resource.
 */
export function ResourceTable<T extends { id: number }>({ resource, title, columns, fields, defaults, toForm, params, searchable = true, dateFilter = true, emptyText, addLabel = 'Add entry', renderToolbar }: {
  resource: string
  title: string
  columns: Column<T>[]
  fields: Field[]
  defaults: () => Record<string, unknown>
  toForm?: (row: T) => Record<string, unknown>
  params?: Params
  searchable?: boolean
  dateFilter?: boolean
  emptyText?: string
  addLabel?: string
  renderToolbar?: ReactNode
}) {
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [editing, setEditing] = useState<T | null>(null)
  const [open, setOpen] = useState(false)
  const list = useList<T>(resource, { ...params, q, from, to })
  const { create, update, remove } = useResource<T>(resource)

  const openNew = () => { setEditing(null); setOpen(true) }
  const openEdit = (row: T) => { setEditing(row); setOpen(true) }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
        <h3 className="font-semibold">{title}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {renderToolbar}
          {searchable && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-8 w-40 pl-8" />
            </div>
          )}
          {dateFilter && (
            <>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-[140px]" aria-label="From date" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-[140px]" aria-label="To date" />
              {(from || to || q) && <Button variant="ghost" size="sm" onClick={() => { setFrom(''); setTo(''); setQ('') }}>Clear</Button>}
            </>
          )}
          <Button size="sm" onClick={openNew}><Plus /> {addLabel}</Button>
        </div>
      </div>
      {list.isLoading ? (
        <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9" />)}</div>
      ) : list.isError ? (
        <div className="p-4"><ErrorState error={list.error} onRetry={() => list.refetch()} /></div>
      ) : !list.data?.length ? (
        <div className="p-4"><EmptyState title={q || from || to ? 'No matching entries' : 'Nothing logged yet'} description={emptyText} action={<Button size="sm" onClick={openNew}><Plus /> {addLabel}</Button>} /></div>
      ) : (
        <Table>
          <THead><TR>{columns.map((c) => <TH key={c.header} className={c.className}>{c.header}</TH>)}<TH className="w-20 text-right">Actions</TH></TR></THead>
          <TBody>
            {list.data.map((row) => (
              <TR key={row.id}>
                {columns.map((c) => <TD key={c.header} className={c.className}>{c.cell(row)}</TD>)}
                <TD className="text-right whitespace-nowrap">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row)} aria-label="Edit"><Pencil /></Button>
                  <ConfirmDelete onConfirm={() => remove.mutateAsync(row.id)} label="entry" />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Edit ${title.toLowerCase()}` : addLabel}
        fields={fields}
        initial={editing ? (toForm ? toForm(editing) : (editing as unknown as Record<string, unknown>)) : defaults()}
        onSubmit={(v) => (editing ? update.mutateAsync({ ...v, id: editing.id }) : create.mutateAsync(v))}
      />
    </Card>
  )
}
