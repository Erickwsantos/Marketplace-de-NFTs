import { useId } from 'react'
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import type { Edition } from '@/contracts'
import { cn } from '@/shared/lib/cn'
import { editionState } from './editions'

const STATE_TEXT = { sold_out: 'Esgotada', unavailable: 'indisponível' } as const

/**
 * Chips de edição (Figma: "1/1 1/10 1/50 ABERTA") como radiogroup acessível
 * (Radix: role="radio", aria-checked, setas do teclado, foco itinerante).
 * Indisponível → desabilitado; esgotada → selecionável, com texto de estado.
 */
export function EditionPicker({
  editions,
  value,
  onChange,
}: {
  editions: Edition[]
  value: string
  onChange: (editionId: string) => void
}) {
  const labelId = useId()
  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="text-sm font-semibold">
        Edição:
      </span>
      <RadioGroupPrimitive.Root
        aria-labelledby={labelId}
        value={value}
        onValueChange={onChange}
        orientation="horizontal"
        className="flex flex-wrap gap-2"
      >
        {editions.map((edition) => {
          const state = editionState(edition)
          return (
            <RadioGroupPrimitive.Item
              key={edition.id}
              value={edition.id}
              disabled={state === 'unavailable'}
              className={cn(
                'inline-flex h-11 min-w-16 cursor-pointer flex-col items-center justify-center rounded-md border border-border bg-surface px-3 text-sm leading-tight font-semibold uppercase transition-colors',
                'hover:border-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
                'data-[disabled]:cursor-not-allowed data-[disabled]:border-dashed data-[disabled]:opacity-60 data-[disabled]:hover:border-border',
              )}
            >
              <span>{edition.label}</span>
              {state !== 'available' && (
                <span className="text-[10px] font-normal normal-case">{STATE_TEXT[state]}</span>
              )}
            </RadioGroupPrimitive.Item>
          )
        })}
      </RadioGroupPrimitive.Root>
    </div>
  )
}
