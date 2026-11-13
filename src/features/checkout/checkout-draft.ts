import { z } from 'zod'
import { collectorProfileSchema } from '@/contracts'
import { session, STORAGE_KEYS } from '@/shared/lib/storage'

export const checkoutFormSchema = z.object({
  walletId: z.string().min(1, 'Selecione uma carteira cadastrada'),
  useOtherWallet: z.boolean(),
  buyer: collectorProfileSchema,
  note: z.string().trim().max(500, 'Use no máximo 500 caracteres'),
})
export type CheckoutFormValues = z.input<typeof checkoutFormSchema>

/**
 * Rascunho do checkout no sessionStorage (por usuário): sobrevive a refresh
 * e à expiração da sessão — após novo login o colecionador retoma de onde
 * parou. Guarda também a tentativa de envio (chave de idempotência + impressão
 * do payload): reenviar o MESMO pedido reutiliza a MESMA chave.
 */
interface CheckoutDraft {
  userId: string
  values?: CheckoutFormValues
  attempt?: { key: string; fingerprint: string }
}

const read = (userId: string): CheckoutDraft | null => {
  const draft = session.get<CheckoutDraft>(STORAGE_KEYS.checkoutDraft)
  return draft?.userId === userId ? draft : null
}

export const checkoutDraft = {
  values: (userId: string) => read(userId)?.values ?? null,
  saveValues(userId: string, values: CheckoutFormValues) {
    session.set(STORAGE_KEYS.checkoutDraft, { ...read(userId), userId, values })
  },
  /** Chave da tentativa atual: reaproveitada se o payload for idêntico. */
  attemptKey(userId: string, fingerprint: string): string {
    const draft = read(userId)
    if (draft?.attempt?.fingerprint === fingerprint) return draft.attempt.key
    const key = `ord_${crypto.randomUUID()}`
    session.set(STORAGE_KEYS.checkoutDraft, { ...draft, userId, attempt: { key, fingerprint } })
    return key
  },
  clearAttempt(userId: string) {
    const draft = read(userId)
    if (draft) session.set(STORAGE_KEYS.checkoutDraft, { ...draft, attempt: undefined })
  },
  clear() {
    session.remove(STORAGE_KEYS.checkoutDraft)
  },
}
