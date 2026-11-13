import { TERMINAL_ORDER_STATUSES, type CreateOrderInput, type Network } from '@/contracts'
import { getActiveScenario, getDb, getRuntime, nextId, nowIso, persist, updateRuntime } from '../db/store'
import type { OrderRecord, SessionRecord, UserRecord } from '../db/types'
import { publishOrderUpdated } from '../events'
import { sha256, stableStringify } from '../lib/crypto'
import { createRandom, hashString } from '../lib/random'
import { MockHttpError } from '../responses'
import { resolveCart, removePurchased } from './cart'
import { bumpPrice, findNft, patchEdition } from './catalog'
import { sameQuoteValues } from '@/shared/lib/quote'
import { createQuote, toQuote } from './pricing'

const EXPLORERS: Record<Network, string> = {
  ethereum: 'https://etherscan.io/tx/',
  polygon: 'https://polygonscan.com/tx/',
  solana: 'https://solscan.io/tx/',
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()

function fakeTxHash(orderId: string): string {
  const rng = createRandom(hashString(orderId))
  return `0x${Array.from({ length: 64 }, () => rng.int(0, 15).toString(16)).join('')}`
}

/** Aplica o resultado simulado do pagamento (uma única vez: estados terminais são finais). */
function resolveOrder(order: OrderRecord) {
  timers.delete(order.id)
  if (TERMINAL_ORDER_STATUSES.includes(order.status)) return
  const now = nowIso()
  order.status = order.outcome
  order.version += 1
  order.updatedAt = now

  if (order.outcome === 'confirmed') {
    const hash = fakeTxHash(order.id)
    order.transaction = { hash, explorerUrl: `${EXPLORERS[order.network]}${hash}`, confirmedAt: now }
    for (const line of order.lines) {
      const edition = findNft(line.nftId).editions.find((e) => e.id === line.editionId)
      if (edition) patchEdition(line.nftId, line.editionId, { available: edition.available - line.quantity })
    }
    removePurchased(order.userId, order.lines)
  } else {
    order.failureReason = 'O pagamento foi recusado pela carteira. Nenhum valor foi cobrado e seus itens continuam no carrinho.'
  }
  persist()
  publishOrderUpdated(order)
}

export function scheduleResolution(order: OrderRecord) {
  if (order.status !== 'pending' || timers.has(order.id)) return
  const delay = Math.max(0, Date.parse(order.resolveAt) - Date.now())
  timers.set(order.id, setTimeout(() => resolveOrder(order), delay))
}

/** Recupera pedidos pendentes após refresh e liquida os vencidos. */
export function settleDueOrders() {
  for (const order of getDb().orders) {
    if (order.status !== 'pending') continue
    if (Date.parse(order.resolveAt) <= Date.now()) resolveOrder(order)
    else scheduleResolution(order)
  }
}

/** Painel de dev/testes: força o desfecho de um pedido pendente. */
export function forceResolve(orderId: string, outcome?: OrderRecord['outcome']) {
  const order = getDb().orders.find((o) => o.id === orderId)
  if (!order) throw new MockHttpError('NOT_FOUND', 'Pedido não encontrado.')
  clearTimeout(timers.get(order.id))
  if (outcome) order.outcome = outcome
  resolveOrder(order)
}

export function clearOrderTimers() {
  timers.forEach((timer) => clearTimeout(timer))
  timers.clear()
}

/** Concorrência simulada: na primeira tentativa, o catálogo muda "por outro comprador". */
function applyCheckoutTwist(firstLine: { nftId: string; editionId: string }) {
  const { checkoutTwist } = getActiveScenario().behavior
  if (checkoutTwist === 'none' || getRuntime().checkoutTwistConsumed) return
  updateRuntime((state) => {
    state.checkoutTwistConsumed = true
  })
  if (checkoutTwist === 'price-change') bumpPrice(firstLine.nftId, firstLine.editionId)
  else patchEdition(firstLine.nftId, firstLine.editionId, { available: 0 })
}

export function findUserOrder(user: UserRecord, orderId: string): OrderRecord {
  const order = getDb().orders.find((o) => o.id === orderId)
  if (!order) throw new MockHttpError('NOT_FOUND', 'Pedido não encontrado.')
  if (order.userId !== user.id) throw new MockHttpError('FORBIDDEN')
  return order
}

/**
 * Criação idempotente:
 * - mesma chave + mesmo conteúdo → devolve o pedido existente (sem duplicar);
 * - mesma chave + conteúdo diferente → 409 IDEMPOTENCY_CONFLICT;
 * - cotação divergente da atual (preço, estoque, cupom, taxa) → 409 com a nova cotação.
 */
export async function createOrder(
  user: UserRecord,
  session: SessionRecord,
  idempotencyKey: string,
  input: CreateOrderInput,
): Promise<{ order: OrderRecord; replayed: boolean }> {
  const db = getDb()
  const requestHash = await sha256(stableStringify(input))
  const existing = db.orders.find((o) => o.userId === user.id && o.idempotencyKey === idempotencyKey)
  if (existing) {
    if (existing.requestHash !== requestHash) throw new MockHttpError('IDEMPOTENCY_CONFLICT')
    return { order: existing, replayed: true }
  }

  const cart = resolveCart(user, null)
  const quote = db.quotes.find((q) => q.id === input.quoteId && q.cartId === cart.id)
  if (!quote) throw new MockHttpError('QUOTE_CHANGED', 'A cotação não é mais válida. Revise o pedido.')

  const firstLine = quote.lines[0]
  if (firstLine) applyCheckoutTwist(firstLine)

  const wallet = db.wallets.find((w) => w.id === input.walletId && w.userId === user.id)
  if (!wallet) throw new MockHttpError('VALIDATION_FAILED', 'Selecione uma carteira cadastrada.', { walletId: 'Carteira inválida' })
  const connected = db.connections.some((c) => c.sessionToken === session.token && c.walletId === wallet.id)
  if (!connected) throw new MockHttpError('WALLET_NOT_CONNECTED')

  const fresh = createQuote(cart, input.network)
  const expired = Date.parse(quote.expiresAt) <= Date.now()
  if (!fresh.valid) {
    const stock = fresh.issues.some((i) => ['SOLD_OUT', 'INSUFFICIENT_STOCK', 'EDITION_UNAVAILABLE'].includes(i.code))
    throw new MockHttpError(stock ? 'OUT_OF_STOCK' : 'QUOTE_CHANGED', undefined, undefined, { quote: toQuote(fresh) })
  }
  if (expired || !sameQuoteValues(quote, fresh)) {
    throw new MockHttpError('QUOTE_CHANGED', undefined, undefined, { quote: toQuote(fresh) })
  }

  const behavior = getActiveScenario().behavior
  const now = Date.now()
  const order: OrderRecord = {
    id: nextId('order'),
    status: 'pending',
    version: 1,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    quoteId: quote.id,
    lines: structuredClone(quote.lines),
    coupon: quote.coupon,
    subtotalEth: quote.subtotalEth,
    discountEth: quote.discountEth,
    networkFeeEth: quote.networkFeeEth,
    totalEth: quote.totalEth,
    network: input.network,
    provider: input.provider,
    wallet: { id: wallet.id, nickname: wallet.profile.nickname, address: input.buyer.address },
    buyer: { displayName: input.buyer.displayName, email: input.buyer.email, ensName: input.buyer.ensName },
    transaction: null,
    failureReason: null,
    userId: user.id,
    idempotencyKey,
    requestHash,
    resolveAt: new Date(now + behavior.payment.delayMs).toISOString(),
    outcome: behavior.payment.outcome,
  }
  db.orders.push(order)
  persist()
  publishOrderUpdated(order)
  scheduleResolution(order)
  return { order, replayed: false }
}
