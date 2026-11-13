import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { toast } from 'sonner'
import { nftUpdatedEventSchema, orderUpdatedEventSchema, REALTIME_EVENTS } from '@/contracts'
import { useAuth } from '@/features/auth/session'
import { announce } from '@/shared/a11y/announcer'
import { env } from '@/shared/config/env'
import { applyNftUpdated, applyOrderUpdated, reconcileAfterReconnect } from './apply'
import { createEventGuard } from './event-guard'

export type RealtimeStatus = 'connecting' | 'connected' | 'reconnecting'
const RealtimeContext = createContext<RealtimeStatus>('connecting')
export const useRealtimeStatus = () => useContext(RealtimeContext)

/**
 * Uma conexão Socket.IO por sessão. Trocar de usuário (token) encerra a
 * conexão anterior e seus listeners — eventos de uma sessão nunca chegam
 * ao cache de outra. A cada reconexão, os recursos ativos são reconciliados
 * com a API REST.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { token, userId } = useAuth()
  const [status, setStatus] = useState<RealtimeStatus>('connecting')

  useEffect(() => {
    // Com token, aguarda a sessão ser validada para saber o userId.
    if (token && !userId) return
    const guard = createEventGuard()
    const socket = io(env.socketUrl, {
      transports: ['websocket'],
      auth: (cb) => cb(token ? { token } : {}),
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Falha de conexão detectada em 5 s (padrão 20 s): o aviso de reconexão aparece rápido.
      timeout: 5000,
    })
    let connectedBefore = false

    socket.on('connect', () => {
      setStatus('connected')
      if (connectedBefore) {
        reconcileAfterReconnect(queryClient)
        announce('Conexão em tempo real restabelecida.')
      }
      connectedBefore = true
    })
    socket.on('disconnect', () => setStatus('reconnecting'))
    socket.on('connect_error', () => setStatus('reconnecting'))

    socket.on(REALTIME_EVENTS.nftUpdated, (payload: unknown) => {
      const parsed = nftUpdatedEventSchema.safeParse(payload)
      if (!parsed.success || !guard.accept(parsed.data)) return
      const { affectedCartItems } = applyNftUpdated(queryClient, parsed.data)
      if (affectedCartItems.length > 0) {
        const message = `Preço ou disponibilidade atualizados no carrinho: ${affectedCartItems.join(', ')}.`
        toast.info(message, { id: `cart-change-${parsed.data.resource.id}` })
        announce(message)
      }
    })

    socket.on(REALTIME_EVENTS.orderUpdated, (payload: unknown) => {
      const parsed = orderUpdatedEventSchema.safeParse(payload)
      if (!userId || !parsed.success || !guard.accept(parsed.data)) return
      applyOrderUpdated(queryClient, userId, parsed.data)
    })

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      setStatus('connecting')
    }
  }, [token, userId, queryClient])

  return <RealtimeContext value={status}>{children}</RealtimeContext>
}
