import type { ReactNode } from 'react'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronLeftIcon } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

/**
 * Cabeçalho de tela no mobile (Figma): botão voltar circular + título central.
 * É o <h1> da página no mobile; no desktop não é renderizado (md:hidden) e a
 * página usa o próprio título.
 */
export function ScreenHeader({
  title,
  fallback = '/',
  action,
  className,
  as: Title = 'h1',
}: {
  title: string
  /** Destino quando não há histórico (acesso direto). */
  fallback?: string
  action?: ReactNode
  className?: string
  /** "p" quando a página já tem seu próprio h1 também no mobile. */
  as?: 'h1' | 'p'
}) {
  const router = useRouter()
  const navigate = useNavigate()
  const back = () => {
    if (window.history.length > 1) router.history.back()
    else void navigate({ to: fallback })
  }
  return (
    <div className={cn('sticky top-0 z-30 -mx-4 mb-3 flex h-14 items-center gap-3 bg-background/95 px-4 backdrop-blur md:hidden', className)}>
      <button
        type="button"
        onClick={back}
        aria-label="Voltar"
        className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-foreground hover:text-primary"
      >
        <ChevronLeftIcon className="size-5" aria-hidden />
      </button>
      <Title className="min-w-0 flex-1 truncate text-center text-base font-bold">{title}</Title>
      <div className="flex size-9 shrink-0 items-center justify-center">{action}</div>
    </div>
  )
}
