import type { Category, Edition, Network, NftImage, Review } from '@/contracts'
import { CATEGORIES } from '@/contracts'
import { eth, toEth } from '@/shared/lib/eth'
import { hashPassword } from '../lib/crypto'
import { createRandom } from '../lib/random'
import type { CouponRecord, MockDatabase, NftRecord, UserRecord, WalletRecord } from './types'

export const DB_SCHEMA_VERSION = 1

/** Data de referência fixa: dados estáveis para testes e regressão visual. */
export const SEED_REFERENCE_DATE = Date.parse('2026-11-01T12:00:00.000Z')
const DAY = 86_400_000
const iso = (ms: number) => new Date(ms).toISOString()

/**
 * As quatro artes do Figma (originais em design-assets/, variantes WebP
 * geradas por `npm run assets`). Único ponto para trocar os assets.
 */
const ART = {
  'monkey-green': 'Macaco de óculos escuros e jaqueta verde estilo college sobre fundo creme',
  'monkey-purple': 'Macaco cinza de chapéu bucket verde e moletom roxo sobre fundo claro',
  'monkey-white': 'Macaco de pelagem escura com gola alta verde e blazer marfim',
  'monkey-orange': 'Macaco dourado com fones de ouvido e jaqueta creme',
} as const
type ArtKey = keyof typeof ART
const ART_KEYS = Object.keys(ART) as ArtKey[]
const ART_WIDTHS = [320, 640, 960]
const image = (key: ArtKey, name: string): NftImage => ({
  url: `/nfts/${key}-640.webp`,
  alt: `${name}: ${ART[key]}`,
  variants: ART_WIDTHS.map((width) => ({ width, url: `/nfts/${key}-${width}.webp` })),
})

/** Os nove itens desenhados no Figma, com os preços do layout. */
const FIGMA_ITEMS: Array<{
  name: string
  art: ArtKey
  price: string
  compareAt?: string
  badge?: 'raro' | 'novo'
}> = [
  { name: 'Emerald Ape #042', art: 'monkey-green', price: '1.19' },
  { name: 'Sage Nomad #009', art: 'monkey-purple', price: '1.69' },
  { name: 'Neon Vessel #552', art: 'monkey-white', price: '1.99', compareAt: '2.29', badge: 'raro' },
  { name: 'Cosmic Bloom #118', art: 'monkey-purple', price: '1.29' },
  { name: 'Violet Nomad #314', art: 'monkey-purple', price: '1.39' },
  { name: 'Ivory Baron #088', art: 'monkey-white', price: '1.79' },
  { name: 'Golden Beat #207', art: 'monkey-orange', price: '0.99' },
  { name: 'Golden Signal #160', art: 'monkey-orange', price: '0.39' },
  { name: 'Golden Frequency #071', art: 'monkey-orange', price: '0.59' },
]

const PREFIXES = ['Amber', 'Onyx', 'Crimson', 'Lunar', 'Solar', 'Velvet', 'Cobalt', 'Jade', 'Rust', 'Pearl']
const SUFFIXES = ['Ape', 'Nomad', 'Vessel', 'Bloom', 'Baron', 'Beat', 'Signal', 'Monarch', 'Drifter']
const COLLECTIONS = [
  { id: 'kurio-apes', name: 'Kurio Apes' },
  { id: 'nomad-club', name: 'Nomad Club' },
  { id: 'golden-sound', name: 'Golden Sound' },
]
const CREATORS = [
  { id: 'studio-kurio', name: 'Studio Kurio' },
  { id: 'lumen-lab', name: 'Lumen Lab' },
  { id: 'atelie-orbita', name: 'Ateliê Órbita' },
]
const ATTRIBUTES = ['Óculos', 'Esmeralda', 'Raro', 'Fones', 'Chapéu bucket', 'Moletom', 'Dourado', 'Blazer']
const NETWORK_LIST: Network[] = ['ethereum', 'polygon', 'solana']
const REVIEW_COMMENTS = [
  'Arte impecável, chegou na carteira em segundos.',
  'Detalhes incríveis na textura do casaco.',
  'Ótima curadoria, já é destaque da minha coleção.',
  'Preço justo pela edição limitada.',
  'Criador muito ativo com a comunidade.',
  'Metadados completos e verificados.',
]
const REVIEWERS = ['colecionador.alfa', 'pixel.nomade', 'arte.cripto', 'galeria.sul', 'token.raro', 'byte.ateliê']

