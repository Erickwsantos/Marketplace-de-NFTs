import { z } from 'zod'
import { ethAmountSchema, isoDateSchema, networkSchema } from './common'
import { imageSchema } from './nft'

export const CART_ITEM_STATUSES = [
  'ok',
  /** Preço atual difere do último preço visto pelo colecionador. */
  'price_changed',
  /** Quantidade no carrinho maior que a disponibilidade atual. */
  'insufficient_stock',
  'sold_out',
  'unavailable',
] as const

export const cartItemSchema = z.object({
  id: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  tokenId: z.string(),
  image: imageSchema,
  editionLabel: z.string(),
  quantity: z.number().int().min(1),
  unitPriceEth: ethAmountSchema,
  /** Último preço confirmado pelo colecionador (para destacar alterações). */
  acknowledgedPriceEth: ethAmountSchema,
  lineTotalEth: ethAmountSchema,
  available: z.number().int().min(0),
  maxPerOrder: z.number().int().positive(),
  status: z.enum(CART_ITEM_STATUSES),
  nftVersion: z.number().int().min(1),
})
export type CartItem = z.infer<typeof cartItemSchema>

export const couponSchema = z.object({
  code: z.string(),
  description: z.string(),
  percentOff: z.number().min(0).max(100),
})
export type Coupon = z.infer<typeof couponSchema>

export const cartSchema = z.object({
  id: z.string(),
  owner: z.enum(['guest', 'user']),
  items: z.array(cartItemSchema),
  coupon: couponSchema.nullable(),
  itemCount: z.number().int().min(0),
  version: z.number().int().min(1),
  updatedAt: isoDateSchema,
})
export type Cart = z.infer<typeof cartSchema>

export const addCartItemInputSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().min(1),
})
export type AddCartItemInput = z.infer<typeof addCartItemInputSchema>

export const updateCartItemInputSchema = z.object({ quantity: z.number().int().min(1) })
export type UpdateCartItemInput = z.infer<typeof updateCartItemInputSchema>

export const applyCouponInputSchema = z.object({
  code: z.string().trim().min(1, 'Informe o código promocional').max(24, 'Código inválido'),
})
export type ApplyCouponInput = z.infer<typeof applyCouponInputSchema>

// ---------------------------------------------------------------- Cotação

export const QUOTE_ISSUE_CODES = [
  'PRICE_CHANGED',
  'INSUFFICIENT_STOCK',
  'SOLD_OUT',
  'EDITION_UNAVAILABLE',
  'COUPON_EXPIRED',
  'EMPTY_CART',
] as const

export const quoteIssueSchema = z.object({
  code: z.enum(QUOTE_ISSUE_CODES),
  itemId: z.string().nullable(),
  message: z.string(),
})
export type QuoteIssue = z.infer<typeof quoteIssueSchema>

export const quoteLineSchema = z.object({
  itemId: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  tokenId: z.string(),
  image: imageSchema,
  editionLabel: z.string(),
  quantity: z.number().int().min(1),
  unitPriceEth: ethAmountSchema,
  lineTotalEth: ethAmountSchema,
})
export type QuoteLine = z.infer<typeof quoteLineSchema>

export const quoteSchema = z.object({
  id: z.string(),
  cartVersion: z.number().int(),
  network: networkSchema,
  lines: z.array(quoteLineSchema),
  coupon: couponSchema.nullable(),
  subtotalEth: ethAmountSchema,
  discountEth: ethAmountSchema,
  networkFeeEth: ethAmountSchema,
  totalEth: ethAmountSchema,
  /** Pendências que impedem a finalização (preço alterado, estoque...). */
  issues: z.array(quoteIssueSchema),
  valid: z.boolean(),
  createdAt: isoDateSchema,
  expiresAt: isoDateSchema,
})
export type Quote = z.infer<typeof quoteSchema>

export const createQuoteInputSchema = z.object({ network: networkSchema })
export type CreateQuoteInput = z.infer<typeof createQuoteInputSchema>
