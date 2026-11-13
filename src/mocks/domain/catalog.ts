import {
  CATALOG_PAGE_SIZE,
  CATEGORIES,
  NETWORKS,
  type CatalogQuery,
  type CatalogResponse,
  type Edition,
  type FeaturedResponse,
  type NftSummary,
} from '@/contracts'
import { compareEth, eth, toEth } from '@/shared/lib/eth'
import { getActiveScenario, getDb } from '../db/store'
import type { NftRecord } from '../db/types'
import { SEED_REFERENCE_DATE } from '../db/seed'
import { publishNftUpdated } from '../events'
import { MockHttpError } from '../responses'
import { toNftSummary } from './mappers'

const NEW_WINDOW_MS = 30 * 86_400_000
const TRENDING_THRESHOLD = 60

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

function matchesBase(nft: NftRecord, query: CatalogQuery): boolean {
  if (query.q) {
    const needle = normalize(query.q)
    const haystack = normalize(`${nft.name} ${nft.collection.name} ${nft.creator.name} ${nft.tokenId}`)
    if (!haystack.includes(needle)) return false
  }
  if (query.tab === 'new' && Date.parse(nft.listedAt) < SEED_REFERENCE_DATE - NEW_WINDOW_MS) return false
  if (query.tab === 'trending' && nft.trendingScore < TRENDING_THRESHOLD) return false
  if (query.collection && nft.collection.id !== query.collection) return false
  if (query.exclude && nft.id === query.exclude) return false
  return true
}

function matchesFilters(summary: NftSummary, query: CatalogQuery): boolean {
  if (query.categories?.length && !query.categories.includes(summary.category)) return false
  if (query.networks?.length && !query.networks.includes(summary.network)) return false
  if (query.minPrice && compareEth(summary.priceEth, query.minPrice) < 0) return false
  if (query.maxPrice && compareEth(summary.priceEth, query.maxPrice) > 0) return false
  return true
}

const SORTERS: Record<NonNullable<CatalogQuery['sort']>, (a: NftSummary, b: NftSummary) => number> = {
  recent: (a, b) => b.listedAt.localeCompare(a.listedAt),
  'price-asc': (a, b) => compareEth(a.priceEth, b.priceEth) || a.name.localeCompare(b.name),
  'price-desc': (a, b) => compareEth(b.priceEth, a.priceEth) || a.name.localeCompare(b.name),
  'name-asc': (a, b) => a.name.localeCompare(b.name),
}

export function searchCatalog(query: CatalogQuery): CatalogResponse {
  const { nfts } = getDb()
  const empty = getActiveScenario().behavior.emptyCatalog
  const base = empty ? [] : nfts.filter((nft) => matchesBase(nft, query)).map(toNftSummary)
  const filtered = base.filter((s) => matchesFilters(s, query))
  const sorted = [...filtered].sort(SORTERS[query.sort ?? 'recent'])

  const pageSize = query.pageSize ?? CATALOG_PAGE_SIZE
  const totalPages = Math.ceil(sorted.length / pageSize)
  const page = query.page ?? 1
  const start = (page - 1) * pageSize

  const prices = nfts.map((n) => toNftSummary(n).priceEth).sort(compareEth)

  return {
    items: sorted.slice(start, start + pageSize),
    page,
    pageSize,
    total: sorted.length,
    totalPages,
    // Contagens sobre a busca/aba atual, antes dos filtros de faceta.
    facets: {
      categories: CATEGORIES.map((value) => ({ value, count: base.filter((s) => s.category === value).length })),
      networks: NETWORKS.map((value) => ({ value, count: base.filter((s) => s.network === value).length })),
      priceRange: { min: prices[0] ?? '0', max: prices.at(-1) ?? '0' },
    },
  }
}

export function getFeatured(): FeaturedResponse {
  const { nfts } = getDb()
  const pick = (id: string) => nfts.find((n) => n.id === id) ?? nfts[0]!
  return {
    hero: ['emerald-ape-042', 'neon-vessel-552', 'golden-signal-160'].map((id) => toNftSummary(pick(id))),
    spotlight: toNftSummary(pick('cosmic-bloom-118')),
  }
}

export function findNft(nftId: string): NftRecord {
  const nft = getDb().nfts.find((n) => n.id === nftId)
  if (!nft) throw new MockHttpError('NOT_FOUND', 'NFT não encontrado.')
  return nft
}

export interface EditionPatch {
  priceEth?: string
  available?: number
  status?: Edition['status']
}

/**
 * Altera preço/disponibilidade de uma edição, incrementa a versão e publica
 * `nft.updated`. Único caminho de mutação do inventário: REST e socket
 * sempre refletem o mesmo estado.
 */
export function patchEdition(nftId: string, editionId: string | undefined, patch: EditionPatch): NftRecord {
  const nft = findNft(nftId)
  const edition = editionId
    ? nft.editions.find((e) => e.id === editionId)
    : nft.editions.find((e) => e.status === 'available') ?? nft.editions[0]
  if (!edition) throw new MockHttpError('NOT_FOUND', 'Edição não encontrada.')

  if (patch.priceEth !== undefined) edition.priceEth = patch.priceEth
  if (patch.available !== undefined) edition.available = Math.max(0, patch.available)
  if (patch.status !== undefined) edition.status = patch.status
  else if (edition.status !== 'unavailable') edition.status = edition.available > 0 ? 'available' : 'sold_out'

  nft.version += 1
  publishNftUpdated(nft)
  return nft
}

/** Variação de preço usada pelo cenário "price-change" e pelo painel de dev. */
export function bumpPrice(nftId: string, editionId: string, deltaEth = '0.15'): NftRecord {
  const edition = findNft(nftId).editions.find((e) => e.id === editionId)
  if (!edition) throw new MockHttpError('NOT_FOUND', 'Edição não encontrada.')
  return patchEdition(nftId, editionId, { priceEth: toEth(eth(edition.priceEth).plus(deltaEth)) })
}
