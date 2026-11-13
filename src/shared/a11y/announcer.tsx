import { useSyncExternalStore } from 'react'

/**
 * Anúncios para leitores de tela (mutations e mudanças em tempo real).
 * Duas regiões aria-live permanentes no layout raiz; `announce` atualiza o texto.
 */
type Politeness = 'polite' | 'assertive'
const state: Record<Politeness, string> = { polite: '', assertive: '' }
const listeners = new Set<() => void>()
let snapshot = { ...state }

export function announce(message: string, politeness: Politeness = 'polite') {
  // Limpa antes para que mensagens repetidas sejam lidas novamente.
  state[politeness] = ''
  snapshot = { ...state }
  listeners.forEach((l) => l())
  setTimeout(() => {
    state[politeness] = message
    snapshot = { ...state }
    listeners.forEach((l) => l())
  }, 50)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function LiveAnnouncer() {
  const messages = useSyncExternalStore(subscribe, () => snapshot, () => snapshot)
  return (
    <div className="sr-only">
      <div role="status" aria-live="polite" aria-atomic="true" data-testid="live-polite">
        {messages.polite}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true" data-testid="live-assertive">
        {messages.assertive}
      </div>
    </div>
  )
}
