import { REALTIME_EVENTS, type NftUpdatedEvent, type OrderUpdatedEvent, type RealtimeEvent } from '@/contracts'
import { getDb, nowIso } from './db/store'
import type { NftRecord, OrderRecord } from './db/types'
import { toNftSummary, toOrder } from './domain/mappers'

/**
 * Barramento de eventos do servidor simulado. Toda mutação de domínio
 * publica aqui; o servidor Socket.IO mockado assina e entrega aos clientes.
 * `audience.userId` restringe eventos privados ao dono do recurso.
 */
export interface PublishedEvent {
  event: RealtimeEvent
  audience: { userId: string | null }
}
type Listener = (published: PublishedEvent) => void

const listeners = new Set<Listener>()
const history: PublishedEvent[] = []
const HISTORY_LIMIT = 100

export function subscribeEvents(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function dispatch(published: PublishedEvent) {
  listeners.forEach((listener) => listener(published))
}

function publish(published: PublishedEvent) {
  history.push(published)
  if (history.length > HISTORY_LIMIT) history.shift()
  dispatch(published)
}

function nextEventId(): string {
  const db = getDb()
  db.eventSequence += 1
  return `evt_${db.eventSequence.toString().padStart(6, '0')}`
}

export function publishNftUpdated(nft: NftRecord) {
  const summary = toNftSummary(nft)
  const event: NftUpdatedEvent = {
    id: nextEventId(),
    type: REALTIME_EVENTS.nftUpdated,
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    occurredAt: nowIso(),
    data: {
      priceEth: summary.priceEth,
      compareAtPriceEth: summary.compareAtPriceEth,
      defaultEditionId: summary.defaultEditionId,
      available: summary.available,
      editions: nft.editions.map(({ id, priceEth, available, status }) => ({ id, priceEth, available, status })),
    },
  }
  publish({ event, audience: { userId: null } })
}

export function publishOrderUpdated(order: OrderRecord) {
  const event: OrderUpdatedEvent = {
    id: nextEventId(),
    type: REALTIME_EVENTS.orderUpdated,
    resource: { type: 'order', id: order.id },
    version: order.version,
    occurredAt: nowIso(),
    data: toOrder(order),
  }
  publish({ event, audience: { userId: order.userId } })
}

/** Reenvia um evento já entregue (mesmo id): exercita a deduplicação no cliente. */
export function replayEvent(eventId?: string): PublishedEvent | null {
  const target = eventId ? history.find((p) => p.event.id === eventId) : history.at(-1)
  if (!target) return null
  dispatch(target)
  return target
}

/** Reenvia o evento mais antigo de um recurso: exercita o descarte por versão. */
export function replayStale(resourceId: string): PublishedEvent | null {
  const target = history.find((p) => p.event.resource.id === resourceId)
  if (!target) return null
  // Novo id, versão antiga: não é duplicata, é evento atrasado.
  const stale = { ...target, event: { ...target.event, id: nextEventId() } } as PublishedEvent
  dispatch(stale)
  return stale
}

export function eventHistory(): readonly PublishedEvent[] {
  return history
}
