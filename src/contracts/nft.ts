import { z } from 'zod'
import { ethAmountSchema, isoDateSchema, networkSchema, paginatedSchema } from './common'

export const CATEGORIES = [
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
] as const
export const categorySchema = z.enum(CATEGORIES)
export type Category = z.infer<typeof categorySchema>

export const EDITION_STATUSES = ['available', 'sold_out', 'unavailable'] as const

export const editionSchema = z.object({
  id: z.string(),
  /** Rótulo exibido: "1/1", "1/10", "1/50" ou "Aberta". */
  label: z.string(),
  /** null = edição aberta (sem limite de tiragem). */
  supply: z.number().int().positive().nullable(),
  available: z.number().int().min(0),
  maxPerOrder: z.number().int().positive(),
  priceEth: ethAmountSchema,
  compareAtPriceEth: ethAmountSchema.nullable(),
  status: z.enum(EDITION_STATUSES),
})
export type Edition = z.infer<typeof editionSchema>

export const imageSchema = z.object({
  url: z.string(),
  alt: z.string(),
  /** Variantes por largura para `srcset` (imagens responsivas). */
  variants: z.array(z.object({ width: z.number().int().positive(), url: z.string() })),
})
export type NftImage = z.infer<typeof imageSchema>

export const nftSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  tokenId: z.string(),
  image: imageSchema,
  category: categorySchema,
  network: networkSchema,
  collection: z.object({ id: z.string(), name: z.string() }),
  creator: z.object({ id: z.string(), name: z.string() }),
  /** Menor preço entre as edições à venda. */
  priceEth: ethAmountSchema,
  /** Edição desse menor preço (null = nada à venda). Usada no atalho "adicionar ao carrinho". */
  defaultEditionId: z.string().nullable(),
  compareAtPriceEth: ethAmountSchema.nullable(),
  badge: z.enum(['raro', 'novo']).nullable(),
  /** Soma das unidades disponíveis em todas as edições. */
  available: z.number().int().min(0),
  listedAt: isoDateSchema,
  /** Versão monotônica do recurso; ordena eventos de tempo real. */
  version: z.number().int().min(1),
})
export type NftSummary = z.infer<typeof nftSummarySchema>

export const reviewSchema = z.object({
  id: z.string(),
  author: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  createdAt: isoDateSchema,
})
export type Review = z.infer<typeof reviewSchema>

export const nftDetailSchema = nftSummarySchema.extend({
  description: z.string(),
  about: z.string(),
  gallery: z.array(imageSchema).min(1),
  attributes: z.array(z.string()),
  editions: z.array(editionSchema).min(1),
  rating: z.object({ average: z.number(), count: z.number().int() }),
  reviews: z.array(reviewSchema),
  contract: z.object({ address: z.string(), standard: z.string() }),
  royaltyPercent: z.number(),
})
export type NftDetail = z.infer<typeof nftDetailSchema>

export const CATALOG_TABS = ['all', 'new', 'trending'] as const
export type CatalogTab = (typeof CATALOG_TABS)[number]
export const CATALOG_SORTS = ['recent', 'price-asc', 'price-desc', 'name-asc'] as const
export type CatalogSort = (typeof CATALOG_SORTS)[number]
export const CATALOG_PAGE_SIZE = 9

/**
 * Parâmetros da listagem. O mesmo schema valida os search params da rota "/"
 * e os query params recebidos pelo handler — URL, estado e API não divergem.
 */
export const catalogQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  categories: z.array(categorySchema).optional(),
  networks: z.array(networkSchema).optional(),
  minPrice: ethAmountSchema.optional(),
  maxPrice: ethAmountSchema.optional(),
  collection: z.string().optional(),
  exclude: z.string().optional(),
  tab: z.enum(CATALOG_TABS).optional(),
  sort: z.enum(CATALOG_SORTS).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(48).optional(),
})
export type CatalogQuery = z.infer<typeof catalogQuerySchema>

const facetSchema = <T extends z.ZodType>(value: T) =>
  z.array(z.object({ value, count: z.number().int().min(0) }))

export const catalogResponseSchema = paginatedSchema(nftSummarySchema).extend({
  facets: z.object({
    categories: facetSchema(categorySchema),
    networks: facetSchema(networkSchema),
    priceRange: z.object({ min: ethAmountSchema, max: ethAmountSchema }),
  }),
})
export type CatalogResponse = z.infer<typeof catalogResponseSchema>

export const featuredResponseSchema = z.object({
  hero: z.array(nftSummarySchema).min(1),
  spotlight: nftSummarySchema,
})
export type FeaturedResponse = z.infer<typeof featuredResponseSchema>
