import { Link } from '@tanstack/react-router'
import { EyeIcon, HeartIcon, ShoppingCartIcon } from 'lucide-react'
import type { NftSummary } from '@/contracts'
import { useIsFavorite, useToggleFavorite } from '@/features/account/favorites'
import { useAddToCart } from '@/features/cart/hooks'
import { cn } from '@/shared/lib/cn'
import { EthAmount, NftImage, Skeleton } from '@/shared/ui/primitives'

const SIZES = '(min-width: 1024px) 260px, (min-width: 640px) 33vw, 50vw'

/**
 * Card do catálogo (grid, carrosséis e favoritos).
 * - Desktop (Figma): imagem em moldura escura; ações aparecem no hover/foco.
 * - Mobile (Figma): cartão inteiro arredondado (rounded-2xl), ♡ circular
 *   sempre visível sobre a imagem; atalho de carrinho ao lado do preço.
 */
export function NftCard({ nft, priority = false, className }: { nft: NftSummary; priority?: boolean; className?: string }) {
  const favorite = useIsFavorite(nft.id)
  const toggleFavorite = useToggleFavorite()
  const addToCart = useAddToCart()
  const soldOut = nft.available === 0 || !nft.defaultEditionId

  const action =
    'grid size-8 place-items-center rounded-full bg-background/85 text-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50'
  const quickAdd = () =>
    nft.defaultEditionId && addToCart.mutate({ nftId: nft.id, editionId: nft.defaultEditionId, quantity: 1, name: nft.name })
  const cartLabel = soldOut ? `${nft.name} esgotado` : `Adicionar ${nft.name} ao carrinho`

  const favoriteButton = (
    <button
      type="button"
      className={cn(action, favorite && 'text-primary')}
      onClick={() => toggleFavorite.toggle(nft, favorite)}
      aria-pressed={favorite}
      aria-label={favorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
    >
      <HeartIcon className={cn('size-4', favorite && 'fill-current')} aria-hidden />
    </button>
  )

  return (
    <article
      className={cn(
        'group relative flex flex-col gap-2 max-md:rounded-2xl max-md:bg-surface max-md:p-2 max-md:pb-3',
        className,
      )}
      aria-labelledby={`nft-${nft.id}-name`}
    >
      <div className="relative overflow-hidden rounded-xl md:rounded-md md:bg-surface md:p-2">
        <NftImage image={nft.image} sizes={SIZES} priority={priority} alt="" className="rounded-xl md:rounded-md" />
        {nft.badge === 'raro' && (
          <span className="absolute top-2 left-2 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
            Raro
          </span>
        )}
        {soldOut && (
          <span className="absolute bottom-2 left-2 rounded-md bg-background/90 px-2 py-0.5 text-[10px] font-bold uppercase md:top-2 md:right-2 md:bottom-auto md:left-auto">
            Esgotado
          </span>
        )}
        {/* Mobile: ♡ sempre visível no canto superior direito (Figma). */}
        <div className="absolute top-2 right-2 z-10 md:hidden">{favoriteButton}</div>
        {/* Desktop: ações no hover/foco (Figma). */}
        <div className="absolute right-3 bottom-3 z-10 hidden gap-1.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 md:flex">
          <button type="button" className={action} disabled={soldOut || addToCart.isPending} onClick={quickAdd} aria-label={cartLabel}>
            <ShoppingCartIcon className="size-4" aria-hidden />
          </button>
          {favoriteButton}
          <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className={action} aria-label={`Ver detalhes de ${nft.name}`} tabIndex={-1}>
            <EyeIcon className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
      <h3 id={`nft-${nft.id}-name`} className="truncate text-sm max-md:px-1">
        <Link
          to="/nfts/$nftId"
          params={{ nftId: nft.id }}
          className="after:absolute after:inset-0 after:content-[''] hover:text-primary focus-visible:outline-none [&:focus-visible]:after:rounded-2xl [&:focus-visible]:after:outline-2 [&:focus-visible]:after:outline-ring md:[&:focus-visible]:after:rounded-md"
        >
          {nft.name}
        </Link>
      </h3>
      <div className="flex items-center justify-between gap-2 max-md:px-1">
        <EthAmount value={nft.priceEth} compareAt={nft.compareAtPriceEth} className="text-sm" />
        <button
          type="button"
          className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full bg-background text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-40 md:hidden"
          disabled={soldOut || addToCart.isPending}
          onClick={quickAdd}
          aria-label={cartLabel}
        >
          <ShoppingCartIcon className="size-4" aria-hidden />
        </button>
      </div>
    </article>
  )
}

/** Skeleton com as mesmas proporções do card (sem layout shift). */
export function NftCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 max-md:rounded-2xl max-md:bg-surface max-md:p-2 max-md:pb-3">
      <div className="rounded-xl md:rounded-md md:bg-surface md:p-2">
        <Skeleton className="aspect-square w-full rounded-xl md:rounded-md" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  )
}
