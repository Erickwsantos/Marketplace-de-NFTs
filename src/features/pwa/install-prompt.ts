import { useSyncExternalStore } from 'react'
import { env } from '@/shared/config/env'

/**
 * PWA: captura o `beforeinstallprompt` no boot (o evento pode disparar antes
 * de a tela de perfil montar) e expõe o estado para o botão "Instalar app".
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallState = 'unavailable' | 'available' | 'installed'

let deferred: BeforeInstallPromptEvent | null = null
let state: InstallState = 'unavailable'
const listeners = new Set<() => void>()
const set = (next: InstallState) => {
  state = next
  listeners.forEach((l) => l())
}

export function initPwa() {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(display-mode: standalone)').matches) state = 'installed'

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    set('available')
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    set('installed')
  })

  // Com mocks, o MSW registra o mesmo /sw.js (precache + mocks). Sem mocks,
  // registramos aqui. Em dev não há SW de PWA.
  if (import.meta.env.PROD && !env.mocksEnabled && 'serviceWorker' in navigator) {
    void navigator.serviceWorker.register('/sw.js')
  }
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable'
  await deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = null
  set(outcome === 'accepted' ? 'installed' : 'unavailable')
  return outcome
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
    () => state,
  )
}

/** iOS não emite beforeinstallprompt: a instalação é manual (Compartilhar → Adicionar à Tela de Início). */
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
