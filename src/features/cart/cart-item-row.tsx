import { Link } from '@tanstack/react-router'
import { Trash2Icon } from 'lucide-react'
import type { CartItem } from '@/contracts'
import { cn } from '@/shared/lib/cn'
import { formatEth, isEthEqual } from '@/shared/lib/eth'
import { Button } from '@/shared/ui/button'
import { NftImage, Skeleton } from '@/shared/ui/primitives'
import { QuantityStepper } from '@/shared/ui/quantity-stepper'
import { useRemoveCartItem, useUpdateCartItem } from './hooks'

const STATUS_TEXT: Record<Exclude<CartItem['status'], 'ok'>, (item: CartItem) => string> = {
  price_changed: () => 'Preço alterado',
  insufficient_stock: (item) => `Só ${item.available} disponíve${item.available === 1 ? 'l' : 'is'}`,
  sold_out: () => 'Esgotado',
  unavailable: () => 'Edição indisponível',
}

export function CartItemStatus({ item }: { item: CartItem }) {
  if (item.status === 'ok') return null
  const severe = item.status !== 'price_changed'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase',
        severe ? 'bg-destructive/15 text-destructive' : 'bg-warning/15 text-warning',
      )}
    >
      {STATUS_TEXT[item.status](item)}
    </span>
  )
}

/** Linha do carrinho (tabela no desktop, cartão no mobile — mesmo componente). */
export function CartItemRow({ item }: { item: CartItem }) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const busy = update.isPending || remove.isPending
  const priceChanged = !isEthEqual(item.unitPriceEth, item.acknowledgedPriceEth)
  // Reduzir sempre é permitido; aumentar respeita disponibilidade e limite por pedido.
  const max = Math.max(item.quantity, Math.min(item.available, item.maxPerOrder))
  const canChange = item.status !== 'unavailable' && item.status !== 'sold_out'

  return (
    <li
      className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-surface p-3 md:grid-cols-[minmax(0,2.2fr)_1fr_1fr_1fr_auto] md:gap-4 md:rounded-md"
      aria-busy={busy || undefined}
    >
      <div className="flex min-w-0 items-center gap-3 md:col-auto">
        <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} className="w-16 shrink-0 overflow-hidden rounded-xl md:w-12 md:rounded-md">
          <NftImage image={item.image} sizes="64px" alt="" />
        </Link>
        <div className="hidden min-w-0 md:block">
          <ItemTitle item={item} />
        </div>
      </div>

      <div className="min-w-0 md:hidden">
        <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} className="block truncate text-sm font-semibold hover:text-primary">
          {item.name}
        </Link>
        <p className="text-[11px] text-muted-foreground">Edição: {item.editionLabel}</p>
        <p className="mt-1 text-sm font-semibold text-primary">{formatEth(item.lineTotalEth)}</p>
        {item.status !== 'ok' && (
          <div className="mt-1">
            <CartItemStatus item={item} />
          </div>
        )}
      </div>

      <div className="hidden text-sm md:block">
        <span className="sr-only">Preço unitário: </span>
        {formatEth(item.unitPriceEth)}
        {priceChanged && (
          <s className="block text-[10px] text-muted-foreground">
            <span className="sr-only">Preço anterior: </span>
            {formatEth(item.acknowledgedPriceEth)}
          </s>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 md:flex-row md:items-center md:justify-start">
        <QuantityStepper
          size="sm"
          label={item.name}
          value={item.quantity}
          max={max}
          disabled={busy || !canChange}
          onChange={(quantity) => update.mutate({ itemId: item.id, quantity, name: item.name })}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-7 rounded-full text-muted-foreground md:hidden"
          onClick={() => remove.mutate({ itemId: item.id, name: item.name })}
          disabled={busy}
          aria-label={`Remover ${item.name} do carrinho`}
        >
          <Trash2Icon aria-hidden />
        </Button>
      </div>

      <p className="hidden text-sm font-semibold text-primary md:block">
        <span className="sr-only">Total do item: </span>
        {formatEth(item.lineTotalEth)}
      </p>

      <Button
        variant="ghost"
        size="icon-sm"
        className="hidden md:inline-flex"
        onClick={() => remove.mutate({ itemId: item.id, name: item.name })}
        disabled={busy}
        aria-label={`Remover ${item.name} do carrinho`}
      >
        <Trash2Icon aria-hidden />
      </Button>
    </li>
  )
}

function ItemTitle({ item }: { item: CartItem }) {
  return (
    <>
      <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} className="block truncate text-sm font-semibold hover:text-primary">
        {item.name}
      </Link>
      <p className="text-[11px] text-muted-foreground">
        ID do token: {item.tokenId} · Edição: {item.editionLabel}
      </p>
      <div className="mt-1">
        <CartItemStatus item={item} />
      </div>
    </>
  )
}

export function CartItemSkeleton() {
  return (
    <li className="grid grid-cols-[64px_1fr] items-center gap-3 rounded-2xl bg-surface p-3 md:rounded-md" aria-hidden>
      <Skeleton className="size-16 md:size-12" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </li>
  )
}
