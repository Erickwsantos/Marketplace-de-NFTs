/** Configuração lida das variáveis de ambiente (ver .env.example). */
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? 'wss://realtime.nft-marketplace.mock',
  mocksEnabled: import.meta.env.VITE_ENABLE_MOCKS === 'true',
  mockScenario: import.meta.env.VITE_MOCK_SCENARIO ?? 'default',
  /** Timeout do Axios: o cenário "order-timeout" estoura este limite. */
  requestTimeoutMs: Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS ?? 8000),
} as const
