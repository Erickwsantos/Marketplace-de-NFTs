import { useSyncExternalStore } from 'react'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { LoginInput, RegisterInput, Session } from '@/contracts'
import { guestCart } from '@/shared/api/http'
import { queryKeys } from '@/shared/api/query-keys'
import { sessionStore } from '@/shared/api/session-store'
import { local, session as sessionStorageStore, STORAGE_KEYS } from '@/shared/lib/storage'
import { authApi, sessionQuery } from './api'

/**
 * Remove do cache tudo que pertence à sessão: dados privados, carrinho
 * (de usuário e de visitante) e a própria sessão. Usado em login, logout,
 * expiração e troca de usuário — nenhum dado sobrevive entre contas.
 */
export function clearSessionScopedData(queryClient: QueryClient) {
  void queryClient.cancelQueries({ queryKey: queryKeys.privateRoot() })
  queryClient.removeQueries({ queryKey: queryKeys.privateRoot() })
  queryClient.removeQueries({ queryKey: queryKeys.cartRoot() })
  queryClient.removeQueries({ queryKey: ['session'] })
}

const useToken = () => useSyncExternalStore(sessionStore.subscribe, sessionStore.token, () => null)

export function useAuth() {
  const token = useToken()
  const query = useQuery(sessionQuery(token))
  const user = token ? (query.data?.user ?? null) : null
  return {
    token,
    user,
    userId: user?.id ?? null,
    isAuthenticated: Boolean(user),
    isResolving: Boolean(token) && query.isPending,
  }
}

/**
 * Dono do carrinho no cache: usuário autenticado ou visitante.
 * null enquanto a sessão é validada (consultas do carrinho aguardam).
 */
export function useCartOwner(): string | null {
  const { userId, token } = useAuth()
  if (token) return userId
  return guestCart.id()
}

function useEstablishSession() {
  const queryClient = useQueryClient()
  return (session: Session) => {
    clearSessionScopedData(queryClient)
    sessionStore.set({ token: session.token, userId: session.user.id, expiresAt: session.expiresAt })
    queryClient.setQueryData(queryKeys.session(session.token), {
      user: session.user,
      expiresAt: session.expiresAt,
    })
    // O carrinho do visitante foi incorporado pelo servidor no login.
    guestCart.rotate()
  }
}

export function useLogin() {
  const establish = useEstablishSession()
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: establish,
    meta: { silent: true },
  })
}

export function useRegister() {
  const establish = useEstablishSession()
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: establish,
    meta: { silent: true },
  })
}

/** Encerra a sessão local mesmo se o servidor falhar (logout nunca "prende" o usuário). */
export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await authApi.logout().catch(() => undefined)
    },
    onSettled: () => {
      sessionStore.set(null)
      guestCart.rotate()
      sessionStorageStore.remove(STORAGE_KEYS.checkoutDraft)
      local.remove(STORAGE_KEYS.pendingOrder)
      clearSessionScopedData(queryClient)
    },
    meta: { silent: true },
  })
}
