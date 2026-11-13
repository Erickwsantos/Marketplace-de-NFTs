import { useEffect, useState } from 'react'
import { FormProvider, useController } from 'react-hook-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ClockIcon, ShoppingCartIcon, WalletIcon } from 'lucide-react'
import { quoteSchema, type Network, type Quote, type Wallet, type WalletProvider } from '@/contracts'
import { accountQueries } from '@/features/account/api'
import { CollectorProfileFields, EMPTY_COLLECTOR_PROFILE } from '@/features/account/collector-profile-fields'
import { useAuth, useCartOwner } from '@/features/auth/session'
import { cartQueries } from '@/features/cart/api'
import { useAcknowledgePrices, useCart, useQuote } from '@/features/cart/hooks'
import { QuoteLines } from '@/features/cart/quote-lines'
import { CouponForm, QuoteIssues, QuoteTotalsState } from '@/features/cart/quote-summary'
import { orderQueries } from '@/features/orders/api'
import { pendingOrder } from '@/features/orders/pending-order'
import { toApiError } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/query-keys'
import { NETWORK_LABELS, shortAddress } from '@/shared/lib/labels'
import { sameQuoteValues } from '@/shared/lib/quote'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { applyServerErrors, FormAlert, TextareaField, useZodForm } from '@/shared/ui/form'
import { Label } from '@/shared/ui/label'
import { Breadcrumbs, EmptyState, ErrorState, Skeleton } from '@/shared/ui/primitives'
import { RadioCard } from '@/shared/ui/radio-card'
import { RadioGroup } from '@/shared/ui/radio-group'
import { checkoutDraft, checkoutFormSchema, type CheckoutFormValues } from './checkout-draft'
import { ReviewDialog, type ReviewNotice } from './review-dialog'
import { usePlaceOrder } from './use-place-order'
import { connectionMatches, useWalletConnection, WalletConnectionPanel } from './wallet-connection'

const EMPTY_VALUES: CheckoutFormValues = { walletId: '', useOtherWallet: false, buyer: EMPTY_COLLECTOR_PROFILE, note: '' }

export function CheckoutPage() {
  const { userId } = useAuth()
  if (!userId) return <CheckoutSkeleton />
  return <Checkout userId={userId} />
}

/** Aviso de pedido em andamento: retomar em vez de comprar de novo. */
function PendingOrderBanner({ userId }: { userId: string }) {
  const orderId = pendingOrder.get(userId)
  const order = useQuery({ ...orderQueries.detail(userId, orderId ?? ''), enabled: Boolean(orderId), refetchInterval: false })
  if (!orderId || order.data?.status !== 'pending') return null
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/50 bg-primary/10 p-3 text-xs">
      <span className="flex items-center gap-2">
        <ClockIcon className="size-4 text-primary" aria-hidden /> Você tem um pedido aguardando confirmação.
      </span>
      <Button asChild size="sm" variant="outline">
        <Link to="/orders/$orderId" params={{ orderId }}>
          Acompanhar pedido
        </Link>
      </Button>
    </div>
  )
}

