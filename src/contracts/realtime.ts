import { z } from 'zod'
import { ethAmountSchema, isoDateSchema } from './common'
import { EDITION_STATUSES } from './nft'
import { orderSchema } from './orders'

/** Nomes dos eventos Socket.IO (servidor → cliente). */
export const REALTIME_EVENTS = {
  nftUpdated: 'nft.updated',
  orderUpdated: 'order.updated',
} as const

/**
 * Envelope comum: identidade estável (id), recurso afetado e versão.
 * O cliente descarta duplicatas (id já visto) e eventos antigos (versão ≤ atual).
 */
const envelope = <T extends string, R extends string, D extends z.ZodType>(
  type: T,
  resource: R,
  data: D,
) =>
  z.object({
    id: z.string(),
    type: z.literal(type),
    resource: z.object({ type: z.literal(resource), id: z.string() }),
    version: z.number().int().min(1),
    occurredAt: isoDateSchema,
    data,
  })

export const nftUpdatedEventSchema = envelope(
  REALTIME_EVENTS.nftUpdated,
  'nft',
  z.object({
    priceEth: ethAmountSchema,
    compareAtPriceEth: ethAmountSchema.nullable(),
    defaultEditionId: z.string().nullable(),
    available: z.number().int().min(0),
    editions: z.array(
      z.object({
        id: z.string(),
        priceEth: ethAmountSchema,
        available: z.number().int().min(0),
        status: z.enum(EDITION_STATUSES),
      }),
    ),
  }),
)
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>

export const orderUpdatedEventSchema = envelope(REALTIME_EVENTS.orderUpdated, 'order', orderSchema)
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>

export const realtimeEventSchema = z.discriminatedUnion('type', [
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
])
export type RealtimeEvent = z.infer<typeof realtimeEventSchema>
