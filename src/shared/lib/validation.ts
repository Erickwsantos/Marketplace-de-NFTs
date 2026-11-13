import type { z } from 'zod'

/** Converte issues do Zod em `{ campo: mensagem }` (primeira mensagem por campo). */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form'
    result[key] ??= issue.message
  }
  return result
}
