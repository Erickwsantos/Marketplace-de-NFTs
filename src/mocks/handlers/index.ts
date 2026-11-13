import { socketHandlers } from '../socket'
import { profileHandlers, walletHandlers } from './account'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { catalogHandlers, favoriteHandlers } from './catalog'
import { orderHandlers } from './orders'

/** Handlers compartilhados por dev, build de demonstração e testes E2E. */
export const handlers = [
  ...authHandlers,
  ...catalogHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...orderHandlers,
  ...profileHandlers,
  ...walletHandlers,
  ...socketHandlers,
]
