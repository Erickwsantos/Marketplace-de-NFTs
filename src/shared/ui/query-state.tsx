import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { ErrorState } from './primitives'

/**
 * Padroniza os estados de uma consulta: carregamento (skeleton com as
 * dimensões do conteúdo), erro com nova tentativa, vazio e sucesso.
 * `aria-busy` sinaliza atualização em segundo plano.
 */
export function QueryState<T>({
  query,
  skeleton,
  isEmpty,
  empty,
  errorTitle,
  children,
}: {
  query: UseQueryResult<T>
  skeleton: ReactNode
  isEmpty?: (data: T) => boolean
  empty?: ReactNode
  errorTitle?: string
  children: (data: T) => ReactNode
}) {
  if (query.isPending) {
    return (
      <div aria-busy="true" aria-label="Carregando">
        {skeleton}
      </div>
    )
  }
  if (query.isError && !query.data) {
    return <ErrorState error={query.error} title={errorTitle} onRetry={() => void query.refetch()} />
  }
  const data = query.data as T
  if (isEmpty?.(data) && empty) return <>{empty}</>
  return <div aria-busy={query.isFetching || undefined}>{children(data)}</div>
}
