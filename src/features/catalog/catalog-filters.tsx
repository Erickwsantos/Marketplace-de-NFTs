import { useState } from 'react'
import { CATEGORIES, NETWORKS, type CatalogResponse, type Category, type Network } from '@/contracts'
import { cn } from '@/shared/lib/cn'
import { CATEGORY_LABELS, NETWORK_LABELS } from '@/shared/lib/labels'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/primitives'
import { Slider } from '@/shared/ui/slider'
import type { CatalogSearch } from './search'

type Facets = CatalogResponse['facets']

const toggle = <T,>(list: T[] | undefined, value: T): T[] | undefined => {
  const next = list?.includes(value) ? list.filter((v) => v !== value) : [...(list ?? []), value]
  return next.length ? next : undefined
}

/** Formato do Figma no slider: vírgula decimal ("0,02 - 12,30 ETH"). */
const formatRange = (value: number) => value.toFixed(2).replace('.', ',')

function FacetGroup<T extends string>({
  title,
  values,
  labels,
  selected,
  counts,
  onToggle,
}: {
  title: string
  values: readonly T[]
  labels: Record<T, string>
  selected: T[] | undefined
  counts: Map<T, number> | null
  onToggle: (value: T) => void
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-2 text-sm font-bold">{title}</legend>
      {values.map((value) => {
        const active = selected?.includes(value) ?? false
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(value)}
            className={cn(
              'flex items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent',
              active ? 'font-semibold text-primary' : 'text-foreground',
            )}
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn('size-2 rounded-full border border-primary', active ? 'bg-primary' : 'bg-transparent')}
              />
              {labels[value]}
            </span>
            {counts ? (
              <span className={cn('tabular-nums', active ? 'text-primary' : 'text-muted-foreground')}>
                ({counts.get(value) ?? 0})
              </span>
            ) : (
              <Skeleton className="h-3 w-6" />
            )}
          </button>
        )
      })}
    </fieldset>
  )
}

function PriceRange({
  range,
  minPrice,
  maxPrice,
  onApply,
}: {
  range: Facets['priceRange'] | null
  minPrice?: string
  maxPrice?: string
  onApply: (min: string | undefined, max: string | undefined) => void
}) {
  const bounds: [number, number] = range ? [Number(range.min), Number(range.max)] : [0, 1]
  const initial: [number, number] = [minPrice ? Number(minPrice) : bounds[0], maxPrice ? Number(maxPrice) : bounds[1]]
  // Estado local só durante o arraste; o pai remonta (key) quando a URL muda.
  const [value, setValue] = useState<[number, number]>(initial)

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-sm font-bold">Faixa de preço</legend>
      <Slider
        min={bounds[0]}
        max={bounds[1]}
        step={0.01}
        value={value}
        onValueChange={(v) => setValue([v[0] ?? bounds[0], v[1] ?? bounds[1]])}
        disabled={!range}
        aria-label="Faixa de preço em ETH"
        thumbLabels={['Preço mínimo', 'Preço máximo']}
      />
      <p className="text-xs" aria-live="polite">
        Preço: {formatRange(value[0])} - {formatRange(value[1])} ETH
      </p>
      <Button
        size="sm"
        className="self-start"
        disabled={!range}
        onClick={() => {
          const atMin = value[0] <= bounds[0]
          const atMax = value[1] >= bounds[1]
          onApply(atMin ? undefined : value[0].toFixed(2), atMax ? undefined : value[1].toFixed(2))
        }}
      >
        Aplicar
      </Button>
    </fieldset>
  )
}

export function CatalogFilters({
  search,
  facets,
  onChange,
  className,
}: {
  search: CatalogSearch
  facets: Facets | null
  onChange: (patch: Partial<CatalogSearch>) => void
  className?: string
}) {
  const categoryCounts = facets ? new Map(facets.categories.map((f) => [f.value, f.count])) : null
  const networkCounts = facets ? new Map(facets.networks.map((f) => [f.value, f.count])) : null
  const hasFilters = Boolean(search.categories?.length || search.networks?.length || search.minPrice || search.maxPrice)

  return (
    <div className={cn('flex flex-col gap-6 rounded-md bg-surface p-4', className)}>
      <FacetGroup<Category>
        title="Coleções"
        values={CATEGORIES}
        labels={CATEGORY_LABELS}
        selected={search.categories}
        counts={categoryCounts}
        onToggle={(value) => onChange({ categories: toggle(search.categories, value) })}
      />
      <PriceRange
        key={`${search.minPrice}-${search.maxPrice}-${facets?.priceRange.min}-${facets?.priceRange.max}`}
        range={facets?.priceRange ?? null}
        minPrice={search.minPrice}
        maxPrice={search.maxPrice}
        onApply={(minPrice, maxPrice) => onChange({ minPrice, maxPrice })}
      />
      <FacetGroup<Network>
        title="Rede"
        values={NETWORKS}
        labels={NETWORK_LABELS}
        selected={search.networks}
        counts={networkCounts}
        onToggle={(value) => onChange({ networks: toggle(search.networks, value) })}
      />
      {hasFilters && (
        <Button
          variant="link"
          size="sm"
          className="self-start"
          onClick={() => onChange({ categories: undefined, networks: undefined, minPrice: undefined, maxPrice: undefined })}
        >
          Limpar filtros
        </Button>
      )}
    </div>
  )
}
