import { createFileRoute } from '@tanstack/react-router'
import { AuthPage } from '@/features/auth/auth-page'
import { authSearchSchema } from '@/features/auth/redirect'

export const Route = createFileRoute('/login')({
  validateSearch: authSearchSchema,
  head: () => ({ meta: [{ title: 'Entrar | Kurio' }] }),
  component: () => <AuthPage mode="login" />,
})
