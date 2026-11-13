import { queryOptions } from '@tanstack/react-query'
import {
  API_ROUTES,
  apiPath,
  favoriteMutationSchema,
  favoritesSchema,
  userSchema,
  walletConnectionResponseSchema,
  walletListSchema,
  walletSchema,
  type ChangePasswordInput,
  type CollectorProfile,
  type ConnectWalletInput,
  type ProfileInput,
  type WalletRole,
} from '@/contracts'
import { request, requestVoid } from '@/shared/api/http'
import { queryKeys } from '@/shared/api/query-keys'

export const favoritesApi = {
  list: (signal?: AbortSignal) => request(favoritesSchema, { url: apiPath(API_ROUTES.favorites), signal }),
  add: (nftId: string) =>
    request(favoriteMutationSchema, { method: 'PUT', url: apiPath(API_ROUTES.favorite, { nftId }) }),
  remove: (nftId: string) =>
    request(favoriteMutationSchema, { method: 'DELETE', url: apiPath(API_ROUTES.favorite, { nftId }) }),
}

export const profileApi = {
  get: (signal?: AbortSignal) => request(userSchema, { url: apiPath(API_ROUTES.profile), signal }),
  update: (input: ProfileInput) => request(userSchema, { method: 'PATCH', url: apiPath(API_ROUTES.profile), data: input }),
  uploadAvatar: (file: Blob) => {
    const form = new FormData()
    form.append('avatar', file, 'avatar.webp')
    return request(userSchema, { method: 'PUT', url: apiPath(API_ROUTES.avatar), data: form })
  },
  removeAvatar: () => request(userSchema, { method: 'DELETE', url: apiPath(API_ROUTES.avatar) }),
  changePassword: (input: ChangePasswordInput) =>
    requestVoid({ method: 'POST', url: apiPath(API_ROUTES.password), data: input }),
}

export const walletsApi = {
  list: (signal?: AbortSignal) => request(walletListSchema, { url: apiPath(API_ROUTES.wallets), signal }),
  create: (role: WalletRole, profile: CollectorProfile) =>
    request(walletSchema, { method: 'POST', url: apiPath(API_ROUTES.wallets), data: { role, profile } }),
  update: (walletId: string, profile: CollectorProfile) =>
    request(walletSchema, { method: 'PATCH', url: apiPath(API_ROUTES.wallet, { walletId }), data: { profile } }),
  connection: (signal?: AbortSignal) =>
    request(walletConnectionResponseSchema, { url: apiPath(API_ROUTES.walletConnection), signal }),
  connect: (walletId: string, input: ConnectWalletInput) =>
    request(walletConnectionResponseSchema, {
      method: 'POST',
      url: apiPath(API_ROUTES.walletConnect, { walletId }),
      data: input,
    }),
  disconnect: () =>
    request(walletConnectionResponseSchema, { method: 'DELETE', url: apiPath(API_ROUTES.walletConnection) }),
}

export const accountQueries = {
  favorites: (userId: string) =>
    queryOptions({ queryKey: queryKeys.favorites(userId), queryFn: ({ signal }) => favoritesApi.list(signal) }),
  profile: (userId: string) =>
    queryOptions({ queryKey: queryKeys.profile(userId), queryFn: ({ signal }) => profileApi.get(signal) }),
  wallets: (userId: string) =>
    queryOptions({ queryKey: queryKeys.wallets(userId), queryFn: ({ signal }) => walletsApi.list(signal) }),
  walletConnection: (userId: string) =>
    queryOptions({
      queryKey: queryKeys.walletConnection(userId),
      queryFn: ({ signal }) => walletsApi.connection(signal),
      staleTime: 0,
    }),
}
