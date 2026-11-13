import { useRef, useState, type ReactNode } from 'react'
import { XIcon, ZoomInIcon } from 'lucide-react'
import type { NftDetail } from '@/contracts'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { CarouselDots } from '@/shared/ui/carousel-dots'
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import { NftImage, Skeleton } from '@/shared/ui/primitives'

/** Imagem principal: largura da coluna esquerda no desktop, tela cheia no mobile. */
const MAIN_SIZES = '(min-width: 1200px) 480px, (min-width: 768px) 45vw, 100vw'

/** Classes compartilhadas com o skeleton (mesmas dimensões, sem CLS). */
const LAYOUT = 'flex flex-col-reverse gap-3 lg:flex-row lg:items-start'
// Mobile (Figma): sem miniaturas — a imagem principal é um carrossel deslizável.
const THUMBS = 'flex gap-2 overflow-x-auto max-md:hidden lg:w-20 lg:shrink-0 lg:flex-col lg:overflow-visible'
const THUMB = 'block size-16 shrink-0 overflow-hidden rounded-md lg:size-20'
const MAIN = 'relative min-w-0 flex-1 overflow-hidden rounded-xl bg-surface max-md:rounded-2xl'
/** Botões circulares sobrepostos à imagem (voltar, favoritar, ampliar). */
export const OVERLAY_BUTTON =
  'grid size-10 place-items-center rounded-full bg-background/85 text-foreground backdrop-blur-sm transition-colors hover:bg-primary hover:text-primary-foreground'

/**
 * Galeria (Figma: miniaturas verticais à esquerda da imagem principal a partir
 * de lg; abaixo dela no tablet). No mobile as miniaturas dão lugar a um
 * carrossel com scroll-snap (deslizar) e indicadores acessíveis.
 * Miniaturas/indicadores rolam a faixa até a imagem; a lupa abre a imagem
 * ampliada em um Dialog (foco preso, Esc fecha, foco volta para a lupa).
 */
export function NftGallery({ nft, overlay }: { nft: NftDetail; overlay?: ReactNode }) {
  const images = nft.gallery
  const [index, setIndex] = useState(0)
  const trackRef = useRef<HTMLUListElement>(null)
  const active = images[index] ?? images[0]!
  const total = images.length

  const goTo = (i: number, smooth: boolean) => {
    setIndex(i)
    const track = trackRef.current
    track?.scrollTo({ left: i * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' })
  }
  // Deslizar no mobile atualiza a imagem ativa (indicadores e lupa).
  const onScroll = () => {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return
    const i = Math.round(track.scrollLeft / track.clientWidth)
    if (i !== index && i >= 0 && i < total) setIndex(i)
  }

  return (
    <div className={LAYOUT}>
      {total > 1 && (
        <ul className={THUMBS} aria-label={`Galeria de imagens de ${nft.name}`}>
          {images.map((image, i) => (
            <li key={`${image.url}-${i}`}>
              <button
                type="button"
                onClick={() => goTo(i, false)}
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
        <ul
          ref={trackRef}
          onScroll={onScroll}
          aria-label={`Imagens de ${nft.name}`}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] md:overflow-hidden [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, i) => (
            // Só a imagem visível fica no leitor de tela (as demais são alcançadas pelas miniaturas/indicadores).
            <li key={`${image.url}-${i}`} aria-hidden={i !== index || undefined} className="w-full shrink-0 snap-center">
              <NftImage
                image={image}
                sizes={MAIN_SIZES}
                priority={i === 0}
                className="rounded-xl max-md:rounded-2xl"
              />
            </li>
          ))}
        </ul>
        {overlay}
        {total > 1 && (
          <div className="absolute inset-x-0 bottom-2 flex justify-center md:hidden">
            <div className="rounded-full bg-background/60 px-1 backdrop-blur-sm">
              <CarouselDots
                count={total}
                current={index}
                onSelect={(i) => goTo(i, true)}
                label={`Imagens de ${nft.name}`}
                itemLabel={(i) => `Mostrar imagem ${i + 1} de ${total}`}
              />
            </div>
          </div>
        )}
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label={`Ampliar imagem ${index + 1} de ${total} de ${nft.name}`}
              className={cn(OVERLAY_BUTTON, 'absolute top-3 right-3 max-md:top-auto max-md:right-3 max-md:bottom-3 max-md:size-9')}
            >
              <ZoomInIcon className="size-5 max-md:size-4" aria-hidden />
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
        <Skeleton className="aspect-square w-full rounded-xl max-md:rounded-2xl" />
      </div>
    </div>
  )
}
