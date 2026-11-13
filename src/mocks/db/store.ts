import { DEFAULT_SCENARIO_ID, getScenario, type FaultRule, type LatencyProfile, type Scenario } from '../scenarios'
import { buildSeed, DB_SCHEMA_VERSION } from './seed'
import type { MockDatabase } from './types'

/**
 * Estado do "servidor" simulado. Fica em memória e é espelhado no
 * localStorage para sobreviver a refresh. `resetDb` restaura integralmente
 * o cenário a partir das fixtures.
 */
const DB_KEY = 'kurio:mock:db'
const RUNTIME_KEY = 'kurio:mock:runtime'

export interface RuntimeState {
  scenarioId: string
  /** Falhas restantes por regra (índice na lista efetiva de faults). */
  faultsRemaining: Record<number, number>
  /** Contador por rota: alimenta a latência semeada e o cenário fora de ordem. */
  requestCounters: Record<string, number>
  orderTimeoutConsumed: boolean
  checkoutTwistConsumed: boolean
  /** Sobrescritas aplicadas pelo painel de dev ou pelos testes. */
  overrides: { latency?: LatencyProfile; faults?: FaultRule[]; socketOnline?: boolean }
}

let db: MockDatabase | null = null
let runtime: RuntimeState = freshRuntime(DEFAULT_SCENARIO_ID)

function freshRuntime(scenarioId: string): RuntimeState {
  return {
    scenarioId,
    faultsRemaining: {},
    requestCounters: {},
    orderTimeoutConsumed: false,
    checkoutTwistConsumed: false,
    overrides: {},
  }
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Persistência é best-effort: sem ela o cenário só não sobrevive ao refresh.
  }
}

export async function initDb(requestedScenario?: string | null): Promise<void> {
  const stored = read<MockDatabase>(DB_KEY)
  const storedRuntime = read<RuntimeState>(RUNTIME_KEY)
  const scenarioId = getScenario(requestedScenario ?? storedRuntime?.scenarioId ?? DEFAULT_SCENARIO_ID).id
  const reusable =
    stored &&
    storedRuntime &&
    stored.schemaVersion === DB_SCHEMA_VERSION &&
    stored.scenarioId === scenarioId &&
    (!requestedScenario || requestedScenario === storedRuntime.scenarioId)

  if (reusable) {
    db = stored
    runtime = storedRuntime
    return
  }
  await resetDb(scenarioId)
}

export async function resetDb(scenarioId: string = runtime.scenarioId): Promise<void> {
  const id = getScenario(scenarioId).id
  db = await buildSeed(id)
  runtime = freshRuntime(id)
  persist()
}

export function getDb(): MockDatabase {
  if (!db) throw new Error('Mock DB não inicializado')
  return db
}

export function getRuntime(): RuntimeState {
  return runtime
}

export function updateRuntime(patch: (state: RuntimeState) => void) {
  patch(runtime)
  write(RUNTIME_KEY, runtime)
}

export function getActiveScenario(): Scenario {
  return getScenario(runtime.scenarioId)
}

export function persist() {
  if (db) write(DB_KEY, db)
  write(RUNTIME_KEY, runtime)
}

export function nextId(prefix: string): string {
  const database = getDb()
  database.sequence += 1
  return `${prefix}_${database.sequence.toString(36)}`
}

export const nowIso = () => new Date().toISOString()
