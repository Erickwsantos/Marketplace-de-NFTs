import { cn } from '@/shared/lib/cn'

/**
 * Indicadores de carrossel. O ponto visual é pequeno (como no Figma), mas a
 * área clicável tem 24×24 px (WCAG 2.5.8 — tamanho mínimo de alvo).
 */
export function CarouselDots({
  count,
  current,
  onSelect,
  label,
  itemLabel,
}: {
  count: number
  current: number
  onSelect: (index: number) => void
  label: string
  itemLabel: (index: number) => string
}) {
  if (count <= 1) return null
  return (
    <div className="flex justify-center" role="group" aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={itemLabel(i)}
          aria-current={i === current}
          className="group grid size-6 place-items-center rounded-full"
        >
          <span
            aria-hidden
            className={cn(
              'size-2.5 rounded-full transition-colors',
              i === current ? 'bg-primary' : 'bg-primary/30 group-hover:bg-primary/60',
            )}
          />
        </button>
      ))}
    </div>
  )
}
