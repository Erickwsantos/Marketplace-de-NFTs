import { Link, useNavigate } from '@tanstack/react-router'
import { ShoppingCartIcon } from 'lucide-react'
import { useAuth } from '@/features/auth/session'
import { NftCarousel } from '@/features/catalog/nft-carousel'
import { Button } from '@/shared/ui/button'
import { Breadcrumbs, EmptyState, ErrorState, Skeleton } from '@/shared/ui/primitives'
import { ScreenHeader } from '@/shared/ui/screen-header'
import { CartItemRow, CartItemSkeleton } from './cart-item-row'
import { useCart, useQuote } from './hooks'
import { CouponForm, QuoteIssues, QuoteTotalsState } from './quote-summary'

/** Rede usada na estimativa do carrinho; o checkout recota com a rede escolhida. */
const ESTIMATE_NETWORK = 'ethereum' as const

export function CartPage() {
  const cart = useCart()
  const quote = useQuote(ESTIMATE_NETWORK)
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const items = cart.data?.items ?? []
  const canCheckout = Boolean(quote.data?.valid) && !quote.isFetching

  const goToCheckout = () => {
    if (isAuthenticated) void navigate({ to: '/checkout' })
    else void navigate({ to: '/login', search: { redirect: '/checkout' } })
  }

  return (
    <div className="container-page flex flex-col gap-12 max-md:min-h-dvh md:py-6">
      <div className="flex flex-col gap-4 max-md:flex-1">
        <ScreenHeader title="Carrinho de NFTs" />
        <Breadcrumbs className="max-md:hidden" items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/' }, { label: 'Carrinho' }]} />
        <h1 className="sr-only max-md:hidden">Carrinho de NFTs</h1>

        {cart.isError && !cart.data ? (
          <ErrorState error={cart.error} title="Não foi possível carregar o carrinho" onRetry={() => void cart.refetch()} />
        ) : cart.data && items.length === 0 ? (
          <EmptyState
            icon={<ShoppingCartIcon className="size-10 text-primary" aria-hidden />}
            title="Seu carrinho está vazio"
            description="Explore o mercado e adicione NFTs para continuar."
            action={
              <Button asChild>
                <Link to="/">Explorar o mercado</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 max-md:flex max-md:flex-1 max-md:flex-col lg:grid-cols-[1fr_320px]">
            <section aria-labelledby="cart-items-title" className="flex min-w-0 flex-col gap-3">
              <h2 id="cart-items-title" className="sr-only">
                Itens do carrinho
              </h2>
              <div aria-hidden className="hidden grid-cols-[minmax(0,2.2fr)_1fr_1fr_1fr_auto] gap-4 px-3 text-xs font-semibold md:grid">
                <span>NFTs</span>
                <span>Preço</span>
                <span>Edições</span>
                <span>Total</span>
                <span className="w-8" />
              </div>
              <ul className="flex flex-col gap-2" aria-busy={cart.isFetching || undefined}>
                {cart.isPending
                  ? Array.from({ length: 3 }, (_, i) => <CartItemSkeleton key={i} />)
                  : items.map((item) => <CartItemRow key={item.id} item={item} />)}
              </ul>
            </section>

            {/* Mobile (Figma): resumo como painel fixo na base da tela. */}
            <aside
              aria-labelledby="summary-title"
              className="flex h-fit flex-col gap-3 bg-surface p-4 max-md:sticky max-md:bottom-0 max-md:z-20 max-md:mt-auto max-md:-mx-4 max-md:rounded-t-3xl max-md:border-t max-md:border-border/70 max-md:pb-[calc(1rem+env(safe-area-inset-bottom))] max-md:shadow-[0_-12px_30px_rgba(0,0,0,0.45)] md:gap-4 md:rounded-md lg:sticky lg:top-20"
            >
              <h2 id="summary-title" className="text-sm font-bold max-md:sr-only">
                Resumo da carteira
              </h2>
              {cart.data ? <CouponForm cart={cart.data} /> : <Skeleton className="h-16 w-full" />}
              <QuoteIssues quote={quote.data} />
              <QuoteTotalsState quote={quote} />
              <Button size="lg" className="w-full max-md:rounded-full" onClick={goToCheckout} disabled={!canCheckout}>
                Conectar e finalizar
              </Button>
              {!isAuthenticated && <p className="text-center text-[11px] text-muted-foreground">Você entrará na sua conta para finalizar. Seus itens serão mantidos.</p>}
              <Link to="/" className="text-center text-xs text-primary underline-offset-4 hover:underline max-md:hidden">
                Continuar explorando
              </Link>
            </aside>
          </div>
        )}
      </div>

      <NftCarousel title="Colecionadores também viram" query={{ tab: 'trending' }} className="max-md:hidden" />
    </div>
  )
}
