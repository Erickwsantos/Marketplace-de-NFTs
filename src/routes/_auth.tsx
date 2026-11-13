import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { sessionQuery } from '@/features/auth/api'
import { isApiError } from '@/shared/api/errors'
import { sessionStore } from '@/shared/api/session-store'

/**
 * Layout sem caminho que protege checkout, pedidos, perfil, carteiras e
 * favoritos. Sem sessão válida → login com `redirect` para retomar o fluxo.
 */
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location }) => {
    const token = sessionStore.token()
    if (!token) throw redirect({ to: '/login', search: { redirect: location.href } })
    try {
      const session = await context.queryClient.ensureQueryData(sessionQuery(token))
      if (!session) throw redirect({ to: '/login', search: { redirect: location.href } })
      return { user: session.user }
    } catch (error) {
      if (isApiError(error, 'SESSION_EXPIRED', 'UNAUTHENTICATED')) {
        throw redirect({ to: '/login', search: { redirect: location.href, reason: 'expired' } })
      }
      throw error
    }
  },
  component: Outlet,
})
