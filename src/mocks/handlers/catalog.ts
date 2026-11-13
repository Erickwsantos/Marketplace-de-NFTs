import { catalogQuerySchema, type FavoriteMutation } from '@/contracts'
import { fromSearchParams } from '@/shared/lib/query-string'
import { getDb } from '../db/store'
import { findNft, getFeatured, searchCatalog } from '../domain/catalog'
import { toNftDetail, toNftSummary } from '../domain/mappers'
import { route } from '../http'
import { validate } from '../responses'

export const catalogHandlers = [
  route('GET', '/nfts', 'none', ({ url }) => {
    const raw = fromSearchParams(url.searchParams, {
      arrays: ['categories', 'networks'],
      numbers: ['page', 'pageSize'],
    })
    return searchCatalog(validate(catalogQuerySchema, raw))
  }),

  // Antes de "/nfts/:nftId" para não ser capturada como id.
  route('GET', '/nfts/featured', 'none', () => getFeatured()),

  route('GET', '/nfts/:nftId', 'none', ({ params }) => toNftDetail(findNft(String(params.nftId)))),
]

export const favoriteHandlers = [
  route('GET', '/favorites', 'required', ({ user }) => {
    const db = getDb()
    const ids = db.favorites[user.id] ?? []
    return { items: db.nfts.filter((n) => ids.includes(n.id)).map(toNftSummary) }
  }),

  route('PUT', '/favorites/:nftId', 'required', ({ user, params }): FavoriteMutation => {
    const nft = findNft(String(params.nftId))
    const db = getDb()
    const ids = new Set(db.favorites[user.id] ?? [])
    ids.add(nft.id)
    db.favorites[user.id] = [...ids]
    return { nftId: nft.id, favorited: true }
  }),

  route('DELETE', '/favorites/:nftId', 'required', ({ user, params }): FavoriteMutation => {
    const nftId = String(params.nftId)
    const db = getDb()
    db.favorites[user.id] = (db.favorites[user.id] ?? []).filter((id) => id !== nftId)
    return { nftId, favorited: false }
  }),
]
