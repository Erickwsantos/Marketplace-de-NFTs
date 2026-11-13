import { Link } from '@tanstack/react-router'
import { EyeIcon, HeartIcon, ShoppingCartIcon } from 'lucide-react'
import type { NftSummary } from '@/contracts'
import { useIsFavorite, useToggleFavorite } from '@/features/account/favorites'
import { useAddToCart } from '@/features/cart/hooks'
import { cn } from '@/shared/lib/cn'
import { EthAmount, NftImage, Skeleton } from '@/shared/ui/primitives'

const SIZES = '(min-width: 1024px) 260px, (min-width: 640px) 33vw, 50vw'

/** Card do catálogo (grid, carrosséis e favoritos). Ações aparecem no hover/foco, como no Figma. */
export function NftCard({ nft, priority = false, className }: { nft: NftSummary; priority?: boolean; className?: string }) {
  const favorite = useIsFavorite(nft.id)
  const toggleFavorite = useToggleFavorite()
  const addToCart = useAddToCart()
  const soldOut = nft.available === 0 || !nft.defaultEditionId

  const action =
    'grid size-8 place-items-center rounded-full bg-background/85 text-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50'

  return (
    <article className={cn('group relative flex flex-col gap-2', className)} aria-labelledby={`nft-${nft.id}-name`}>
      <div className="relative overflow-hidden rounded-md bg-surface p-2">
        <NftImage image={nft.image} sizes={SIZES} priority={priority} alt="" className="rounded-md" />
        {nft.badge === 'raro' && (
          <span className="absolute top-2 left-2 rounded-sm bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
            Raro
          </span>
        )}
        {soldOut && (
          <span className="absolute top-2 right-2 rounded-sm bg-background/90 px-2 py-0.5 text-[10px] font-bold uppercase">
            Esgotado
          </span>
        )}
        <div className="absolute right-3 bottom-3 z-10 flex gap-1.5 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
          <button
            type="button"
            className={action}
            disabled={soldOut || addToCart.isPending}
            onClick={() =>
              nft.defaultEditionId &&
              addToCart.mutate({ nftId: nft.id, editionId: nft.defaultEditionId, quantity: 1, name: nft.name })
            }
            aria-label={soldOut ? `${nft.name} esgotado` : `Adicionar ${nft.name} ao carrinho`}
          >
            <ShoppingCartIcon className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            className={cn(action, favorite && 'text-primary')}
            onClick={() => toggleFavorite.toggle(nft, favorite)}
            aria-pressed={favorite}
            aria-label={favorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
          >
            <HeartIcon className={cn('size-4', favorite && 'fill-current')} aria-hidden />
          </button>
          <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className={action} aria-label={`Ver detalhes de ${nft.name}`} tabIndex={-1}>
            <EyeIcon className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
      <h3 id={`nft-${nft.id}-name`} className="text-sm">
        <Link
          to="/nfts/$nftId"
          params={{ nftId: nft.id }}
          className="after:absolute after:inset-0 after:content-[''] hover:text-primary focus-visible:outline-none [&:focus-visible]:after:rounded-md [&:focus-visible]:after:outline-2 [&:focus-visible]:after:outline-ring"
        >
          {nft.name}
        </Link>
      </h3>
      <EthAmount value={nft.priceEth} compareAt={nft.compareAtPriceEth} className="text-sm" />
    </article>
  )
}

/** Skeleton com as mesmas proporções do card (sem layout shift). */
export function NftCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-md bg-surface p-2">
        <Skeleton className="aspect-square w-full" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  )
}
