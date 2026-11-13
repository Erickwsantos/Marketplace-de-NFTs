import type { Page } from '@playwright/test'
import {
  addToCartFromCatalog,
  connectWallet,
  expect,
  goToCart,
  goToCheckout,
  mockControl,
  openAuthenticated,
  openReview,
  test,
  type ScenarioId,
} from './fixtures'

const EMERALD = { id: 'emerald-ape-042', name: 'Emerald Ape #042' }

/** Ana autenticada, com 1 NFT no carrinho, no checkout. */
async function startCheckout(page: Page, scenario: ScenarioId = 'instant') {
  await openAuthenticated(page, '/', scenario)
  await addToCartFromCatalog(page, EMERALD.name)
  await goToCart(page)
  await goToCheckout(page)
  await expect(page.getByRole('textbox', { name: 'Nome de exibição' })).toHaveValue('Ana Ribeiro')
}

const orderIdFromUrl = (page: Page) => new URL(page.url()).pathname.split('/').pop()!

test.describe('Checkout', () => {
  test('compra completa do catálogo ao recibo confirmado', async ({ page }) => {
    await startCheckout(page)
    await expect(page.getByRole('table', { name: 'Itens do pedido' }).getByText(EMERALD.name)).toBeVisible()
    await connectWallet(page)

    const review = await openReview(page)
    await expect(review.getByText(EMERALD.name)).toBeVisible()
    await expect(review.getByText('MetaMask')).toBeVisible()
    await review.getByRole('button', { name: 'Confirmar compra' }).click()

    await page.waitForURL('**/orders/**')
    const orderId = orderIdFromUrl(page)
    await expect(page.getByRole('heading', { name: 'Aguardando confirmação' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
    const receipt = page.getByRole('region', { name: 'Recibo do pedido' })
    await expect(receipt.getByRole('table', { name: 'NFTs comprados' }).getByText(EMERALD.name)).toBeVisible()
    await expect(page.getByTestId('live-polite')).toHaveText('Pagamento confirmado')

    const orders = await mockControl(page).orders()
    expect(orders).toEqual([expect.objectContaining({ id: orderId, status: 'confirmed' })])

    // Itens comprados saem do carrinho.
    await goToCart(page)
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })

  test('pagamento recusado mantém os itens no carrinho', async ({ page }) => {
    await startCheckout(page, 'payment-declined')
    await connectWallet(page)
    const review = await openReview(page)
    await review.getByRole('button', { name: 'Confirmar compra' }).click()

    await page.waitForURL('**/orders/**')
    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
    await expect(page.getByText('Nenhum valor foi cobrado')).toBeVisible()
    await expect(page.getByTestId('live-assertive')).toHaveText('Pagamento recusado')
    expect(await mockControl(page).orders()).toEqual([expect.objectContaining({ status: 'declined' })])

    await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
    await page.waitForURL('**/cart')
    await expect(page.getByRole('region', { name: 'Itens do carrinho' }).getByRole('link', { name: EMERALD.name })).toBeVisible()
    const { carts } = await mockControl(page).snapshot()
    expect(carts.find((c) => c.userId === 'user-ana')?.items).toEqual([expect.objectContaining({ nftId: EMERALD.id, quantity: 1 })])
  })

  test('duplo clique em "Confirmar compra" gera um único pedido', async ({ page }) => {
    await startCheckout(page)
    await connectWallet(page)
    const review = await openReview(page)
    // Latência para que os cliques extras aconteçam com o envio em voo.
    await mockControl(page).setLatency({ kind: 'fixed', ms: 600 })
    await review.getByRole('button', { name: 'Confirmar compra' }).dblclick()

    await page.waitForURL('**/orders/**')
    await expect(page.getByRole('heading', { name: 'Aguardando confirmação' })).toBeVisible()
    await mockControl(page).setLatency(null)
    const orders = await mockControl(page).orders()
    expect(orders).toHaveLength(1)
    expect(orders[0]!.id).toBe(orderIdFromUrl(page))
  })

  test('cliques repetidos síncronos (antes do re-render) geram um único pedido', async ({ page }) => {
    await startCheckout(page)
    await connectWallet(page)
    const review = await openReview(page)
    await mockControl(page).setLatency({ kind: 'fixed', ms: 600 })
    await review.getByRole('button', { name: 'Confirmar compra' }).evaluate((button: HTMLButtonElement) => {
      for (let i = 0; i < 5; i++) button.click()
    })

    await page.waitForURL('**/orders/**')
    await expect(page.getByRole('heading', { name: 'Aguardando confirmação' })).toBeVisible()
    await mockControl(page).setLatency(null)
    expect(await mockControl(page).orders()).toHaveLength(1)
  })

  test('timeout no envio recupera o mesmo pedido (idempotência)', async ({ page }) => {
    test.setTimeout(60_000)
    await startCheckout(page, 'order-timeout')
    await connectWallet(page)
    const review = await openReview(page)
    const posted: string[] = []
    page.on('request', (r) => {
      if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/orders') posted.push(r.headers()['idempotency-key'] ?? '')
    })
    await review.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(review.getByRole('button', { name: 'Confirmar compra' })).toHaveAttribute('aria-busy', 'true')

    // 1ª resposta estoura o timeout do cliente (8 s); o reenvio usa a mesma chave.
    await page.waitForURL('**/orders/**', { timeout: 25_000 })
    expect(posted.length).toBeGreaterThanOrEqual(2)
    expect(new Set(posted).size).toBe(1)

    const orders = await mockControl(page).orders()
    expect(orders).toHaveLength(1)
    expect(orders[0]!.id).toBe(orderIdFromUrl(page))
    expect(orders[0]!.idempotencyKey).toBe(posted[0])
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
    const { orders: snapshotOrders } = await mockControl(page).snapshot()
    expect(snapshotOrders).toHaveLength(1)
  })

  test('carteira recusa a conexão', async ({ page }) => {
    await startCheckout(page, 'wallet-rejected')
    await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
    await expect(page.getByText('MetaMask recusou a conexão. Tente novamente ou escolha outro provedor.')).toBeVisible()
    await expect(page.getByText('Carteira não conectada.')).toBeVisible()

    // Sem conexão, a compra não segue para a revisão.
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Conecte a carteira selecionada antes de confirmar a compra.' })).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Revise seu pedido' })).toBeHidden()
    await expect(page.getByRole('button', { name: 'Conectar MetaMask' })).toBeFocused()
    expect(await mockControl(page).orders()).toEqual([])
  })

  test('validação do formulário de pagamento: campo obrigatório com erro associado', async ({ page }) => {
    await startCheckout(page)
    await connectWallet(page)
    const displayName = page.getByRole('textbox', { name: 'Nome de exibição' })
    await displayName.fill('')
    const email = page.getByRole('textbox', { name: 'E-mail', exact: true })
    await email.fill('ana@')

    // Validação no envio (mode onSubmit): erros associados e foco no primeiro inválido.
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByRole('dialog', { name: 'Revise seu pedido' })).toBeHidden()
    await expect(displayName).toBeFocused()
    await expect(displayName).toHaveAttribute('aria-invalid', 'true')
    await expect(displayName).toHaveAccessibleDescription('Informe o nome de exibição')
    const describedBy = await displayName.getAttribute('aria-describedby')
    await expect(page.locator(`[id="${describedBy}"]`)).toHaveText('Informe o nome de exibição')
    await expect(email).toHaveAccessibleDescription('E-mail inválido')
    expect(await mockControl(page).orders()).toEqual([])

    // Corrigido, a revisão abre normalmente.
    await displayName.fill('Ana Ribeiro')
    await email.fill('ana@kurio.test')
    await expect(displayName).toHaveAttribute('aria-invalid', 'false')
    await openReview(page)
  })
})
