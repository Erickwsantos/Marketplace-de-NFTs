import { FormProvider } from 'react-hook-form'
import { AlertTriangleIcon, TagIcon, XIcon } from 'lucide-react'
import { applyCouponInputSchema, type Cart, type Quote } from '@/contracts'
import { cn } from '@/shared/lib/cn'
import { formatEth } from '@/shared/lib/eth'
import { Button } from '@/shared/ui/button'
import { applyServerErrors, FormAlert, TextField, useZodForm } from '@/shared/ui/form'
import { BackgroundRefresh, ErrorState, Skeleton } from '@/shared/ui/primitives'
import { useState } from 'react'
import { useAcknowledgePrices, useApplyCoupon, useRemoveCoupon } from './hooks'

/** Linha de valor do resumo. */
function Row({
  label,
  value,
  hint,
  strong,
  className,
}: {
  label: string
  value: string
  hint?: string
  strong?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        className,
        'flex items-start justify-between gap-3',
        strong ? 'text-base font-bold' : 'text-xs md:text-sm',
      )}
    >
      <dt>{label}</dt>
      <dd className="text-right">
        <span className={cn(strong && 'text-primary')}>{value}</span>
        {hint && <span className="text-primary/80 block text-[10px] font-normal">{hint}</span>}
      </dd>
    </div>
  )
}

/**
 * Subtotal, desconto, taxa de rede e total — exatamente como vieram da
 * cotação da API (nenhum cálculo no cliente).
 */
export function QuoteTotals({
  quote,
  refreshing,
  compactOnMobile = false,
}: {
  quote: Quote
  refreshing?: boolean
  compactOnMobile?: boolean
}) {
  // compactOnMobile: no mobile só o total (Figma do pagamento); o detalhamento aparece na revisão.
  const detail = compactOnMobile ? 'max-md:hidden' : undefined
  const discount = quote.coupon ? `Desconto (${quote.coupon.code})` : 'Desconto de lançamento'
  return (
    <div className="flex flex-col gap-2" aria-busy={refreshing || undefined}>
      <dl className="flex flex-col gap-2">
        <Row label="Subtotal" value={formatEth(quote.subtotalEth)} className={detail} />
        <Row label={discount} value={`(-) ${formatEth(quote.discountEth)}`} className={detail} />
        <Row
          label="Taxa de rede"
          value={formatEth(quote.networkFeeEth)}
          hint="Taxa estimada"
          className={detail}
        />
        <div className={cn('border-border my-1 border-t', detail)} />
        <Row label="Total" value={formatEth(quote.totalEth)} strong />
      </dl>
      <BackgroundRefresh active={Boolean(refreshing)} label="Atualizando valores…" />
    </div>
  )
}

export function QuoteTotalsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
      <Skeleton className="mt-2 h-5 w-full" />
    </div>
  )
}

/** Estado da cotação com skeleton, erro e atualização em segundo plano. */
export function QuoteTotalsState({
  quote,
  compactOnMobile,
}: {
  compactOnMobile?: boolean
  quote: {
    data?: Quote
    isPending: boolean
    isError: boolean
    isFetching: boolean
    error: unknown
    refetch: () => unknown
  }
}) {
  if (quote.data)
    return (
      <QuoteTotals
        quote={quote.data}
        refreshing={quote.isFetching}
        compactOnMobile={compactOnMobile}
      />
    )
  if (quote.isError)
    return (
      <ErrorState
        error={quote.error}
        title="Não foi possível calcular o total"
        onRetry={() => void quote.refetch()}
        className="p-4"
      />
    )
  return <QuoteTotalsSkeleton />
}

/** Cupom: aplicar/remover com erros de cupom inválido ou expirado no próprio campo. */
export function CouponForm({ cart, compact = false }: { cart: Cart; compact?: boolean }) {
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const form = useZodForm(applyCouponInputSchema, { defaultValues: { code: '' } })
  const [message, setMessage] = useState<string | null>(null)

  if (cart.coupon) {
    return (
      <div className="border-primary/40 bg-primary/10 flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs">
        <span className="flex items-center gap-2">
          <TagIcon className="text-primary size-4" aria-hidden />
          <span>
            Cupom <strong>{cart.coupon.code}</strong> aplicado ({cart.coupon.percentOff}% off)
          </span>
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => remove.mutate(undefined)}
          loading={remove.isPending}
          aria-label={`Remover cupom ${cart.coupon.code}`}
        >
          {!remove.isPending && <XIcon aria-hidden />}
        </Button>
      </div>
    )
  }

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(({ code }) => {
          setMessage(null)
          apply.mutate(code, {
            onSuccess: () => form.reset({ code: '' }),
            onError: (error) => setMessage(applyServerErrors(form, error)),
          })
        })}
        className="flex flex-col gap-2"
      >
        <div className={cn('flex items-end gap-2', compact && 'items-start')}>
          <TextField
            name="code"
            label="Código promocional"
            placeholder="Digite o código promocional..."
            autoCapitalize="characters"
            hideLabel="mobile"
            className="flex-1 [&_input]:max-md:h-10 [&_input]:max-md:rounded-full [&_input]:max-md:px-4 [&_input]:max-md:text-xs"
          />
          <Button
            type="submit"
            size="default"
            loading={apply.isPending}
            className="mt-[22px] shrink-0 self-start max-md:mt-0 max-md:rounded-full"
          >
            Aplicar
          </Button>
        </div>
        <FormAlert message={message} />
      </form>
    </FormProvider>
  )
}

/**
 * Pendências da cotação (preço alterado, estoque, cupom expirado). Enquanto
 * houver pendência a finalização fica bloqueada; preço alterado exige que o
 * colecionador confirme explicitamente os novos valores.
 */
export function QuoteIssues({ quote }: { quote: Quote | undefined }) {
  const acknowledge = useAcknowledgePrices()
  const issues = quote?.issues.filter((i) => i.code !== 'EMPTY_CART') ?? []
  if (issues.length === 0) return null
  const priceChanged = issues.some((i) => i.code === 'PRICE_CHANGED')
  return (
    <div
      role="alert"
      className="border-warning/50 bg-warning/10 flex flex-col gap-2 rounded-md border p-3 text-xs"
    >
      <p className="text-warning flex items-center gap-2 font-semibold">
        <AlertTriangleIcon className="size-4" aria-hidden /> Seu carrinho mudou
      </p>
      <ul className="list-disc pl-5">
        {issues.map((issue) => (
          <li key={`${issue.code}-${issue.itemId}`}>{issue.message}</li>
        ))}
      </ul>
      {priceChanged && (
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onClick={() => acknowledge.mutate(undefined)}
          loading={acknowledge.isPending}
        >
          Confirmar novos preços
        </Button>
      )}
      {!priceChanged && <p>Ajuste as quantidades ou remova os itens indicados para continuar.</p>}
    </div>
  )
}
