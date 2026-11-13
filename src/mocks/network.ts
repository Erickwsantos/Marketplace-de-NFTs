import { HttpResponse } from 'msw'
import type { ApiRoute } from '@/contracts'
import { getActiveScenario, getRuntime, updateRuntime } from './db/store'
import { createRandom, hashString } from './lib/random'
import { errorResponse } from './responses'
import type { FaultRule, LatencyProfile } from './scenarios'

/** Usa setTimeout real (controlável pelo relógio do Playwright). */
export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Mais longo que o timeout do cliente: a resposta chega depois do abort. */
export const BEYOND_CLIENT_TIMEOUT_MS = 30_000

export function effectiveLatency(): LatencyProfile {
  return getRuntime().overrides.latency ?? getActiveScenario().latency
}

export function effectiveFaults(): FaultRule[] {
  return [...getActiveScenario().faults, ...(getRuntime().overrides.faults ?? [])]
}

function latencyFor(method: string, path: ApiRoute): number {
  const profile = effectiveLatency()
  const counterKey = `${method} ${path}`
  let count = 0
  updateRuntime((state) => {
    count = (state.requestCounters[counterKey] ?? 0) + 1
    state.requestCounters[counterKey] = count
  })

  switch (profile.kind) {
    case 'none':
      return 0
    case 'fixed':
      return profile.ms
    case 'variable': {
      const rng = createRandom(hashString(`${getRuntime().scenarioId}:${counterKey}:${count}`))
      return rng.int(profile.min, profile.max)
    }
    case 'out-of-order':
      if (path !== profile.route || method !== 'GET') return profile.baseMs
      // 1ª, 3ª, 5ª... requisições são lentas; as seguintes respondem antes.
      return count % 2 === 1 ? profile.slowMs : profile.fastMs
  }
}

function takeFault(method: string, path: ApiRoute): FaultRule | null {
  const faults = effectiveFaults()
  for (const [index, rule] of faults.entries()) {
    if (rule.method && rule.method !== method) continue
    if (rule.route !== '*' && rule.route !== path) continue
    const remaining = getRuntime().faultsRemaining[index] ?? rule.times ?? Number.POSITIVE_INFINITY
    if (remaining <= 0) continue
    if (Number.isFinite(remaining)) {
      updateRuntime((state) => {
        state.faultsRemaining[index] = remaining - 1
      })
    }
    return rule
  }
  return null
}

/** Aplica latência e falhas configuradas no cenário. Retorna a resposta de falha, se houver. */
export async function applyNetworkConditions(method: string, path: ApiRoute): Promise<Response | null> {
  const latency = latencyFor(method, path)
  if (latency > 0) await wait(latency)

  const rule = takeFault(method, path)
  if (!rule) return null

  switch (rule.fault.type) {
    case 'network':
      return HttpResponse.error()
    case 'timeout':
      await wait(BEYOND_CLIENT_TIMEOUT_MS)
      return errorResponse('SERVICE_UNAVAILABLE')
    case 'status':
      return errorResponse(rule.fault.code)
  }
}
