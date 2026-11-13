import { useState, type ReactNode } from 'react'
import { XIcon, ZoomInIcon } from 'lucide-react'
import type { NftDetail } from '@/contracts'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import { NftImage, Skeleton } from '@/shared/ui/primitives'

/** Imagem principal: largura da coluna esquerda no desktop, tela cheia no mobile. */
const MAIN_SIZES = '(min-width: 1200px) 480px, (min-width: 768px) 45vw, 100vw'

/** Classes compartilhadas com o skeleton (mesmas dimensões, sem CLS). */
const LAYOUT = 'flex flex-col-reverse gap-3 lg:flex-row lg:items-start'
const THUMBS = 'flex gap-2 overflow-x-auto lg:w-20 lg:shrink-0 lg:flex-col lg:overflow-visible'
const THUMB = 'block size-16 shrink-0 overflow-hidden rounded-md lg:size-20'
const MAIN = 'relative min-w-0 flex-1 overflow-hidden rounded-xl bg-surface'

/**
 * Galeria (Figma: miniaturas verticais à esquerda da imagem principal a partir
 * de lg; abaixo dela em telas menores, para a imagem ocupar a coluna inteira).
 * Miniaturas trocam a imagem principal; a lupa abre a imagem ampliada em um
 * Dialog (foco preso, Esc fecha, foco volta para a lupa).
 */
export function NftGallery({ nft, overlay }: { nft: NftDetail; overlay?: ReactNode }) {
  const images = nft.gallery
  const [index, setIndex] = useState(0)
  const active = images[index] ?? images[0]!
  const total = images.length

  return (
    <div className={LAYOUT}>
      {total > 1 && (
        <ul className={THUMBS} aria-label={`Galeria de imagens de ${nft.name}`}>
          {images.map((image, i) => (
            <li key={`${image.url}-${i}`}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-pressed={i === index}
                className={cn(
                  THUMB,
                  'border-2 transition-opacity',
                  i === index ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100',
                )}
              >
                <NftImage image={image} sizes="80px" alt={`Imagem ${i + 1} de ${total} de ${nft.name}`} className="size-full" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={MAIN}>
        <NftImage image={active} sizes={MAIN_SIZES} priority className="rounded-xl" />
        {overlay}
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label={`Ampliar imagem ${index + 1} de ${total} de ${nft.name}`}
              className="absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-background/85 text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <ZoomInIcon className="size-5" aria-hidden />
            </button>
          </DialogTrigger>
          <DialogContent
            showCloseButton={false}
            aria-describedby={undefined}
            className="border-border bg-surface p-3 sm:max-w-[min(90vw,85vh)]"
          >
            <DialogTitle className="sr-only">
              {nft.name} — imagem {index + 1} de {total}
            </DialogTitle>
            <NftImage image={active} sizes="90vw" className="rounded-lg" />
            <DialogClose asChild>
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-5 right-5 rounded-full bg-background/85"
                aria-label="Fechar imagem ampliada"
              >
                <XIcon aria-hidden />
              </Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export function NftGallerySkeleton() {
  return (
    <div className={LAYOUT}>
      <div className={THUMBS}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className={THUMB} />
        ))}
      </div>
      <div className={MAIN}>
        <Skeleton className="aspect-square w-full rounded-xl" />
      </div>
    </div>
  )
}
