import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { AlertTriangleIcon, ChevronRightIcon, RotateCwIcon } from 'lucide-react'
import type { EthAmount as EthAmountValue, NftImage as NftImageData } from '@/contracts'
import { toApiError } from '@/shared/api/errors'
import { cn } from '@/shared/lib/cn'
import { formatEth } from '@/shared/lib/eth'
import { Button } from './button'

/** Valor em ETH: formatação única (string decimal, sem float). */
export function EthAmount({
  value,
  compareAt,
  className,
}: {
  value: EthAmountValue
  compareAt?: EthAmountValue | null
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-baseline gap-2', className)}>
      <data value={value} className="font-semibold text-primary">
        {formatEth(value)}
      </data>
      {compareAt && (
        <s className="text-xs text-muted-foreground">
          <span className="sr-only">Preço anterior: </span>
          {formatEth(compareAt)}
        </s>
      )}
    </span>
  )
}

/** Imagem responsiva com dimensões reservadas (sem CLS). */
export function NftImage({
  image,
  sizes,
  priority = false,
  className,
  alt,
}: {
  image: NftImageData
  sizes: string
  priority?: boolean
  className?: string
  /** Sobrescreve o alt (ex.: "" quando a imagem é decorativa ao lado do nome). */
  alt?: string
}) {
  return (
    <img
      src={image.url}
      srcSet={image.variants.map((v) => `${v.url} ${v.width}w`).join(', ')}
      sizes={sizes}
      alt={alt ?? image.alt}
      width={640}
      height={640}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={cn('aspect-square h-auto w-full object-cover', className)}
    />
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('skeleton rounded-md', className)} />
}

export function ErrorState({
  error,
  title = 'Não foi possível carregar',
  onRetry,
  className,
}: {
  error: unknown
  title?: string
  onRetry?: () => void
  className?: string
}) {
  const apiError = toApiError(error)
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 rounded-md bg-surface p-8 text-center', className)}>
      <AlertTriangleIcon className="size-8 text-warning" aria-hidden />
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{apiError.message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCwIcon aria-hidden /> Tentar novamente
        </Button>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-md bg-surface p-8 text-center', className)}>
      {icon}
      <p className="font-semibold">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  )
}

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Trilha de navegação" className={cn('text-xs text-muted-foreground', className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={item.label} className="flex items-center gap-1">
              {item.to && !last ? (
                <Link to={item.to} className="hover:text-primary">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className={cn(last && 'text-foreground')}>
                  {item.label}
                </span>
              )}
              {!last && <ChevronRightIcon className="size-3 opacity-60" aria-hidden />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** Título de seção no estilo do Figma (laranja, sublinhado opcional). */
export function SectionTitle({ children, as: Tag = 'h2', className, id }: { children: ReactNode; as?: 'h1' | 'h2' | 'h3'; className?: string; id?: string }) {
  return (
    <Tag id={id} className={cn('text-base font-bold text-primary md:text-lg', className)}>
      {children}
    </Tag>
  )
}

/** Indica atualização em segundo plano sem esconder o conteúdo atual. */
export function BackgroundRefresh({ active, label = 'Atualizando…' }: { active: boolean; label?: string }) {
  if (!active) return null
  return (
    <span role="status" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <RotateCwIcon className="size-3 animate-spin" aria-hidden /> {label}
    </span>
  )
}
