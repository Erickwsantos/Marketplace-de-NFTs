import { catalogResults, expect, mockControl, openAuthenticated, test } from './fixtures'

const NFT = { id: 'emerald-ape-042', name: 'Emerald Ape #042' }

const anaFavorites = async (page: Parameters<typeof mockControl>[0]) =>
  (await mockControl(page).snapshot()).favorites['user-ana'] ?? []

test.describe('Favoritos', () => {
  test('favoritar no card e no detalhe (aria-pressed) persiste após reload', async ({ page }) => {
    await openAuthenticated(page, '/')
    const card = catalogResults(page).getByRole('article', { name: NFT.name })
    const cardFavorite = card.getByRole('button', { name: /favorit/i })
    await expect(cardFavorite).toHaveAttribute('aria-pressed', 'false')
    await expect(cardFavorite).toHaveAccessibleName(`Favoritar ${NFT.name}`)

    await cardFavorite.click()
    await expect(cardFavorite).toHaveAttribute('aria-pressed', 'true')
    await expect(cardFavorite).toHaveAccessibleName(`Remover ${NFT.name} dos favoritos`)
    await expect(page.getByTestId('live-polite')).toContainText(`${NFT.name} adicionado aos favoritos`)
    await expect.poll(() => anaFavorites(page)).toContain(NFT.id)

    await page.reload()
    await expect(catalogResults(page).getByRole('article', { name: NFT.name }).getByRole('button', { name: /favorit/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    // Detalhe reflete o mesmo estado e permite desfavoritar.
    await card.getByRole('link', { name: NFT.name, exact: true }).click()
    await page.waitForURL(`**/nfts/${NFT.id}`)
    const detailFavorite = page.getByRole('button', { name: /^Favorita(r|do)$/ })
    await expect(detailFavorite).toHaveAttribute('aria-pressed', 'true')
    await expect(detailFavorite).toHaveText('Favoritado')
    await detailFavorite.click()
    await expect(detailFavorite).toHaveAttribute('aria-pressed', 'false')
    await expect(detailFavorite).toHaveText('Favoritar')
    await expect.poll(() => anaFavorites(page)).not.toContain(NFT.id)

    await page.reload()
    await expect(page.getByRole('button', { name: /^Favorita(r|do)$/ })).toHaveAttribute('aria-pressed', 'false')
  })

  test('falha ao favoritar faz rollback com mensagem; nova tentativa funciona', async ({ page }) => {
    await openAuthenticated(page, '/', 'favorite-failure')
    // Latência no servidor simulado para observar o estado otimista antes da resposta.
    await mockControl(page).setLatency({ kind: 'fixed', ms: 800 })

    const favorite = catalogResults(page).getByRole('article', { name: NFT.name }).getByRole('button', { name: /favorit/i })
    await expect(favorite).toHaveAttribute('aria-pressed', 'false')

    await favorite.click()
    // Otimista: marca na hora…
    await expect(favorite).toHaveAttribute('aria-pressed', 'true')
    // …e volta ao estado anterior quando a API falha.
    const message = `Não foi possível atualizar os favoritos de ${NFT.name}. Tente novamente.`
    await expect(favorite).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByTestId('live-assertive')).toHaveText(message)
    await expect(page.getByRole('region', { name: /Notificações/ }).getByText(message)).toBeVisible()
    expect(await anaFavorites(page)).not.toContain(NFT.id)

    // Nova tentativa (a falha ocorre só uma vez).
    await favorite.click()
    await expect(favorite).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => anaFavorites(page)).toContain(NFT.id)
    await mockControl(page).setLatency(null)
    await page.reload()
    await expect(catalogResults(page).getByRole('article', { name: NFT.name }).getByRole('button', { name: /favorit/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
