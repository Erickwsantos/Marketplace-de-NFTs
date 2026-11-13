import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AddCartItemInput, Cart, Network } from '@/contracts'
import { useCartOwner } from '@/features/auth/session'
import { announce } from '@/shared/a11y/announcer'
import { queryKeys } from '@/shared/api/query-keys'
import { cartApi, cartQueries } from './api'

export function useCart() {
  const owner = useCartOwner()
  return useQuery({ ...cartQueries.cart(owner ?? ''), enabled: Boolean(owner) })
}

/** Cotação da API para o carrinho atual (rechaveada a cada versão do carrinho). */
export function useQuote(network: Network, { enabled = true }: { enabled?: boolean } = {}) {
  const owner = useCartOwner()
  const cart = useCart()
  const version = cart.data?.version ?? 0
  return useQuery({
    ...cartQueries.quote(owner ?? '', network, version),
    enabled: enabled && Boolean(owner) && (cart.data?.items.length ?? 0) > 0,
    placeholderData: keepPreviousData,
  })
}

/**
 * Toda mutation do carrinho devolve o carrinho completo: o cache é
 * substituído pela resposta (sem refetch) e o resultado é anunciado.
 * Em falha, o carrinho é revalidado para refletir o estado real.
 */
function useCartMutation<V>(
  mutationFn: (variables: V) => Promise<Cart>,
  describe: (variables: V, cart: Cart) => string,
  { silent = false }: { silent?: boolean } = {},
) {
  const owner = useCartOwner()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    // silent: o erro é exibido no próprio formulário (ex.: cupom inválido).
    meta: { silent },
    onSuccess: (cart, variables) => {
      if (owner) queryClient.setQueryData(queryKeys.cart(owner), cart)
      announce(describe(variables, cart))
    },
    onError: () => {
      if (owner) void queryClient.invalidateQueries({ queryKey: queryKeys.cart(owner) })
    },
  })
}

export const useAddToCart = () =>
  useCartMutation(
    (input: AddCartItemInput & { name: string }) =>
      cartApi.add({ nftId: input.nftId, editionId: input.editionId, quantity: input.quantity }),
    (input) => `${input.name} adicionado ao carrinho.`,
  )

export const useUpdateCartItem = () =>
  useCartMutation(
    ({ itemId, quantity }: { itemId: string; quantity: number; name: string }) => cartApi.update(itemId, quantity),
    ({ name, quantity }) => `Quantidade de ${name} alterada para ${quantity}.`,
  )

export const useRemoveCartItem = () =>
  useCartMutation(
    ({ itemId }: { itemId: string; name: string }) => cartApi.remove(itemId),
    ({ name }) => `${name} removido do carrinho.`,
  )

export const useApplyCoupon = () =>
  useCartMutation(
    (code: string) => cartApi.applyCoupon(code),
    (_code, cart) => `Cupom ${cart.coupon?.code ?? ''} aplicado.`,
    { silent: true },
  )

export const useRemoveCoupon = () => useCartMutation(() => cartApi.removeCoupon(), () => 'Cupom removido.')

export const useAcknowledgePrices = () =>
  useCartMutation(() => cartApi.acknowledge(), () => 'Novos preços confirmados. Resumo atualizado.')
