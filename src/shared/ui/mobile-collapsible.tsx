import { useId, type ReactNode } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

/**
 * Seção recolhível só no mobile (no desktop o conteúdo fica sempre visível e
 * o cabeçalho não é renderizado). Usada para manter telas mobile enxutas como
 * no Figma sem duplicar campos de formulário.
 */
export function MobileCollapsible({
  title,
  summary,
  open,
  onOpenChange,
  children,
}: {
  title: string
  summary?: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  const id = useId()
  return (
    <section className="flex flex-col gap-4 md:contents">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface px-4 py-3 text-left md:hidden"
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold">{title}</span>
          {summary && <span className="block truncate text-xs text-muted-foreground">{summary}</span>}
        </span>
        <ChevronDownIcon className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      <div id={id} className={cn('flex flex-col gap-6', !open && 'max-md:hidden')}>
        {children}
      </div>
    </section>
  )
}
