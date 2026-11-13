import { local, STORAGE_KEYS } from '@/shared/lib/storage'

/**
 * Credencial da sessão (fora do React, lida pelo Axios e pelo socket).
 * Persistida para recuperar a sessão após refresh; os dados do usuário
 * ficam no cache do TanStack Query (GET /auth/session).
 */
export interface StoredSession {
  token: string
  userId: string
  expiresAt: string
}

export type SessionEvent = 'changed' | 'expired'
type Listener = (event: SessionEvent) => void

let current: StoredSession | null = local.get<StoredSession>(STORAGE_KEYS.session)
const listeners = new Set<Listener>()
const emit = (event: SessionEvent) => listeners.forEach((l) => l(event))

export const sessionStore = {
  get: () => current,
  token: () => current?.token ?? null,

  set(session: StoredSession | null) {
    current = session
    if (session) local.set(STORAGE_KEYS.session, session)
    else local.remove(STORAGE_KEYS.session)
    emit('changed')
  },

  /** Chamado ao receber SESSION_EXPIRED (ou ao vencer o prazo localmente). */
  expire() {
    if (!current) return
    current = null
    local.remove(STORAGE_KEYS.session)
    emit('expired')
  },

  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

// Mantém abas sincronizadas: login/logout em uma aba reflete nas outras.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEYS.session) return
    current = local.get<StoredSession>(STORAGE_KEYS.session)
    emit('changed')
  })
}
