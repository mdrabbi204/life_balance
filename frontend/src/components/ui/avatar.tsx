import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils'

export function Avatar({ src, name, className }: { src?: string | null; name: string; className?: string }) {
  const initials = name.split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <AvatarPrimitive.Root className={cn('relative flex size-9 shrink-0 overflow-hidden rounded-full', className)}>
      {src && <AvatarPrimitive.Image src={src} alt={name} className="aspect-square size-full object-cover" />}
      <AvatarPrimitive.Fallback className="flex size-full items-center justify-center bg-primary/15 text-sm font-semibold text-primary">{initials}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}
