import { MutationCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toApiError, type ApiError } from '@/shared/api/errors'

/**
 * Política de cache, retry e sincronização (documentada em ARCHITECTURE.md):
 * - staleTime 30 s: navegação entre telas reaproveita dados sem piscar;
 *   eventos Socket.IO e invalidações mantêm o cache atualizado.
 * - retry só para falhas transitórias (rede, timeout, 5xx), até 2 vezes com
 *   backoff exponencial. Erros 4xx são definitivos.
 * - mutations nunca têm retry automático: repetir uma escrita só é seguro
 *   com idempotência explícita (pedido), feita pelo próprio fluxo.
 * - toda queryFn recebe `signal`: trocar de chave cancela a requisição
 *   anterior (respostas obsoletas são descartadas).
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => toApiError(error).retryable && failureCount < 2,
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4000),
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false },
    },
    mutationCache: new MutationCache({
      // Feedback padrão de falha; mutations com tratamento próprio usam meta.silent.
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.meta?.silent) return
        const apiError = toApiError(error)
        if (apiError.is('SESSION_EXPIRED', 'UNAUTHENTICATED', 'VALIDATION_FAILED')) return
        toast.error(apiError.message)
      },
    }),
  })
}

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError
    mutationMeta: { silent?: boolean }
  }
}
