import { Link } from '@tanstack/react-router'
import { HeartIcon } from 'lucide-react'
import { NftCard, NftCardSkeleton } from '@/features/catalog/nft-card'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/primitives'
import { QueryState } from '@/shared/ui/query-state'
import { useFavorites } from './favorites'

const GRID = 'grid grid-cols-2 gap-4 sm:grid-cols-3'

export function FavoritesPage() {
  const query = useFavorites()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold text-primary md:text-2xl">Lista de interesse</h1>
        {query.data && query.data.items.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {query.data.items.length} {query.data.items.length === 1 ? 'NFT' : 'NFTs'}
          </span>
        )}
      </div>
      <QueryState
        query={query}
        errorTitle="Não foi possível carregar sua lista de interesse"
        skeleton={
          <ul className={GRID}>
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i}>
                <NftCardSkeleton />
              </li>
            ))}
          </ul>
        }
        isEmpty={(data) => data.items.length === 0}
        empty={
          <EmptyState
            icon={<HeartIcon className="size-8 text-primary" aria-hidden />}
            title="Nenhum NFT favoritado ainda"
            description="Toque no coração de um NFT para guardá-lo aqui."
            action={
              <Button asChild>
                <Link to="/">Explorar o mercado</Link>
              </Button>
            }
          />
        }
      >
        {(data) => (
          <ul className={GRID}>
            {data.items.map((nft, i) => (
              <li key={nft.id}>
                <NftCard nft={nft} priority={i < 2} />
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </div>
  )
}
