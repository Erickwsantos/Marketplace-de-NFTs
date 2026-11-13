import { isAxiosError, isCancel } from 'axios'
import { apiErrorBodySchema, type ApiErrorCode } from '@/contracts'

/** Códigos que só existem no cliente (transporte). */
export type ClientErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'CANCELLED' | 'INVALID_RESPONSE' | 'UNKNOWN'
export type ErrorCode = ApiErrorCode | ClientErrorCode

const CLIENT_MESSAGES: Record<ClientErrorCode, string> = {
  NETWORK_ERROR: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
  TIMEOUT: 'O servidor demorou para responder. Tente novamente.',
  CANCELLED: 'Requisição cancelada.',
  INVALID_RESPONSE: 'Resposta inesperada do servidor.',
  UNKNOWN: 'Algo deu errado. Tente novamente.',
}

const RETRYABLE: ReadonlySet<ErrorCode> = new Set(['NETWORK_ERROR', 'TIMEOUT', 'INTERNAL_ERROR', 'SERVICE_UNAVAILABLE'])

/** Erro único consumido por hooks e UI, independente da origem. */
export class ApiError extends Error {
  readonly code: ErrorCode
  readonly status: number | null
  readonly fieldErrors: Record<string, string>
  readonly details: Record<string, unknown>

  constructor(
    code: ErrorCode,
    message: string,
    options: { status?: number | null; fieldErrors?: Record<string, string>; details?: Record<string, unknown> } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = options.status ?? null
    this.fieldErrors = options.fieldErrors ?? {}
    this.details = options.details ?? {}
  }

  /** Falha transitória: pode ser repetida com segurança (GET ou mutation idempotente). */
  get retryable(): boolean {
    return RETRYABLE.has(this.code)
  }

  is(...codes: ErrorCode[]): boolean {
    return codes.includes(this.code)
  }
}

export function clientError(code: ClientErrorCode): ApiError {
  return new ApiError(code, CLIENT_MESSAGES[code])
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (isCancel(error)) return clientError('CANCELLED')
  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return clientError('TIMEOUT')
    if (!error.response) return clientError('NETWORK_ERROR')
    const parsed = apiErrorBodySchema.safeParse(error.response.data)
    if (parsed.success) {
      const { code, message, fieldErrors, details } = parsed.data.error
      return new ApiError(code, message, { status: error.response.status, fieldErrors, details })
    }
    return new ApiError(error.response.status >= 500 ? 'INTERNAL_ERROR' : 'UNKNOWN', CLIENT_MESSAGES.UNKNOWN, {
      status: error.response.status,
    })
  }
  return clientError('UNKNOWN')
}

export const isApiError = (error: unknown, ...codes: ErrorCode[]): error is ApiError =>
  error instanceof ApiError && (codes.length === 0 || error.is(...codes))

export const errorMessage = (error: unknown): string => toApiError(error).message