export const NFT_COUNT = 60

function buildEditions(id: string, basePrice: string, rng: ReturnType<typeof createRandom>, soldOut: boolean): Edition[] {
  const base = eth(basePrice)
  const editions: Edition[] = [
    {
      id: `${id}-1-1`,
      label: '1/1',
      supply: 1,
      available: soldOut || rng.chance(0.5) ? 0 : 1,
      maxPerOrder: 1,
      priceEth: toEth(base.times(5)),
      compareAtPriceEth: null,
      status: 'available',
    },
    {
      id: `${id}-1-10`,
      label: '1/10',
      supply: 10,
      available: soldOut ? 0 : rng.int(0, 10),
      maxPerOrder: 3,
      priceEth: toEth(base.times(2)),
      compareAtPriceEth: null,
      status: 'available',
    },
    {
      id: `${id}-1-50`,
      label: '1/50',
      supply: 50,
      available: soldOut ? 0 : rng.int(12, 50),
      maxPerOrder: 10,
      priceEth: basePrice,
      compareAtPriceEth: null,
      status: 'available',
    },
    {
      id: `${id}-aberta`,
      label: 'Aberta',
      supply: null,
      available: 0,
      maxPerOrder: 10,
      priceEth: toEth(base.times(0.8)),
      compareAtPriceEth: null,
      // Edição aberta ainda não liberada: exercita "edição indisponível".
      status: 'unavailable',
    },
  ]
  return editions.map((edition) =>
    edition.status === 'available' && edition.available === 0 ? { ...edition, status: 'sold_out' } : edition,
  )
}

