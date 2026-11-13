import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { AlertTriangleIcon, BanIcon, ChevronLeftIcon, HeartIcon, Link2Icon, ShoppingCartIcon, StarIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { NftDetail } from '@/contracts'
import { useIsFavorite, useToggleFavorite } from '@/features/account/favorites'
import { useAddToCart } from '@/features/cart/hooks'
import { catalogQueries } from '@/features/catalog/api'
import { NftCardSkeleton } from '@/features/catalog/nft-card'
import { NftCarousel } from '@/features/catalog/nft-carousel'
import { cn } from '@/shared/lib/cn'
import { multiplyEth } from '@/shared/lib/eth'
import { Button } from '@/shared/ui/button'
import { BackgroundRefresh, Breadcrumbs, ErrorState, EthAmount, Skeleton } from '@/shared/ui/primitives'
import { QuantityStepper } from '@/shared/ui/quantity-stepper'
import { EditionPicker } from './edition-picker'
import { editionMax, editionState, useEditionChangeNotice, type EditionNotice } from './editions'
import { NftGallery, NftGallerySkeleton, OVERLAY_BUTTON } from './nft-gallery'
import { formatRating, NftInfoTabs, RatingStars, type InfoTab } from './nft-info-tabs'

const route = getRouteApi('/nfts/$nftId')

/*
 * Estrutura compartilhada entre a página e o skeleton (mesmas dimensões → sem CLS).
 * Mobile (Figma): tela imersiva (sem header/navegação inferior) com a barra de
 * compra fixa no rodapé da tela; o conteúdo reserva espaço para ela
 * (`max-md:pb-*`), então a barra nunca cobre o último conteúdo.
 */
const PAGE =
  'container-page flex flex-col gap-10 pt-4 max-md:pb-[calc(9.5rem+env(safe-area-inset-bottom))] md:gap-14 md:pt-6'
const GRID = 'grid gap-5 md:grid-cols-2 md:items-start md:gap-8 lg:gap-12'
const INFO = 'flex min-w-0 flex-col gap-4 md:gap-5'
const MOBILE_BAR =
  'fixed inset-x-0 bottom-0 z-40 flex flex-col gap-3 border-t border-border bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden'

export function NftDetailPage() {
  const { nftId } = route.useParams()
  const query = useQuery(catalogQueries.detail(nftId))

  if (query.isPending) return <NftDetailSkeleton />
  const nft = query.data
  if (!nft) {
    return (
      <div className="container-page py-8">
        <ErrorState error={query.error} title="Não foi possível carregar este NFT" onRetry={() => void query.refetch()} />
      </div>
    )
  }
  // key: ao navegar para outro NFT (carrossel), edição/quantidade/galeria reiniciam.
  return <NftDetailView key={nft.id} nft={nft} refreshing={query.isFetching} />
}

function NftDetailView({ nft, refreshing }: { nft: NftDetail; refreshing: boolean }) {
  const navigate = useNavigate()
  const [editionId, setEditionId] = useState(() => nft.defaultEditionId ?? nft.editions[0]!.id)
  const edition = nft.editions.find((e) => e.id === editionId) ?? nft.editions[0]!
  const [quantity, setQuantity] = useState(1)
  const [tab, setTab] = useState<InfoTab>('details')
  const reviewsTabRef = useRef<HTMLButtonElement>(null)

  // Disponibilidade/preço podem mudar em tempo real: a quantidade efetiva é derivada.
  const max = editionMax(edition)
  const state = editionState(edition)
  const canBuy = max > 0
  const qty = Math.max(1, Math.min(quantity, max))
  const { notice, dismiss } = useEditionChangeNotice(edition, quantity)

  // Duas instâncias: cada botão mostra o próprio spinner; ambos bloqueiam enquanto houver envio.
  const buyMutation = useAddToCart()
  const addMutation = useAddToCart()
  const busy = buyMutation.isPending || addMutation.isPending
  const input = { nftId: nft.id, editionId: edition.id, quantity: qty, name: nft.name }

  const buy = () => {
    if (busy || !canBuy) return
    buyMutation.mutate(input, { onSuccess: () => void navigate({ to: '/cart' }) })
  }
  const addOnly = () => {
    if (busy || !canBuy) return
    addMutation.mutate(input, {
      onSuccess: () =>
        toast.success(`${nft.name} adicionado ao carrinho.`, {
          action: { label: 'Ver carrinho', onClick: () => void navigate({ to: '/cart' }) },
        }),
    })
  }
  const showReviews = () => {
    setTab('reviews')
    document.getElementById('nft-info')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    reviewsTabRef.current?.focus({ preventScroll: true })
  }

  const buyLabel = canBuy ? null : state === 'unavailable' ? 'Indisponível' : 'Esgotada'

  return (
    <div className={PAGE}>
      <div className="flex flex-col gap-4">
        <Breadcrumbs
          className="hidden md:block"
          items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/' }, { label: nft.name }]}
        />
        <div className={GRID}>
          <NftGallery
            nft={nft}
            overlay={
              <>
                <BackButton />
                {/* Mobile: favoritar sobre a imagem (Figma); no desktop fica ao lado de "Comprar". */}
                <FavoriteButton nft={nft} variant="overlay" />
              </>
            }
          />

          <div className={INFO}>
            {/* Mobile: nome à esquerda e pílula da nota à direita; o preço fica só na barra de compra. */}
            <div className="flex flex-col gap-2 max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:items-start max-md:gap-3">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-2xl font-bold break-words max-md:text-xl md:text-3xl">{nft.name}</h1>
                <BackgroundRefresh active={refreshing} />
              </div>
              <EthAmount value={edition.priceEth} compareAt={edition.compareAtPriceEth} className="text-xl max-md:hidden md:text-2xl" />
              <RatingSummary nft={nft} onShowReviews={showReviews} />
            </div>

            <section aria-labelledby="nft-about-title" className="flex flex-col gap-1.5 text-sm">
              <h2 id="nft-about-title" className="font-semibold max-md:sr-only">
                Sobre este NFT:
              </h2>
              <p className="leading-relaxed text-muted-foreground">{nft.description}</p>
            </section>

            <div className="flex flex-col gap-2">
              <EditionPicker editions={nft.editions} value={edition.id} onChange={setEditionId} />
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {canBuy ? (
                  <>
                    Máx. {edition.maxPerOrder} por pedido · {edition.available} disponíveis
                  </>
                ) : (
                  <>
                    <BanIcon className="size-3.5 text-warning" aria-hidden />
                    Edição {edition.label} {state === 'unavailable' ? 'indisponível' : 'esgotada'} — escolha outra edição.
                  </>
                )}
              </p>
            </div>

            {notice && <ChangeNotice notice={notice} onDismiss={dismiss} />}

            <div className="flex flex-wrap items-center gap-3 max-md:hidden">
              <div className="flex items-center gap-3">
                <QuantityStepper
                  value={qty}
                  max={Math.max(1, max)}
                  onChange={setQuantity}
                  label={nft.name}
                  disabled={!canBuy || busy}
                />
                <Button className="min-w-36 uppercase" onClick={buy} loading={buyMutation.isPending} disabled={!canBuy || busy}>
                  {buyLabel ?? 'Comprar'}
                </Button>
              </div>
              <FavoriteButton nft={nft} variant="inline" />
            </div>

            <dl className="grid grid-cols-[max-content_1fr] gap-x-2 gap-y-1.5 text-sm">
              <dt className="font-semibold">ID do token:</dt>
              <dd className="text-muted-foreground">{nft.tokenId}</dd>
              <dt className="font-semibold">Coleção:</dt>
              <dd className="text-muted-foreground">{nft.collection.name}</dd>
              {nft.attributes.length > 0 && (
                <>
                  <dt className="font-semibold">Atributos:</dt>
                  <dd className="text-muted-foreground">{nft.attributes.join(', ')}</dd>
                </>
              )}
            </dl>

            <ShareRow />
          </div>
        </div>
      </div>

      <NftInfoTabs nft={nft} tab={tab} onTabChange={setTab} reviewsTabRef={reviewsTabRef} />

      <NftCarousel title="Mais desta coleção" query={{ collection: nft.collection.id, exclude: nft.id }} />

      <section aria-label="Compra rápida" className={MOBILE_BAR}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground" aria-hidden>
              Qtd.
            </span>
            <QuantityStepper value={qty} max={Math.max(1, max)} onChange={setQuantity} label={nft.name} disabled={!canBuy || busy} />
          </div>
          <p className="text-lg font-bold">
            <span className="sr-only">Total: </span>
            <EthAmount value={multiplyEth(edition.priceEth, qty)} />
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="lg" className="flex-1 rounded-full" onClick={buy} loading={buyMutation.isPending} disabled={!canBuy || busy}>
            {buyLabel ?? 'Comprar NFT'}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-12 rounded-full [&_svg]:size-5"
            onClick={addOnly}
            loading={addMutation.isPending}
            disabled={!canBuy || busy}
            aria-label={`Adicionar ${nft.name} ao carrinho`}
          >
            {!addMutation.isPending && <ShoppingCartIcon aria-hidden />}
          </Button>
        </div>
      </section>
    </div>
  )
}

/** Mobile: volta no histórico; sem histórico (link direto), vai para o início. */
function BackButton() {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => (canGoBack ? router.history.back() : void navigate({ to: '/' }))}
      aria-label="Voltar"
      className={cn(OVERLAY_BUTTON, 'absolute top-3 left-3 md:hidden')}
    >
      <ChevronLeftIcon className="size-5" aria-hidden />
    </button>
  )
}

