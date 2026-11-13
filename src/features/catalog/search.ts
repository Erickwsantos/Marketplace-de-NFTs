import { CATALOG_PAGE_SIZE, type CatalogQuery } from '@/contracts'

export type CatalogSearch = Pick<
  CatalogQuery,
  'q' | 'categories' | 'networks' | 'minPrice' | 'maxPrice' | 'tab' | 'sort' | 'page'
>

/**
 * Normaliza os search params da URL para a consulta enviada à API.
 * Arrays são ordenados para que a mesma combinação de filtros gere a mesma
 * chave de cache, independente da ordem dos cliques.
 */
export function toCatalogQuery(search: CatalogSearch): CatalogQuery {
  return {
    q: search.q || undefined,
    categories: search.categories?.length ? [...search.categories].sort() : undefined,
    networks: search.networks?.length ? [...search.networks].sort() : undefined,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    tab: search.tab ?? 'all',
    sort: search.sort ?? 'recent',
    page: search.page ?? 1,
    pageSize: CATALOG_PAGE_SIZE,
  }
}