function buildReviews(id: string, count: number, rng: ReturnType<typeof createRandom>): Review[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${id}-review-${i + 1}`,
    author: rng.pick(REVIEWERS),
    rating: rng.int(4, 5),
    comment: rng.pick(REVIEW_COMMENTS),
    createdAt: iso(SEED_REFERENCE_DATE - (i + 1) * 3 * DAY),
  }))
}

export function buildNfts(): NftRecord[] {
  const rng = createRandom(42)
  return Array.from({ length: NFT_COUNT }, (_, index): NftRecord => {
    const figma = FIGMA_ITEMS[index]
    const art = figma?.art ?? ART_KEYS[index % ART_KEYS.length]!
    const number = figma ? Number(figma.name.split('#')[1]) : 100 + ((index * 37) % 900)
    const name = figma?.name ?? `${PREFIXES[index % PREFIXES.length]} ${SUFFIXES[(index * 7) % SUFFIXES.length]} #${String(number).padStart(3, '0')}`
    const id = name.toLowerCase().replace(/#/g, '').replace(/\s+/g, '-')
    const basePrice = figma?.price ?? toEth(eth(rng.int(2, 1230)).div(100))
    const soldOut = !figma && index % 13 === 0
    const category: Category = figma ? CATEGORIES[index % 3]! : CATEGORIES[index % CATEGORIES.length]!
    const collection = COLLECTIONS[index % COLLECTIONS.length]!
    const editions = buildEditions(id, basePrice, rng, soldOut)
    const ratingCount = index === 0 ? 19 : rng.int(3, 20)
    const attributes = index === 0 ? ['Óculos', 'Esmeralda', 'Raro'] : [rng.pick(ATTRIBUTES), rng.pick(ATTRIBUTES)].filter((v, i, a) => a.indexOf(v) === i)
    const network = index === 0 ? 'ethereum' : NETWORK_LIST[index % NETWORK_LIST.length]!
    const tokenId = `#${String(number).padStart(4, '0')}`

    return {
      id,
      name,
      tokenId,
      image: image(art, name),
      // Galeria: a arte principal + as demais artes (4 miniaturas, como no layout).
      gallery: [image(art, name), ...ART_KEYS.filter((k) => k !== art).map((k) => image(k, name))],
      category,
      network,
      collection: index === 0 ? COLLECTIONS[0]! : collection,
      creator: CREATORS[index % CREATORS.length]!,
      badge: figma?.badge ?? (index % 11 === 5 ? 'raro' : null),
      listedAt: iso(SEED_REFERENCE_DATE - index * 2 * DAY - (index % 3) * 3_600_000),
      trendingScore: (index * 53) % 100,
      description: `Um colecionável digital ${editions[2]!.label} finalizado à mão da coleção ${collection.name}, verificado na ${network === 'ethereum' ? 'Ethereum' : network === 'polygon' ? 'Polygon' : 'Solana'}, com arte desbloqueável e acesso para colecionadores.`,
      about: `${name} é uma obra digital da coleção ${collection.name}. Cada atributo foi armazenado nos metadados do token e verificado na rede. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      attributes,
      editions,
      rating: { average: index === 0 ? 4.8 : Math.round((4 + rng.next()) * 10) / 10, count: ratingCount },
      reviews: buildReviews(id, ratingCount, rng),
      contract: { address: `0x${(index + 1).toString(16).padStart(4, '0')}...${(4242 + index).toString(16)}`, standard: 'ERC-721' },
      royaltyPercent: 5,
      version: 1,
    }
  }).map((nft, index) => {
    if (!FIGMA_ITEMS[index]?.compareAt) return nft
    const editions = nft.editions.map((e) =>
      e.label === '1/50' ? { ...e, compareAtPriceEth: FIGMA_ITEMS[index]!.compareAt! } : e,
    )
    return { ...nft, editions }
  })
}

/** Credenciais fictícias documentadas no README. */
export const SEED_USERS = [
  {
    id: 'user-ana',
    username: 'ana.colecionadora',
    displayName: 'Ana Ribeiro',
    email: 'ana@kurio.test',
    password: 'kurio1234',
    ensName: 'ana',
    walletNickname: 'Principal',
  },
  {
    id: 'user-bruno',
    username: 'bruno.criador',
    displayName: 'Bruno Lima',
    email: 'bruno@kurio.test',
    password: 'kurio1234',
    ensName: null,
    walletNickname: null,
  },
] as const

async function buildUsers(): Promise<UserRecord[]> {
  return Promise.all(
    SEED_USERS.map(async (user) => {
      const salt = `seed-salt-${user.id}`
      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: null,
        ensName: user.ensName,
        walletNickname: user.walletNickname,
        createdAt: iso(SEED_REFERENCE_DATE - 90 * DAY),
        password: { salt, hash: await hashPassword(user.password, salt) },
      }
    }),
  )
}

function buildWallets(): WalletRecord[] {
  const updatedAt = iso(SEED_REFERENCE_DATE - 30 * DAY)
  return [
    {
      id: 'wallet-ana-primary',
      userId: 'user-ana',
      role: 'primary',
      version: 1,
      updatedAt,
      profile: {
        displayName: 'Ana Ribeiro',
        nickname: 'Principal',
        network: 'ethereum',
        profileName: 'ana.colecionadora',
        address: '0x8f3a5b7c9d1e2f40a6b8c0d2e4f6a8b0c2d4e62c',
        secondaryAddress: '',
        provider: 'metamask',
        referralCode: 'KURIO-2026',
        email: 'ana@kurio.test',
        ensName: 'ana',
      },
    },
    {
      id: 'wallet-ana-secondary',
      userId: 'user-ana',
      role: 'secondary',
      version: 1,
      updatedAt,
      profile: {
        displayName: 'Ana Ribeiro',
        nickname: 'Reserva',
        network: 'polygon',
        profileName: 'ana.reserva',
        address: '0x1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e',
        secondaryAddress: 'nova.kurio.eth',
        provider: 'coinbase',
        referralCode: 'KURIO-2026',
        email: 'ana@kurio.test',
        ensName: 'nova-kurio',
      },
    },
  ]
}

export const SEED_COUPONS: CouponRecord[] = [
  { code: 'KURIO10', description: 'Cupom de boas-vindas', percentOff: 10, expiresAt: null },
  { code: 'LANCAMENTO', description: 'Desconto de lançamento', percentOff: 5, expiresAt: null },
  { code: 'EXPIRADO', description: 'Campanha encerrada', percentOff: 20, expiresAt: '2026-01-31T23:59:59.000Z' },
]

export async function buildSeed(scenarioId: string): Promise<MockDatabase> {
  return {
    schemaVersion: DB_SCHEMA_VERSION,
    scenarioId,
    nfts: buildNfts(),
    users: await buildUsers(),
    sessions: [],
    carts: [],
    favorites: { 'user-ana': ['sage-nomad-009', 'golden-beat-207'] },
    coupons: structuredClone(SEED_COUPONS),
    wallets: buildWallets(),
    connections: [],
    quotes: [],
    orders: [],
    sequence: 1000,
    eventSequence: 0,
  }
}
