import { Link } from '@tanstack/react-router'
import { AlertTriangleIcon, RotateCwIcon } from 'lucide-react'
import type { Quote } from '@/contracts'
import { QuoteLines } from '@/features/cart/quote-lines'
import { QuoteTotals } from '@/features/cart/quote-summary'
import { NETWORK_LABELS, PROVIDER_LABELS, shortAddress } from '@/shared/lib/labels'
import { formatEth } from '@/shared/lib/eth'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import type { CheckoutFormValues } from './checkout-draft'

export type ReviewNotice =
  | { kind: 'changed'; previousTotal: string }
  | { kind: 'error'; message: string; retryable: boolean }
  | null

/**
 * Revisão antes do envio. Mostra a cotação revalidada; se ela mudou desde
 * a última exibição (preço, estoque, cupom ou taxa), o colecionador precisa
 * confirmar de novo — o botão só envia a cotação que está na tela.
 */
export function ReviewDialog({
  open,
  onOpenChange,
  quote,
  values,
  notice,
  submitting,
  accepting,
  onAcceptPrices,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  quote: Quote | null
  values: CheckoutFormValues
  notice: ReviewNotice
  submitting: boolean
  accepting: boolean
  onAcceptPrices: () => void
  onConfirm: () => void
}) {
  const blocked = !quote?.valid
  const onlyPriceIssues = Boolean(quote?.issues.length) && quote!.issues.every((i) => i.code === 'PRICE_CHANGED')
  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Revise seu pedido</DialogTitle>
          <DialogDescription>Confira itens, valores e carteira antes de confirmar a compra.</DialogDescription>
        </DialogHeader>

        {notice?.kind === 'changed' && (
          <p role="alert" className="flex gap-2 rounded-md border border-warning/50 bg-warning/10 p-3 text-xs text-warning">
            <AlertTriangleIcon className="size-4 shrink-0" aria-hidden />
            <span>
              Os valores foram atualizados (total anterior {formatEth(notice.previousTotal)}). Revise e confirme novamente.
            </span>
          </p>
        )}
        {notice?.kind === 'error' && (
          <p role="alert" className="flex gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangleIcon className="size-4 shrink-0" aria-hidden />
            <span>{notice.message}</span>
          </p>
        )}

        {quote ? (
          <div className="flex flex-col gap-4">
            <QuoteLines lines={quote.lines} caption="Itens do pedido" />
            {quote.issues.length > 0 && (
              <div className="flex flex-col gap-2 rounded-md bg-warning/10 p-3 text-xs text-warning">
                <ul className="list-disc pl-4">
                  {quote.issues.map((issue) => (
                    <li key={`${issue.code}-${issue.itemId}`}>{issue.message}</li>
                  ))}
                </ul>
                {onlyPriceIssues ? (
                  <Button size="sm" variant="outline" className="self-start" onClick={onAcceptPrices} loading={accepting}>
                    Aceitar novos preços
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="self-start" asChild>
                    <Link to="/cart">Ajustar carrinho</Link>
                  </Button>
                )}
              </div>
            )}
            <QuoteTotals quote={quote} />
            <dl className="grid grid-cols-2 gap-2 rounded-md bg-background p-3 text-xs">
              <dt className="text-muted-foreground">Carteira</dt>
              <dd className="text-right">
                {values.buyer.nickname} · {shortAddress(values.buyer.address)}
              </dd>
              <dt className="text-muted-foreground">Provedor</dt>
              <dd className="text-right">{PROVIDER_LABELS[values.buyer.provider]}</dd>
              <dt className="text-muted-foreground">Rede</dt>
              <dd className="text-right">{NETWORK_LABELS[values.buyer.network]}</dd>
              <dt className="text-muted-foreground">E-mail</dt>
              <dd className="truncate text-right">{values.buyer.email}</dd>
            </dl>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Revalidando valores…</p>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Voltar
          </Button>
          <Button onClick={onConfirm} loading={submitting} disabled={blocked}>
            {notice?.kind === 'error' && notice.retryable ? (
              <>
                <RotateCwIcon aria-hidden /> Tentar novamente
              </>
            ) : notice?.kind === 'changed' ? (
              'Confirmar novos valores'
            ) : (
              'Confirmar compra'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
