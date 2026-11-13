import { expect, isMobile, mockControl, open, test } from './fixtures'

const NFT = { id: 'emerald-ape-042', name: 'Emerald Ape #042' }

test.describe('Detalhe do NFT', () => {
  test('acesso direto pela URL', async ({ page }) => {
    await open(page, `/nfts/${NFT.id}`)
    await expect(page.getByRole('heading', { level: 1, name: NFT.name })).toBeVisible()
    await expect(page).toHaveTitle(`${NFT.name} | Kurio`)
    // Edição padrão = menor preço disponível (1/50).
    await expect(page.getByRole('radio', { name: '1/50' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('main data').first()).toHaveText('1.19 ETH')
    await expect(page.getByText('ID do token:')).toBeVisible()
  })

  test('NFT inexistente mostra "NFT não encontrado"', async ({ page }) => {
    await open(page, '/nfts/nao-existe')
    await expect(page.getByText('NFT não encontrado')).toBeVisible()
    await expect(page.getByText('Este NFT não existe ou foi removido do mercado.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Voltar ao início' })).toBeVisible()
  })

  test('edição "Aberta" indisponível fica desabilitada', async ({ page }) => {
    await open(page, `/nfts/${NFT.id}`)
    const open_ = page.getByRole('radio', { name: /Aberta/ })
    await expect(open_).toBeDisabled()
    await expect(open_).toContainText('indisponível')
    await expect(open_).toHaveAttribute('aria-checked', 'false')
  })

  test('limite de quantidade: "+" desabilita no máximo por pedido', async ({ page }) => {
    await open(page, `/nfts/${NFT.id}`)
    const limits = await page.getByText(/^Máx\. \d+ por pedido · \d+ disponíveis$/).innerText()
    const [, maxPerOrder, available] = /Máx\. (\d+) por pedido · (\d+) disponíveis/.exec(limits)!.map(Number)
    const max = Math.min(maxPerOrder!, available!)
    expect(max).toBeGreaterThan(1)

    const plus = page.getByRole('button', { name: `Aumentar quantidade de ${NFT.name}` })
    const minus = page.getByRole('button', { name: `Diminuir quantidade de ${NFT.name}` })
    const value = page.getByRole('group', { name: NFT.name }).locator('output')
    await expect(minus).toBeDisabled()
    for (let i = 1; i < max; i++) {
      await plus.click()
      await expect(value).toHaveText(String(i + 1))
    }
    await expect(plus).toBeDisabled()
    await expect(plus).toHaveAttribute('title', `Limite de ${max} por pedido`)
    await expect(minus).toBeEnabled()
  })

  test('comprar adiciona ao carrinho e abre o carrinho', async ({ page }) => {
    await open(page, `/nfts/${NFT.id}`)
    await page.getByRole('button', { name: `Aumentar quantidade de ${NFT.name}` }).click()
    await page.getByRole('button', { name: isMobile(page) ? 'Comprar NFT' : 'Comprar', exact: true }).click()

    await page.waitForURL('**/cart')
    await expect(page.getByRole('link', { name: NFT.name }).first()).toBeVisible()
    await expect(page.getByRole('group', { name: NFT.name }).locator('output')).toHaveText('2')
    await expect(page.getByTestId('live-polite')).toContainText(`${NFT.name} adicionado ao carrinho`)

    const { carts } = await mockControl(page).snapshot()
    const items = carts.flatMap((c) => c.items)
    expect(items).toEqual([expect.objectContaining({ nftId: NFT.id, quantity: 2 })])
  })
})
