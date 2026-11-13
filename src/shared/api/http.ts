import axios, { type AxiosRequestConfig } from 'axios'
import type { z } from 'zod'
import { API_HEADERS } from '@/contracts'
import { env } from '@/shared/config/env'
import { local, STORAGE_KEYS } from '@/shared/lib/storage'
import { toSearchParams } from '@/shared/lib/query-string'
import { ApiError, toApiError } from './errors'
import { sessionStore } from './session-store'

/** Identidade do carrinho do visitante (preservada até o login). */
export const guestCart = {
  id(): string {
    let id = local.get<string>(STORAGE_KEYS.guestCart)
    if (!id) {
      id = `guest_${crypto.randomUUID()}`
      local.set(STORAGE_KEYS.guestCart, id)
    }
    return id
  },
  /** Após logout o visitante recomeça com um carrinho novo e vazio. */
  rotate() {
    local.remove(STORAGE_KEYS.guestCart)
  },
}

export const http = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.requestTimeoutMs,
  headers: { Accept: 'application/json' },
  paramsSerializer: { serialize: (params) => toSearchParams(params).toString() },
})

http.interceptors.request.use((config) => {
  const token = sessionStore.token()
  if (token) config.headers.set(API_HEADERS.authorization, `Bearer ${token}`)
  config.headers.set(API_HEADERS.cartId, guestCart.id())
  return config
})

http.interceptors.response.use(undefined, (error: unknown) => {
  const apiError = toApiError(error)
  // Sessão inválida durante a navegação: encerra localmente e avisa o app
  // (que preserva o contexto e oferece novo login).
  if (apiError.is('SESSION_EXPIRED') || (apiError.is('UNAUTHENTICATED') && sessionStore.token())) {
    sessionStore.expire()
  }
  return Promise.reject(apiError)
})

/**
 * Requisição tipada: a resposta é validada pelo schema do contrato antes de
 * chegar ao cache. Divergências viram INVALID_RESPONSE (nunca dados corrompidos).
 */
export async function request<S extends z.ZodType>(schema: S, config: AxiosRequestConfig): Promise<z.infer<S>> {
  const response = await http.request<unknown>(config)
  const parsed = schema.safeParse(response.data)
  if (!parsed.success) {
    if (import.meta.env.DEV) console.error('[api] contrato violado', config.url, parsed.error.issues)
    throw new ApiError('INVALID_RESPONSE', 'Resposta inesperada do servidor.', { status: response.status })
  }
  return parsed.data
}

export async function requestVoid(config: AxiosRequestConfig): Promise<void> {
  await http.request(config)
}
