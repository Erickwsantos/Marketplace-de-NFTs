import { z } from 'zod'
import { nftSummarySchema } from './nft'

export const favoritesSchema = z.object({ items: z.array(nftSummarySchema) })
export type Favorites = z.infer<typeof favoritesSchema>

export const favoriteMutationSchema = z.object({ nftId: z.string(), favorited: z.boolean() })
export type FavoriteMutation = z.infer<typeof favoriteMutationSchema>
