/// <reference lib="webworker" />
import { PrecacheController } from 'workbox-precaching'

/**
 * Service worker único do app (escopo "/"):
 * 1. precache do shell/assets (instalação PWA e navegação offline);
 * 2. incorpora o worker do MSW para a camada de mocks da demonstração.
 *
 * Só pode haver um SW por escopo, por isso os dois convivem aqui. Nosso
 * listener de fetch é registrado ANTES do importScripts: quando ele responde
 * (asset precacheado ou navegação), interrompe a propagação e o MSW não
 * tenta responder o mesmo evento. As chamadas de API seguem para o MSW.
 */
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> }

const precache = new PrecacheController()
precache.addToCacheList(self.__WB_MANIFEST)

self.addEventListener('install', (event) => {
  event.waitUntil(precache.install(event))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(precache.activate(event))
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    // Network-first: sempre a versão publicada; cache só quando offline.
    event.stopImmediatePropagation()
    event.respondWith(
      fetch(request).catch(async () => (await precache.matchPrecache('/index.html')) ?? Response.error()),
    )
    return
  }

  const cacheKey = precache.getCacheKeyForURL(url.href)
  if (cacheKey) {
    event.stopImmediatePropagation()
    event.respondWith(precache.matchPrecache(url.href).then((cached) => cached ?? fetch(request)))
  }
})

importScripts('/mockServiceWorker.js')