function RatingSummary({ nft, onShowReviews }: { nft: NftDetail; onShowReviews: () => void }) {
  const { average, count } = nft.rating
  if (count === 0) return <p className="text-sm text-muted-foreground max-md:text-xs">Sem avaliações ainda</p>
  const avg = formatRating(average)
  return (
    <button
      type="button"
      onClick={onShowReviews}
      className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
    >
      <span className="sr-only">
        Nota média {avg} de 5, {count} avaliações de colecionadores. Ver avaliações.
      </span>
      <span aria-hidden className="hidden flex-wrap items-center gap-x-2 text-left md:flex">
        <RatingStars value={average} /> {count} avaliações de colecionadores
      </span>
      <span
        aria-hidden
        className="inline-flex items-center gap-1 rounded-full border border-primary px-2.5 py-1 text-xs whitespace-nowrap text-foreground md:hidden"
      >
        <StarIcon className="size-3.5 fill-current text-primary" /> {avg} ({count})
      </span>
    </button>
  )
}

function ChangeNotice({ notice, onDismiss }: { notice: EditionNotice; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="flex-1">
        <span className="font-semibold">Atualização: </span>
        {notice.message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dispensar aviso"
        className="grid size-6 shrink-0 place-items-center rounded hover:bg-warning/20"
      >
        <XIcon className="size-4" aria-hidden />
      </button>
    </div>
  )
}

/**
 * Mesmo botão em dois pontos do layout responsivo: `overlay` (círculo sobre a
 * imagem, só mobile — Figma) e `inline` (ao lado de "Comprar", só md+). Um
 * deles está sempre com display:none, então só um existe na árvore de
 * acessibilidade e a ordem de foco segue a ordem visual em cada layout.
 */
function FavoriteButton({ nft, variant }: { nft: NftDetail; variant: 'overlay' | 'inline' }) {
  const favorite = useIsFavorite(nft.id)
  const toggleFavorite = useToggleFavorite()
  const label = favorite ? 'Favoritado' : 'Favoritar'
  const onClick = () => toggleFavorite.toggle(nft, favorite)
  if (variant === 'overlay') {
    return (
      <button
        type="button"
        aria-pressed={favorite}
        onClick={onClick}
        className={cn(OVERLAY_BUTTON, 'absolute top-3 right-3 md:hidden', favorite && 'text-primary')}
      >
        <HeartIcon className={cn('size-5', favorite && 'fill-current')} aria-hidden />
        <span className="sr-only">{label}</span>
      </button>
    )
  }
  return (
    <Button variant="outline" aria-pressed={favorite} onClick={onClick}>
      <HeartIcon className={cn(favorite && 'fill-current')} aria-hidden />
      {label}
    </Button>
  )
}

function ShareRow() {
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copiado')
    } catch {
      toast.error('Não foi possível copiar o link. Copie o endereço pela barra do navegador.')
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      <span className="font-semibold">Compartilhar este NFT:</span>
      <Button variant="outline" size="sm" onClick={() => void copyLink()}>
        <Link2Icon aria-hidden /> Copiar link
      </Button>
      <span className="text-xs text-muted-foreground">Redes sociais em breve</span>
    </div>
  )
}

