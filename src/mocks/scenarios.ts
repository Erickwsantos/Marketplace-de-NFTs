import type { ApiErrorCode, ApiRoute } from '@/contracts'

export type Fault =
  | { type: 'status'; code: ApiErrorCode }
  /** Falha de conexão (HttpResponse.error → Network Error no Axios). */
  | { type: 'network' }
  /** Resposta nunca chega a tempo: o cliente atinge seu timeout. */
  | { type: 'timeout' }

export interface FaultRule {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  route: ApiRoute | '*'
  fault: Fault
  /** Quantas vezes a falha ocorre antes de o endpoint se recuperar (omitido = sempre). */
  times?: number
}

export type LatencyProfile =
  | { kind: 'none' }
  | { kind: 'fixed'; ms: number }
  /** Latência variável com PRNG semeado: reproduzível entre execuções. */
  | { kind: 'variable'; min: number; max: number }
  /** Requisições alternam lenta/rápida na rota: a resposta antiga chega depois da nova. */
  | { kind: 'out-of-order'; route: ApiRoute; slowMs: number; fastMs: number; baseMs: number }

export interface ScenarioBehavior {
  sessionTtlMs: number
  payment: { outcome: 'confirmed' | 'declined'; delayMs: number }
  walletConnect: 'approve' | 'reject'
  /** Mudança aplicada ao primeiro envio do pedido (simula concorrência). */
  checkoutTwist: 'none' | 'price-change' | 'sold-out'
  /** A primeira tentativa de criar pedido cria o pedido, mas a resposta não chega a tempo. */
  orderTimeout: boolean
  socket: 'online' | 'offline'
  emptyCatalog: boolean
}

export interface Scenario {
  id: string
  label: string
  description: string
  latency: LatencyProfile
  faults: FaultRule[]
  behavior: ScenarioBehavior
}

const DEFAULT_BEHAVIOR: ScenarioBehavior = {
  sessionTtlMs: 2 * 60 * 60 * 1000,
  payment: { outcome: 'confirmed', delayMs: 2500 },
  walletConnect: 'approve',
  checkoutTwist: 'none',
  orderTimeout: false,
  socket: 'online',
  emptyCatalog: false,
}

const DEFAULT_LATENCY: LatencyProfile = { kind: 'variable', min: 60, max: 220 }

const scenario = (
  id: string,
  label: string,
  description: string,
  overrides: { latency?: LatencyProfile; faults?: FaultRule[]; behavior?: Partial<ScenarioBehavior> } = {},
): Scenario => ({
  id,
  label,
  description,
  latency: overrides.latency ?? DEFAULT_LATENCY,
  faults: overrides.faults ?? [],
  behavior: { ...DEFAULT_BEHAVIOR, ...overrides.behavior },
})

export const SCENARIOS = [
  scenario('default', 'Padrão', 'Dados completos, latência curta e pagamento aprovado.'),
  scenario('instant', 'Sem latência', 'Igual ao padrão, sem atraso de rede.', { latency: { kind: 'none' } }),
  scenario('empty', 'Catálogo vazio', 'A busca do catálogo não retorna resultados.', {
    behavior: { emptyCatalog: true },
  }),
  scenario('slow', 'Rede lenta', 'Todas as respostas levam 2,5 s (skeletons visíveis).', {
    latency: { kind: 'fixed', ms: 2500 },
  }),
  scenario('variable-latency', 'Latência variável', 'Respostas entre 0,2 s e 2,5 s (sementes fixas).', {
    latency: { kind: 'variable', min: 200, max: 2500 },
  }),
  scenario('out-of-order', 'Respostas fora de ordem', 'Consultas do catálogo alternam lenta/rápida.', {
    latency: { kind: 'out-of-order', route: '/nfts', slowMs: 1800, fastMs: 150, baseMs: 80 },
  }),
  scenario('offline', 'Sem conexão', 'Toda requisição falha por conexão e o socket não conecta.', {
    faults: [{ route: '*', fault: { type: 'network' } }],
    behavior: { socket: 'offline' },
  }),
  scenario('server-error', 'Falhas HTTP 5xx', 'Catálogo responde 500 três vezes (esgota os retries automáticos e exibe erro) e detalhe 503 uma vez; depois recupera.', {
    faults: [
      { method: 'GET', route: '/nfts', fault: { type: 'status', code: 'INTERNAL_ERROR' }, times: 3 },
      { method: 'GET', route: '/nfts/:nftId', fault: { type: 'status', code: 'SERVICE_UNAVAILABLE' }, times: 1 },
    ],
  }),
  scenario('favorite-failure', 'Falha ao favoritar', 'A primeira inclusão de favorito falha (rollback otimista).', {
    faults: [{ method: 'PUT', route: '/favorites/:nftId', fault: { type: 'status', code: 'SERVICE_UNAVAILABLE' }, times: 1 }],
  }),
  scenario('session-expired', 'Sessão expira', 'Sessões expiram 45 s após o login.', {
    behavior: { sessionTtlMs: 45_000 },
  }),
  scenario('price-change', 'Preço alterado no checkout', 'Ao enviar o pedido, o preço de um item muda.', {
    behavior: { checkoutTwist: 'price-change' },
  }),
  scenario('sold-out', 'Edição esgotada no checkout', 'Ao enviar o pedido, uma edição esgota.', {
    behavior: { checkoutTwist: 'sold-out' },
  }),
  scenario('order-timeout', 'Timeout após criar pedido', 'O pedido é criado, mas a primeira resposta expira; o reenvio recupera o mesmo pedido.', {
    behavior: { orderTimeout: true },
  }),
  scenario('payment-declined', 'Pagamento recusado', 'A simulação recusa o pagamento.', {
    behavior: { payment: { outcome: 'declined', delayMs: 2500 } },
  }),
  scenario('slow-payment', 'Pagamento demorado', 'O pedido fica pendente por 20 s (desconexão e retomada).', {
    behavior: { payment: { outcome: 'confirmed', delayMs: 20_000 } },
  }),
  scenario('wallet-rejected', 'Carteira recusa conexão', 'A conexão da carteira é recusada.', {
    behavior: { walletConnect: 'reject' },
  }),
] as const satisfies readonly Scenario[]

export type ScenarioId = (typeof SCENARIOS)[number]['id']
export const DEFAULT_SCENARIO_ID: ScenarioId = 'default'

export function getScenario(id: string | null | undefined): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0]
}
