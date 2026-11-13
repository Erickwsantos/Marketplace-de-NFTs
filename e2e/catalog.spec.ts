import type { Request, Response } from '@playwright/test'
import {
  catalogCards,
  catalogNames,
  catalogPrices,
  closeFiltersPanel,
  expect,
  filtersPanel,
  isMobile,
  open,
  searchParam,
  test,
} from './fixtures'

/** Requisição de listagem do catálogo (GET /api/nfts, sem /featured ou detalhe). */
const isCatalogRequest = (request: Request) =>
  request.method() === 'GET' && new URL(request.url()).pathname === '/api/nfts'

test.describe('Catálogo', () => {
  test('busca pelo header (desktop) ou pelo campo do catálogo (mobile)', async ({ page }) => {
    await open(page, '/')
    await expect(catalogCards(page)).toHaveCount(9)

    const searched = page.waitForRequest((r) => isCatalogRequest(r) && new URL(r.url()).searchParams.get('q') === 'Emerald')
    if (isMobile(page)) {
      await page.getByRole('searchbox', { name: 'Buscar no catálogo' }).fill('Emerald')
    } else {
      await page.getByRole('button', { name: 'Buscar NFTs' }).click()
      const dialog = page.getByRole('dialog', { name: 'Buscar NFTs' })
      await dialog.getByRole('textbox', { name: 'Termo de busca' }).fill('Emerald')
      await dialog.getByRole('button', { name: 'Buscar' }).click()
      await expect(dialog).toBeHidden()
    }
    await searched

    await expect.poll(() => searchParam(page, 'q')).toBe('Emerald')
    await expect(page.getByText('Resultados para')).toContainText('“Emerald”')
    await expect.poll(() => catalogNames(page)).toEqual(['Emerald Ape #042'])

    // Limpar a busca restaura a listagem completa.
    await page.getByRole('button', { name: 'Limpar busca' }).click()
    await expect.poll(() => searchParam(page, 'q')).toBeUndefined()
    await expect(catalogCards(page)).toHaveCount(9)
  })

  test('filtros combinados refletem na URL e na requisição e reiniciam a paginação', async ({ page }) => {
    await open(page, '/')
    await expect(catalogCards(page)).toHaveCount(9)

    // Vai para a página 2: mudança de filtro deve voltar à página 1.
    await page.getByRole('button', { name: 'Página 2' }).click()
    await expect.poll(() => searchParam(page, 'page')).toBe(2)

    const panel = await filtersPanel(page)
    const byCategory = page.waitForRequest(
      (r) => isCatalogRequest(r) && new URL(r.url()).searchParams.getAll('categories').includes('fotografia'),
    )
    await panel.getByRole('button', { name: /^Fotografia/ }).click()
    await byCategory
    await expect(panel.getByRole('button', { name: /^Fotografia/ })).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => searchParam(page, 'page')).toBeUndefined()

    const combined = page.waitForRequest((r) => {
      if (!isCatalogRequest(r)) return false
      const params = new URL(r.url()).searchParams
      return params.getAll('categories').includes('fotografia') && params.getAll('networks').includes('polygon')
    })
    await panel.getByRole('button', { name: /^Polygon/ }).click()
    const request = await combined
    const params = new URL(request.url()).searchParams
    expect(params.getAll('categories')).toEqual(['fotografia'])
    expect(params.getAll('networks')).toEqual(['polygon'])
    expect(params.get('page')).toBe('1')
    await closeFiltersPanel(page)

    expect(searchParam(page, 'categories')).toEqual(['fotografia'])
    expect(searchParam(page, 'networks')).toEqual(['polygon'])
    expect(searchParam(page, 'page')).toBeUndefined()

    // Os cards exibidos são exatamente os da resposta da API para os filtros.
    const response = await request.response()
    const body = (await response!.json()) as { items: Array<{ name: string; category: string; network: string }> }
    expect(body.items.length).toBeGreaterThan(0)
    for (const item of body.items) {
      expect(item.category).toBe('fotografia')
      expect(item.network).toBe('polygon')
    }
    await expect.poll(() => catalogNames(page)).toEqual(body.items.map((i) => i.name))
  })

  test('ordenação "Menor preço" exibe preços em ordem crescente', async ({ page }) => {
    await open(page, '/')
    await expect(catalogCards(page)).toHaveCount(9)

    const sorted = page.waitForRequest((r) => isCatalogRequest(r) && new URL(r.url()).searchParams.get('sort') === 'price-asc')
    await page.getByRole('combobox', { name: 'Ordenar por:' }).click()
    await page.getByRole('option', { name: 'Menor preço' }).click()
    await sorted

    await expect.poll(() => searchParam(page, 'sort')).toBe('price-asc')
    await expect(page.getByRole('combobox', { name: 'Ordenar por:' })).toHaveText('Menor preço')
    await expect
      .poll(async () => {
        const prices = (await catalogPrices(page)).map(Number)
        return prices.length === 9 && prices.every((p, i) => i === 0 || prices[i - 1]! <= p)
      })
      .toBe(true)
  })

  test('paginação e restauração pelo histórico e após reload', async ({ page }) => {
    await open(page, '/')
    await expect(catalogCards(page)).toHaveCount(9)
    const firstPage = await catalogNames(page)

    const panel = await filtersPanel(page)
    await panel.getByRole('button', { name: /^Ethereum/ }).click()
    await expect(panel.getByRole('button', { name: /^Ethereum/ })).toHaveAttribute('aria-pressed', 'true')
    await closeFiltersPanel(page)
    await expect.poll(() => searchParam(page, 'networks')).toEqual(['ethereum'])
    await expect.poll(() => catalogNames(page)).not.toEqual(firstPage)
    const ethereumPage1 = await catalogNames(page)

    const pagination = page.getByRole('navigation', { name: 'Paginação do catálogo' })
    await pagination.getByRole('button', { name: 'Página 2' }).click()
    await expect(pagination.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
    await expect.poll(() => searchParam(page, 'page')).toBe(2)
    await expect.poll(() => catalogNames(page)).not.toEqual(ethereumPage1)
    const ethereumPage2 = await catalogNames(page)

    // Voltar: página 1 com o filtro mantido.
    await page.goBack()
    await expect.poll(() => searchParam(page, 'page')).toBeUndefined()
    expect(searchParam(page, 'networks')).toEqual(['ethereum'])
    await expect(pagination.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page')
    await expect.poll(() => catalogNames(page)).toEqual(ethereumPage1)

    // Avançar: página 2 novamente.
    await page.goForward()
    await expect.poll(() => searchParam(page, 'page')).toBe(2)
    await expect.poll(() => catalogNames(page)).toEqual(ethereumPage2)

    // Reload: filtros e página vêm da URL.
    await page.reload()
    await expect(pagination.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
    await expect.poll(() => catalogNames(page)).toEqual(ethereumPage2)
    const reloaded = await filtersPanel(page)
    await expect(reloaded.getByRole('button', { name: /^Ethereum/ })).toHaveAttribute('aria-pressed', 'true')
  })

  test('cenário "empty" mostra o estado vazio', async ({ page }) => {
    await open(page, '/', 'empty')
    await expect(page.getByText('Nenhum NFT encontrado')).toBeVisible()
    await expect(catalogCards(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Limpar busca e filtros' })).toBeVisible()
  })

  test('cenário "out-of-order": a lista exibida corresponde à última consulta', async ({ page }) => {
    const settled = new Set<Request>()
    const sent: Request[] = []
    const responses = new Map<Request, Response>()
    page.on('request', (r) => {
      if (isCatalogRequest(r)) sent.push(r)
    })
    page.on('requestfinished', async (r) => {
      if (!isCatalogRequest(r)) return
      const response = await r.response()
      if (response) responses.set(r, response)
      settled.add(r)
    })
    page.on('requestfailed', (r) => {
      if (isCatalogRequest(r)) settled.add(r)
    })

    await open(page, '/', 'out-of-order')
    const tabs = page.getByRole('tablist', { name: 'Listas do catálogo' })
    await expect(tabs).toBeVisible()

    // A carga inicial (lenta) ainda está em voo: alterna rapidamente as abas.
    await tabs.getByRole('tab', { name: 'Novos lançamentos' }).click()
    await tabs.getByRole('tab', { name: 'Em alta' }).click()
    await expect(tabs.getByRole('tab', { name: 'Em alta' })).toHaveAttribute('aria-selected', 'true')
    await expect.poll(() => searchParam(page, 'tab')).toBe('trending')

    // Espera todas as respostas (inclusive as atrasadas/abortadas) chegarem.
    await expect.poll(() => sent.length).toBeGreaterThanOrEqual(3)
    await expect.poll(() => sent.every((r) => settled.has(r)), { timeout: 15_000 }).toBe(true)

    const last = sent.findLast((r) => new URL(r.url()).searchParams.get('tab') === 'trending')
    expect(last, 'requisição da última aba').toBeDefined()
    const lastResponse = responses.get(last!)
    expect(lastResponse, 'resposta da última consulta').toBeDefined()
    const body = (await lastResponse!.json()) as { items: Array<{ name: string }> }

    await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-busy', 'false')
    await expect.poll(() => catalogNames(page)).toEqual(body.items.map((i) => i.name))
  })
})
