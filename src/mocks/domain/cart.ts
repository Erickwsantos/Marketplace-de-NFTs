import type { AddCartItemInput, Cart, CartItem, Edition } from '@/contracts'
import { isEthEqual, multiplyEth } from '@/shared/lib/eth'
import { getDb, nextId, nowIso } from '../db/store'
import type { CartRecord, NftRecord, UserRecord } from '../db/types'
import { MockHttpError } from '../responses'
import { findNft } from './catalog'

/**
 * O carrinho vive no servidor simulado. Visitantes são identificados pelo
 * header X-Cart-Id; usuários autenticados pelo token. Um visitante nunca
 * acessa o carrinho de um usuário (userId precisa ser null).
 */
export function resolveCart(user: UserRecord | null, guestCartId: string | null): CartRecord {
  const db = getDb()
  if (user) {
    let cart = db.carts.find((c) => c.userId === user.id)
    if (!cart) {
      cart = { id: nextId('cart'), userId: user.id, items: [], couponCode: null, version: 1, updatedAt: nowIso() }
      db.carts.push(cart)
    }
    return cart
  }
  if (!guestCartId) throw new MockHttpError('VALIDATION_FAILED', 'Identificador do carrinho ausente.')
  let cart = db.carts.find((c) => c.id === guestCartId && c.userId === null)
  if (!cart) {
    if (db.carts.some((c) => c.id === guestCartId)) throw new MockHttpError('FORBIDDEN')
    cart = { id: guestCartId, userId: null, items: [], couponCode: null, version: 1, updatedAt: nowIso() }
    db.carts.push(cart)
  }
  return cart
}

export function touchCart(cart: CartRecord) {
  cart.version += 1
  cart.updatedAt = nowIso()
}

export function findEdition(nftId: string, editionId: string): { nft: NftRecord; edition: Edition } {
  const nft = findNft(nftId)
  const edition = nft.editions.find((e) => e.id === editionId)
  if (!edition) throw new MockHttpError('NOT_FOUND', 'Edição não encontrada.')
  return { nft, edition }
}

export function itemStatus(edition: Edition, quantity: number, acknowledgedPriceEth: string): CartItem['status'] {
  if (edition.status === 'unavailable') return 'unavailable'
  if (edition.available === 0) return 'sold_out'
  if (quantity > edition.available) return 'insufficient_stock'
  if (!isEthEqual(edition.priceEth, acknowledgedPriceEth)) return 'price_changed'
  return 'ok'
}

export function toCart(cart: CartRecord): Cart {
  const db = getDb()
  const items: CartItem[] = cart.items.flatMap((item) => {
    const nft = db.nfts.find((n) => n.id === item.nftId)
    const edition = nft?.editions.find((e) => e.id === item.editionId)
    if (!nft || !edition) return []
    return [
      {
        id: item.id,
        nftId: nft.id,
        editionId: edition.id,
        name: nft.name,
        tokenId: nft.tokenId,
        image: nft.image,
        editionLabel: edition.label,
        quantity: item.quantity,
        unitPriceEth: edition.priceEth,
        acknowledgedPriceEth: item.acknowledgedPriceEth,
        lineTotalEth: multiplyEth(edition.priceEth, item.quantity),
        available: edition.available,
        maxPerOrder: edition.maxPerOrder,
        status: itemStatus(edition, item.quantity, item.acknowledgedPriceEth),
        nftVersion: nft.version,
      },
    ]
  })
  const coupon = cart.couponCode ? db.coupons.find((c) => c.code === cart.couponCode) : null
  return {
    id: cart.id,
    owner: cart.userId ? 'user' : 'guest',
    items,
    coupon: coupon ? { code: coupon.code, description: coupon.description, percentOff: coupon.percentOff } : null,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    version: cart.version,
    updatedAt: cart.updatedAt,
  }
}

function assertPurchasable(edition: Edition, quantity: number) {
  if (edition.status === 'unavailable') throw new MockHttpError('EDITION_UNAVAILABLE')
  if (edition.available === 0) throw new MockHttpError('OUT_OF_STOCK', 'Esta edição está esgotada.')
  const max = Math.min(edition.available, edition.maxPerOrder)
  if (quantity > max) {
    throw new MockHttpError(
      'QUANTITY_LIMIT',
      `Você pode levar no máximo ${max} ${max === 1 ? 'unidade' : 'unidades'} desta edição.`,
      { quantity: `Máximo de ${max}` },
      { max },
    )
  }
}

