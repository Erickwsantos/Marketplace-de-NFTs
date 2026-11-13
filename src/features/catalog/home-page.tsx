import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from 'lucide-react'
import { CATALOG_SORTS, CATALOG_TABS, type CatalogSort } from '@/contracts'
import { cn } from '@/shared/lib/cn'
import { SORT_LABELS, TAB_LABELS } from '@/shared/lib/labels'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { BackgroundRefresh, EmptyState, ErrorState } from '@/shared/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/sheet'
import { catalogQueries } from './api'
import { CatalogFilters } from './catalog-filters'
import { Hero, Journal, Promos, Spotlight } from './home-sections'
import { NftCard, NftCardSkeleton } from './nft-card'
import { toCatalogQuery, type CatalogSearch } from './search'

const route = getRouteApi('/')

function useCatalogSearch() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  /** Qualquer mudança de filtro/busca/ordenação volta para a página 1. */
  const update = (patch: Partial<CatalogSearch>, { resetPage = true, replace = false } = {}) =>
    navigate({
      search: (prev) => ({ ...prev, ...patch, ...(resetPage ? { page: undefined } : {}) }),
      replace,
      resetScroll: false,
    })
  return { search, update }
}

/** Remontado (key) quando a busca muda por fora (histórico, limpar busca). */
function SearchBox({
  value,
  onSearch,
}: {
  value: string | undefined
  onSearch: (q: string | undefined) => void
}) {
  const [text, setText] = useState(value ?? '')
  // Debounce: digitação atualiza a URL (replace) sem poluir o histórico.
  useEffect(() => {
    const normalized = text.trim() || undefined
    if (normalized === (value || undefined)) return
    const timer = setTimeout(() => onSearch(normalized), 350)
    return () => clearTimeout(timer)
  }, [text]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div role="search" className="relative flex-1">
      <label htmlFor="catalog-search" className="sr-only">
        Buscar no catálogo
      </label>
      <SearchIcon
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        aria-hidden
      />
      <Input
        id="catalog-search"
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Explorar coleções"
        className="border-border bg-surface md:bg-background h-11 rounded-xl pl-9 md:h-10 md:rounded-md"
      />
    </div>
  )
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number
  totalPages: number
  onPage: (page: number) => void
}) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
  const item = 'grid size-8 place-items-center rounded text-xs transition-colors'
  return (
    <nav aria-label="Paginação do catálogo" className="flex justify-end">
      <ul className="flex items-center gap-1">
        <li>
          <button
            type="button"
            className={cn(item, 'hover:bg-accent disabled:opacity-40')}
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeftIcon className="size-4" aria-hidden />
          </button>
        </li>
        {pages.map((p) => (
          <li key={p}>
            <button
              type="button"
              onClick={() => onPage(p)}
              aria-current={p === page ? 'page' : undefined}
              aria-label={`Página ${p}`}
              className={cn(
                item,
                p === page ? 'bg-primary text-primary-foreground font-bold' : 'hover:bg-accent',
              )}
            >
              {p}
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            className={cn(item, 'hover:bg-accent disabled:opacity-40')}
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
            aria-label="Próxima página"
          >
            <ChevronRightIcon className="size-4" aria-hidden />
          </button>
        </li>
      </ul>
    </nav>
  )
}

function SortSelect({
  value,
  onChange,
  id,
}: {
  value: CatalogSort
  onChange: (sort: CatalogSort) => void
  id: string
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span id={id}>Ordenar por:</span>
      <Select value={value} onValueChange={(sort) => onChange(sort as CatalogSort)}>
        <SelectTrigger
          aria-labelledby={id}
          size="sm"
          className="h-8 w-auto min-w-44 border-none bg-transparent px-1 text-xs"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CATALOG_SORTS.map((sort) => (
            <SelectItem key={sort} value={sort}>
              {SORT_LABELS[sort]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function HomePage() {
  const { search, update } = useCatalogSearch()
  const query = toCatalogQuery(search)
  const featured = useQuery(catalogQueries.featured())
  const catalog = useQuery(catalogQueries.list(query))
  const [filtersOpen, setFiltersOpen] = useState(false)
  const data = catalog.data
  const facets = data?.facets ?? null
  // keepPreviousData: enquanto a nova consulta carrega, o resultado anterior fica visível (atualizando).
  const refreshing = catalog.isFetching && !catalog.isPending
  const activeFilterCount =
    (search.categories?.length ?? 0) +
    (search.networks?.length ?? 0) +
    (search.minPrice || search.maxPrice ? 1 : 0)

  const setSort = (sort: CatalogSort) => update({ sort: sort === 'recent' ? undefined : sort })

  const goToPage = (page: number) => {
    update({ page }, { resetPage: false })
    document.getElementById('catalogo')?.scrollIntoView({ block: 'start' })
  }

  return (
    <div className="flex flex-col gap-5 pt-3 md:gap-12 md:pt-0">
      {/* Mobile (Figma): busca e filtros no topo da tela. */}
      <div className="container-page flex gap-2 md:hidden">
        <SearchBox
          key={search.q ?? ''}
          value={search.q}
          onSearch={(q) => update({ q }, { replace: true })}
        />
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button
              size="icon"
              className="relative size-11 rounded-xl"
              aria-label={`Filtros${activeFilterCount ? ` (${activeFilterCount} ativos)` : ''}`}
            >
              <SlidersHorizontalIcon aria-hidden />
              {activeFilterCount > 0 && (
                <span
                  aria-hidden
                  className="bg-foreground text-background absolute -top-1 -right-1 grid size-4 place-items-center rounded-full text-[10px]"
                >
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="bg-background w-[85vw] max-w-sm overflow-y-auto rounded-r-2xl p-4"
          >
            <SheetHeader className="p-0">
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>Combine coleções, faixa de preço e rede.</SheetDescription>
            </SheetHeader>
            <SortSelect id="sort-label-mobile" value={search.sort ?? 'recent'} onChange={setSort} />
            <CatalogFilters
              search={search}
              facets={facets}
              onChange={(patch) => update(patch)}
              className="rounded-2xl"
            />
            <Button onClick={() => setFiltersOpen(false)} className="rounded-full">
              Ver {data?.total ?? ''} resultados
            </Button>
          </SheetContent>
        </Sheet>
      </div>
      <Hero featured={featured.data} />

      <section
        id="catalogo"
        aria-labelledby="catalog-title"
        className="container-page scroll-mt-20"
      >
        <h2 id="catalog-title" className="sr-only">
          Catálogo de NFTs
        </h2>
        <div className="grid gap-6 md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr]">
          <aside aria-label="Filtros do catálogo" className="hidden flex-col gap-8 md:flex">
            <CatalogFilters search={search} facets={facets} onChange={(patch) => update(patch)} />
            <Spotlight featured={featured.data} />
          </aside>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                role="tablist"
                aria-label="Listas do catálogo"
                className="flex gap-4 overflow-x-auto"
              >
                {CATALOG_TABS.map((tab) => {
                  const selected = (search.tab ?? 'all') === tab
                  return (
                    <button
                      key={tab}
                      role="tab"
                      type="button"
                      aria-selected={selected}
                      aria-controls="catalog-results"
                      onClick={() => update({ tab: tab === 'all' ? undefined : tab })}
                      className={cn(
                        'border-b-2 pb-1 text-xs whitespace-nowrap transition-colors md:text-sm',
                        selected
                          ? 'border-primary text-primary font-semibold'
                          : 'hover:text-primary border-transparent',
                      )}
                    >
                      {TAB_LABELS[tab]}
                    </button>
                  )
                })}
              </div>
              <div className="hidden md:block">
                <SortSelect id="sort-label" value={search.sort ?? 'recent'} onChange={setSort} />
              </div>
            </div>

            <div
              className={cn(
                'flex min-h-6 flex-wrap items-center justify-between gap-2',
                !search.q && !refreshing && 'max-md:hidden',
              )}
              aria-live="polite"
            >
              {search.q ? (
                <p className="flex items-center gap-2 text-xs">
                  Resultados para <strong>“{search.q}”</strong>
                  <button
                    type="button"
                    onClick={() => update({ q: undefined })}
                    className="hover:bg-accent rounded p-0.5"
                    aria-label="Limpar busca"
                  >
                    <XIcon className="size-3.5" aria-hidden />
                  </button>
                </p>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground flex items-center gap-3 text-xs">
                <BackgroundRefresh active={refreshing} />
                {data && `${data.total} ${data.total === 1 ? 'NFT' : 'NFTs'}`}
              </span>
            </div>

            <div id="catalog-results" role="tabpanel" aria-busy={catalog.isFetching}>
              {catalog.isPending ? (
                <ul
                  className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3"
                  aria-label="Carregando NFTs"
                >
                  {Array.from({ length: 9 }, (_, i) => (
                    <li key={i}>
                      <NftCardSkeleton />
                    </li>
                  ))}
                </ul>
              ) : catalog.isError && !data ? (
                <ErrorState
                  error={catalog.error}
                  title="Não foi possível carregar o catálogo"
                  onRetry={() => void catalog.refetch()}
                />
              ) : data && data.items.length === 0 ? (
                <EmptyState
                  icon={<SearchIcon className="text-primary size-8" aria-hidden />}
                  title="Nenhum NFT encontrado"
                  description="Tente outros termos ou remova alguns filtros."
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        update({
                          q: undefined,
                          categories: undefined,
                          networks: undefined,
                          minPrice: undefined,
                          maxPrice: undefined,
                          tab: undefined,
                        })
                      }
                    >
                      Limpar busca e filtros
                    </Button>
                  }
                />
              ) : (
                <ul
                  className={cn(
                    'grid grid-cols-2 gap-3 transition-opacity md:gap-4 lg:grid-cols-3',
                    refreshing && 'opacity-70',
                  )}
                >
                  {data?.items.map((nft, i) => (
                    <li key={nft.id}>
                      <NftCard nft={nft} priority={i < 2} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {data && <Pagination page={data.page} totalPages={data.totalPages} onPage={goToPage} />}
          </div>
        </div>
      </section>

      <Promos />
      <Journal />
    </div>
  )
}
