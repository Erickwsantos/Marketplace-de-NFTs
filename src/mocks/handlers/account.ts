import {
  AVATAR_MAX_BYTES,
  AVATAR_TYPES,
  changePasswordInputSchema,
  connectWalletInputSchema,
  createWalletInputSchema,
  profileInputSchema,
  updateWalletInputSchema,
  type WalletConnectionResponse,
  type WalletList,
} from '@/contracts'
import { getActiveScenario, getDb, nextId, nowIso } from '../db/store'
import type { SessionRecord, WalletRecord } from '../db/types'
import { assertUniqueIdentity } from '../domain/auth'
import { toUser, toWallet } from '../domain/mappers'
import { route } from '../http'
import { hashPassword, randomToken } from '../lib/crypto'
import { created, MockHttpError, noContent, parseJson } from '../responses'

async function toDataUrl(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return `data:${file.type};base64,${btoa(binary)}`
}

function connectionOf(session: SessionRecord): WalletConnectionResponse {
  const record = getDb().connections.find((c) => c.sessionToken === session.token)
  return {
    connection: record
      ? {
          walletId: record.walletId,
          provider: record.provider,
          network: record.network,
          status: 'connected',
          connectedAt: record.connectedAt,
        }
      : null,
  }
}

export const profileHandlers = [
  route('GET', '/profile', 'required', ({ user }) => toUser(user)),

  route('PATCH', '/profile', 'required', async ({ request, user }) => {
    const input = await parseJson(request, profileInputSchema)
    assertUniqueIdentity(input, user.id)
    Object.assign(user, input)
    return toUser(user)
  }),

  route('PUT', '/profile/avatar', 'required', async ({ request, user }) => {
    const form = await request.formData().catch(() => null)
    const file = form?.get('avatar')
    if (!(file instanceof File)) {
      throw new MockHttpError('VALIDATION_FAILED', undefined, { avatar: 'Selecione uma imagem' })
    }
    if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
      throw new MockHttpError('VALIDATION_FAILED', undefined, { avatar: 'Use PNG, JPG ou WEBP' })
    }
    if (file.size > AVATAR_MAX_BYTES) {
      throw new MockHttpError('VALIDATION_FAILED', undefined, { avatar: 'A imagem deve ter até 2 MB' })
    }
    user.avatarUrl = await toDataUrl(file)
    return toUser(user)
  }),

  route('DELETE', '/profile/avatar', 'required', ({ user }) => {
    user.avatarUrl = null
    return toUser(user)
  }),

  route('POST', '/profile/password', 'required', async ({ request, user, session }) => {
    const { currentPassword, newPassword } = await parseJson(request, changePasswordInputSchema)
    if ((await hashPassword(currentPassword, user.password.salt)) !== user.password.hash) {
      throw new MockHttpError('VALIDATION_FAILED', undefined, { currentPassword: 'Senha atual incorreta' })
    }
    if (currentPassword === newPassword) {
      throw new MockHttpError('VALIDATION_FAILED', undefined, { newPassword: 'A nova senha deve ser diferente da atual' })
    }
    const salt = randomToken(12)
    user.password = { salt, hash: await hashPassword(newPassword, salt) }
    // Outras sessões do usuário são encerradas; a atual continua válida.
    getDb().sessions.forEach((s) => {
      if (s.userId === user.id && s.token !== session.token) s.revoked = true
    })
    return noContent()
  }),
]

function findUserWallet(userId: string, walletId: string): WalletRecord {
  const wallet = getDb().wallets.find((w) => w.id === walletId)
  if (!wallet) throw new MockHttpError('NOT_FOUND', 'Carteira não encontrada.')
  if (wallet.userId !== userId) throw new MockHttpError('FORBIDDEN')
  return wallet
}

export const walletHandlers = [
  route('GET', '/wallets', 'required', ({ user }): WalletList => ({
    items: getDb()
      .wallets.filter((w) => w.userId === user.id)
      .sort((a, b) => a.role.localeCompare(b.role))
      .map(toWallet),
  })),

  route('POST', '/wallets', 'required', async ({ request, user }) => {
    const input = await parseJson(request, createWalletInputSchema)
    const db = getDb()
    if (db.wallets.some((w) => w.userId === user.id && w.role === input.role)) {
      throw new MockHttpError('VALIDATION_FAILED', 'Você já cadastrou esta carteira. Edite a existente.', {
        role: 'Carteira já cadastrada',
      })
    }
    const wallet: WalletRecord = {
      id: nextId('wallet'),
      userId: user.id,
      role: input.role,
      profile: input.profile,
      version: 1,
      updatedAt: nowIso(),
    }
    db.wallets.push(wallet)
    return created(toWallet(wallet))
  }),

  // Antes de "/wallets/:walletId".
  route('GET', '/wallets/connection', 'required', ({ session }) => connectionOf(session)),

  route('DELETE', '/wallets/connection', 'required', ({ session }) => {
    const db = getDb()
    db.connections = db.connections.filter((c) => c.sessionToken !== session.token)
    return connectionOf(session)
  }),

  route('PATCH', '/wallets/:walletId', 'required', async ({ request, params, user }) => {
    const wallet = findUserWallet(user.id, String(params.walletId))
    wallet.profile = (await parseJson(request, updateWalletInputSchema)).profile
    wallet.version += 1
    wallet.updatedAt = nowIso()
    return toWallet(wallet)
  }),

  route('POST', '/wallets/:walletId/connect', 'required', async ({ request, params, user, session }) => {
    const wallet = findUserWallet(user.id, String(params.walletId))
    const input = await parseJson(request, connectWalletInputSchema)
    if (getActiveScenario().behavior.walletConnect === 'reject') throw new MockHttpError('WALLET_REJECTED')
    const db = getDb()
    db.connections = db.connections.filter((c) => c.sessionToken !== session.token)
    db.connections.push({ sessionToken: session.token, walletId: wallet.id, ...input, connectedAt: nowIso() })
    return connectionOf(session)
  }),
]
