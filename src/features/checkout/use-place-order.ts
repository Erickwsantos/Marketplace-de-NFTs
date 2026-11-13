import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { CreateOrderInput } from '@/contracts'
import { ordersApi } from '@/features/orders/api'
import { pendingOrder } from '@/features/orders/pending-order'
import { toApiError } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/query-keys'
import { checkoutDraft } from './checkout-draft'

/**
 * Envio do pedido com proteção contra duplicidade:
 * - a chave de idempotência é derivada da tentativa (mesmo payload = mesma chave),
 *   persistida no sessionStorage — sobrevive a refresh;
 * - falhas transitórias (timeout, rede, 5xx) são repetidas automaticamente
 *   com a mesma chave: o servidor devolve o mesmo pedido, nunca outro;
 * - um ref bloqueia cliques repetidos antes mesmo do re-render.
 */
export function usePlaceOrder(userId: string) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const inFlight = useRef(false)

  const mutation = useMutation({
    mutationFn: (input: CreateOrderInput) => {
      const key = checkoutDraft.attemptKey(userId, JSON.stringify(input))
      return ordersApi.create(input, key)
    },
    retry: (failureCount, error) => toApiError(error).retryable && failureCount < 2,
    retryDelay: 800,
    meta: { silent: true },
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.order(userId, order.id), order)
      pendingOrder.set(userId, order.id)
      checkoutDraft.clear()
      void navigate({ to: '/orders/$orderId', params: { orderId: order.id }, replace: true })
    },
    onError: (error) => {
      const apiError = toApiError(error)
      // Payload mudará (nova cotação/carteira): a próxima tentativa usa nova chave.
      if (!apiError.retryable) checkoutDraft.clearAttempt(userId)
    },
    onSettled: () => {
      inFlight.current = false
    },
  })

  return {
    ...mutation,
    submit(input: CreateOrderInput, options?: { onError?: (error: unknown) => void }) {
      if (inFlight.current || mutation.isPending) return
      inFlight.current = true
      mutation.mutate(input, options)
    },
  }
}
