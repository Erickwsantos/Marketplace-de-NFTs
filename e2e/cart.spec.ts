import type { Page } from '@playwright/test'
import {
  addToCartFromCatalog,
  expect,
  goToCart,
  login,
  mockControl,
  open,
  summaryValue,
  test,
  USERS,
} from './fixtures'

const EMERALD = { id: 'emerald-ape-042', name: 'Emerald Ape #042' }
const SAGE = { id: 'sage-nomad-009', name: 'Sage Nomad #009' }

const cartItems = (page: Page) => page.getByRole('region', { name: 'Itens do carrinho' }).getByRole('listitem')
const cartItem = (page: Page, name: string) => cartItems(page).filter({ has: page.getByRole('link', { name }) })
const summary = (page: Page) => page.getByRole('complementary', { name: 'Resumo da carteira' })
const eth = (text: string) => Number(text.replace(/[^\d.]/g, ''))

test.describe('Carrinho', () => {
  test('adicionar, alterar quantidade e remover itens', async ({ page }) => {
    await open(page, '/')
    await addToCartFromCatalog(page, EMERALD.name)
    await addToCartFromCatalog(page, SAGE.name)
    await goToCart(page)
    await expect(cartItems(page)).toHaveCount(2)

    const emerald = cartItem(page, EMERALD.name)
    await emerald.getByRole('button', { name: `Aumentar quantidade de ${EMERALD.name}` }).click()
    await expect(page.getByTestId('live-polite')).toHaveText(`Quantidade de ${EMERALD.name} alterada para 2.`)
    await expect(emerald.locator('output')).toHaveText('2')
    // Total da linha (cartão no mobile, coluna "Total" no desktop).
    await expect(emerald.getByText(/2\.38 ETH$/).filter({ visible: true })).toBeVisible()
    await expect(summaryValue(summary(page), 'Subtotal')).toHaveText('4.07 ETH')

    await emerald.getByRole('button', { name: `Diminuir quantidade de ${EMERALD.name}` }).click()
    await expect(emerald.locator('output')).toHaveText('1')

    await cartItem(page, SAGE.name).getByRole('button', { name: `Remover ${SAGE.name} do carrinho` }).click()
    await expect(page.getByTestId('live-polite')).toHaveText(`${SAGE.name} removido do carrinho.`)
    await expect(cartItems(page)).toHaveCount(1)
    await expect(summaryValue(summary(page), 'Subtotal')).toHaveText('1.19 ETH')

    const { carts } = await mockControl(page).snapshot()
    expect(carts.flatMap((c) => c.items)).toEqual([expect.objectContaining({ nftId: EMERALD.id, quantity: 1 })])

    // Remover o último item mostra o carrinho vazio.
    await emerald.getByRole('button', { name: `Remover ${EMERALD.name} do carrinho` }).click()
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })

  test('cupons inválido, expirado e válido', async ({ page }) => {
    await open(page, '/')
    await addToCartFromCatalog(page, EMERALD.name)
    await goToCart(page)
    await expect(summaryValue(summary(page), 'Total')).toBeVisible()
    const totalBefore = eth(await summaryValue(summary(page), 'Total').innerText())

    const code = summary(page).getByRole('textbox', { name: 'Código promocional' })
    const apply = summary(page).getByRole('button', { name: 'Aplicar' })

    await code.fill('XYZ')
    await apply.click()
    await expect(code).toHaveAttribute('aria-invalid', 'true')
    await expect(code).toHaveAccessibleDescription('Cupom inválido')

    await code.fill('EXPIRADO')
    await apply.click()
    await expect(code).toHaveAccessibleDescription('Cupom expirado')
    await expect(code).toBeFocused()

    await code.fill('KURIO10')
    await apply.click()
    await expect(summary(page).getByText('Cupom KURIO10 aplicado (10% off)')).toBeVisible()
    await expect(page.getByTestId('live-polite')).toHaveText('Cupom KURIO10 aplicado.')

    const discount = summaryValue(summary(page), 'Desconto (KURIO10)')
    await expect(discount).toHaveText('(-) 0.119 ETH')
    await expect.poll(async () => eth(await summaryValue(summary(page), 'Total').innerText())).toBeCloseTo(totalBefore - 0.119, 6)

    const subtotal = eth(await summaryValue(summary(page), 'Subtotal').innerText())
    const fee = eth(await summaryValue(summary(page), 'Taxa de rede').innerText())
    const total = eth(await summaryValue(summary(page), 'Total').innerText())
    expect(total).toBeCloseTo(subtotal - 0.119 + fee, 6)

    // Remover o cupom restaura o total.
    await summary(page).getByRole('button', { name: 'Remover cupom KURIO10' }).click()
    await expect.poll(async () => eth(await summaryValue(summary(page), 'Total').innerText())).toBeCloseTo(totalBefore, 6)
  })

  test('carrinho persiste após refresh', async ({ page }) => {
    await open(page, '/')
    await addToCartFromCatalog(page, EMERALD.name)
    await addToCartFromCatalog(page, SAGE.name)
    await goToCart(page)
    await cartItem(page, SAGE.name).getByRole('button', { name: `Aumentar quantidade de ${SAGE.name}` }).click()
    await expect(cartItem(page, SAGE.name).locator('output')).toHaveText('2')

    await page.reload()
    await expect(cartItems(page)).toHaveCount(2)
    await expect(cartItem(page, EMERALD.name).locator('output')).toHaveText('1')
    await expect(cartItem(page, SAGE.name).locator('output')).toHaveText('2')
    await expect(page.getByRole('link', { name: 'Carrinho, 3 itens' })).toBeVisible()
  })

  test('itens do visitante são preservados após o login', async ({ page }) => {
    await open(page, '/')
    await addToCartFromCatalog(page, EMERALD.name)
    await addToCartFromCatalog(page, SAGE.name)
    await goToCart(page)
    await expect(summary(page).getByText('Você entrará na sua conta para finalizar. Seus itens serão mantidos.')).toBeVisible()

    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await page.waitForURL((url) => url.pathname === '/login' && url.searchParams.get('redirect') === '/checkout')
    await login(page, USERS.ana)
    await page.waitForURL('**/checkout')

    const order = page.getByRole('table', { name: 'Itens do pedido' })
    await expect(order.getByText(EMERALD.name)).toBeVisible()
    await expect(order.getByText(SAGE.name)).toBeVisible()

    const { carts } = await mockControl(page).snapshot()
    const anaCart = carts.find((c) => c.userId === 'user-ana')
    expect(anaCart?.items.map((i) => i.nftId).sort()).toEqual([EMERALD.id, SAGE.id])

    await goToCart(page)
    await expect(cartItems(page)).toHaveCount(2)
  })
})
