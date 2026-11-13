import { local, STORAGE_KEYS } from '@/shared/lib/storage'

/**
 * Último pedido enviado e ainda não finalizado, por usuário. Permite
 * retomar o acompanhamento após refresh/reconexão sem criar outra compra.
 */
interface PendingOrderRef {
  userId: string
  orderId: string
}

export const pendingOrder = {
  get(userId: string): string | null {
    const ref = local.get<PendingOrderRef>(STORAGE_KEYS.pendingOrder)
    return ref?.userId === userId ? ref.orderId : null
  },
  set(userId: string, orderId: string) {
    local.set(STORAGE_KEYS.pendingOrder, { userId, orderId })
  },
  clear(orderId?: string) {
    const ref = local.get<PendingOrderRef>(STORAGE_KEYS.pendingOrder)
    if (!orderId || ref?.orderId === orderId) local.remove(STORAGE_KEYS.pendingOrder)
  },
}
