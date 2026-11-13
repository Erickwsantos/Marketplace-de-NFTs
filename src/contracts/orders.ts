import { z } from 'zod'
import { couponSchema, quoteLineSchema } from './cart'
import { ethAmountSchema, isoDateSchema, networkSchema, walletProviderSchema } from './common'
import { collectorProfileSchema } from './wallets'

export const ORDER_STATUSES = ['pending', 'confirmed', 'declined'] as const
export const orderStatusSchema = z.enum(ORDER_STATUSES)
export type OrderStatus = z.infer<typeof orderStatusSchema>
export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = ['confirmed', 'declined']

export const createOrderInputSchema = z.object({
  quoteId: z.string(),
  walletId: z.string(),
  provider: walletProviderSchema,
  network: networkSchema,
  buyer: collectorProfileSchema,
  note: z.string().trim().max(500, 'Use no máximo 500 caracteres'),
})
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>

/**
 * O pedido guarda um snapshot completo (linhas, valores, comprador).
 * O recibo é renderizado somente a partir deste snapshot.
 */
export const orderSchema = z.object({
  id: z.string(),
  status: orderStatusSchema,
  version: z.number().int().min(1),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  quoteId: z.string(),
  lines: z.array(quoteLineSchema).min(1),
  coupon: couponSchema.nullable(),
  subtotalEth: ethAmountSchema,
  discountEth: ethAmountSchema,
  networkFeeEth: ethAmountSchema,
  totalEth: ethAmountSchema,
  network: networkSchema,
  provider: walletProviderSchema,
  wallet: z.object({ id: z.string(), nickname: z.string(), address: z.string() }),
  buyer: z.object({ displayName: z.string(), email: z.string(), ensName: z.string() }),
  transaction: z
    .object({ hash: z.string(), explorerUrl: z.string(), confirmedAt: isoDateSchema })
    .nullable(),
  failureReason: z.string().nullable(),
})
export type Order = z.infer<typeof orderSchema>

export const orderListSchema = z.object({ items: z.array(orderSchema) })
export type OrderList = z.infer<typeof orderListSchema>
