import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { SearchCheckIcon, Loader2Icon, MailCheckIcon, WifiOffIcon, XCircleIcon } from 'lucide-react'
import type { Order } from '@/contracts'
import { RouteNotFound } from '@/app/route-fallbacks'
import { useAuth } from '@/features/auth/session'
import { QuoteLines } from '@/features/cart/quote-lines'
import { useRealtimeStatus } from '@/features/realtime/realtime-provider'
import { announce } from '@/shared/a11y/announcer'
import { isApiError } from '@/shared/api/errors'
import { formatEth } from '@/shared/lib/eth'
import { EXPLORER_LABELS, formatDate, NETWORK_LABELS, ORDER_STATUS_LABELS, PROVIDER_LABELS, shortAddress } from '@/shared/lib/labels'
import { Button } from '@/shared/ui/button'
import { ErrorState, Skeleton } from '@/shared/ui/primitives'
import { ScreenHeader } from '@/shared/ui/screen-header'
import { orderQueries } from './api'
import { pendingOrder } from './pending-order'

const route = getRouteApi('/_auth/orders/$orderId')

/**
 * Acompanhamento do pedido. A confirmação só aparece para pedido com
 * status "confirmed" vindo da API/evento. Estados terminais são finais.
 * O recibo é renderizado a partir do snapshot do pedido.
 */
export function OrderPage() {
  const { orderId } = route.useParams()
  const { userId } = useAuth()
  const order = useQuery({ ...orderQueries.detail(userId ?? '', orderId), enabled: Boolean(userId) })
  const lastStatus = useRef<Order['status'] | null>(null)

  const status = order.data?.status
  useEffect(() => {
    if (!status || lastStatus.current === status) return
    if (lastStatus.current !== null || status !== 'pending') {
      announce(ORDER_STATUS_LABELS[status], status === 'declined' ? 'assertive' : 'polite')
    }
    lastStatus.current = status
    if (status !== 'pending') pendingOrder.clear(orderId)
  }, [status, orderId])

  if (order.isError && !order.data) {
    if (isApiError(order.error, 'NOT_FOUND', 'FORBIDDEN')) {
      return <RouteNotFound title="Pedido não encontrado" description="Este pedido não existe ou não pertence à sua conta." />
    }
    return <ErrorState className="container-page my-10" error={order.error} onRetry={() => void order.refetch()} />
  }
  if (!order.data) return <ReceiptSkeleton />

  return (
    <div className="container-page flex flex-col items-center md:py-14">
      <ScreenHeader title={order.data.status === 'confirmed' ? 'Pedido confirmado' : 'Seu pedido'} className="self-stretch" as="p" />
      {order.data.status === 'pending' && <PendingOrder order={order.data} />}
      {order.data.status === 'confirmed' && <Receipt order={order.data} />}
      {order.data.status === 'declined' && <DeclinedOrder order={order.data} />}
    </div>
  )
}

function Card({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <section aria-label={label} className="w-full max-w-lg rounded-2xl border-b-4 border-primary bg-surface p-5 md:rounded-md md:p-6">
      {children}
    </section>
  )
}

function PendingOrder({ order }: { order: Order }) {
  const realtime = useRealtimeStatus()
  return (
    <Card label="Pedido pendente">
      <div className="flex flex-col items-center gap-3 text-center" role="status">
        <Loader2Icon className="size-10 animate-spin text-primary" aria-hidden />
        <h1 className="text-lg font-bold">Aguardando confirmação</h1>
        <p className="text-sm text-muted-foreground">
          Seu pagamento de <strong className="text-foreground">{formatEth(order.totalEth)}</strong> foi enviado para a rede{' '}
          {NETWORK_LABELS[order.network]}. Você pode fechar esta página: o pedido continuará sendo processado e não será
          duplicado.
        </p>
        {realtime === 'reconnecting' && (
          <p className="flex items-center gap-2 text-xs text-warning">
            <WifiOffIcon className="size-4" aria-hidden /> Conexão em tempo real interrompida. Verificando o status pelo servidor…
          </p>
        )}
        <p className="text-[11px] text-muted-foreground">Pedido {order.id}</p>
      </div>
    </Card>
  )
}

function DeclinedOrder({ order }: { order: Order }) {
  return (
    <Card label="Pagamento recusado">
      <div className="flex flex-col items-center gap-3 text-center">
        <XCircleIcon className="size-10 text-destructive" aria-hidden />
        <h1 className="text-lg font-bold">Pagamento recusado</h1>
        <p className="text-sm text-muted-foreground">{order.failureReason}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/checkout">Tentar novamente</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/cart">Voltar ao carrinho</Link>
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Pedido {order.id}</p>
      </div>
    </Card>
  )
}

/** Recibo (Figma "Confirmação de pedido"): somente dados do snapshot do pedido. */
function Receipt({ order }: { order: Order }) {
  const tx = order.transaction!
  return (
    <Card label="Recibo do pedido">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="grid size-14 place-items-center rounded-md border-2 border-primary text-primary">
            <MailCheckIcon className="size-7" aria-hidden />
          </span>
          <p className="text-[10px] font-bold tracking-widest text-primary uppercase">Thank you</p>
          <h1 className="text-sm font-bold">Seus NFTs agora estão na sua carteira</h1>
        </div>

        <dl className="grid grid-cols-2 gap-3 border-y border-border py-3 text-[11px] sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">ID da transação</dt>
            <dd className="font-semibold break-all" title={tx.hash}>
              {shortAddress(tx.hash)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Data</dt>
            <dd className="font-semibold">{formatDate(tx.confirmedAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-semibold">{formatEth(order.totalEth)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Carteira</dt>
            <dd className="font-semibold">{PROVIDER_LABELS[order.provider]}</dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-bold">Detalhes da transação</h2>
          <QuoteLines lines={order.lines} caption="NFTs comprados" />
        </div>

        <dl className="flex flex-col gap-1.5 text-xs">
          {order.coupon && (
            <div className="flex justify-end gap-6">
              <dt>Desconto ({order.coupon.code})</dt>
              <dd>(-) {formatEth(order.discountEth)}</dd>
            </div>
          )}
          <div className="flex justify-end gap-6">
            <dt>Taxa de rede</dt>
            <dd>{formatEth(order.networkFeeEth)}</dd>
          </div>
          <div className="flex justify-end gap-6 font-bold">
            <dt>Total</dt>
            <dd className="text-primary">{formatEth(order.totalEth)}</dd>
          </div>
        </dl>

        <p className="text-center text-[11px] text-muted-foreground">
          Transação confirmada na {NETWORK_LABELS[order.network]}. A propriedade foi transferida para sua carteira conectada (
          {shortAddress(order.wallet.address)}) e registrada na rede.
        </p>
        <div className="flex flex-col items-center gap-2">
          <Button asChild>
            {/* Explorador SIMULADO interno (tx.explorerUrl): nenhuma referência aponta para blockchain real. */}
            <Link to="/explorer/tx/$hash" params={{ hash: tx.hash }}>
              Ver no {EXPLORER_LABELS[order.network]} (simulado) <SearchCheckIcon aria-hidden />
            </Link>
          </Button>
          <p className="text-[10px] text-muted-foreground">Referência de transação simulada para demonstração.</p>
          <Link to="/" className="text-xs text-primary underline-offset-4 hover:underline">
            Continuar explorando
          </Link>
        </div>
      </div>
    </Card>
  )
}

function ReceiptSkeleton() {
  return (
    <div className="container-page flex justify-center py-14" aria-busy="true" aria-label="Carregando pedido">
      <Skeleton className="h-[520px] w-full max-w-lg" />
    </div>
  )
}
