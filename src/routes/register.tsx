import { createFileRoute } from '@tanstack/react-router'
import { AuthPage } from '@/features/auth/auth-page'
import { authSearchSchema } from '@/features/auth/redirect'

export const Route = createFileRoute('/register')({
  validateSearch: authSearchSchema,
  head: () => ({ meta: [{ title: 'Criar conta | Kurio' }] }),
  component: () => <AuthPage mode="register" />,
})
