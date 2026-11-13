/**
 * Subconjunto tipado da API de controle do servidor simulado
 * (implementação em src/mocks/control.ts) usada pelos testes.
 */
interface KurioMockControl {
  scenarioId: string
  reset(scenarioId?: string): Promise<void>
  setLatency(latency: { kind: 'none' } | { kind: 'fixed'; ms: number } | null): void
  socket: { online: boolean; connections: number; drop(): void; setOnline(online: boolean): void }
  nft: {
    update(nftId: string, patch: { editionId?: string; priceEth?: string; available?: number }): number
    bumpPrice(nftId: string, editionId: string, deltaEth?: string): number
  }
  events: {
    history(): Array<{ id: string; type: string; version: number; resource: { type: string; id: string } }>
    replayLast(): string | null
    replay(eventId: string): string | null
    replayStale(resourceId: string): string | null
  }
  session: { expireAll(): void }
  orders: {
    list(): Array<{ id: string; status: string; version: number; idempotencyKey: string }>
    resolve(orderId: string, outcome?: 'confirmed' | 'declined'): void
    settleDue(): void
  }
  snapshot(): {
    orders: Array<{ id: string; status: string; userId: string }>
    carts: Array<{ userId: string | null; items: Array<{ nftId: string; quantity: number }> }>
    favorites: Record<string, string[]>
    users: Array<{ id: string; email: string; displayName: string; avatarUrl: string | null }>
    wallets: Array<{ id: string; userId: string; role: string; profile: { address: string; nickname: string } }>
    sessions: Array<{ userId: string; revoked: boolean; expiresAt: string }>
  }
}

interface Window {
  __kurioMock?: KurioMockControl
}
