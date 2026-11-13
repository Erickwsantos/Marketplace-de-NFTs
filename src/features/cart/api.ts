import { queryOptions } from '@tanstack/react-query'
import {
  API_ROUTES,
  apiPath,
  cartSchema,
  quoteSchema,
  type AddCartItemInput,
  type Network,
} from '@/contracts'
import { request } from '@/shared/api/http'
import { queryKeys } from '@/shared/api/query-keys'

export const cartApi = {
  get: (signal?: AbortSignal) => request(cartSchema, { url: apiPath(API_ROUTES.cart), signal }),
  add: (input: AddCartItemInput) => request(cartSchema, { method: 'POST', url: apiPath(API_ROUTES.cartItems), data: input }),
  update: (itemId: string, quantity: number) =>
    request(cartSchema, { method: 'PATCH', url: apiPath(API_ROUTES.cartItem, { itemId }), data: { quantity } }),
  remove: (itemId: string) => request(cartSchema, { method: 'DELETE', url: apiPath(API_ROUTES.cartItem, { itemId }) }),
  applyCoupon: (code: string) => request(cartSchema, { method: 'PUT', url: apiPath(API_ROUTES.cartCoupon), data: { code } }),
  removeCoupon: () => request(cartSchema, { method: 'DELETE', url: apiPath(API_ROUTES.cartCoupon) }),
  acknowledge: () => request(cartSchema, { method: 'POST', url: apiPath(API_ROUTES.cartAcknowledge) }),
  quote: (network: Network, signal?: AbortSignal) =>
    request(quoteSchema, { method: 'POST', url: apiPath(API_ROUTES.quotes), data: { network }, signal }),
}

export const cartQueries = {
  cart: (owner: string) =>
    queryOptions({
      queryKey: queryKeys.cart(owner),
      queryFn: ({ signal }) => cartApi.get(signal),
      staleTime: 15_000,
    }),

  /**
   * A cotação é chaveada pela versão do carrinho: qualquer mudança no
   * carrinho gera nova cotação; a API é a única fonte dos valores.
   */
  quote: (owner: string, network: Network, cartVersion: number) =>
    queryOptions({
      queryKey: queryKeys.quote(owner, network, cartVersion),
      queryFn: ({ signal }) => cartApi.quote(network, signal),
      staleTime: 60_000,
    }),
}
