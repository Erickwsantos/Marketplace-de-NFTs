import { createFileRoute, notFound } from '@tanstack/react-router'
import { RouteNotFound } from '@/app/route-fallbacks'
import { catalogQueries } from '@/features/catalog/api'
import { NftDetailPage, NftDetailSkeleton } from '@/features/nft/nft-detail-page'
import { isApiError } from '@/shared/api/errors'

export const Route = createFileRoute('/nfts/$nftId')({
  loader: async ({ context, params }) => {
    try {
      const nft = await context.queryClient.ensureQueryData(catalogQueries.detail(params.nftId))
      return { title: nft.name }
    } catch (error) {
      if (isApiError(error, 'NOT_FOUND')) throw notFound()
      // Outras falhas: a página renderiza o estado de erro com nova tentativa.
      return { title: 'NFT' }
    }
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.title ?? 'NFT'} | Kurio` }] }),
  pendingComponent: NftDetailSkeleton,
  notFoundComponent: () => (
    <RouteNotFound title="NFT não encontrado" description="Este NFT não existe ou foi removido do mercado." />
  ),
  component: NftDetailPage,
})
