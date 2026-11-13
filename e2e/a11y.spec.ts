import type { Locator, Page } from '@playwright/test'
import { catalogCards, expect, isMobile, open, test } from './fixtures'

/** Pressiona Tab várias vezes e garante que o foco nunca sai do container. */
async function expectFocusTrapped(page: Page, container: Locator, presses = 12) {
  for (let i = 0; i < presses; i++) {
    await page.keyboard.press(i % 3 === 2 ? 'Shift+Tab' : 'Tab')
    expect(await container.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  }
}

test.describe('Acessibilidade', () => {
  test('teclado: "Pular para o conteúdo" é o primeiro foco e leva ao conteúdo principal', async ({ page }) => {
    await open(page, '/')
    await expect(catalogCards(page).first()).toBeVisible()

    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeInViewport()

    await page.keyboard.press('Enter')
    await expect(page.getByRole('main')).toBeFocused()
    await expect(page).toHaveURL(/#conteudo$/)
  })

  test('diálogo de busca: foco preso e Esc devolve o foco ao botão', async ({ page }) => {
    await open(page, '/')
    const trigger = page.getByRole('button', { name: 'Buscar NFTs' })
    await trigger.focus()
    await page.keyboard.press('Enter')

    const dialog = page.getByRole('dialog', { name: 'Buscar NFTs' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('textbox', { name: 'Termo de busca' })).toBeFocused()
    await expectFocusTrapped(page, dialog)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('drawer de filtros no mobile: foco gerenciado', async ({ page }) => {
    test.skip(!isMobile(page), 'No desktop os filtros ficam na coluna lateral (sem drawer).')
    await open(page, '/')
    const trigger = page.getByRole('button', { name: /^Filtros/ })
    await trigger.click()

    const sheet = page.getByRole('dialog', { name: 'Filtros' })
    await expect(sheet).toBeVisible()
    expect(await sheet.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    await expectFocusTrapped(page, sheet, 20)

    // Ativar um filtro pelo teclado mantém o foco no drawer.
    const photography = sheet.getByRole('button', { name: /^Fotografia/ })
    await photography.focus()
    await page.keyboard.press('Enter')
    await expect(photography).toHaveAttribute('aria-pressed', 'true')
    expect(await sheet.evaluate((el) => el.contains(document.activeElement))).toBe(true)

    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveAccessibleName('Filtros (1 ativos)')
  })

  test('login: erros associados aos campos via aria-describedby', async ({ page }) => {
    await open(page, '/login')
    const dialog = page.getByRole('dialog', { name: 'Entrar' })
    const email = dialog.getByRole('textbox', { name: 'E-mail' })
    await expect(email).toBeFocused()

    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(email).toHaveAccessibleDescription('Informe o e-mail')
    const errorId = await email.getAttribute('aria-describedby')
    expect(errorId).toBeTruthy()
    await expect(dialog.locator(`[id="${errorId}"]`)).toHaveText('Informe o e-mail')
    await expect(email).toBeFocused()

    const password = dialog.getByLabel(/^Senha\*?$/)
    await expect(password).toHaveAttribute('aria-invalid', 'true')
    await expect(password).toHaveAccessibleDescription('Informe a senha')

    await email.fill('ana@')
    await email.blur()
    await expect(email).toHaveAccessibleDescription('E-mail inválido')
  })

  test('rede lenta: skeleton do catálogo antes dos cards', async ({ page }) => {
    await open(page, '/', 'slow')
    const skeleton = page.getByRole('list', { name: 'Carregando NFTs' })
    await expect(skeleton).toBeVisible()
    await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-busy', 'true')
    await expect(catalogCards(page)).toHaveCount(0)

    await expect(catalogCards(page)).toHaveCount(9, { timeout: 15_000 })
    await expect(skeleton).toBeHidden()
    await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-busy', 'false')
  })

  test('falha do servidor: estado de erro e recuperação com "Tentar novamente"', async ({ page }) => {
    await open(page, '/', 'server-error')
    const error = page.getByRole('tabpanel').getByRole('alert')
    // Três respostas 500 esgotam os retries automáticos (backoff ~3 s).
    await expect(error).toContainText('Não foi possível carregar o catálogo', { timeout: 15_000 })
    await expect(catalogCards(page)).toHaveCount(0)

    await error.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(catalogCards(page)).toHaveCount(9)
    await expect(error).toBeHidden()
  })
})
