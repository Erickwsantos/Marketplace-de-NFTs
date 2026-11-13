import { deflateSync } from 'node:zlib'
import { test as base, expect, type Locator, type Page } from '@playwright/test'

/**
 * Fixtures compartilhadas pelos testes E2E.
 *
 * - Estado isolado: cada teste tem contexto próprio e reinicia o cenário MSW.
 * - `mock`: controla o servidor simulado (window.__kurioMock). Alterações
 *   passam pelo domínio do mock e chegam à UI pelos handlers REST e pelo
 *   socket.io-client — os testes nunca alteram o cache/UI diretamente.
 */
export const USERS = {
  ana: { email: 'ana@kurio.test', password: 'kurio1234', name: 'Ana Ribeiro' },
  bruno: { email: 'bruno@kurio.test', password: 'kurio1234', name: 'Bruno Lima' },
} as const

export type ScenarioId =
  | 'default'
  | 'instant'
  | 'empty'
  | 'slow'
  | 'variable-latency'
  | 'out-of-order'
  | 'offline'
  | 'server-error'
  | 'favorite-failure'
  | 'session-expired'
  | 'price-change'
  | 'sold-out'
  | 'order-timeout'
  | 'payment-declined'
  | 'slow-payment'
  | 'wallet-rejected'

export function withScenario(path: string, scenario: ScenarioId = 'instant') {
  const url = new URL(path, 'http://x')
  url.searchParams.set('mock-scenario', scenario)
  url.searchParams.set('mock-reset', '1')
  return `${url.pathname}${url.search}${url.hash}`
}

/** Abre a rota no cenário indicado, com o estado do mock restaurado. */
export async function open(page: Page, path: string, scenario: ScenarioId = 'instant') {
  await page.goto(withScenario(path, scenario))
  await page.waitForFunction(() => Boolean(window.__kurioMock))
}

export function mockControl(page: Page) {
  const call = <T>(fn: (mock: NonNullable<Window['__kurioMock']>, arg: unknown) => T, arg?: unknown) =>
    page.evaluate(([source, a]) => {
      const f = new Function('mock', 'arg', `return (${source})(mock, arg)`)
      return f(window.__kurioMock, a)
    }, [fn.toString(), arg] as const) as Promise<Awaited<T>>

  return {
    updateNft: (nftId: string, patch: { editionId?: string; priceEth?: string; available?: number }) =>
      call((mock, a) => {
        const { nftId: id, patch: p } = a as { nftId: string; patch: object }
        return mock.nft.update(id, p)
      }, { nftId, patch }),
    replayLastEvent: () => call((mock) => mock.events.replayLast()),
    replayStale: (resourceId: string) => call((mock, id) => mock.events.replayStale(id as string), resourceId),
    dropSocket: () => call((mock) => mock.socket.drop()),
    setSocketOnline: (online: boolean) => call((mock, o) => mock.socket.setOnline(o as boolean), online),
    socketConnections: () => call((mock) => mock.socket.connections),
    expireSessions: () => call((mock) => mock.session.expireAll()),
    resolveOrder: (orderId: string, outcome?: 'confirmed' | 'declined') =>
      call((mock, a) => {
        const { orderId: id, outcome: o } = a as { orderId: string; outcome?: 'confirmed' | 'declined' }
        return mock.orders.resolve(id, o)
      }, { orderId, outcome }),
    orders: () => call((mock) => mock.orders.list()),
    snapshot: () => call((mock) => mock.snapshot()),
    /** Latência artificial no servidor simulado (null volta ao perfil do cenário). */
    setLatency: (latency: { kind: 'none' } | { kind: 'fixed'; ms: number } | null) =>
      call((mock, l) => mock.setLatency(l as Parameters<typeof mock.setLatency>[0]), latency),
  }
}

/** Layout mobile (< md do Tailwind), decidido pelo viewport do projeto. */
export function isMobile(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1440) < 768
}

