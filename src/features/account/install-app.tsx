import { useId, useState } from 'react'
import { CheckCircle2Icon, DownloadIcon } from 'lucide-react'
import { toast } from 'sonner'
import { isIos, promptInstall, useInstallState } from '@/features/pwa/install-prompt'
import { announce } from '@/shared/a11y/announcer'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'

/** Botão "Instalar app" (PWA) com os estados: disponível, instalado, iOS (manual) e indisponível. */
export function InstallApp({ className }: { className?: string }) {
  const state = useInstallState()
  const [pending, setPending] = useState(false)
  const hintId = useId()

  if (state === 'installed') {
    return (
      <p role="status" className={cn('flex items-center gap-2 text-sm text-success', className)}>
        <CheckCircle2Icon className="size-4" aria-hidden /> App instalado
      </p>
    )
  }

  if (state === 'unavailable' && isIos()) {
    return (
      <p className={cn('text-xs text-muted-foreground', className)}>
        <span className="mb-1 block font-semibold text-foreground">Instalar app</span>
        No iPhone: Compartilhar → Adicionar à Tela de Início
      </p>
    )
  }

  const install = async () => {
    setPending(true)
    try {
      const outcome = await promptInstall()
      if (outcome === 'accepted') {
        toast.success('App instalado.')
        announce('App instalado.')
      }
    } finally {
      setPending(false)
    }
  }

  const unavailable = state === 'unavailable'
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Button
        type="button"
        variant="outline"
        className="w-full max-md:h-11 max-md:rounded-xl"
        onClick={() => void install()}
        loading={pending}
        disabled={unavailable}
        aria-describedby={unavailable ? hintId : undefined}
      >
        <DownloadIcon aria-hidden /> Instalar app
      </Button>
      {unavailable && (
        <p id={hintId} className="text-xs text-muted-foreground">
          A instalação não está disponível neste navegador. Use o Chrome ou o Edge, ou o menu do navegador.
        </p>
      )}
    </div>
  )
}
