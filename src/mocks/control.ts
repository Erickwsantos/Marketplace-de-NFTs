import { getDb, getRuntime, persist, resetDb, updateRuntime } from './db/store'
import { expireAllSessions } from './domain/auth'
import { bumpPrice, patchEdition, type EditionPatch } from './domain/catalog'
import { clearOrderTimers, forceResolve, settleDueOrders } from './domain/orders'
import { eventHistory, replayEvent, replayStale } from './events'
import { SCENARIOS, type FaultRule, type LatencyProfile } from './scenarios'
import { connectionCount, dropConnections, isSocketOnline } from './socket'

/**
 * API de controle do servidor simulado (window.__kurioMock).
 * Usada pelo painel de dev e pelos testes Playwright. Toda alteração passa
 * pelo domínio do mock: reflete no REST e gera os eventos Socket.IO — a UI
 * nunca é alterada diretamente.
 */
export function createMockControl() {
  const mutate = <T>(fn: () => T): T => {
    const result = fn()
    persist()
    return result
  }

  return {
    scenarios: SCENARIOS.map(({ id, label, description }) => ({ id, label, description })),
    get scenarioId() {
      return getRuntime().scenarioId
    },

    /** Restaura integralmente o cenário (dados, falhas, contadores). */
    async reset(scenarioId?: string) {
      clearOrderTimers()
      dropConnections()
      await resetDb(scenarioId)
    },

    setLatency: (latency: LatencyProfile | null) =>
      updateRuntime((s) => {
        s.overrides.latency = latency ?? undefined
      }),
    addFault: (rule: FaultRule) =>
      updateRuntime((s) => {
        s.overrides.faults = [...(s.overrides.faults ?? []), rule]
      }),
    clearFaults: () =>
      updateRuntime((s) => {
        s.overrides.faults = []
      }),

    socket: {
      get online() {
        return isSocketOnline()
      },
      get connections() {
        return connectionCount()
      },
      /** Simula queda de conexão (o cliente reconecta sozinho). */
      drop: () => dropConnections(),
      setOnline(online: boolean) {
        updateRuntime((s) => {
          s.overrides.socketOnline = online
        })
        if (!online) dropConnections()
      },
    },

    nft: {
      update: (nftId: string, patch: EditionPatch & { editionId?: string }) =>
        mutate(() => patchEdition(nftId, patch.editionId, patch).version),
      bumpPrice: (nftId: string, editionId: string, deltaEth?: string) =>
        mutate(() => bumpPrice(nftId, editionId, deltaEth).version),
    },

    events: {
      history: () => eventHistory().map((p) => p.event),
      /** Reentrega o último evento (mesmo id) — duplicata. */
      replayLast: () => replayEvent()?.event.id ?? null,
      replay: (eventId: string) => replayEvent(eventId)?.event.id ?? null,
      /** Reentrega a versão mais antiga de um recurso — evento atrasado. */
      replayStale: (resourceId: string) => replayStale(resourceId)?.event.id ?? null,
    },

    session: {
      expireAll: () => mutate(expireAllSessions),
    },

    orders: {
      list: () => getDb().orders.map(({ id, status, version, idempotencyKey }) => ({ id, status, version, idempotencyKey })),
      resolve: (orderId: string, outcome?: 'confirmed' | 'declined') => mutate(() => forceResolve(orderId, outcome)),
      settleDue: () => mutate(settleDueOrders),
    },

    /** Leitura do estado (cópia) para asserções dos testes. */
    snapshot: () => structuredClone(getDb()),
  }
}

export type MockControl = ReturnType<typeof createMockControl>

declare global {
  interface Window {
    __kurioMock?: MockControl
  }
}
