import {
  expect,
  goToLoginFromLayout,
  isMobile,
  login,
  logout,
  mockControl,
  open,
  openAuthenticated,
  profileNav,
  test,
  USERS,
} from './fixtures'

test.describe('Autenticação', () => {
  test('cadastro: validação de campos vazios e senhas diferentes', async ({ page }) => {
    await open(page, '/register')
    const dialog = page.getByRole('dialog', { name: 'Criar perfil de colecionador' })
    const username = dialog.getByRole('textbox', { name: 'Nome de usuário' })
    const email = dialog.getByRole('textbox', { name: 'Digite seu e-mail' })
    const password = dialog.getByLabel(/^Senha\*?$/)
    const confirm = dialog.getByLabel(/^Confirmar senha\*?$/)

    await dialog.getByRole('button', { name: 'Criar conta' }).click()
    await expect(username).toHaveAttribute('aria-invalid', 'true')
    await expect(username).toHaveAccessibleDescription('Use ao menos 3 caracteres')
    await expect(email).toHaveAccessibleDescription('Informe o e-mail')
    await expect(password).toHaveAccessibleDescription('A senha deve ter ao menos 8 caracteres')
    await expect(confirm).toHaveAccessibleDescription('Confirme a senha')
    // Foco vai para o primeiro campo inválido.
    await expect(username).toBeFocused()

    await username.fill('nova.colecionadora')
    await email.fill('nova@kurio.test')
    await password.fill('senha1234')
    await confirm.fill('outra1234')
    await dialog.getByRole('button', { name: 'Criar conta' }).click()
    await expect(confirm).toHaveAccessibleDescription('As senhas não conferem')
    await expect(username).toHaveAttribute('aria-invalid', 'false')

    const { users } = await mockControl(page).snapshot()
    expect(users.map((u) => u.email)).not.toContain('nova@kurio.test')
  })

  test('cadastro: e-mail já cadastrado mostra erro no campo; sucesso autentica', async ({ page }) => {
    await open(page, '/register')
    const dialog = page.getByRole('dialog', { name: 'Criar perfil de colecionador' })
    const email = dialog.getByRole('textbox', { name: 'Digite seu e-mail' })
    await dialog.getByRole('textbox', { name: 'Nome de usuário' }).fill('outra.ana')
    await email.fill(USERS.ana.email)
    await dialog.getByLabel(/^Senha\*?$/).fill('senha1234')
    await dialog.getByLabel(/^Confirmar senha\*?$/).fill('senha1234')
    await dialog.getByRole('button', { name: 'Criar conta' }).click()

    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(email).toHaveAccessibleDescription('Este e-mail já está cadastrado')
    await expect(email).toBeFocused()

    await email.fill('outra.ana@kurio.test')
    await dialog.getByRole('button', { name: 'Criar conta' }).click()
    await page.waitForURL((url) => url.pathname === '/')
    await expect(page.getByRole('dialog')).toBeHidden()
    const { users } = await mockControl(page).snapshot()
    expect(users.filter((u) => u.email === 'outra.ana@kurio.test')).toHaveLength(1)
  })

  test('login inválido mostra erro', async ({ page }) => {
    await open(page, '/login')
    const dialog = page.getByRole('dialog', { name: 'Entrar' })
    await dialog.getByRole('textbox', { name: 'E-mail' }).fill(USERS.ana.email)
    await dialog.getByLabel(/^Senha\*?$/).fill('senha-errada1')
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()

    await expect(dialog.getByRole('alert')).toHaveText('E-mail ou senha incorretos.')
    await expect(page).toHaveURL(/\/login/)
  })

  test('visitante em rota privada faz login e volta ao destino', async ({ page }) => {
    await open(page, '/profile')
    await page.waitForURL((url) => url.pathname === '/login' && url.searchParams.get('redirect') === '/profile')
    await login(page, USERS.ana)
    await page.waitForURL((url) => url.pathname === '/profile')
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Nome de exibição' })).toHaveValue(USERS.ana.name)
  })

  test('sessão expirada leva ao login com aviso e retoma o fluxo', async ({ page }) => {
    await page.clock.install()
    await openAuthenticated(page, '/profile', 'session-expired')
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()

    // Prazo local vence (45 s): o verificador periódico encerra a sessão.
    await page.clock.fastForward(46_000)
    await page.waitForURL((url) => url.pathname === '/login' && url.searchParams.get('reason') === 'expired')
    const dialog = page.getByRole('dialog', { name: 'Entrar' })
    await expect(dialog.getByRole('status')).toHaveText('Sua sessão expirou. Entre novamente para continuar de onde parou.')
    expect(new URL(page.url()).searchParams.get('redirect')).toBe('/profile')
    await login(page, USERS.ana)
    await page.waitForURL((url) => url.pathname === '/profile')
    await expect(page.getByRole('textbox', { name: 'Nome de exibição' })).toHaveValue(USERS.ana.name)

    // Sessão expira no servidor: a próxima ação numa rota privada recebe 401 e volta ao login.
    await mockControl(page).expireSessions()
    await profileNav(page).getByRole('link', { name: 'Carteiras' }).click()
    await page.waitForURL(
      (url) =>
        url.pathname === '/login' &&
        url.searchParams.get('reason') === 'expired' &&
        url.searchParams.get('redirect') === '/profile/wallets',
    )
    await expect(page.getByRole('dialog', { name: 'Entrar' }).getByRole('status')).toContainText('Sua sessão expirou')
    await login(page, USERS.ana)
    await page.waitForURL((url) => url.pathname === '/profile/wallets')
    await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()
  })

  test('logout encerra a sessão', async ({ page }) => {
    await openAuthenticated(page, '/profile')
    await logout(page)
    if (isMobile(page)) {
      await expect(page.getByRole('navigation', { name: 'Navegação inferior' }).getByRole('link', { name: 'Entrar' })).toBeVisible()
    } else {
      await expect(page.getByRole('banner').getByRole('link', { name: 'Entrar' })).toBeVisible()
      await expect(page.getByRole('banner').getByRole('link', { name: USERS.ana.name })).toHaveCount(0)
    }
    expect(await page.evaluate(() => localStorage.getItem('kurio:session'))).toBeNull()
    // O servidor revogou o token da sessão encerrada.
    const { sessions } = await mockControl(page).snapshot()
    expect(sessions.filter((s) => s.userId === 'user-ana' && !s.revoked)).toEqual([])

    // Rota privada volta a exigir login.
    await page.goto('/profile')
    await page.waitForURL((url) => url.pathname === '/login')
  })

  test('troca de usuário não vaza favoritos', async ({ page }) => {
    await openAuthenticated(page, '/profile/favorites')
    await expect(page.getByRole('heading', { name: 'Lista de interesse' })).toBeVisible()
    await expect(page.getByRole('main').getByRole('article')).toHaveCount(2)

    await logout(page)
    await goToLoginFromLayout(page)
    await login(page, USERS.bruno)
    await page.waitForURL((url) => url.pathname === '/')
    await expect(page.getByRole('dialog')).toBeHidden()

    // Navegação no app (sem reload): o cache não pode trazer dados da Ana.
    if (isMobile(page)) {
      await page.getByRole('navigation', { name: 'Navegação inferior' }).getByRole('link', { name: 'Favoritos' }).click()
    } else {
      await page.getByRole('banner').getByRole('link', { name: USERS.bruno.name }).click()
      await profileNav(page).getByRole('link', { name: 'Lista de interesse' }).click()
    }
    await page.waitForURL((url) => url.pathname === '/profile/favorites')
    await expect(page.getByText('Nenhum NFT favoritado ainda')).toBeVisible()
    await expect(page.getByRole('main').getByRole('article')).toHaveCount(0)
  })
})
