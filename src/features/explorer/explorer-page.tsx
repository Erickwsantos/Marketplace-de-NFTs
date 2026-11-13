import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { CheckCircle2Icon, FlaskConicalIcon } from 'lucide-react'
import { API_ROUTES, apiPath, transactionSchema } from '@/contracts'
import { RouteNotFound } from '@/app/route-fallbacks'
import { isApiError } from '@/shared/api/errors'
import { request } from '@/shared/api/http'
import { formatEth } from '@/shared/lib/eth'
import { EXPLORER_LABELS, NETWORK_LABELS } from '@/shared/lib/labels'
import { ErrorState, Skeleton } from '@/shared/ui/primitives'
import { ScreenHeader } from '@/shared/ui/screen-header'

const route = getRouteApi('/explorer/tx/$hash')

const transactionQuery = (hash: string) => ({
  queryKey: ['explorer', 'tx', hash] as const,
  queryFn: ({ signal }: { signal: AbortSignal }) =>
    request(transactionSchema, { url: apiPath(API_ROUTES.transaction, { hash }), signal }),
  staleTime: 15_000,
})

/**
 * Explorador de blocos SIMULADO. As referências de transação da demonstração
 * apontam para cá (nunca para Etherscan/Polygonscan reais), deixando claro
 * que nada foi registrado em blockchain.
 */
export function ExplorerPage() {
  const { hash } = route.useParams()
  const tx = useQuery(transactionQuery(hash))

  if (tx.isError && isApiError(tx.error, 'NOT_FOUND')) {
    return <RouteNotFound title="Transação não encontrada" description="Esta referência não existe na simulação." />
  }

  return (
    <div className="container-page flex flex-col gap-4 md:py-10">
      <ScreenHeader title="Transação" as="p" />
      <div
        role="note"
        className="flex items-start gap-3 rounded-2xl border border-warning/50 bg-warning/10 p-4 text-xs text-warning md:rounded-md"
      >
        <FlaskConicalIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          <strong>Explorador simulado.</strong> Esta transação foi gerada pela simulação da Kurio para demonstração e não
          existe em nenhuma blockchain real.
        </p>
      </div>

      {tx.isPending ? (
        <Skeleton className="h-96 w-full rounded-2xl md:rounded-md" />
      ) : tx.isError ? (
        <ErrorState error={tx.error} onRetry={() => void tx.refetch()} />
      ) : (
        <section aria-labelledby="tx-title" className="flex flex-col gap-5 rounded-2xl bg-surface p-5 md:rounded-md md:p-6">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">
              {EXPLORER_LABELS[tx.data.network]} (simulado) · {NETWORK_LABELS[tx.data.network]}
            </p>
            <h1 id="tx-title" className="text-lg font-bold">
              Detalhes da transação
            </h1>
          </div>

          <dl className="grid gap-3 text-xs sm:grid-cols-[180px_1fr]">
            <dt className="text-muted-foreground">Hash da transação</dt>
            <dd className="font-mono break-all">{tx.data.hash}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2 py-0.5 font-semibold text-success">
                <CheckCircle2Icon className="size-3.5" aria-hidden /> Sucesso
              </span>
            </dd>
            <dt className="text-muted-foreground">Bloco</dt>
            <dd>
              #{tx.data.blockNumber.toLocaleString('pt-BR')} · {tx.data.confirmations}{' '}
              {tx.data.confirmations === 1 ? 'confirmação' : 'confirmações'}
            </dd>
            <dt className="text-muted-foreground">Data</dt>
            <dd>{new Date(tx.data.timestamp).toLocaleString('pt-BR')}</dd>
            <dt className="text-muted-foreground">De (carteira)</dt>
            <dd className="font-mono break-all">{tx.data.from}</dd>
            <dt className="text-muted-foreground">Para (contrato do marketplace)</dt>
            <dd className="font-mono break-all">{tx.data.to}</dd>
            <dt className="text-muted-foreground">Valor</dt>
            <dd className="font-semibold text-primary">{formatEth(tx.data.valueEth)}</dd>
            <dt className="text-muted-foreground">Taxa de rede</dt>
            <dd>{formatEth(tx.data.networkFeeEth)}</dd>
          </dl>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-bold">Tokens transferidos</h2>
            <ul className="flex flex-col gap-1.5 text-xs">
              {tx.data.transfers.map((t) => (
                <li key={`${t.tokenId}-${t.editionLabel}`} className="flex justify-between gap-3 rounded-xl bg-background px-3 py-2 md:rounded-md">
                  <span>
                    {t.name} <span className="text-muted-foreground">({t.tokenId} · edição {t.editionLabel})</span>
                  </span>
                  <span className="text-muted-foreground">x {t.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
          <Link to="/" className="self-start text-xs text-primary underline-offset-4 hover:underline">
            Voltar ao início
          </Link>
        </section>
      )}
    </div>
  )
}
