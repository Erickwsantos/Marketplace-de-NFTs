import { MinusIcon, PlusIcon } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

/**
 * Seletor de quantidade (− n +) do Figma. Inteiros entre min e max; o limite
 * é anunciado quando atingido. Reutilizado no detalhe e no carrinho.
 */
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label,
  disabled = false,
  size = 'md',
  className,
}: {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  label: string
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}) {
  const button = cn(
    'inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40',
    size === 'sm' ? 'size-6' : 'size-8',
  )
  const atMax = value >= max
  return (
    <div role="group" aria-label={label} className={cn('inline-flex items-center gap-2', className)}>
      <button
        type="button"
        className={button}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label={`Diminuir quantidade de ${label}`}
      >
        <MinusIcon className="size-3.5" aria-hidden />
      </button>
      <output aria-live="polite" className="min-w-6 text-center text-sm font-semibold tabular-nums">
        {value}
      </output>
      <button
        type="button"
        className={button}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || atMax}
        aria-label={`Aumentar quantidade de ${label}`}
        title={atMax ? `Limite de ${max} por pedido` : undefined}
      >
        <PlusIcon className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}
