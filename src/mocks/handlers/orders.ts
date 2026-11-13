import { HttpResponse } from 'msw'
import { API_HEADERS, createOrderInputSchema, orderStatusSchema, type OrderList } from '@/contracts'
import { getActiveScenario, getDb, getRuntime, updateRuntime } from '../db/store'
import { toOrder } from '../domain/mappers'
import { createOrder, findUserOrder } from '../domain/orders'
import { route } from '../http'
import { BEYOND_CLIENT_TIMEOUT_MS, wait } from '../network'
import { MockHttpError, parseJson, validate } from '../responses'

export const orderHandlers = [
  route('POST', '/orders', 'required', async ({ request, user, session }) => {
    const key = request.headers.get(API_HEADERS.idempotencyKey)
    if (!key || key.length < 8) {
      throw new MockHttpError('VALIDATION_FAILED', 'Cabeçalho Idempotency-Key obrigatório.')
    }
    const input = await parseJson(request, createOrderInputSchema)
    const { order, replayed } = await createOrder(user, session, key, input)

    // Cenário "order-timeout": o pedido foi criado, mas a primeira resposta
    // só chega depois do timeout do cliente. O reenvio com a mesma chave
    // recupera este mesmo pedido.
    if (!replayed && getActiveScenario().behavior.orderTimeout && !getRuntime().orderTimeoutConsumed) {
      updateRuntime((state) => {
        state.orderTimeoutConsumed = true
      })
      await wait(BEYOND_CLIENT_TIMEOUT_MS)
    }
    return HttpResponse.json(toOrder(order), {
      status: replayed ? 200 : 201,
      headers: { 'Idempotent-Replayed': String(replayed) },
    })
  }),

  route('GET', '/orders', 'required', ({ user, url }): OrderList => {
    const status = url.searchParams.get('status')
    const filter = status ? validate(orderStatusSchema, status) : null
    const items = getDb()
      .orders.filter((o) => o.userId === user.id && (!filter || o.status === filter))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toOrder)
    return { items }
  }),

  route('GET', '/orders/:orderId', 'required', ({ user, params }) =>
    toOrder(findUserOrder(user, String(params.orderId))),
  ),
]
