import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from './api'
import { errorMessage } from './utils'

export type Params = Record<string, string | number | boolean | null | undefined>

const clean = (p?: Params) => (p ? Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v !== null && v !== undefined)) : undefined)

/** GET /{path} returning the raw JSON body. */
export function useApi<T>(path: string, params?: Params, opts?: Partial<UseQueryOptions<T>>) {
  return useQuery<T>({
    queryKey: [path, clean(params)],
    queryFn: () => api.get(`/${path}`, { params: clean(params) }).then((r) => r.data as T),
    ...opts,
  })
}

/** GET /{resource} returning body.data as a list. */
export function useList<T>(resource: string, params?: Params, opts?: { enabled?: boolean }) {
  return useQuery<T[]>({
    queryKey: [resource, clean(params)],
    queryFn: () => api.get(`/${resource}`, { params: clean(params) }).then((r) => r.data.data as T[]),
    ...opts,
  })
}

/**
 * Mutations for a REST resource. All queries are invalidated after a change so every
 * dashboard, score and report recomputes from the stored data.
 */
export function useResource<T = unknown>(resource: string, messages?: { created?: string; updated?: string; deleted?: string }) {
  const qc = useQueryClient()
  const done = (msg?: string) => () => {
    qc.invalidateQueries()
    if (msg) toast.success(msg)
  }
  const fail = (e: unknown) => toast.error(errorMessage(e))
  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post(`/${resource}`, data).then((r) => r.data.data as T),
    onSuccess: done(messages?.created ?? 'Saved'),
  })
  const update = useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown> & { id: number }) => api.put(`/${resource}/${id}`, data).then((r) => r.data.data as T),
    onSuccess: done(messages?.updated ?? 'Updated'),
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/${resource}/${id}`),
    onSuccess: done(messages?.deleted ?? 'Deleted'),
    onError: fail,
  })
  return { create, update, remove }
}

/** One-off action mutation (POST/PATCH/PUT) that refreshes everything on success. */
export function useAction<TBody = Record<string, unknown>, TRes = unknown>(fn: (body: TBody) => Promise<TRes>, successMessage?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries()
      if (successMessage) toast.success(successMessage)
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
}