export function addItem(cart: CartRecord, input: AddCartItemInput) {
  const { edition } = findEdition(input.nftId, input.editionId)
  const existing = cart.items.find((i) => i.nftId === input.nftId && i.editionId === input.editionId)
  const quantity = (existing?.quantity ?? 0) + input.quantity
  assertPurchasable(edition, quantity)
  if (existing) {
    existing.quantity = quantity
    existing.acknowledgedPriceEth = edition.priceEth
  } else {
    cart.items.push({
      id: nextId('item'),
      nftId: input.nftId,
      editionId: input.editionId,
      quantity,
      acknowledgedPriceEth: edition.priceEth,
    })
  }
  touchCart(cart)
}

function findItem(cart: CartRecord, itemId: string) {
  const item = cart.items.find((i) => i.id === itemId)
  if (!item) throw new MockHttpError('NOT_FOUND', 'Item não está no carrinho.')
  return item
}

export function updateItem(cart: CartRecord, itemId: string, quantity: number) {
  const item = findItem(cart, itemId)
  const { edition } = findEdition(item.nftId, item.editionId)
  // Reduzir a quantidade é sempre permitido (resolve falta de estoque).
  if (quantity > item.quantity) assertPurchasable(edition, quantity)
  else if (edition.status === 'unavailable') throw new MockHttpError('EDITION_UNAVAILABLE')
  item.quantity = quantity
  touchCart(cart)
}

export function removeItem(cart: CartRecord, itemId: string) {
  findItem(cart, itemId)
  cart.items = cart.items.filter((i) => i.id !== itemId)
  touchCart(cart)
}

export function applyCoupon(cart: CartRecord, rawCode: string) {
  const code = rawCode.trim().toUpperCase()
  const coupon = getDb().coupons.find((c) => c.code === code)
  if (!coupon) throw new MockHttpError('COUPON_INVALID', 'Cupom inválido.', { code: 'Cupom inválido' })
  if (coupon.expiresAt && Date.parse(coupon.expiresAt) <= Date.now()) {
    throw new MockHttpError('COUPON_EXPIRED', 'Este cupom expirou.', { code: 'Cupom expirado' })
  }
  cart.couponCode = coupon.code
  touchCart(cart)
}

export function removeCoupon(cart: CartRecord) {
  cart.couponCode = null
  touchCart(cart)
}

/** Colecionador confirmou que viu os novos preços. */
export function acknowledgePrices(cart: CartRecord) {
  for (const item of cart.items) {
    const { edition } = findEdition(item.nftId, item.editionId)
    item.acknowledgedPriceEth = edition.priceEth
  }
  touchCart(cart)
}

/**
 * Login preserva o carrinho do visitante: itens são somados ao carrinho do
 * usuário respeitando disponibilidade e limite por pedido.
 */
export function mergeGuestCart(userCart: CartRecord, guestCartId: string) {
  const db = getDb()
  const guest = db.carts.find((c) => c.id === guestCartId && c.userId === null)
  if (!guest) return
  for (const item of guest.items) {
    const nft = db.nfts.find((n) => n.id === item.nftId)
    const edition = nft?.editions.find((e) => e.id === item.editionId)
    if (!edition || edition.status === 'unavailable') continue
    const existing = userCart.items.find((i) => i.nftId === item.nftId && i.editionId === item.editionId)
    const max = Math.max(1, Math.min(edition.maxPerOrder, edition.available || edition.maxPerOrder))
    if (existing) {
      existing.quantity = Math.min(existing.quantity + item.quantity, max)
    } else {
      userCart.items.push({ ...item, id: nextId('item'), quantity: Math.min(item.quantity, max) })
    }
  }
  userCart.couponCode ??= guest.couponCode
  db.carts = db.carts.filter((c) => c.id !== guest.id)
  touchCart(userCart)
}

/** Após confirmação: remove somente os itens e quantidades comprados. */
export function removePurchased(userId: string, lines: Array<{ nftId: string; editionId: string; quantity: number }>) {
  const cart = getDb().carts.find((c) => c.userId === userId)
  if (!cart) return
  for (const line of lines) {
    const item = cart.items.find((i) => i.nftId === line.nftId && i.editionId === line.editionId)
    if (item) item.quantity -= line.quantity
  }
  cart.items = cart.items.filter((i) => i.quantity > 0)
  cart.couponCode = null
  touchCart(cart)
}
