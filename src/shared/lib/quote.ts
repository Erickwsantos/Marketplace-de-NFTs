import type { Quote } from '@/contracts'

/**
 * Duas cotações são equivalentes quando linhas e valores coincidem.
 * Usada pelo servidor simulado (rejeitar cotação desatualizada) e pelo
 * cliente (exigir nova confirmação quando a revalidação muda valores).
 */
export function sameQuoteValues(a: Quote, b: Quote): boolean {
  const lineKey = (q: Quote) => q.lines.map((l) => `${l.itemId}:${l.quantity}:${l.unitPriceEth}`).join('|')
  return (
    a.network === b.network &&
    lineKey(a) === lineKey(b) &&
    a.subtotalEth === b.subtotalEth &&
    a.discountEth === b.discountEth &&
    a.networkFeeEth === b.networkFeeEth &&
    a.totalEth === b.totalEth
  )
}
