/** Acesso tolerante a falhas ao storage (modo privado, cota, bloqueio). */
function safe(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export function createStore(kind: 'local' | 'session') {
  return {
    get<T>(key: string): T | null {
      try {
        const raw = safe(kind)?.getItem(key)
        return raw ? (JSON.parse(raw) as T) : null
      } catch {
        return null
      }
    },
    set(key: string, value: unknown) {
      try {
        safe(kind)?.setItem(key, JSON.stringify(value))
      } catch {
        /* best-effort */
      }
    },
    remove(key: string) {
      try {
        safe(kind)?.removeItem(key)
      } catch {
        /* best-effort */
      }
    },
  }
}

export const local = createStore('local')
export const session = createStore('session')

export const STORAGE_KEYS = {
  session: 'kurio:session',
  guestCart: 'kurio:guest-cart',
  checkoutDraft: 'kurio:checkout-draft',
  pendingOrder: 'kurio:pending-order',
} as const
