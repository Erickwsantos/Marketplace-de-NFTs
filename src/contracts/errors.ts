import { z } from 'zod'

/**
 * Códigos de erro do contrato e o status HTTP de cada um.
 * Usado pelos handlers MSW (para responder) e pelo cliente (para normalizar).
 */
export const ERROR_STATUS = {
  VALIDATION_FAILED: 422,
  INVALID_CREDENTIALS: 401,
  UNAUTHENTICATED: 401,
  SESSION_EXPIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  USERNAME_TAKEN: 409,
  OUT_OF_STOCK: 409,
  QUANTITY_LIMIT: 409,
  EDITION_UNAVAILABLE: 409,
  QUOTE_CHANGED: 409,
  IDEMPOTENCY_CONFLICT: 409,
  COUPON_INVALID: 422,
  COUPON_EXPIRED: 422,
  WALLET_REJECTED: 403,
  WALLET_NOT_CONNECTED: 409,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

export type ApiErrorCode = keyof typeof ERROR_STATUS
export const API_ERROR_CODES = Object.keys(ERROR_STATUS) as [ApiErrorCode, ...ApiErrorCode[]]
export const apiErrorCodeSchema = z.enum(API_ERROR_CODES)

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    /** Erros por campo (chave = nome do campo no formulário). */
    fieldErrors: z.record(z.string(), z.string()).optional(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>
