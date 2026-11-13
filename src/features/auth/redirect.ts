import { z } from 'zod'

/** Aceita apenas caminhos internos (evita open redirect). */
export const safeRedirect = z
  .string()
  .refine((value) => value.startsWith('/') && !value.startsWith('//'), 'Destino inválido')
  .optional()
  .catch(undefined)

export const authSearchSchema = z.object({
  redirect: safeRedirect,
  reason: z.enum(['expired']).optional().catch(undefined),
})
export type AuthSearch = z.infer<typeof authSearchSchema>

/** Rotas que exigem sessão (fonte única para guard de expiração e login). */
export const PRIVATE_PREFIXES = ['/checkout', '/orders', '/profile'] as const

export const isPrivatePath = (path: string) => PRIVATE_PREFIXES.some((prefix) => path.startsWith(prefix))
