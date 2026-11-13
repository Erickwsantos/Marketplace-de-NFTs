import type { Page } from '@playwright/test'
import { expect, makePng, mockControl, openAuthenticated, test, USERS } from './fixtures'

const profileForm = (page: Page) => page.getByRole('form', { name: 'Dados do perfil' })
const passwordForm = (page: Page) => page.getByRole('form', { name: 'Alterar senha' })

test.describe('Conta', () => {
  test('edição de perfil: erro de validação e sucesso persistido após reload', async ({ page }) => {
    await openAuthenticated(page, '/profile')
    const form = profileForm(page)
    const displayName = form.getByRole('textbox', { name: 'Nome de exibição' })
    await expect(displayName).toHaveValue(USERS.ana.name)

    // Validação no envio (mode onSubmit): nada é salvo, erros associados e
    // foco no primeiro campo inválido.
    await displayName.fill('A')
    const ens = form.getByRole('textbox', { name: 'Nome ENS (sufixo .eth)' })
    await ens.fill('Nome Invalido')
    await form.getByRole('button', { name: 'Salvar' }).click()
    await expect(displayName).toBeFocused()
    await expect(displayName).toHaveAttribute('aria-invalid', 'true')
    await expect(displayName).toHaveAccessibleDescription('Informe o nome de exibição')
    await expect(ens).toHaveAccessibleDescription('Use letras minúsculas, números e "-"')
    expect((await mockControl(page).snapshot()).users.find((u) => u.email === USERS.ana.email)?.displayName).toBe(USERS.ana.name)

    await displayName.fill('Ana R. Colecionadora')
    await ens.fill('ana-colecionadora')
    await ens.blur()
    await expect(ens).toHaveAttribute('aria-invalid', 'false')
    await expect(displayName).toHaveAttribute('aria-invalid', 'false')
    await form.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByTestId('live-polite')).toHaveText('Perfil atualizado.')
    await expect(displayName).toHaveAttribute('aria-invalid', 'false')

    await page.reload()
    await expect(profileForm(page).getByRole('textbox', { name: 'Nome de exibição' })).toHaveValue('Ana R. Colecionadora')
    await expect(profileForm(page).getByRole('textbox', { name: 'Nome ENS (sufixo .eth)' })).toHaveValue('ana-colecionadora')
    const { users } = await mockControl(page).snapshot()
    expect(users.find((u) => u.email === USERS.ana.email)?.displayName).toBe('Ana R. Colecionadora')
  })

  test('avatar: envio de imagem e remoção', async ({ page }) => {
    await openAuthenticated(page, '/profile')
    const form = profileForm(page)
    await expect(form.getByRole('img', { name: `Sem avatar: iniciais de ${USERS.ana.name}` })).toHaveText('AR')

    await form.getByLabel('Escolher imagem do avatar').setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: makePng(4, 4, [255, 122, 0]),
    })
    await expect(page.getByTestId('live-polite')).toHaveText('Avatar atualizado.')
    const avatar = form.getByRole('img', { name: `Avatar de ${USERS.ana.name}` })
    await expect(avatar).toBeVisible()
    await expect(avatar).toHaveAttribute('src', /^data:image\/webp;base64,/)
    await expect.poll(async () => (await mockControl(page).snapshot()).users.find((u) => u.id === 'user-ana')?.avatarUrl).toMatch(/^data:image/)

    await page.reload()
    await expect(profileForm(page).getByRole('img', { name: `Avatar de ${USERS.ana.name}` })).toBeVisible()

    await profileForm(page).getByRole('button', { name: 'Remover' }).click()
    await expect(page.getByTestId('live-polite')).toHaveText('Avatar removido.')
    await expect(profileForm(page).getByRole('img', { name: `Sem avatar: iniciais de ${USERS.ana.name}` })).toBeVisible()
    const { users } = await mockControl(page).snapshot()
    expect(users.find((u) => u.id === 'user-ana')?.avatarUrl).toBeNull()
  })

  test('arquivo de avatar inválido mostra erro', async ({ page }) => {
    await openAuthenticated(page, '/profile')
    const form = profileForm(page)
    await form.getByLabel('Escolher imagem do avatar').setInputFiles({
      name: 'avatar.gif',
      mimeType: 'image/gif',
      buffer: Buffer.from('GIF89a'),
    })
    await expect(form.getByRole('alert')).toHaveText('Use uma imagem PNG, JPG ou WEBP.')
    await expect(form.getByRole('button', { name: 'Alterar' })).toHaveAccessibleDescription('Use uma imagem PNG, JPG ou WEBP.')
  })

  test('senha atual incorreta mostra erro no campo', async ({ page }) => {
    await openAuthenticated(page, '/profile')
    const form = passwordForm(page)
    const current = form.getByLabel(/^Senha atual\*?$/)
    await current.fill('senhaerrada1')
    await form.getByLabel(/^Nova senha\*?$/).fill('novaSenha123')
    await form.getByLabel(/^Confirmar nova senha\*?$/).fill('novaSenha123')
    await form.getByRole('button', { name: 'Salvar' }).click()

    await expect(current).toHaveAttribute('aria-invalid', 'true')
    await expect(current).toHaveAccessibleDescription('Senha atual incorreta')
    await expect(current).toBeFocused()
  })

  test('carteiras (Bruno): endereço inválido e cadastro persistido após reload', async ({ page }) => {
    await openAuthenticated(page, '/profile/wallets', 'instant', USERS.bruno)
    await expect(page.getByText('Você ainda não adicionou uma carteira principal.')).toBeVisible()
    await page.getByRole('button', { name: 'Adicionar carteira principal' }).click()

    const form = page.getByRole('form', { name: 'Carteira principal' })
    await form.getByRole('textbox', { name: 'Nome de exibição' }).fill('Bruno Lima')
    await form.getByRole('textbox', { name: 'Apelido da carteira' }).fill('Principal')
    await form.getByRole('textbox', { name: 'Nome do perfil' }).fill('bruno.criador')
    const address = form.getByRole('textbox', { name: 'Endereço da carteira' })
    await address.fill('0x123')
    await form.getByRole('textbox', { name: 'Código de indicação' }).fill('KURIO-2026')
    await form.getByRole('textbox', { name: 'E-mail' }).fill(USERS.bruno.email)
    await form.getByRole('textbox', { name: 'Nome ENS (sufixo .eth)' }).fill('bruno-lima')
    await form.getByRole('button', { name: 'Salvar carteira' }).click()

    await expect(address).toHaveAttribute('aria-invalid', 'true')
    await expect(address).toHaveAccessibleDescription('Endereço inválido: use 0x seguido de 40 caracteres hexadecimais')
    await expect(address).toBeFocused()
    expect((await mockControl(page).snapshot()).wallets.filter((w) => w.userId === 'user-bruno')).toEqual([])

    const valid = '0xabcdef0123456789abcdef0123456789abcdef01'
    await address.fill(valid)
    await form.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByTestId('live-polite')).toHaveText('Carteira principal adicionada.')

    await page.reload()
    const saved = page.getByRole('form', { name: 'Carteira principal' })
    await expect(saved.getByRole('textbox', { name: 'Endereço da carteira' })).toHaveValue(valid)
    await expect(saved.getByRole('textbox', { name: 'Apelido da carteira' })).toHaveValue('Principal')
    const wallets = (await mockControl(page).snapshot()).wallets.filter((w) => w.userId === 'user-bruno')
    expect(wallets).toEqual([expect.objectContaining({ role: 'primary', profile: expect.objectContaining({ address: valid }) })])
  })
})
