import { z } from 'zod'
import { emailField } from './auth'
import { isoDateSchema, networkSchema, walletProviderSchema } from './common'
import { displayNameField, ensNameField, nicknameField } from './profile'

const ETH_ADDRESS = /^0x[a-fA-F0-9]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

/**
 * Campos do "Perfil do colecionador". São os mesmos no cadastro de carteiras
 * e no pagamento: um único schema e um único componente de formulário.
 */
export const collectorProfileSchema = z
  .object({
    displayName: displayNameField,
    nickname: nicknameField,
    network: networkSchema,
    profileName: z.string().trim().min(2, 'Informe o nome do perfil').max(40, 'Use no máximo 40 caracteres'),
    address: z.string().trim().min(1, 'Informe o endereço da carteira'),
    secondaryAddress: z.string().trim().max(64, 'Use no máximo 64 caracteres'),
    provider: walletProviderSchema,
    referralCode: z
      .string()
      .trim()
      .min(4, 'Informe o código de indicação')
      .max(16, 'Use no máximo 16 caracteres')
      .regex(/^[A-Z0-9-]+$/i, 'Use letras, números e "-"'),
    email: emailField,
    ensName: ensNameField,
  })
  .superRefine((value, ctx) => {
    if (!value.address) return
    const pattern = value.network === 'solana' ? SOLANA_ADDRESS : ETH_ADDRESS
    if (!pattern.test(value.address)) {
      ctx.addIssue({
        code: 'custom',
        path: ['address'],
        message:
          value.network === 'solana'
            ? 'Endereço Solana inválido'
            : 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais',
      })
    }
  })
export type CollectorProfile = z.infer<typeof collectorProfileSchema>

export const WALLET_ROLES = ['primary', 'secondary'] as const
export const walletRoleSchema = z.enum(WALLET_ROLES)
export type WalletRole = z.infer<typeof walletRoleSchema>

export const walletSchema = z.object({
  id: z.string(),
  role: walletRoleSchema,
  profile: z.object({
    displayName: z.string(),
    nickname: z.string(),
    network: networkSchema,
    profileName: z.string(),
    address: z.string(),
    secondaryAddress: z.string(),
    provider: walletProviderSchema,
    referralCode: z.string(),
    email: z.string(),
    ensName: z.string(),
  }),
  version: z.number().int().min(1),
  updatedAt: isoDateSchema,
})
export type Wallet = z.infer<typeof walletSchema>

export const walletListSchema = z.object({ items: z.array(walletSchema) })
export type WalletList = z.infer<typeof walletListSchema>

export const createWalletInputSchema = z.object({ role: walletRoleSchema, profile: collectorProfileSchema })
export type CreateWalletInput = z.infer<typeof createWalletInputSchema>

export const updateWalletInputSchema = z.object({ profile: collectorProfileSchema })
export type UpdateWalletInput = z.infer<typeof updateWalletInputSchema>

export const connectWalletInputSchema = z.object({
  provider: walletProviderSchema,
  network: networkSchema,
})
export type ConnectWalletInput = z.infer<typeof connectWalletInputSchema>

export const walletConnectionSchema = z.object({
  walletId: z.string(),
  provider: walletProviderSchema,
  network: networkSchema,
  status: z.enum(['connected', 'disconnected']),
  connectedAt: isoDateSchema.nullable(),
})
export type WalletConnection = z.infer<typeof walletConnectionSchema>

export const walletConnectionResponseSchema = z.object({ connection: walletConnectionSchema.nullable() })
export type WalletConnectionResponse = z.infer<typeof walletConnectionResponseSchema>
