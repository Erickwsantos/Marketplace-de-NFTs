import {
  addCartItemInputSchema,
  applyCouponInputSchema,
  createQuoteInputSchema,
  updateCartItemInputSchema,
} from '@/contracts'
import {
  acknowledgePrices,
  addItem,
  applyCoupon,
  removeCoupon,
  removeItem,
  resolveCart,
  toCart,
  updateItem,
} from '../domain/cart'
import { createQuote, toQuote } from '../domain/pricing'
import { route } from '../http'
import { created, parseJson } from '../responses'

/** Toda mutação devolve o carrinho completo: o cliente substitui o cache sem refetch. */
export const cartHandlers = [
  route('GET', '/cart', 'optional', ({ user, guestCartId }) => toCart(resolveCart(user, guestCartId))),

  route('POST', '/cart/items', 'optional', async ({ request, user, guestCartId }) => {
    const cart = resolveCart(user, guestCartId)
    addItem(cart, await parseJson(request, addCartItemInputSchema))
    return created(toCart(cart))
  }),

  route('PATCH', '/cart/items/:itemId', 'optional', async ({ request, params, user, guestCartId }) => {
    const cart = resolveCart(user, guestCartId)
    const { quantity } = await parseJson(request, updateCartItemInputSchema)
    updateItem(cart, String(params.itemId), quantity)
    return toCart(cart)
  }),

  route('DELETE', '/cart/items/:itemId', 'optional', ({ params, user, guestCartId }) => {
    const cart = resolveCart(user, guestCartId)
    removeItem(cart, String(params.itemId))
    return toCart(cart)
  }),

  route('PUT', '/cart/coupon', 'optional', async ({ request, user, guestCartId }) => {
    const cart = resolveCart(user, guestCartId)
    applyCoupon(cart, (await parseJson(request, applyCouponInputSchema)).code)
    return toCart(cart)
  }),

  route('DELETE', '/cart/coupon', 'optional', ({ user, guestCartId }) => {
    const cart = resolveCart(user, guestCartId)
    removeCoupon(cart)
    return toCart(cart)
  }),

  route('POST', '/cart/acknowledge', 'optional', ({ user, guestCartId }) => {
    const cart = resolveCart(user, guestCartId)
    acknowledgePrices(cart)
    return toCart(cart)
  }),

  route('POST', '/quotes', 'optional', async ({ request, user, guestCartId }) => {
    const { network } = await parseJson(request, createQuoteInputSchema)
    return toQuote(createQuote(resolveCart(user, guestCartId), network))
  }),
]
