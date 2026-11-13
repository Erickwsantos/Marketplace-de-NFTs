import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import { env } from '@/shared/config/env'
import { getActiveScenario, getRuntime } from './db/store'
import { findActiveSession } from './domain/auth'
import { subscribeEvents } from './events'

/**
 * Servidor Socket.IO simulado (MSW + @mswjs/socket.io-binding).
 *
 * Limitações do transporte documentadas em ARCHITECTURE.md:
 * - apenas transporte WebSocket (sem long-polling);
 * - o binding não emite pings do Engine.IO; enviamos o heartbeat ("2")
 *   manualmente para o cliente não encerrar por ping timeout;
 * - sem namespaces/rooms: a entrega privada é filtrada por usuário aqui.
 */
const link = ws.link(env.socketUrl)
const HEARTBEAT_MS = 20_000

type RawClient = Parameters<Parameters<typeof link.addEventListener<'connection'>>[1]>[0]['client']

interface SocketConnection {
  client: RawClient
  io: ReturnType<typeof toSocketIo>
  /** Token recebido no pacote CONNECT (`auth: { token }`). */
  token: string | null
  heartbeat: ReturnType<typeof setInterval>
}

const connections = new Set<SocketConnection>()

export function isSocketOnline(): boolean {
  return getRuntime().overrides.socketOnline ?? getActiveScenario().behavior.socket === 'online'
}

/** Derruba todas as conexões; o socket.io-client reconecta sozinho. */
export function dropConnections() {
  connections.forEach((connection) => connection.client.close())
}

export function connectionCount() {
  return connections.size
}

function readAuthToken(data: unknown): string | null | undefined {
  // Pacote Socket.IO CONNECT do namespace "/": "40" + JSON opcional de auth.
  if (typeof data !== 'string' || !data.startsWith('40')) return undefined
  try {
    const payload = JSON.parse(data.slice(2) || '{}') as { token?: unknown }
    return typeof payload.token === 'string' ? payload.token : null
  } catch {
    return null
  }
}

subscribeEvents(({ event, audience }) => {
  for (const connection of connections) {
    if (audience.userId) {
      // Eventos privados: só para a sessão ativa do dono do recurso.
      const session = findActiveSession(connection.token)
      if (!session || session === 'expired' || session.user.id !== audience.userId) continue
    }
    connection.io.client.emit(event.type, event)
  }
})

export const socketHandlers = [
  link.addEventListener('connection', (connection) => {
    const { client } = connection
    if (!isSocketOnline()) {
      client.close(4000, 'offline')
      return
    }

    const entry: SocketConnection = {
      client,
      io: toSocketIo(connection),
      token: null,
      heartbeat: setInterval(() => client.send('2'), HEARTBEAT_MS),
    }
    connections.add(entry)

    client.addEventListener('message', (event) => {
      const token = readAuthToken(event.data)
      if (token !== undefined) entry.token = token
    })
    client.addEventListener('close', () => {
      clearInterval(entry.heartbeat)
      connections.delete(entry)
    })
  }),
]
