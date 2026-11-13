import { HttpResponse, type DefaultBodyType } from 'msw'
import type { z } from 'zod'
import { ERROR_STATUS, type ApiErrorBody, type ApiErrorCode } from '@/contracts'
import { toFieldErrors } from '@/shared/lib/validation'
import { ERROR_MESSAGES } from './messages'

/** Erro de domínio do servidor simulado; vira o envelope de erro do contrato. */
export class MockHttpError extends Error {
  readonly code: ApiErrorCode
  readonly fieldErrors?: Record<string, string>
  readonly details?: Record<string, unknown>

  constructor(
    code: ApiErrorCode,
    message: string = ERROR_MESSAGES[code],
    fieldErrors?: Record<string, string>,
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.code = code
    this.fieldErrors = fieldErrors
    this.details = details
  }
}

export function errorResponse(
  code: ApiErrorCode,
  message: string = ERROR_MESSAGES[code],
  fieldErrors?: Record<string, string>,
  details?: Record<string, unknown>,
) {
  const body: ApiErrorBody = { error: { code, message, fieldErrors, details } }
  return HttpResponse.json(body, { status: ERROR_STATUS[code] })
}

export const created = (body: DefaultBodyType) => HttpResponse.json(body, { status: 201 })
export const noContent = () => new HttpResponse(null, { status: 204 })

export async function parseJson<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S>> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    throw new MockHttpError('VALIDATION_FAILED', 'Corpo da requisição inválido')
  }
  return validate(schema, raw)
}

export function validate<S extends z.ZodType>(schema: S, raw: unknown): z.infer<S> {
  const result = schema.safeParse(raw)
  if (!result.success) {
    throw new MockHttpError('VALIDATION_FAILED', ERROR_MESSAGES.VALIDATION_FAILED, toFieldErrors(result.error))
  }
  return result.data
}