function WalletPicker({ wallets, onSelect }: { wallets: Wallet[]; onSelect: (wallet: Wallet) => void }) {
  const { field, fieldState } = useController<CheckoutFormValues, 'walletId'>({ name: 'walletId' })
  return (
    <section aria-labelledby="wallet-picker-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="wallet-picker-title" className="text-sm font-bold">
          Carteira conectada
        </h2>
        <Link to="/profile/wallets" className="text-xs text-primary underline-offset-4 hover:underline">
          Gerenciar carteiras
        </Link>
      </div>
      <RadioGroup
        value={field.value}
        onValueChange={(id) => {
          const wallet = wallets.find((w) => w.id === id)
          if (wallet) onSelect(wallet)
        }}
        aria-label="Carteira cadastrada"
        aria-invalid={Boolean(fieldState.error)}
        className="gap-2 sm:grid-cols-2"
      >
        {wallets.map((wallet) => (
          <RadioCard
            key={wallet.id}
            value={wallet.id}
            selected={field.value === wallet.id}
            title={`${wallet.profile.nickname}${wallet.role === 'primary' ? ' (principal)' : ''}`}
            description={`${wallet.profile.secondaryAddress || shortAddress(wallet.profile.address)} · Rede ${NETWORK_LABELS[wallet.profile.network]}`}
          />
        ))}
      </RadioGroup>
      {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
    </section>
  )
}

function Checkout({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const owner = useCartOwner()
  const cart = useCart()
  const wallets = useQuery(accountQueries.wallets(userId))
  const { connection } = useWalletConnection(userId)
  const placeOrder = usePlaceOrder(userId)
  const acknowledge = useAcknowledgePrices()
  const form = useZodForm(checkoutFormSchema, { defaultValues: checkoutDraft.values(userId) ?? EMPTY_VALUES })

  const [walletId, provider, network, useOtherWallet] = form.watch(['walletId', 'buyer.provider', 'buyer.network', 'useOtherWallet'])
  const quote = useQuote(network as Network)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewQuote, setReviewQuote] = useState<Quote | null>(null)
  const [notice, setNotice] = useState<ReviewNotice>(null)
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [couponOpen, setCouponOpen] = useState(false)

  // Rascunho persistido a cada alteração (retomada após refresh/expiração).
  useEffect(() => {
    const subscription = form.watch((values) => checkoutDraft.saveValues(userId, values as CheckoutFormValues))
    return () => subscription.unsubscribe()
  }, [form, userId])

  // Sem rascunho: pré-seleciona a carteira principal.
  const items = wallets.data?.items
  useEffect(() => {
    if (!items?.length || form.getValues('walletId')) return
    const primary = items.find((w) => w.role === 'primary') ?? items[0]!
    form.reset({ ...form.getValues(), walletId: primary.id, buyer: { ...primary.profile } })
  }, [items, form])

  const selectWallet = (wallet: Wallet) => {
    form.setValue('walletId', wallet.id, { shouldValidate: true })
    form.setValue('useOtherWallet', false)
    form.setValue('buyer', { ...wallet.profile }, { shouldValidate: form.formState.isSubmitted })
  }

  const toggleOtherWallet = (checked: boolean) => {
    form.setValue('useOtherWallet', checked)
    const wallet = items?.find((w) => w.id === walletId)
    form.setValue('buyer.address', checked ? '' : (wallet?.profile.address ?? ''), { shouldValidate: false })
    form.setValue('buyer.secondaryAddress', checked ? '' : (wallet?.profile.secondaryAddress ?? ''))
  }

  /** Revalida carrinho e cotação no servidor antes de abrir a revisão. */
  const openReview = form.handleSubmit(async (values) => {
    setFormMessage(null)
    const target = { walletId: values.walletId, provider: values.buyer.provider, network: values.buyer.network }
    if (!connectionMatches(connection, target)) {
      setFormMessage('Conecte a carteira selecionada antes de confirmar a compra.')
      document.getElementById('wallet-connection')?.querySelector('button')?.focus()
      return
    }
    setNotice(null)
    setReviewOpen(true)
    await revalidate(quote.data ?? null)
  })

  /** Busca carrinho e cotação frescos; se os valores diferirem do exibido, exige nova confirmação. */
  const revalidate = async (shown: Quote | null) => {
    setReviewQuote(null)
    try {
      const network = form.getValues('buyer.network')
      const freshCart = await queryClient.fetchQuery({ ...cartQueries.cart(owner!), staleTime: 0 })
      const fresh = await queryClient.fetchQuery({ ...cartQueries.quote(owner!, network, freshCart.version), staleTime: 0 })
      if (shown && !sameQuoteValues(shown, fresh)) setNotice({ kind: 'changed', previousTotal: shown.totalEth })
      setReviewQuote(fresh)
    } catch (error) {
      setNotice({ kind: 'error', message: toApiError(error).message, retryable: false })
    }
  }

  const acceptPrices = () =>
    acknowledge.mutate(undefined, {
      onSuccess: () => void revalidate(null),
    })

  const confirm = () => {
    if (!reviewQuote) return
    const values = form.getValues()
    placeOrder.submit(
      {
        quoteId: reviewQuote.id,
        walletId: values.walletId,
        provider: values.buyer.provider,
        network: values.buyer.network,
        buyer: values.buyer,
        note: values.note,
      },
      {
        onError: (error) => {
          const apiError = toApiError(error)
          if (apiError.is('QUOTE_CHANGED', 'OUT_OF_STOCK')) {
            // Servidor recusou a cotação: exibe a nova e exige nova confirmação.
            const parsed = quoteSchema.safeParse(apiError.details.quote)
            void queryClient.invalidateQueries({ queryKey: queryKeys.cartRoot() })
            setNotice({ kind: 'changed', previousTotal: reviewQuote.totalEth })
            setReviewQuote(parsed.success ? parsed.data : null)
          } else if (apiError.is('VALIDATION_FAILED')) {
            setReviewOpen(false)
            setFormMessage(applyServerErrors(form, error))
          } else if (apiError.is('WALLET_NOT_CONNECTED')) {
            void queryClient.invalidateQueries({ queryKey: queryKeys.walletConnection(userId) })
            setNotice({ kind: 'error', message: apiError.message, retryable: false })
          } else {
            setNotice({
              kind: 'error',
              retryable: apiError.retryable,
              message: apiError.retryable
                ? 'Não conseguimos confirmar o envio do pedido. Tente novamente: a mesma tentativa será reaproveitada e não haverá cobrança em dobro.'
                : apiError.message,
            })
          }
        },
      },
    )
  }

  if (cart.isPending || wallets.isPending) return <CheckoutSkeleton />
  if (cart.isError) return <ErrorState className="container-page my-8" error={cart.error} onRetry={() => void cart.refetch()} />
  if (wallets.isError) return <ErrorState className="container-page my-8" error={wallets.error} onRetry={() => void wallets.refetch()} />

  if (cart.data.items.length === 0) {
    return (
      <div className="container-page flex flex-col gap-4 py-8">
        <PendingOrderBanner userId={userId} />
        <EmptyState
          icon={<ShoppingCartIcon className="size-10 text-primary" aria-hidden />}
          title="Seu carrinho está vazio"
          description="Adicione NFTs ao carrinho para finalizar uma compra."
          action={<Button asChild><Link to="/">Explorar o mercado</Link></Button>}
        />
      </div>
    )
  }

  if (wallets.data.items.length === 0) {
    return (
      <div className="container-page py-8">
        <EmptyState
          icon={<WalletIcon className="size-10 text-primary" aria-hidden />}
          title="Cadastre uma carteira para pagar"
          description="As carteiras cadastradas ficam disponíveis no pagamento e para receber os NFTs comprados."
          action={<Button asChild><Link to="/profile/wallets">Cadastrar carteira</Link></Button>}
        />
      </div>
    )
  }

  const canConfirm = Boolean(quote.data?.valid) && !quote.isFetching

  return (
    <div className="container-page flex flex-col gap-4 py-6">
      <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/' }, { label: 'Pagamento' }]} />
      <PendingOrderBanner userId={userId} />
      <FormProvider {...form}>
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <form id="checkout-form" noValidate onSubmit={openReview} className="flex min-w-0 flex-col gap-6">
            <h1 className="text-base font-bold">Perfil do colecionador</h1>
            <WalletPicker wallets={wallets.data.items} onSelect={selectWallet} />
            <CollectorProfileFields prefix="buyer." omit={['provider']} />
            <div className="flex items-center gap-2">
              <Checkbox id="use-other-wallet" checked={Boolean(useOtherWallet)} onCheckedChange={(v) => toggleOtherWallet(v === true)} />
              <Label htmlFor="use-other-wallet" className="text-xs">
                Usar outra carteira? <span className="text-muted-foreground">(informe outro endereço para receber os NFTs)</span>
              </Label>
            </div>
            <TextareaField name="note" label="Observação do colecionador (opcional)" rows={4} className="sm:max-w-md" />
            <FormAlert message={formMessage} />
          </form>

          <aside aria-labelledby="order-summary-title" className="flex h-fit flex-col gap-4 rounded-md bg-surface p-4 lg:sticky lg:top-20">
            <div className="flex items-center justify-between">
              <h2 id="order-summary-title" className="text-sm font-bold">
                Seus NFTs
              </h2>
            </div>
            {quote.data ? <QuoteLines lines={quote.data.lines} caption="Itens do pedido" /> : <Skeleton className="h-24 w-full" />}
            {couponOpen || cart.data.coupon ? (
              <CouponForm cart={cart.data} />
            ) : (
              <button type="button" onClick={() => setCouponOpen(true)} className="text-center text-xs underline-offset-4 hover:underline">
                Tem um código promocional? <span className="text-primary">Aplique aqui</span>
              </button>
            )}
            <QuoteIssues quote={quote.data} />
            <QuoteTotalsState quote={quote} />
            <div id="wallet-connection">
              <WalletConnectionPanel
                userId={userId}
                walletId={walletId}
                provider={provider as WalletProvider}
                network={network as Network}
                onProviderChange={(value) => form.setValue('buyer.provider', value)}
              />
            </div>
            <Button type="submit" form="checkout-form" size="lg" className="w-full" disabled={!canConfirm}>
              Confirmar compra
            </Button>
            {!canConfirm && quote.data && !quote.data.valid && (
              <p className="text-center text-[11px] text-warning">Resolva as pendências do carrinho para continuar.</p>
            )}
          </aside>
        </div>
      </FormProvider>

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        quote={reviewQuote}
        values={form.getValues()}
        notice={notice}
        submitting={placeOrder.isPending}
        accepting={acknowledge.isPending}
        onAcceptPrices={acceptPrices}
        onConfirm={confirm}
      />
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <div className="container-page grid gap-8 py-6 lg:grid-cols-[1fr_360px]" aria-busy="true" aria-label="Carregando pagamento">
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  )
}
