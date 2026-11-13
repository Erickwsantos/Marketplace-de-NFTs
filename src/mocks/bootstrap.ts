import { env } from '@/shared/config/env'

/** Parâmetros de URL aceitos para escolher/reiniciar cenário (removidos após a leitura). */
export const SCENARIO_PARAM = 'mock-scenario'
export const RESET_PARAM = 'mock-reset'

/**
 * Ativa a camada de mocks antes do primeiro render. Carregada via import
 * dinâmico apenas quando VITE_ENABLE_MOCKS=true (chunk separado).
 *
 * Seleção de cenário: `?mock-scenario=<id>` (persiste entre refreshes) e
 * `?mock-reset=1` (restaura o cenário a partir das fixtures).
 */
export async function enableMocking(): Promise<void> {
  const url = new URL(window.location.href)
  const requested = url.searchParams.get(SCENARIO_PARAM)
  const reset = url.searchParams.has(RESET_PARAM)
  if (requested || reset) {
    url.searchParams.delete(SCENARIO_PARAM)
    url.searchParams.delete(RESET_PARAM)
    window.history.replaceState(window.history.state, '', url)
  }

  const [{ initDb, resetDb, getRuntime }, { worker }, { createMockControl }, { settleDueOrders }] = await Promise.all([
    import('./db/store'),
    import('./browser'),
    import('./control'),
    import('./domain/orders'),
  ])

  await initDb(requested ?? (hasStoredState() ? null : env.mockScenario))
  if (reset) await resetDb(requested ?? getRuntime().scenarioId)
  settleDueOrders()

  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    // Em produção o SW do PWA incorpora o worker do MSW (um único SW por escopo).
    serviceWorker: { url: import.meta.env.PROD ? '/sw.js' : '/mockServiceWorker.js' },
  })
  window.__kurioMock = createMockControl()
}

function hasStoredState(): boolean {
  try {
    return localStorage.getItem('kurio:mock:runtime') !== null
  } catch {
    return false
  }
}
