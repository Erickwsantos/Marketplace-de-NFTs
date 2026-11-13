import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { toast } from 'sonner'
import { announce } from '@/shared/a11y/announcer'
import { sessionStore } from '@/shared/api/session-store'
import { isPrivatePath } from './redirect'
import { clearSessionScopedData } from './session'


/**
 * Trata expiração da sessão em qualquer ponto da navegação:
 * - limpa dados privados e encerra o socket (via troca de token);
 * - em rota privada, leva ao login preservando a URL para retomada
 *   (o rascunho do checkout fica no sessionStorage);
 * - em rota pública, apenas avisa.
 * Também expira localmente quando o prazo da sessão vence.
 */
export function SessionWatcher() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const href = useRouterState({ select: (s) => s.location.href })
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(
    () =>
      sessionStore.subscribe((event) => {
        if (event !== 'expired') return
        clearSessionScopedData(queryClient)
        const message = 'Sua sessão expirou. Entre novamente para continuar de onde parou.'
        announce(message, 'assertive')
        if (isPrivatePath(pathname)) {
          void navigate({ to: '/login', search: { redirect: href, reason: 'expired' } })
        } else {
          toast.warning(message, { id: 'session-expired' })
        }
      }),
    [queryClient, navigate, href, pathname],
  )

  useEffect(() => {
    const check = () => {
      const current = sessionStore.get()
      if (current && Date.parse(current.expiresAt) <= Date.now()) sessionStore.expire()
    }
    const timer = setInterval(check, 15_000)
    return () => clearInterval(timer)
  }, [])

  return null
}
