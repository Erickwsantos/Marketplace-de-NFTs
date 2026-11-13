import { queryOptions } from '@tanstack/react-query'
import {
  API_ROUTES,
  apiPath,
  currentSessionSchema,
  sessionSchema,
  type LoginInput,
  type RegisterInput,
} from '@/contracts'
import { request, requestVoid } from '@/shared/api/http'
import { queryKeys } from '@/shared/api/query-keys'

export const authApi = {
  register: (input: RegisterInput) =>
    request(sessionSchema, { method: 'POST', url: apiPath(API_ROUTES.register), data: input }),
  login: (input: LoginInput) => request(sessionSchema, { method: 'POST', url: apiPath(API_ROUTES.login), data: input }),
  session: (signal?: AbortSignal) => request(currentSessionSchema, { url: apiPath(API_ROUTES.session), signal }),
  logout: () => requestVoid({ method: 'POST', url: apiPath(API_ROUTES.logout) }),
}

/** Sessão atual validada no servidor; a chave inclui o token (troca de usuário = outra entrada). */
export const sessionQuery = (token: string | null) =>
  queryOptions({
    queryKey: queryKeys.session(token),
    queryFn: ({ signal }) => (token ? authApi.session(signal) : null),
    staleTime: 60_000,
    retry: false,
  })
