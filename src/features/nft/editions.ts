import { useEffect, useState } from 'react'
import type { Edition } from '@/contracts'
import { announce } from '@/shared/a11y/announcer'
import { formatEth, isEthEqual } from '@/shared/lib/eth'

export type EditionState = 'available' | 'sold_out' | 'unavailable'

/** Estado efetivo da edição: `available` com 0 unidades é tratado como esgotada. */
export function editionState(edition: Edition): EditionState {
  if (edition.status === 'unavailable') return 'unavailable'
  if (edition.status === 'sold_out' || edition.available === 0) return 'sold_out'
  return 'available'
}

/** Quantidade máxima comprável agora (0 = não é possível comprar). */
export function editionMax(edition: Edition): number {
  return editionState(edition) === 'available' ? Math.min(edition.available, edition.maxPerOrder) : 0
}

interface Snapshot {
  id: string
  priceEth: string
  max: number
  state: EditionState
}

export interface EditionNotice {
  seq: number
  message: string
  politeness: 'polite' | 'assertive'
}

function describeChange(prev: Snapshot, next: Snapshot, quantity: number, label: string): Omit<EditionNotice, 'seq'> | null {
  const messages: string[] = []
  let politeness: EditionNotice['politeness'] = 'polite'
  if (!isEthEqual(prev.priceEth, next.priceEth)) {
    messages.push(`O preço da edição ${label} mudou de ${formatEth(prev.priceEth)} para ${formatEth(next.priceEth)}.`)
  }
  if (prev.state === 'available' && next.state !== 'available') {
    messages.push(next.state === 'sold_out' ? `A edição ${label} esgotou.` : `A edição ${label} ficou indisponível.`)
    politeness = 'assertive'
  } else if (prev.state !== 'available' && next.state === 'available') {
    messages.push(`A edição ${label} voltou a ficar disponível.`)
  } else if (next.max > 0 && next.max < prev.max && quantity > next.max) {
    messages.push(`Quantidade ajustada para ${next.max} (disponibilidade atual).`)
  }
  return messages.length ? { message: messages.join(' '), politeness } : null
}

/**
 * Detecta mudanças em tempo real da edição selecionada (o cache é atualizado
 * por eventos Socket.IO). A comparação com a versão anterior é feita durante
 * a renderização (padrão "estado da renderização anterior"), sem useEffect +
 * setState; o efeito apenas anuncia a mensagem para leitores de tela.
 * Trocar de edição não gera aviso (foi ação do próprio colecionador).
 */
export function useEditionChangeNotice(edition: Edition, quantity: number) {
  const snapshot: Snapshot = { id: edition.id, priceEth: edition.priceEth, max: editionMax(edition), state: editionState(edition) }
  const [seen, setSeen] = useState(snapshot)
  const [notice, setNotice] = useState<EditionNotice | null>(null)

  if (
    seen.id !== snapshot.id ||
    seen.priceEth !== snapshot.priceEth ||
    seen.max !== snapshot.max ||
    seen.state !== snapshot.state
  ) {
    setSeen(snapshot)
    if (seen.id !== snapshot.id) {
      setNotice(null)
    } else {
      const change = describeChange(seen, snapshot, quantity, edition.label)
      if (change) setNotice({ ...change, seq: (notice?.seq ?? 0) + 1 })
    }
  }

  useEffect(() => {
    if (notice) announce(notice.message, notice.politeness)
  }, [notice])

  return { notice, dismiss: () => setNotice(null) }
}
