import type { NftDetail, NftSummary, Order, User, Wallet } from '@/contracts'
import { compareEth } from '@/shared/lib/eth'
import type { NftRecord, OrderRecord, UserRecord, WalletRecord } from '../db/types'

/** Registros internos → DTOs do contrato (nada privado sai daqui). */

export function toNftSummary(nft: NftRecord): NftSummary {
  const onSale = nft.editions.filter((e) => e.status === 'available' && e.available > 0)
  const priced = onSale.length > 0 ? onSale : nft.editions.filter((e) => e.status !== 'unavailable')
  const cheapest = [...(priced.length > 0 ? priced : nft.editions)].sort((a, b) =>
    compareEth(a.priceEth, b.priceEth),
  )[0]!

  return {
    id: nft.id,
    name: nft.name,
    tokenId: nft.tokenId,
    image: nft.image,
    category: nft.category,
    network: nft.network,
    collection: nft.collection,
    creator: nft.creator,
    priceEth: cheapest.priceEth,
    defaultEditionId: onSale.length > 0 ? cheapest.id : null,
    compareAtPriceEth: cheapest.compareAtPriceEth,
    badge: nft.badge,
    available: onSale.reduce((sum, e) => sum + e.available, 0),
    listedAt: nft.listedAt,
    version: nft.version,
  }
}

export function toNftDetail(nft: NftRecord): NftDetail {
  return {
    ...toNftSummary(nft),
    description: nft.description,
    about: nft.about,
    gallery: nft.gallery,
    attributes: nft.attributes,
    editions: nft.editions,
    rating: nft.rating,
    reviews: nft.reviews,
    contract: nft.contract,
    royaltyPercent: nft.royaltyPercent,
  }
}

export function toUser(user: UserRecord): User {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    ensName: user.ensName,
    walletNickname: user.walletNickname,
    createdAt: user.createdAt,
  }
}

export function toWallet(wallet: WalletRecord): Wallet {
  return {
    id: wallet.id,
    role: wallet.role,
    profile: wallet.profile,
    version: wallet.version,
    updatedAt: wallet.updatedAt,
  }
}

export function toOrder(order: OrderRecord): Order {
  return {
    id: order.id,
    status: order.status,
    version: order.version,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    quoteId: order.quoteId,
    lines: order.lines,
    coupon: order.coupon,
    subtotalEth: order.subtotalEth,
    discountEth: order.discountEth,
    networkFeeEth: order.networkFeeEth,
    totalEth: order.totalEth,
    network: order.network,
    provider: order.provider,
    wallet: order.wallet,
    buyer: order.buyer,
    transaction: order.transaction,
    failureReason: order.failureReason,
  }
}
