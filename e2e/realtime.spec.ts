import type { Page } from '@playwright/test'
import {
  addToCartFromCatalog,
  connectWallet,
  expect,
  goToCart,
  goToCheckout,
  mockControl,
  open,
  openAuthenticated,
  openReview,
  summaryValue,
  test,
  type ScenarioId,
} from './fixtures'

const EMERALD = { id: 'emerald-ape-042', name: 'Emerald Ape #042', edition: 'emerald-ape-042-1-50' }

/** Ana autenticada, com Emerald Ape no carrinho, no checkout. */
async function startCheckout(page: Page, scenario: ScenarioId = 'instant') {
  await openAuthenticated(page, '/', scenario)
  await addToCartFromCatalog(page, EMERALD.name)
  await goToCart(page)
  await goToCheckout(page)
  await expect(page.getByRole('textbox', { name: 'Nome de exibição' })).toHaveValue('Ana Ribeiro')
}

const orderSummary = (page: Page) => page.getByRole('complementary', { name: 'Seus NFTs' })
const confirmButton = (page: Page) => page.getByRole('button', { name: 'Confirmar compra' })

test.describe('Tempo real', () => {
  test('preço alterado durante o checkout exige confirmar os novos preços', async ({ page }) => {
    await startCheckout(page)
    await connectWallet(page)
    const summary = orderSummary(page)
    await expect(summaryValue(summary, 'Subtotal')).toHaveText('1.19 ETH')
    await expect(confirmButton(page)).toBeEnabled()
    const totalBefore = await summaryValue(summary, 'Total').innerText()

    // Mudança no servidor simulado → evento nft.updated via socket.io-client.
    await mockControl(page).updateNft(EMERALD.id, { editionId: EMERALD.edition, priceEth: '1.50' })

    const notice = summary.getByRole('alert').filter({ hasText: 'Seu carrinho mudou' })
    await expect(notice).toBeVisible()
    await expect(confirmButton(page)).toBeDisabled()
    await expect(summary.getByText('Resolva as pendências do carrinho para continuar.')).toBeVisible()
    await expect(page.getByTestId('live-polite')).toContainText(`Preço ou disponibilidade atualizados no carrinho: ${EMERALD.name}`)

    await notice.getByRole('button', { name: 'Confirmar novos preços' }).click()
    await expect(notice).toBeHidden()
    await expect(confirmButton(page)).toBeEnabled()
    await expect(summaryValue(summary, 'Subtotal')).toHaveText('1.50 ETH')
    await expect(summaryValue(summary, 'Total')).not.toHaveText(totalBefore)

    // A revisão usa o novo total e o pedido pode seguir.
    const review = await openReview(page)
    await expect(summaryValue(review, 'Subtotal')).toHaveText('1.50 ETH')
    await expect(review.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
  })

  test('edição esgotada durante o checkout bloqueia a compra', async ({ page }) => {
    await startCheckout(page)
    await connectWallet(page)
    await expect(confirmButton(page)).toBeEnabled()

    await mockControl(page).updateNft(EMERALD.id, { editionId: EMERALD.edition, available: 0 })

    const summary = orderSummary(page)
    const notice = summary.getByRole('alert').filter({ hasText: 'Seu carrinho mudou' })
    await expect(notice).toBeVisible()
    await expect(notice.getByText('Ajuste as quantidades ou remova os itens indicados para continuar.')).toBeVisible()
    await expect(notice.getByRole('button', { name: 'Confirmar novos preços' })).toHaveCount(0)
    await expect(confirmButton(page)).toBeDisabled()

    // No carrinho, o item aparece como esgotado.
    await goToCart(page)
    await expect(page.getByRole('region', { name: 'Itens do carrinho' }).getByText('Esgotado').filter({ visible: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled()
  })

  test('eventos duplicados e antigos não regridem o preço exibido no detalhe', async ({ page }) => {
    await open(page, `/nfts/${EMERALD.id}`)
    const price = page.locator('main data').first()
    await expect(price).toHaveText('1.19 ETH')
    await expect.poll(() => mockControl(page).socketConnections()).toBeGreaterThan(0)

    await mockControl(page).updateNft(EMERALD.id, { editionId: EMERALD.edition, priceEth: '1.50' })
    await expect(price).toHaveText('1.50 ETH')
    await mockControl(page).updateNft(EMERALD.id, { editionId: EMERALD.edition, priceEth: '1.75' })
    await expect(price).toHaveText('1.75 ETH')
    await expect(page.getByText('O preço da edição 1/50 mudou de 1.50 ETH para 1.75 ETH.')).toBeVisible()

    // Duplicata (mesmo id) e versão antiga (preço 1.50) chegam pelo socket…
    expect(await mockControl(page).replayLastEvent()).not.toBeNull()
    expect(await mockControl(page).replayStale(EMERALD.id)).not.toBeNull()

    // …e um evento novo serve de marco: quando ele aparece, os anteriores já foram processados.
    await mockControl(page).updateNft(EMERALD.id, { editionId: EMERALD.edition, available: 20 })
    await expect(page.getByText(/Máx\. 10 por pedido · 20 disponíveis/)).toBeVisible()
    await expect(price).toHaveText('1.75 ETH')

    // REST concorda com o que está na tela.
    await page.reload()
    await expect(page.locator('main data').first()).toHaveText('1.75 ETH')
  })

  test('desconexão e retomada de pedido pendente', async ({ page }) => {
    await startCheckout(page, 'slow-payment')
    await connectWallet(page)
    const review = await openReview(page)
    await review.getByRole('button', { name: 'Confirmar compra' }).click()

    await page.waitForURL('**/orders/**')
    const orderId = new URL(page.url()).pathname.split('/').pop()!
    const pending = page.getByRole('region', { name: 'Pedido pendente' })
    await expect(pending.getByRole('heading', { name: 'Aguardando confirmação' })).toBeVisible()
    await expect(pending.getByText(`Pedido ${orderId}`)).toBeVisible()

    // Socket cai e fica offline; o refresh retoma o MESMO pedido pendente.
    await mockControl(page).setSocketOnline(false)
    await page.reload()
    await expect(pending.getByRole('heading', { name: 'Aguardando confirmação' })).toBeVisible()
    await expect(pending.getByText(`Pedido ${orderId}`)).toBeVisible()
    expect(await mockControl(page).socketConnections()).toBe(0)
    expect(await mockControl(page).orders()).toEqual([expect.objectContaining({ id: orderId, status: 'pending' })])

    // Pagamento liquida no servidor enquanto o cliente está offline; a conexão volta.
    await mockControl(page).resolveOrder(orderId)
    await mockControl(page).setSocketOnline(true)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/orders/${orderId}$`))

    const orders = await mockControl(page).orders()
    expect(orders).toEqual([expect.objectContaining({ id: orderId, status: 'confirmed' })])
  })
})
