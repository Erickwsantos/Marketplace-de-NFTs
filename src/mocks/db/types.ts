import type {
  Category,
  CollectorProfile,
  Coupon,
  Edition,
  Network,
  NftImage,
  Order,
  Quote,
  Review,
  WalletProvider,
  WalletRole,
} from '@/contracts'

/**
 * Registros internos do "servidor" simulado. Diferem dos DTOs do contrato:
 * guardam dados que nunca saem pela API (hash de senha, dono do recurso,
 * chave de idempotência, agendamento de pagamento).
 */
export interface NftRecord {
  id: string
  name: string
  tokenId: string
  image: NftImage
  gallery: NftImage[]
  category: Category
  network: Network
  collection: { id: string; name: string }
  creator: { id: string; name: string }
  badge: 'raro' | 'novo' | null
  listedAt: string
  trendingScore: number
  description: string
  about: string
  attributes: string[]
  editions: Edition[]
  rating: { average: number; count: number }
  reviews: Review[]
  contract: { address: string; standard: string }
  royaltyPercent: number
  version: number
}

export interface UserRecord {
  id: string
  username: string
  displayName: string
  email: string
  avatarUrl: string | null
  ensName: string | null
  walletNickname: string | null
  createdAt: string
  password: { salt: string; hash: string }
}

export interface SessionRecord {
  token: string
  userId: string
  createdAt: string
  expiresAt: string
  revoked: boolean
}

export interface CartItemRecord {
  id: string
  nftId: string
  editionId: string
  quantity: number
  acknowledgedPriceEth: string
}

export interface CartRecord {
  id: string
  /** null = carrinho de visitante. */
  userId: string | null
  items: CartItemRecord[]
  couponCode: string | null
  version: number
  updatedAt: string
}

export interface CouponRecord extends Coupon {
  expiresAt: string | null
}

export interface WalletRecord {
  id: string
  userId: string
  role: WalletRole
  profile: CollectorProfile
  version: number
  updatedAt: string
}

export interface WalletConnectionRecord {
  sessionToken: string
  walletId: string
  provider: WalletProvider
  network: Network
  connectedAt: string
}

export interface QuoteRecord extends Quote {
  cartId: string
}

export interface OrderRecord extends Order {
  userId: string
  idempotencyKey: string
  requestHash: string
  /** Quando a simulação de pagamento resolve o pedido (sobrevive a refresh). */
  resolveAt: string
  outcome: 'confirmed' | 'declined'
}

export interface MockDatabase {
  schemaVersion: number
  scenarioId: string
  nfts: NftRecord[]
  users: UserRecord[]
  sessions: SessionRecord[]
  carts: CartRecord[]
  favorites: Record<string, string[]>
  coupons: CouponRecord[]
  wallets: WalletRecord[]
  connections: WalletConnectionRecord[]
  quotes: QuoteRecord[]
  orders: OrderRecord[]
  /** Contadores para ids e eventos determinísticos. */
  sequence: number
  eventSequence: number
}
