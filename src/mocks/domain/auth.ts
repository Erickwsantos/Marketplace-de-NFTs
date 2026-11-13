import type { LoginInput, RegisterInput, Session } from '@/contracts'
import { API_HEADERS } from '@/contracts'
import { getActiveScenario, getDb, nextId, nowIso } from '../db/store'
import type { SessionRecord, UserRecord } from '../db/types'
import { hashPassword, randomToken } from '../lib/crypto'
import { MockHttpError } from '../responses'
import { toUser } from './mappers'

const RESERVED_USERNAMES = ['admin', 'kurio', 'suporte', 'root']

export function readBearer(request: Request): string | null {
  const header = request.headers.get(API_HEADERS.authorization)
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}

/** Valida o token de uma requisição. Usado também pelo servidor de socket. */
export function findActiveSession(token: string | null): { session: SessionRecord; user: UserRecord } | 'expired' | null {
  if (!token) return null
  const db = getDb()
  const session = db.sessions.find((s) => s.token === token && !s.revoked)
  if (!session) return null
  if (Date.parse(session.expiresAt) <= Date.now()) return 'expired'
  const user = db.users.find((u) => u.id === session.userId)
  return user ? { session, user } : null
}

export function resolveSession(
  request: Request,
  mode: 'required' | 'optional' | 'none',
): { session: SessionRecord | null; user: UserRecord | null } {
  if (mode === 'none') return { session: null, user: null }
  const token = readBearer(request)
  const result = findActiveSession(token)

  if (result === 'expired') {
    // Mesmo em rotas opcionais, um token vencido é sinalizado: o cliente
    // precisa saber que a sessão acabou (e não tratar como visitante).
    throw new MockHttpError('SESSION_EXPIRED')
  }
  if (!result) {
    if (mode === 'required' || token) throw new MockHttpError('UNAUTHENTICATED')
    return { session: null, user: null }
  }
  return result
}

function createSession(user: UserRecord): Session {
  const now = Date.now()
  const record: SessionRecord = {
    token: randomToken(),
    userId: user.id,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + getActiveScenario().behavior.sessionTtlMs).toISOString(),
    revoked: false,
  }
  getDb().sessions.push(record)
  return { token: record.token, expiresAt: record.expiresAt, user: toUser(user) }
}

export async function login(input: LoginInput): Promise<{ session: Session; user: UserRecord }> {
  const user = getDb().users.find((u) => u.email.toLowerCase() === input.email.toLowerCase())
  const hash = user ? await hashPassword(input.password, user.password.salt) : null
  if (!user || hash !== user.password.hash) throw new MockHttpError('INVALID_CREDENTIALS')
  return { session: createSession(user), user }
}

export function assertUniqueIdentity(
  { email, username }: { email?: string; username?: string },
  exceptUserId?: string,
) {
  const db = getDb()
  const others = db.users.filter((u) => u.id !== exceptUserId)
  if (username && RESERVED_USERNAMES.includes(username.toLowerCase())) {
    throw new MockHttpError('VALIDATION_FAILED', undefined, { username: 'Este nome de usuário é reservado' })
  }
  if (email && others.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new MockHttpError('EMAIL_TAKEN', undefined, { email: 'Este e-mail já está cadastrado' })
  }
  if (username && others.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new MockHttpError('USERNAME_TAKEN', undefined, { username: 'Este nome de usuário já está em uso' })
  }
}

export async function register(input: RegisterInput): Promise<{ session: Session; user: UserRecord }> {
  assertUniqueIdentity(input)
  const salt = randomToken(12)
  const user: UserRecord = {
    id: nextId('user'),
    username: input.username,
    displayName: input.username,
    email: input.email,
    avatarUrl: null,
    ensName: null,
    walletNickname: null,
    createdAt: nowIso(),
    password: { salt, hash: await hashPassword(input.password, salt) },
  }
  getDb().users.push(user)
  return { session: createSession(user), user }
}

export function logout(session: SessionRecord) {
  session.revoked = true
  const db = getDb()
  db.connections = db.connections.filter((c) => c.sessionToken !== session.token)
}

/** Usado pelo painel de dev e testes: expira todas as sessões ativas. */
export function expireAllSessions() {
  const now = nowIso()
  getDb().sessions.forEach((s) => {
    if (!s.revoked) s.expiresAt = now
  })
}