/**
 * Painel de filtros do catálogo: no mobile abre o drawer "Filtros";
 * no desktop é a coluna lateral "Filtros do catálogo".
 */
export async function filtersPanel(page: Page): Promise<Locator> {
  if (isMobile(page)) {
    await page.getByRole('button', { name: /^Filtros/ }).click()
    const sheet = page.getByRole('dialog', { name: 'Filtros' })
    await expect(sheet).toBeVisible()
    return sheet
  }
  return page.getByRole('complementary', { name: 'Filtros do catálogo' })
}

/** Fecha o drawer de filtros (somente mobile; no desktop não há o que fechar). */
export async function closeFiltersPanel(page: Page) {
  if (!isMobile(page)) return
  const sheet = page.getByRole('dialog', { name: 'Filtros' })
  await sheet.getByRole('button', { name: /^Ver \d* ?resultados/ }).click()
  await expect(sheet).toBeHidden()
}

/** Lista de resultados do catálogo (tabpanel), sem destaques/carrosséis. */
export const catalogResults = (page: Page) => page.locator('#catalog-results')

/** Cards visíveis do catálogo. */
export const catalogCards = (page: Page) => catalogResults(page).getByRole('article')

/** Nomes dos cards exibidos, na ordem da tela. */
export const catalogNames = (page: Page) => catalogCards(page).getByRole('heading', { level: 3 }).allInnerTexts()

/** Preços (string decimal do `<data value>`) dos cards exibidos. */
export const catalogPrices = (page: Page) =>
  catalogCards(page)
    .locator('data')
    .evaluateAll((els) => els.map((el) => (el as HTMLDataElement).value))

/** Lê um search param do TanStack Router (valores não-string vêm em JSON). */
export function searchParam(page: Page, key: string): unknown {
  const raw = new URL(page.url()).searchParams.get(key)
  if (raw === null) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

/** Abre o carrinho pela navegação do layout: header no desktop, navegação inferior no mobile. */
export async function goToCart(page: Page) {
  if (isMobile(page)) {
    const nav = page.getByRole('navigation', { name: 'Navegação inferior' })
    if (await nav.count()) {
      await nav.getByRole('link', { name: /^Carrinho/ }).click()
    } else {
      // Telas imersivas (Figma) não têm navegação inferior: volta pelo cabeçalho da tela.
      await page.getByRole('button', { name: 'Voltar' }).click()
    }
  } else {
    await page.getByRole('banner').getByRole('link', { name: /^Carrinho/ }).click()
  }
  await page.waitForURL('**/cart')
}

/** Vai do carrinho ao checkout ("Conectar e finalizar"). */
export async function goToCheckout(page: Page) {
  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await page.waitForURL('**/checkout')
  // Desktop: "Perfil do colecionador"; mobile (Figma): "Pagamento com carteira".
  await expect(page.getByRole('heading', { level: 1, name: /Perfil do colecionador|Pagamento com carteira/ })).toBeVisible()
}

/** Mobile: abre a seção recolhível "Dados do colecionador" do checkout (no desktop já está visível). */
export async function openCollectorData(page: Page) {
  if (!isMobile(page)) return
  const toggle = page.getByRole('button', { name: /Dados do colecionador/ })
  if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
}

/** Confere o nome pré-preenchido do colecionador (campo no desktop; resumo da seção no mobile). */
export async function expectCollectorName(page: Page, name: string) {
  if (isMobile(page)) {
    await expect(page.getByRole('button', { name: /Dados do colecionador/ })).toContainText(name)
  } else {
    await expect(page.getByRole('textbox', { name: 'Nome de exibição' })).toHaveValue(name)
  }
}

/** Conecta a carteira selecionada no checkout (MetaMask por padrão para a Ana). */
export async function connectWallet(page: Page, provider = 'MetaMask') {
  // Pode já estar conectada ("Confirmar compra" conecta automaticamente).
  if (await page.getByText(new RegExp(`Conectado: ${provider}`)).isVisible()) return
  await page.getByRole('button', { name: `Conectar ${provider}` }).click()
  await expect(page.getByText(new RegExp(`Conectado: ${provider}`))).toBeVisible()
}

/** Abre a revisão do pedido a partir do checkout. */
export async function openReview(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  const review = page.getByRole('dialog', { name: 'Revise seu pedido' })
  await expect(review).toBeVisible()
  await expect(review.getByRole('table', { name: 'Itens do pedido' })).toBeVisible()
  return review
}

/** Valor de uma linha do resumo (`<dt>rótulo</dt><dd>valor</dd>`). */
export const summaryValue = (scope: Locator, label: string) =>
  scope.locator(`dt:text-is("${label}")`).locator('xpath=following-sibling::dd[1]')

/** Menu lateral "Meu perfil" da área logada (o rodapé tem outra navegação com o mesmo nome). */
export const profileNav = (page: Page) => page.getByRole('main').getByRole('navigation', { name: 'Meu perfil' })

/** Logout pelo menu "Meu perfil". */
export async function logout(page: Page) {
  await profileNav(page).getByRole('button', { name: 'Sair' }).click()
  await page.waitForURL((url) => url.pathname === '/')
}

/** Leva ao login pela navegação do layout (header no desktop, barra inferior no mobile). */
export async function goToLoginFromLayout(page: Page) {
  const nav = isMobile(page) ? page.getByRole('navigation', { name: 'Navegação inferior' }) : page.getByRole('banner')
  await nav.getByRole('link', { name: 'Entrar' }).click()
  await expect(page.getByRole('dialog', { name: 'Entrar' })).toBeVisible()
}

/** Aguarda imagens (inclusive lazy) e fontes para capturas estáveis. */
export async function waitForStableAssets(page: Page) {
  await page.evaluate(() => {
    for (const img of Array.from(document.images)) img.loading = 'eager'
  })
  await expect
    .poll(() => page.evaluate(() => Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0)), {
      timeout: 15_000,
    })
    .toBe(true)
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
}

