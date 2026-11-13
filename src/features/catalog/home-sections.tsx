import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
import type { FeaturedResponse } from '@/contracts'
import { Button } from '@/shared/ui/button'
import { CarouselDots } from '@/shared/ui/carousel-dots'
import { EthAmount, NftImage, Skeleton } from '@/shared/ui/primitives'

/** Hero com carrossel de destaques (pontos navegáveis por teclado). */
export function Hero({ featured }: { featured: FeaturedResponse | undefined }) {
  const [index, setIndex] = useState(0)
  const items = featured?.hero ?? []
  const current = items[index]

  return (
    <section aria-roledescription="carrossel" aria-label="Destaques" className="container-page">
      <div className="grid items-center gap-6 rounded-md bg-surface p-5 md:grid-cols-[1fr_minmax(0,360px)] md:bg-transparent md:p-0 md:py-10">
        <div className="flex flex-col gap-3 md:gap-5">
          <p className="text-xs text-muted-foreground md:text-sm">Bem-vindo à Kurio</p>
          <h1 className="text-xl leading-tight font-bold tracking-wide uppercase md:text-4xl md:leading-[1.25]">
            Seja dono do futuro da arte digital
          </h1>
          <p className="max-w-md text-xs text-muted-foreground md:text-sm">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e
            tenha uma porta de cultura da internet.
          </p>
          <Button asChild size="sm" className="self-start uppercase">
            <Link to="/" hash="catalogo">
              Explorar
            </Link>
          </Button>
        </div>
        <div className="relative mx-auto w-40 md:w-full">
          {current ? (
            <Link to="/nfts/$nftId" params={{ nftId: current.id }} className="block" aria-label={`Ver destaque: ${current.name}`}>
              <NftImage image={current.image} sizes="(min-width: 768px) 360px, 160px" priority className="rounded-xl" />
            </Link>
          ) : (
            <Skeleton className="aspect-square w-full rounded-xl" />
          )}
          <div className="mt-2">
            <CarouselDots
              count={items.length}
              current={index}
              onSelect={setIndex}
              label="Escolher destaque"
              itemLabel={(i) => `Destaque ${i + 1} de ${items.length}: ${items[i]?.name ?? ''}`}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export function Spotlight({ featured }: { featured: FeaturedResponse | undefined }) {
  const nft = featured?.spotlight
  return (
    <section aria-labelledby="spotlight-title" className="flex flex-col gap-2">
      <h2 id="spotlight-title" className="text-sm font-bold text-primary uppercase">
        NFT em destaque
      </h2>
      <p className="text-center text-sm font-bold uppercase">Oferta limitada</p>
      {nft ? (
        <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="group block overflow-hidden rounded-md bg-surface">
          <NftImage image={nft.image} sizes="240px" className="transition-transform group-hover:scale-[1.02]" />
          <span className="flex items-center justify-between p-2 text-xs">
            <span>{nft.name}</span>
            <EthAmount value={nft.priceEth} />
          </span>
        </Link>
      ) : (
        <Skeleton className="aspect-square w-full" />
      )}
    </section>
  )
}

const PROMOS = [
  {
    title: 'Lançamentos gênesis de edição limitada',
    text: 'Coleções edições escassas diretamente dos criadores antes da revelação pública.',
    art: 'monkey-green',
    search: { tab: 'new' as const },
  },
  {
    title: 'Arte digital selecionada e muito mais',
    text: 'Explore novos artistas, coleções verificadas e obras digitais que merecem um lugar.',
    art: 'monkey-white',
    search: { categories: ['arte-digital' as const] },
  },
]

export function Promos() {
  return (
    <section aria-label="Coleções em destaque" className="container-page grid gap-4 md:grid-cols-2">
      {PROMOS.map((promo) => (
        <article key={promo.title} className="grid grid-cols-[120px_1fr] items-center gap-4 rounded-md bg-surface p-3 md:grid-cols-[160px_1fr]">
          <img
            src={`/nfts/${promo.art}-320.webp`}
            alt=""
            width={320}
            height={320}
            loading="lazy"
            decoding="async"
            className="aspect-square w-full rounded-md object-cover"
          />
          <div className="flex flex-col items-start gap-2">
            <h2 className="text-sm font-bold">{promo.title}</h2>
            <p className="text-xs text-muted-foreground">{promo.text}</p>
            <Button asChild size="sm">
              <Link to="/" search={promo.search} hash="catalogo">
                Explorar <ArrowRightIcon aria-hidden />
                <span className="sr-only">: {promo.title}</span>
              </Link>
            </Button>
          </div>
        </article>
      ))}
    </section>
  )
}

const POSTS = [
  { title: 'Como funciona a propriedade de NFTs', text: 'Aprenda a colecionar, negociar e verificar ativos digitais.', art: 'monkey-white', date: '15 de setembro', read: 3 },
  { title: '10 artistas digitais para acompanhar', text: 'Conheça criadores que estão moldando a cultura digital.', art: 'monkey-green', date: '12 de setembro', read: 2 },
  { title: 'Raridade, atributos e procedência', text: 'Entenda raridade, procedência e atributos que valorizam obras.', art: 'monkey-purple', date: '8 de setembro', read: 5 },
  { title: 'Como proteger sua carteira', text: 'Proteja sua carteira, suas chaves e sua identidade.', art: 'monkey-orange', date: '2 de setembro', read: 4 },
]

/** "Diário da Cunhagem": conteúdo editorial fora do escopo — sem links que aparentem funcionar. */
export function Journal() {
  return (
    <section aria-labelledby="journal-title" className="container-page flex flex-col gap-6">
      <div className="text-center">
        <h2 id="journal-title" className="text-xl font-bold">
          Diário da Cunhagem
        </h2>
        <p className="text-xs text-muted-foreground">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {POSTS.map((post) => (
          <li key={post.title} className="flex flex-col overflow-hidden rounded-md bg-surface">
            <img src={`/nfts/${post.art}-320.webp`} alt="" width={320} height={200} loading="lazy" decoding="async" className="aspect-[16/10] w-full object-cover" />
            <div className="flex flex-col gap-2 p-3">
              <p className="text-[10px] text-muted-foreground">
                {post.date} | Leitura de {post.read} min
              </p>
              <h3 className="text-sm font-bold">{post.title}</h3>
              <p className="text-xs text-muted-foreground">{post.text}</p>
              <span className="text-xs text-muted-foreground" title="Em breve">
                Ler mais (em breve)
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
