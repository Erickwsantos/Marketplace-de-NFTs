/**
 * Tabela única de rotas REST. O cliente Axios monta URLs com `apiPath` e os
 * handlers MSW registram os mesmos templates — o contrato não se repete.
 */
export const API_ROUTES = {
  register: '/auth/register',
  login: '/auth/login',
  session: '/auth/session',
  logout: '/auth/logout',

  nfts: '/nfts',
  featured: '/nfts/featured',
  nft: '/nfts/:nftId',

  favorites: '/favorites',
  favorite: '/favorites/:nftId',

  cart: '/cart',
  cartItems: '/cart/items',
  cartItem: '/cart/items/:itemId',
  cartCoupon: '/cart/coupon',
  cartAcknowledge: '/cart/acknowledge',

  quotes: '/quotes',

  orders: '/orders',
  order: '/orders/:orderId',

  profile: '/profile',
  avatar: '/profile/avatar',
  password: '/profile/password',

  wallets: '/wallets',
  wallet: '/wallets/:walletId',
  walletConnection: '/wallets/connection',
  walletConnect: '/wallets/:walletId/connect',
} as const

export type ApiRoute = (typeof API_ROUTES)[keyof typeof API_ROUTES]

type PathParams<T extends string> = T extends `${string}:${infer P}/${infer Rest}`
  ? { [K in P | keyof PathParams<`/${Rest}`>]: string }
  : T extends `${string}:${infer P}`
    ? { [K in P]: string }
    : Record<never, string>

export function apiPath<T extends ApiRoute>(
  route: T,
  ...[params]: keyof PathParams<T> extends never ? [] : [PathParams<T>]
): string {
  if (!params) return route
  return route.replace(/:(\w+)/g, (_, key: string) =>
    encodeURIComponent((params as Record<string, string>)[key] ?? ''),
  )
}

export const API_HEADERS = {
  authorization: 'Authorization',
  /** Identifica o carrinho do visitante antes da autenticação. */
  cartId: 'X-Cart-Id',
  idempotencyKey: 'Idempotency-Key',
} as const
