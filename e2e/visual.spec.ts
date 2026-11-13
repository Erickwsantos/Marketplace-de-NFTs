import type { Page } from '@playwright/test'
import {
  addToCartFromCatalog,
  catalogCards,
  expect,
  goToCart,
  goToCheckout,
  open,
  openAuthenticated,
  summaryValue,
  test,
  waitForStableAssets,
  expectCollectorName,
  isMobile,
} from './fixtures'

/** Toasts (sonner) e cursor não fazem parte da regressão visual. */
const HIDE_TRANSIENT = '[data-sonner-toaster] { display: none !important; }'

async function snap(page: Page, name: string) {
  await page.mouse.move(0, 0)
  await page.addStyleTag({ content: HIDE_TRANSIENT })
  await waitForStableAssets(page)
  await expect(page).toHaveScreenshot(name, { fullPage: true })
}

test.describe('Regressão visual', () => {
  test.beforeEach(async ({ page }) => {
    // Relógio fixo: datas, prazos e cotações estáveis entre execuções.
    await page.clock.setFixedTime(new Date('2026-11-13T15:00:00Z'))
  })

  test('início', async ({ page }) => {
    await open(page, '/')
    await expect(catalogCards(page)).toHaveCount(9)
    // Destaques carregados (hero com imagem real, não o skeleton).
    await expect(page.getByRole('region', { name: 'Destaques' }).getByRole('link', { name: /^Ver destaque:/ })).toBeVisible()
    await snap(page, 'inicio.png')
  })

  test('detalhe do NFT', async ({ page }) => {
    await open(page, '/nfts/emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Mais desta coleção' }).getByRole('article').first()).toBeVisible()
    await snap(page, 'detalhe.png')
  })

  test('carrinho com 2 itens', async ({ page }) => {
    await open(page, '/')
    await addToCartFromCatalog(page, 'Emerald Ape #042')
    await addToCartFromCatalog(page, 'Sage Nomad #009')
    await goToCart(page)
    const summary = page.getByRole('complementary', { name: 'Resumo da carteira' })
    await expect(summaryValue(summary, 'Subtotal')).toHaveText('2.88 ETH')
    // No mobile (Figma) o carrinho não exibe o carrossel de recomendações.
    if (!isMobile(page)) {
      await expect(page.getByRole('region', { name: 'Colecionadores também viram' }).getByRole('article').first()).toBeVisible()
    }
    await snap(page, 'carrinho.png')
  })

  test('pagamento (Ana autenticada)', async ({ page }) => {
    await openAuthenticated(page, '/')
    await addToCartFromCatalog(page, 'Emerald Ape #042')
    await addToCartFromCatalog(page, 'Sage Nomad #009')
    await goToCart(page)
    await goToCheckout(page)
    await expectCollectorName(page, 'Ana Ribeiro')
    await expect(summaryValue(page.getByRole('complementary', { name: 'Seus NFTs' }), 'Subtotal')).toHaveText('2.88 ETH')
    await expect(page.getByText('Carteira não conectada.')).toBeVisible()
    await snap(page, 'pagamento.png')
  })
})
