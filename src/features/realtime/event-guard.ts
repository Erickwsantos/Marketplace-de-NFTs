import type { RealtimeEvent } from '@/contracts'

/**
 * Garante idempotência e ordem no consumo de eventos:
 * - duplicata (id já processado) → ignorada;
 * - evento antigo (versão ≤ última aplicada ao recurso) → ignorado.
 * Assim um evento nunca regride um estado mais recente nem reaplica efeitos.
 */
export function createEventGuard(capacity = 500) {
  const seenIds = new Set<string>()
  const versions = new Map<string, number>()

  const key = (event: RealtimeEvent) => `${event.resource.type}:${event.resource.id}`

  return {
    accept(event: RealtimeEvent): boolean {
      if (seenIds.has(event.id)) return false
      seenIds.add(event.id)
      if (seenIds.size > capacity) seenIds.delete(seenIds.values().next().value!)

      const current = versions.get(key(event)) ?? 0
      if (event.version <= current) return false
      versions.set(key(event), event.version)
      return true
    },
    /** Versão conhecida via REST: eventos anteriores a ela passam a ser antigos. */
    observe(resourceType: RealtimeEvent['resource']['type'], resourceId: string, version: number) {
      const k = `${resourceType}:${resourceId}`
      versions.set(k, Math.max(versions.get(k) ?? 0, version))
    },
    reset() {
      seenIds.clear()
      versions.clear()
    },
  }
}
export type EventGuard = ReturnType<typeof createEventGuard>
