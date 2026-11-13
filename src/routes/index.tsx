import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { catalogQuerySchema } from '@/contracts'
import { catalogQueries } from '@/features/catalog/api'
import { HomePage } from '@/features/catalog/home-page'
import { toCatalogQuery } from '@/features/catalog/search'

/**
 * Busca, filtros, ordenação e paginação vivem na URL (sobrevivem a refresh
 * e ao histórico). O schema é o mesmo usado pela API.
 */
const homeSearchSchema = catalogQuerySchema.pick({
  q: true,
  categories: true,
  networks: true,
  minPrice: true,
  maxPrice: true,
  tab: true,
  sort: true,
  page: true,
})

export const Route = createFileRoute('/')({
  validateSearch: homeSearchSchema,
  search: { middlewares: [stripSearchParams({ tab: 'all', sort: 'recent', page: 1 })] },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    // Pré-carrega sem bloquear a navegação: skeletons cobrem o carregamento.
    void context.queryClient.prefetchQuery(catalogQueries.featured())
    void context.queryClient.prefetchQuery(catalogQueries.list(toCatalogQuery(deps)))
  },
  head: () => ({ meta: [{ title: 'Kurio — Marketplace de NFTs' }] }),
  component: HomePage,
})
