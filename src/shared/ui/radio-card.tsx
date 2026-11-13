import { useId, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { RadioGroupItem } from './radio-group'

/** Opção de rádio em formato de cartão (carteiras e provedores no checkout). */
export function RadioCard({
  value,
  selected,
  title,
  description,
  aside,
  disabled,
}: {
  value: string
  selected: boolean
  title: ReactNode
  description?: ReactNode
  aside?: ReactNode
  disabled?: boolean
}) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-xl border bg-surface px-3 py-3 text-sm transition-colors md:rounded-md md:bg-background',
        selected ? 'border-primary' : 'border-border hover:border-primary/50',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <RadioGroupItem id={id} value={value} disabled={disabled} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold">{title}</span>
        {description && <span className="truncate text-xs text-muted-foreground">{description}</span>}
      </span>
      {aside}
    </label>
  )
}
