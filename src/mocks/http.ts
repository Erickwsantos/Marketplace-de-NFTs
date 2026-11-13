import { http, HttpResponse, type DefaultBodyType, type PathParams } from 'msw'
import { API_HEADERS, type ApiRoute } from '@/contracts'
import { env } from '@/shared/config/env'
import { persist } from './db/store'
import type { SessionRecord, UserRecord } from './db/types'
import { resolveSession } from './domain/auth'
import { settleDueOrders } from './domain/orders'
import { applyNetworkConditions } from './network'
import { errorResponse, MockHttpError } from './responses'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type AuthMode = 'required' | 'optional' | 'none'

export interface RouteContext<Auth extends AuthMode> {
  request: Request
  params: PathParams<string>
  url: URL
  session: Auth extends 'required' ? SessionRecord : SessionRecord | null
  user: Auth extends 'required' ? UserRecord : UserRecord | null
  /** Carrinho do visitante (header X-Cart-Id). */
  guestCartId: string | null
}

const methods = { GET: http.get, POST: http.post, PUT: http.put, PATCH: http.patch, DELETE: http.delete }

/**
 * Define um endpoint simulado. Toda rota passa pelo mesmo pipeline:
 * condições de rede do cenário → liquidação de pagamentos vencidos →
 * autenticação → resolver → persistência.
 */
export function route<Auth extends AuthMode>(
  method: Method,
  path: ApiRoute,
  auth: Auth,
  resolver: (ctx: RouteContext<Auth>) => Promise<Response | DefaultBodyType> | Response | DefaultBodyType,
) {
  return methods[method](`${env.apiBaseUrl}${path}`, async ({ request, params }) => {
    const networkResult = await applyNetworkConditions(method, path)
    if (networkResult) return networkResult

    try {
      settleDueOrders()
      const { session, user } = resolveSession(request, auth)
      const result = await resolver({
        request,
        params,
        url: new URL(request.url),
        session,
        user,
        guestCartId: request.headers.get(API_HEADERS.cartId),
      } as RouteContext<Auth>)
      return result instanceof Response ? result : HttpResponse.json(result as DefaultBodyType)
    } catch (error) {
      if (error instanceof MockHttpError) {
        return errorResponse(error.code, error.message, error.fieldErrors, error.details)
      }
      console.error('[mock] erro inesperado', error)
      return errorResponse('INTERNAL_ERROR')
    } finally {
      if (method !== 'GET') persist()
    }
  })
}
