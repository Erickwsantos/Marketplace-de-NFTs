import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link2Icon, Link2OffIcon, PlugZapIcon } from 'lucide-react'
import {
  NETWORKS,
  WALLET_PROVIDERS,
  type Network,
  type WalletConnection,
  type WalletProvider,
} from '@/contracts'
import { accountQueries, walletsApi } from '@/features/account/api'
import { announce } from '@/shared/a11y/announcer'
import { toApiError } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/query-keys'
import { NETWORK_LABELS, PROVIDER_LABELS } from '@/shared/lib/labels'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { RadioCard } from '@/shared/ui/radio-card'
import { RadioGroup } from '@/shared/ui/radio-group'

export function useWalletConnection(userId: string) {
  const queryClient = useQueryClient()
  const key = queryKeys.walletConnection(userId)
  const query = useQuery(accountQueries.walletConnection(userId))

  const connect = useMutation({
    mutationFn: (input: { walletId: string; provider: WalletProvider; network: Network }) =>
      walletsApi.connect(input.walletId, { provider: input.provider, network: input.network }),
    onSuccess: (data) => {
      queryClient.setQueryData(key, data)
      if (data.connection) {
        announce(
          `Carteira conectada: ${PROVIDER_LABELS[data.connection.provider]} na rede ${NETWORK_LABELS[data.connection.network]}.`,
        )
      }
    },
    meta: { silent: true },
  })

  const disconnect = useMutation({
    mutationFn: () => walletsApi.disconnect(),
    onSuccess: (data) => {
      queryClient.setQueryData(key, data)
      announce('Carteira desconectada.')
    },
  })

  return { query, connection: query.data?.connection ?? null, connect, disconnect }
}

export const connectionMatches = (
  connection: WalletConnection | null,
  target: { walletId: string; provider: WalletProvider; network: Network },
) =>
  Boolean(
    connection &&
    connection.status === 'connected' &&
    connection.walletId === target.walletId &&
    connection.provider === target.provider &&
    connection.network === target.network,
  )

/**
 * "Carteira e rede" (Figma): escolha do provedor + simulação de conexão,
 * recusa e desconexão. Trocar provedor, rede ou carteira exige reconectar.
 */
export function WalletConnectionPanel({
  userId,
  walletId,
  provider,
  network,
  onProviderChange,
  onNetworkChange,
}: {
  userId: string
  walletId: string
  provider: WalletProvider
  network: Network
  onProviderChange: (provider: WalletProvider) => void
  onNetworkChange: (network: Network) => void
}) {
  const { connection, connect, disconnect } = useWalletConnection(userId)
  const target = { walletId, provider, network }
  const connected = connectionMatches(connection, target)
  const rejected = connect.isError && toApiError(connect.error).is('WALLET_REJECTED')

  return (
    <section aria-labelledby="wallet-network-title" className="flex flex-col gap-3">
      <h2 id="wallet-network-title" className="text-sm font-bold md:text-center">
        Carteira e rede
      </h2>
      {/* Rede da compra (a taxa estimada muda conforme a rede). */}
      <div role="radiogroup" aria-label="Rede da compra" className="flex flex-wrap gap-2">
        {NETWORKS.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={network === value}
            onClick={() => onNetworkChange(value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs transition-colors',
              network === value
                ? 'border-primary bg-primary/10 text-primary font-semibold'
                : 'border-border hover:border-primary/50',
            )}
          >
            {NETWORK_LABELS[value]}
          </button>
        ))}
      </div>
      <RadioGroup
        value={provider}
        onValueChange={(value) => onProviderChange(value as WalletProvider)}
        aria-label="Provedor da carteira"
        className="gap-2"
      >
        {WALLET_PROVIDERS.map((value) => (
          <RadioCard
            key={value}
            value={value}
            selected={provider === value}
            title={PROVIDER_LABELS[value]}
            description={
              value === 'walletconnect' ? 'MetaMask · WalletConnect · Coinbase' : undefined
            }
          />
        ))}
      </RadioGroup>

      <div
        role="status"
        className="border-border bg-background rounded-xl border p-3 text-xs md:rounded-md"
      >
        {connected ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-success flex items-center gap-2">
              <Link2Icon className="size-4" aria-hidden />
              Conectado: {PROVIDER_LABELS[provider]} · {NETWORK_LABELS[network]}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => disconnect.mutate()}
              loading={disconnect.isPending}
            >
              <Link2OffIcon aria-hidden /> Desconectar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground flex items-center gap-2">
              <PlugZapIcon className="size-4" aria-hidden />
              {connection
                ? 'Carteira, provedor ou rede alterados: conecte novamente.'
                : 'Carteira não conectada.'}
            </span>
            {rejected && (
              <p className="text-destructive font-medium">
                {PROVIDER_LABELS[provider]} recusou a conexão. Tente novamente ou escolha outro
                provedor.
              </p>
            )}
            {connect.isError && !rejected && (
              <p className="text-destructive font-medium">{toApiError(connect.error).message}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              data-wallet-connect
              disabled={!walletId}
              loading={connect.isPending}
              onClick={() => connect.mutate(target)}
            >
              Conectar {PROVIDER_LABELS[provider]}
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
