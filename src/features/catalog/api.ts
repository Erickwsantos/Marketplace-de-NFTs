import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import {
  API_ROUTES,
  apiPath,
  catalogResponseSchema,
  featuredResponseSchema,
  nftDetailSchema,
  type CatalogQuery,
} from '@/contracts'
import { toApiError } from '@/shared/api/errors'
import { request } from '@/shared/api/http'
import { queryKeys } from '@/shared/api/query-keys'

export const catalogApi = {
  list: (query: CatalogQuery, signal?: AbortSignal) =>
    request(catalogResponseSchema, { url: apiPath(API_ROUTES.nfts), params: query, signal }),
  featured: (signal?: AbortSignal) => request(featuredResponseSchema, { url: apiPath(API_ROUTES.featured), signal }),
  detail: (nftId: string, signal?: AbortSignal) =>
    request(nftDetailSchema, { url: apiPath(API_ROUTES.nft, { nftId }), signal }),
}

export const catalogQueries = {
  /**
   * A chave inclui todos os parâmetros: cada combinação de filtros tem seu
   * cache. Ao trocar a chave, a requisição anterior é abortada (signal) e
   * uma resposta atrasada nunca sobrescreve a consulta atual.
   */
  list: (query: CatalogQuery) =>
    queryOptions({
      queryKey: queryKeys.catalog(query),
      queryFn: ({ signal }) => catalogApi.list(query, signal),
      placeholderData: keepPreviousData,
    }),

  featured: () =>
    queryOptions({
      queryKey: queryKeys.featured(),
      queryFn: ({ signal }) => catalogApi.featured(signal),
      staleTime: 5 * 60_000,
    }),

  detail: (nftId: string) =>
    queryOptions({
      queryKey: queryKeys.nft(nftId),
      queryFn: ({ signal }) => catalogApi.detail(nftId, signal),
      retry: (count, error) => toApiError(error).retryable && count < 2,
    }),
}
