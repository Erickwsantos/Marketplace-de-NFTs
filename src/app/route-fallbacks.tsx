import { Link, type ErrorComponentProps } from '@tanstack/react-router'
import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { SearchXIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { EmptyState, ErrorState } from '@/shared/ui/primitives'

export function RouteNotFound({ title = 'Página não encontrada', description }: { title?: string; description?: string }) {
  return (
    <div className="container-page py-16">
      <title>{`${title} | Kurio`}</title>
      <EmptyState
        icon={<SearchXIcon className="size-10 text-primary" aria-hidden />}
        title={title}
        description={description ?? 'O endereço acessado não existe ou foi removido.'}
        action={
          <Button asChild>
            <Link to="/">Voltar ao início</Link>
          </Button>
        }
      />
    </div>
  )
}

export function RouteError({ error, reset }: ErrorComponentProps) {
  const { reset: resetQueries } = useQueryErrorResetBoundary()
  return (
    <div className="container-page py-16">
      <ErrorState
        error={error}
        title="Não foi possível carregar esta página"
        onRetry={() => {
          resetQueries()
          reset()
        }}
      />
    </div>
  )
}