/** PNG RGB válido gerado em memória (sem arquivos de fixture). */
export function makePng(width: number, height: number, [r, g, b]: [number, number, number]): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc32 = (buf: Buffer) => {
    let c = 0xffffffff
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff]! ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([length, body, crc])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.writeUInt8(8, 8) // profundidade de bits
  header.writeUInt8(2, 9) // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => [r, g, b]).flat())])
  const raw = Buffer.concat(Array.from({ length: height }, () => row))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

export async function login(page: Page, user: (typeof USERS)[keyof typeof USERS] = USERS.ana) {
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: /e-mail/i }).fill(user.email)
  await dialog.locator('input[type=password]').first().fill(user.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
}

/** Abre o login já no cenário e autentica (retorna na rota indicada). */
export async function openAuthenticated(
  page: Page,
  path: string,
  scenario: ScenarioId = 'instant',
  user: (typeof USERS)[keyof typeof USERS] = USERS.ana,
) {
  await open(page, `/login?redirect=${encodeURIComponent(path)}`, scenario)
  await login(page, user)
  await page.waitForURL((url) => url.pathname === new URL(path, 'http://x').pathname)
}

export async function addToCartFromCatalog(page: Page, nftName: string) {
  await page.getByRole('button', { name: `Adicionar ${nftName} ao carrinho` }).click()
  await expect(page.getByTestId('live-polite')).toContainText(`${nftName} adicionado ao carrinho`)
}

export const test = base
export { expect }

/**
 * Confere os itens do pedido no checkout. Desktop: tabela no resumo lateral.
 * Mobile (Figma): os itens aparecem na revisão — abre a revisão, confere e fecha.
 */
export async function expectCheckoutLines(page: Page, names: string[]) {
  if (!isMobile(page)) {
    const table = page.getByRole('table', { name: 'Itens do pedido' })
    for (const name of names) await expect(table.getByText(name)).toBeVisible()
    return
  }
  const review = await openReview(page)
  for (const name of names) await expect(review.getByText(name)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(review).toBeHidden()
}
