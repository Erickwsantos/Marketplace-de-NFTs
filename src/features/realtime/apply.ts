import type { QueryClient } from '@tanstack/react-query'
import type {
  Cart,
  CatalogResponse,
  Favorites,
  FeaturedResponse,
  NftDetail,
  NftSummary,
  NftUpdatedEvent,
  Order,
  OrderUpdatedEvent,
} from '@/contracts'
import { queryKeys } from '@/shared/api/query-keys'

/**
 * Aplica eventos ao cache. Cada atualização compara a versão do recurso
 * em cache: nunca regride um dado mais novo vindo do REST.
 */
export function applyNftUpdated(queryClient: QueryClient, event: NftUpdatedEvent): { affectedCartItems: string[] } {
  const { id } = event.resource
  const { data, version } = event

  const patchSummary = <T extends NftSummary>(summary: T): T =>
    summary.id === id && summary.version < version
      ? {
          ...summary,
          priceEth: data.priceEth,
          compareAtPriceEth: data.compareAtPriceEth,
          available: data.available,
          defaultEditionId: data.defaultEditionId,
          version,
        }
      : summary

  queryClient.setQueryData<NftDetail>(queryKeys.nft(id), (old) =>
    old && old.version < version
      ? {
          ...patchSummary(old),
          editions: old.editions.map((edition) => {
            const update = data.editions.find((e) => e.id === edition.id)
            return update ? { ...edition, ...update } : edition
          }),
        }
      : old,
  )
  queryClient.setQueriesData<CatalogResponse>({ queryKey: queryKeys.catalogLists() }, (old) =>
    old ? { ...old, items: old.items.map(patchSummary) } : old,
  )
  queryClient.setQueryData<FeaturedResponse>(queryKeys.featured(), (old) =>
    old ? { hero: old.hero.map(patchSummary), spotlight: patchSummary(old.spotlight) } : old,
  )
  queryClient.setQueriesData<Favorites>(
    { queryKey: queryKeys.privateRoot(), predicate: (q) => q.queryKey[2] === 'favorites' },
    (old) => (old ? { items: old.items.map(patchSummary) } : old),
  )

  // Carrinho e cotação dependem de regras do servidor (status, cotação):
  // revalidamos via REST em vez de recalcular no cliente.
  const cartItems = queryClient
    .getQueriesData<Cart>({ queryKey: queryKeys.cartRoot() })
    .flatMap(([, cart]) => (cart && 'items' in cart ? cart.items.filter((i) => i.nftId === id) : []))
  if (cartItems.length > 0) void queryClient.invalidateQueries({ queryKey: queryKeys.cartRoot() })

  // Só avisa quando a mudança importa para o item: preço diferente ou
  // estoque abaixo da quantidade no carrinho (baixa de estoque irrelevante não notifica).
  const affectedCartItems = cartItems
    .filter((item) => {
      const edition = data.editions.find((e) => e.id === item.editionId)
      return edition && (edition.priceEth !== item.unitPriceEth || edition.available < item.quantity || edition.status !== 'available')
    })
    .map((item) => item.name)

  return { affectedCartItems: [...new Set(affectedCartItems)] }
}

export function applyOrderUpdated(queryClient: QueryClient, userId: string, event: OrderUpdatedEvent): Order | null {
  let applied: Order | null = null
  queryClient.setQueryData<Order>(queryKeys.order(userId, event.resource.id), (old) => {
    if (old && old.version >= event.version) return old
    applied = event.data
    return event.data
  })
  if (!applied) return null
  void queryClient.invalidateQueries({ queryKey: queryKeys.orders(userId), exact: true })
  // Confirmação remove itens comprados do carrinho (no servidor).
  if (event.data.status === 'confirmed') void queryClient.invalidateQueries({ queryKey: queryKeys.cartRoot() })
  return applied
}

/** Após reconexão: reconcilia recursos ativos com a API REST. */
export function reconcileAfterReconnect(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.nfts(), refetchType: 'active' })
  void queryClient.invalidateQueries({ queryKey: queryKeys.cartRoot(), refetchType: 'active' })
  void queryClient.invalidateQueries({
    queryKey: queryKeys.privateRoot(),
    predicate: (q) => q.queryKey[2] === 'orders',
    refetchType: 'active',
  })
}