/**
 * Skeleton da página (mesmo layout). Exportado também como identificador
 * próprio: com `autoCodeSplitting`, a rota deve usar
 * `pendingComponent: NftDetailSkeleton` (ver relatório).
 */
export function NftDetailSkeleton() {
  return (
    <div className={PAGE} aria-busy="true" aria-label="Carregando NFT">
      <div className="flex flex-col gap-4">
        <Skeleton className="hidden h-4 w-56 md:block" />
        <div className={GRID}>
          <NftGallerySkeleton />
          <div className={INFO}>
            <div className="flex flex-col gap-2 max-md:flex-row max-md:items-start max-md:justify-between max-md:gap-3">
              <Skeleton className="h-8 w-3/4 max-md:h-7 max-md:w-1/2 md:h-9" />
              <Skeleton className="h-7 w-28 max-md:hidden md:h-8" />
              <Skeleton className="h-5 w-64 max-w-full max-md:h-6 max-md:w-20 max-md:rounded-full" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-16" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-11 w-16" />
                ))}
              </div>
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="flex flex-wrap items-center gap-3 max-md:hidden">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-64 max-w-full" />
            </div>
            <Skeleton className="h-8 w-72 max-w-full" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <Skeleton className="h-9 w-full max-w-md" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full max-w-3xl" />
          <Skeleton className="h-4 w-full max-w-3xl" />
          <Skeleton className="h-4 w-full max-w-3xl md:hidden" />
          <Skeleton className="h-4 w-2/3 max-w-3xl" />
        </div>
        {/* Rede / Contrato / Direitos: uma linha cada no desktop, rótulo + valor empilhados no mobile. */}
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2 sm:flex-row sm:gap-4">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-48" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-48" />
        <div className="flex gap-4 overflow-hidden pb-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="w-[44%] shrink-0 sm:w-[30%] lg:w-[18.5%]">
              <NftCardSkeleton />
            </div>
          ))}
        </div>
      </div>
      <div className={MOBILE_BAR} aria-hidden="true">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 flex-1 rounded-full" />
          <Skeleton className="size-12 rounded-full" />
        </div>
      </div>
    </div>
  )
}

NftDetailPage.Skeleton = NftDetailSkeleton
