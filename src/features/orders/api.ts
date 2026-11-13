import { queryOptions } from '@tanstack/react-query'
import {
  API_HEADERS,
  API_ROUTES,
  apiPath,
  orderListSchema,
  orderSchema,
  TERMINAL_ORDER_STATUSES,
  type CreateOrderInput,
} from '@/contracts'
import { request } from '@/shared/api/http'
import { queryKeys } from '@/shared/api/query-keys'

export const ordersApi = {
  /** A chave de idempotência acompanha a tentativa: reenvios recuperam o mesmo pedido. */
  create: (input: CreateOrderInput, idempotencyKey: string) =>
    request(orderSchema, {
      method: 'POST',
      url: apiPath(API_ROUTES.orders),
      data: input,
      headers: { [API_HEADERS.idempotencyKey]: idempotencyKey },
    }),
  get: (orderId: string, signal?: AbortSignal) =>
    request(orderSchema, { url: apiPath(API_ROUTES.order, { orderId }), signal }),
  list: (status?: string, signal?: AbortSignal) =>
    request(orderListSchema, { url: apiPath(API_ROUTES.orders), params: { status }, signal }),
}

export const orderQueries = {
  /**
   * Pedido pendente: o socket é o canal principal; o polling lento é a rede
   * de segurança caso eventos se percam (offline, reconexão). Estados
   * terminais param o polling.
   */
  detail: (userId: string, orderId: string) =>
    queryOptions({
      queryKey: queryKeys.order(userId, orderId),
      queryFn: ({ signal }) => ordersApi.get(orderId, signal),
      refetchInterval: (query) =>
        query.state.data && TERMINAL_ORDER_STATUSES.includes(query.state.data.status) ? false : 5000,
    }),
}
