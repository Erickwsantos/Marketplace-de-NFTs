import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { Favorites, NftSummary } from '@/contracts'
import { useAuth } from '@/features/auth/session'
import { announce } from '@/shared/a11y/announcer'
import { queryKeys } from '@/shared/api/query-keys'
import { accountQueries, favoritesApi } from './api'

export function useFavorites() {
  const { userId } = useAuth()
  return useQuery({ ...accountQueries.favorites(userId ?? ''), enabled: Boolean(userId) })
}

export function useIsFavorite(nftId: string): boolean {
  const { data } = useFavorites()
  return data?.items.some((item) => item.id === nftId) ?? false
}

/**
 * Favoritar com atualização otimista: o coração muda na hora; se a API
 * falhar, o estado anterior é restaurado (rollback) e o usuário é avisado.
 * Visitantes são levados ao login (favoritos exigem autenticação).
 */
export function useToggleFavorite() {
  const { userId } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const href = useRouterState({ select: (s) => s.location.href })

  const mutation = useMutation({
    mutationFn: ({ nft, favorite }: { nft: NftSummary; favorite: boolean }) =>
      favorite ? favoritesApi.add(nft.id) : favoritesApi.remove(nft.id),
    onMutate: async ({ nft, favorite }) => {
      const key = queryKeys.favorites(userId!)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Favorites>(key)
      queryClient.setQueryData<Favorites>(key, (old) => {
        const items = (old?.items ?? []).filter((item) => item.id !== nft.id)
        return { items: favorite ? [...items, nft] : items }
      })
      announce(favorite ? `${nft.name} adicionado aos favoritos.` : `${nft.name} removido dos favoritos.`)
      return { previous, key }
    },
    onError: (_error, { nft }, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous)
      const message = `Não foi possível atualizar os favoritos de ${nft.name}. Tente novamente.`
      toast.error(message)
      announce(message, 'assertive')
    },
    onSettled: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: queryKeys.favorites(userId) })
    },
    meta: { silent: true },
  })

  return {
    ...mutation,
    toggle(nft: NftSummary, currentlyFavorite: boolean) {
      if (!userId) {
        toast.info('Entre na sua conta para salvar favoritos.')
        void navigate({ to: '/login', search: { redirect: href } })
        return
      }
      mutation.mutate({ nft, favorite: !currentlyFavorite })
    },
  }
}
