import type { Network, Quote, QuoteIssue, QuoteLine } from '@/contracts'
import { eth, multiplyEth, sumEth, toEth } from '@/shared/lib/eth'
import { getDb, nextId } from '../db/store'
import type { CartRecord, QuoteRecord } from '../db/types'
import { findEdition, itemStatus } from './cart'

/** Taxas de rede estimadas (o layout exibe 0.016 ETH na Ethereum). */
export const NETWORK_FEES: Record<Network, string> = {
  ethereum: '0.016',
  polygon: '0.002',
  solana: '0.001',
}
const QUOTE_TTL_MS = 10 * 60_000
const QUOTES_KEPT_PER_CART = 20

const ISSUE_BY_STATUS = {
  price_changed: ['PRICE_CHANGED', 'O preço deste item mudou.'],
  insufficient_stock: ['INSUFFICIENT_STOCK', 'Quantidade acima da disponibilidade atual.'],
  sold_out: ['SOLD_OUT', 'Esta edição esgotou.'],
  unavailable: ['EDITION_UNAVAILABLE', 'Esta edição não está mais à venda.'],
} as const

/**
 * Motor de cotação: única fonte de subtotal, desconto, taxa e total.
 * A UI nunca calcula estes valores — apenas exibe a cotação da API.
 */
export function createQuote(cart: CartRecord, network: Network): QuoteRecord {
  const db = getDb()
  const issues: QuoteIssue[] = []
  const lines: QuoteLine[] = cart.items.map((item) => {
    const { nft, edition } = findEdition(item.nftId, item.editionId)
    const status = itemStatus(edition, item.quantity, item.acknowledgedPriceEth)
    if (status !== 'ok') {
      const [code, message] = ISSUE_BY_STATUS[status]
      issues.push({ code, itemId: item.id, message: `${nft.name} (${edition.label}): ${message}` })
    }
    return {
      itemId: item.id,
      nftId: nft.id,
      editionId: edition.id,
      name: nft.name,
      tokenId: nft.tokenId,
      image: nft.image,
      editionLabel: edition.label,
      quantity: item.quantity,
      unitPriceEth: edition.priceEth,
      lineTotalEth: multiplyEth(edition.priceEth, item.quantity),
    }
  })
  if (lines.length === 0) issues.push({ code: 'EMPTY_CART', itemId: null, message: 'O carrinho está vazio.' })

  const subtotal = sumEth(lines.map((l) => l.lineTotalEth))
  let coupon: Quote['coupon'] = null
  let discount = '0'
  const couponRecord = cart.couponCode ? db.coupons.find((c) => c.code === cart.couponCode) : null
  if (couponRecord) {
    if (couponRecord.expiresAt && Date.parse(couponRecord.expiresAt) <= Date.now()) {
      issues.push({ code: 'COUPON_EXPIRED', itemId: null, message: `O cupom ${couponRecord.code} expirou.` })
    } else {
      coupon = { code: couponRecord.code, description: couponRecord.description, percentOff: couponRecord.percentOff }
      discount = toEth(eth(eth(subtotal).times(couponRecord.percentOff).div(100).toFixed(6)))
    }
  }
  const fee = lines.length > 0 ? NETWORK_FEES[network] : '0'
  const total = toEth(eth(subtotal).minus(discount).plus(fee))
  const now = Date.now()

  const quote: QuoteRecord = {
    id: nextId('quote'),
    cartId: cart.id,
    cartVersion: cart.version,
    network,
    lines,
    coupon,
    subtotalEth: subtotal,
    discountEth: discount,
    networkFeeEth: fee,
    totalEth: total,
    issues,
    valid: issues.length === 0,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(),
  }
  const others = db.quotes.filter((q) => q.cartId === cart.id).slice(-(QUOTES_KEPT_PER_CART - 1))
  db.quotes = [...db.quotes.filter((q) => q.cartId !== cart.id), ...others, quote]
  return quote
}

export function toQuote({ cartId: _cartId, ...quote }: QuoteRecord): Quote {
  return quote
}
