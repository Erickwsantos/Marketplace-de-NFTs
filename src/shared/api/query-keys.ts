import type { CatalogQuery, Network } from '@/contracts'

/**
 * Fábrica central de chaves do TanStack Query.
 *
 * Isolamento: tudo que é privado fica sob ['private', userId, ...] e o
 * carrinho sob ['cart', owner] (userId ou id do visitante). Logout/troca de
 * usuário removem esses prefixos inteiros; chaves de um usuário nunca são
 * lidas por outro. Chaves de catálogo incluem todos os parâmetros da consulta.
 */
export const queryKeys = {
  session: (token: string | null) => ['session', token] as const,

  nfts: () => ['nfts'] as const,
  catalog: (query: CatalogQuery) => ['nfts', 'list', query] as const,
  catalogLists: () => ['nfts', 'list'] as const,
  featured: () => ['nfts', 'featured'] as const,
  nft: (nftId: string) => ['nfts', 'detail', nftId] as const,

  cart: (owner: string) => ['cart', owner] as const,
  cartRoot: () => ['cart'] as const,
  quote: (owner: string, network: Network, cartVersion: number) => ['cart', owner, 'quote', network, cartVersion] as const,

  private: (userId: string) => ['private', userId] as const,
  privateRoot: () => ['private'] as const,
  favorites: (userId: string) => ['private', userId, 'favorites'] as const,
  orders: (userId: string) => ['private', userId, 'orders'] as const,
  order: (userId: string, orderId: string) => ['private', userId, 'orders', orderId] as const,
  profile: (userId: string) => ['private', userId, 'profile'] as const,
  wallets: (userId: string) => ['private', userId, 'wallets'] as const,
  walletConnection: (userId: string) => ['private', userId, 'wallet-connection'] as const,
}
