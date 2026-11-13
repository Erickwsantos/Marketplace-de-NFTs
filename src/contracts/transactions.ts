import { z } from 'zod'
import { ethAmountSchema, isoDateSchema, networkSchema } from './common'

/**
 * Transação exibida pelo explorador SIMULADO (`/explorer/tx/:hash`).
 * Como num explorador público, não contém dados pessoais do comprador:
 * apenas endereços, valores e tokens transferidos.
 */
export const transactionSchema = z.object({
  hash: z.string(),
  network: networkSchema,
  status: z.literal('success'),
  blockNumber: z.number().int().positive(),
  confirmations: z.number().int().min(1),
  timestamp: isoDateSchema,
  from: z.string(),
  to: z.string(),
  valueEth: ethAmountSchema,
  networkFeeEth: ethAmountSchema,
  transfers: z.array(
    z.object({ name: z.string(), tokenId: z.string(), editionLabel: z.string(), quantity: z.number().int().min(1) }),
  ),
  /** Sempre true: referência gerada pela simulação, não existe em blockchain. */
  simulated: z.literal(true),
})
export type Transaction = z.infer<typeof transactionSchema>
