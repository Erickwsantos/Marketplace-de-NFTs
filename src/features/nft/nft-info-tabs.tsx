import { useState, type Ref } from 'react'
import { StarIcon } from 'lucide-react'
import type { NftDetail, Review } from '@/contracts'
import { cn } from '@/shared/lib/cn'
import { formatDate, NETWORK_LABELS } from '@/shared/lib/labels'
import { Button } from '@/shared/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'

export type InfoTab = 'details' | 'reviews'

const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
export const formatRating = (value: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)

/** Estrelas visuais (decorativas): o valor acessível vem em texto ao lado. */
export function RatingStars({ value, className }: { value: number; className?: string }) {
  const filled = Math.round(value)
  return (
    <span aria-hidden className={cn('inline-flex text-primary', className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} className={cn('size-4', i < filled ? 'fill-current' : 'opacity-35')} />
      ))}
    </span>
  )
}

const TRIGGER =
  'flex-none px-1 text-sm text-muted-foreground after:bg-primary hover:text-foreground data-[state=active]:font-semibold data-[state=active]:text-primary'

const REVIEWS_PREVIEW = 5

/** Abas "Detalhes do NFT" | "Avaliações de colecionadores (n)". */
export function NftInfoTabs({
  nft,
  tab,
  onTabChange,
  reviewsTabRef,
}: {
  nft: NftDetail
  tab: InfoTab
  onTabChange: (tab: InfoTab) => void
  reviewsTabRef?: Ref<HTMLButtonElement>
}) {
  return (
    <Tabs id="nft-info" value={tab} onValueChange={(value) => onTabChange(value as InfoTab)} className="scroll-mt-24 gap-5">
      <TabsList variant="line" className="w-full justify-start gap-6 border-b border-border">
        <TabsTrigger value="details" className={TRIGGER}>
          Detalhes do NFT
        </TabsTrigger>
        <TabsTrigger value="reviews" className={TRIGGER} ref={reviewsTabRef}>
          <span className="md:hidden">Avaliações ({nft.rating.count})</span>
          <span className="hidden md:inline">Avaliações de colecionadores ({nft.rating.count})</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="flex flex-col gap-5 text-sm">
        <p className="max-w-3xl leading-relaxed text-muted-foreground">{nft.about}</p>
        <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[max-content_1fr]">
          <dt className="font-semibold">Rede:</dt>
          <dd className="text-muted-foreground">{NETWORK_LABELS[nft.network]}</dd>
          <dt className="font-semibold">Contrato:</dt>
          <dd className="break-all text-muted-foreground">
            <code>{nft.contract.address}</code> ({nft.contract.standard})
          </dd>
          <dt className="font-semibold">Direitos autorais:</dt>
          <dd className="text-muted-foreground">{numberFormat.format(nft.royaltyPercent)}% nas vendas secundárias</dd>
        </dl>
      </TabsContent>

      <TabsContent value="reviews">
        <ReviewList reviews={nft.reviews} />
      </TabsContent>
    </Tabs>
  )
}

function ReviewList({ reviews }: { reviews: Review[] }) {
  const [showAll, setShowAll] = useState(false)
  if (reviews.length === 0) {
    return <p className="text-sm text-muted-foreground">Este NFT ainda não tem avaliações de colecionadores.</p>
  }
  const visible = showAll ? reviews : reviews.slice(0, REVIEWS_PREVIEW)
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {visible.map((review) => (
          <li key={review.id}>
            <article className="flex flex-col gap-1.5 rounded-md bg-surface p-4 text-sm" aria-label={`Avaliação de ${review.author}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{review.author}</span>
                <time dateTime={review.createdAt} className="text-xs text-muted-foreground">
                  {formatDate(review.createdAt)}
                </time>
              </div>
              <p className="flex items-center gap-2">
                <RatingStars value={review.rating} />
                <span className="sr-only">Nota {review.rating} de 5</span>
              </p>
              <p className="text-muted-foreground">{review.comment}</p>
            </article>
          </li>
        ))}
      </ul>
      {reviews.length > REVIEWS_PREVIEW && (
        <Button variant="outline" size="sm" className="self-start" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
          {showAll ? 'Mostrar menos' : `Mostrar todas as avaliações (${reviews.length})`}
        </Button>
      )}
    </div>
  )
}
