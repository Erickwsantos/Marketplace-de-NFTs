import { loginInputSchema, registerInputSchema, type CurrentSession } from '@/contracts'
import type { UserRecord } from '../db/types'
import { login, logout, register } from '../domain/auth'
import { mergeGuestCart, resolveCart } from '../domain/cart'
import { toUser } from '../domain/mappers'
import { route } from '../http'
import { created, noContent, parseJson } from '../responses'

/** Ao autenticar, os itens do visitante (X-Cart-Id) migram para o carrinho do usuário. */
function adoptGuestCart(user: UserRecord, guestCartId: string | null) {
  if (guestCartId) mergeGuestCart(resolveCart(user, null), guestCartId)
}

export const authHandlers = [
  route('POST', '/auth/register', 'none', async ({ request, guestCartId }) => {
    const { session, user } = await register(await parseJson(request, registerInputSchema))
    adoptGuestCart(user, guestCartId)
    return created(session)
  }),

  route('POST', '/auth/login', 'none', async ({ request, guestCartId }) => {
    const { session, user } = await login(await parseJson(request, loginInputSchema))
    adoptGuestCart(user, guestCartId)
    return session
  }),

  route('GET', '/auth/session', 'required', ({ session, user }): CurrentSession => ({
    user: toUser(user),
    expiresAt: session.expiresAt,
  })),

  route('POST', '/auth/logout', 'required', ({ session }) => {
    logout(session)
    return noContent()
  }),
]
