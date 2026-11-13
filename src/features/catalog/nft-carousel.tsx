import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { CatalogQuery } from '@/contracts'
import { cn } from '@/shared/lib/cn'
import { SectionTitle } from '@/shared/ui/primitives'
import { catalogQueries } from './api'
import { NftCard, NftCardSkeleton } from './nft-card'

/**
 * Carrossel horizontal de NFTs ("Mais desta coleção", "Colecionadores
 * também viram"). Scroll nativo com snap (teclado/touch) + indicadores.
 * Falhas não bloqueiam a página: a seção simplesmente não aparece.
 */
export function NftCarousel({ title, query, className }: { title: string; query: CatalogQuery; className?: string }) {
  const { data, isPending, isError } = useQuery(catalogQueries.list({ pageSize: 8, ...query }))
  const scroller = useRef<HTMLUListElement>(null)
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(1)
  const headingId = `carousel-${title.replace(/\W+/g, '-').toLowerCase()}`

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const update = () => {
      // Container ainda sem largura (oculto/montando): uma página.
      if (el.clientWidth === 0) return setPages(1)
      setPages(Math.min(12, Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth - 0.05))))
      setPage(Math.round(el.scrollLeft / el.clientWidth))
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [data])

  if (isError || (data && data.items.length === 0)) return null

  return (
    <section aria-labelledby={headingId} className={cn('flex flex-col gap-4', className)}>
      <SectionTitle id={headingId}>{title}</SectionTitle>
      <ul
        ref={scroller}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]"
        aria-busy={isPending}
      >
        {(isPending ? Array.from({ length: 5 }, () => null) : data.items).map((nft, i) => (
          <li key={nft?.id ?? i} className="w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-[18.5%]">
            {nft ? <NftCard nft={nft} /> : <NftCardSkeleton />}
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <div className="flex justify-center gap-2" role="group" aria-label={`Navegar em ${title}`}>
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Página ${i + 1} de ${pages}`}
              aria-current={i === page}
              onClick={() => scroller.current?.scrollTo({ left: i * scroller.current.clientWidth, behavior: 'smooth' })}
              className={cn('size-2.5 rounded-full transition-colors', i === page ? 'bg-primary' : 'bg-primary/30')}
            />
          ))}
        </div>
      )}
    </section>
  )
}
