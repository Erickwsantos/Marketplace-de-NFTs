# Arquitetura — Kurio NFT Marketplace

## 1. Visão geral

```
src/
  contracts/      Schemas Zod = contratos REST e de eventos (fonte única de tipos)
  shared/         api (Axios, erros, query keys, sessão), ui (shadcn + primitivos), lib, a11y
  features/       catalog · nft · cart · checkout · orders · auth · account · realtime · pwa
  routes/         TanStack Router (file-based)
  app/            bootstrap, providers, layout
  mocks/          "Servidor" simulado (MSW REST + Socket.IO), cenários e API de controle
  pwa/sw.ts       Service worker único (precache + worker do MSW)
e2e/              Playwright (E2E, regressão visual)
scripts/          otimização de assets, auditoria Lighthouse
```

**Regras de dependência**

- `contracts` não depende de nada além de Zod. O cliente (Axios/Query/UI) **e** os handlers MSW validam contra os mesmos schemas.
- UI, hooks e cliente HTTP **não importam** `src/mocks` (regra `no-restricted-imports` no ESLint). A única ponte é o `import()` dinâmico em `main.tsx`, controlado por `VITE_ENABLE_MOCKS`.
- Regra de negócio (preço, cupom, taxa, estoque, total, idempotência) existe **somente** no servidor simulado. A UI exibe a cotação da API.

## 2. Contratos REST

Base: `VITE_API_BASE_URL` (padrão `/api`). Rotas em `src/contracts/api.ts` (`API_ROUTES`), usadas pelo cliente (`apiPath`) e pelos handlers.

| Recurso | Método e rota | Auth | Corpo / query | Resposta |
| --- | --- | --- | --- | --- |
| Cadastro | `POST /auth/register` | — | `RegisterInput` | `201 Session` |
| Login | `POST /auth/login` | — | `LoginInput` | `200 Session` |
| Sessão | `GET /auth/session` | obrigatória | — | `CurrentSession` |
| Logout | `POST /auth/logout` | obrigatória | — | `204` |
| Catálogo | `GET /nfts` | — | `CatalogQuery` (q, categories[], networks[], minPrice, maxPrice, tab, sort, page, pageSize, collection, exclude) | `CatalogResponse` (itens, paginação, facets) |
| Destaques | `GET /nfts/featured` | — | — | `FeaturedResponse` |
| Detalhe | `GET /nfts/:nftId` | — | — | `NftDetail` |
| Favoritos | `GET /favorites` · `PUT/DELETE /favorites/:nftId` | obrigatória | — | `Favorites` · `FavoriteMutation` |
| Carrinho | `GET /cart` | opcional | — | `Cart` |
| | `POST /cart/items` | opcional | `AddCartItemInput` | `201 Cart` |
| | `PATCH/DELETE /cart/items/:itemId` | opcional | `{ quantity }` | `Cart` |
| | `PUT/DELETE /cart/coupon` | opcional | `{ code }` | `Cart` |
| | `POST /cart/acknowledge` | opcional | — | `Cart` (aceita novos preços) |
| Cotação | `POST /quotes` | opcional | `{ network }` | `Quote` |
| Pedidos | `POST /orders` + `Idempotency-Key` | obrigatória | `CreateOrderInput` | `201 Order` (novo) · `200 Order` (replay) |
| Transação (explorador simulado) | `GET /transactions/:hash` | — | — | `Transaction` (público, sem dados pessoais) |
| | `GET /orders?status=` · `GET /orders/:orderId` | obrigatória | — | `OrderList` · `Order` |
| Perfil | `GET/PATCH /profile` | obrigatória | `ProfileInput` | `User` |
| | `PUT/DELETE /profile/avatar` | obrigatória | multipart `avatar` (png/jpg/webp ≤ 2 MB) | `User` |
| | `POST /profile/password` | obrigatória | `ChangePasswordInput` | `204` |
| Carteiras | `GET/POST /wallets` · `PATCH /wallets/:walletId` | obrigatória | `CreateWalletInput` / `UpdateWalletInput` | `WalletList` / `Wallet` |
| Conexão | `GET/DELETE /wallets/connection` · `POST /wallets/:walletId/connect` | obrigatória | `{ provider, network }` | `{ connection }` |

Cabeçalhos: `Authorization: Bearer <token>`, `X-Cart-Id` (carrinho do visitante), `Idempotency-Key`.

**Envelope de erro** (`apiErrorBodySchema`): `{ error: { code, message, fieldErrors?, details? } }`.

| Situação | Código | HTTP |
| --- | --- | --- |
| Validação | `VALIDATION_FAILED` (com `fieldErrors`) | 422 |
| Credenciais | `INVALID_CREDENTIALS` | 401 |
| Sessão inválida / expirada | `UNAUTHENTICATED` / `SESSION_EXPIRED` | 401 |
| Sem permissão (recurso de outro usuário) | `FORBIDDEN` | 403 |
| Recurso inexistente | `NOT_FOUND` | 404 |
| Conflitos | `EMAIL_TAKEN`, `USERNAME_TAKEN`, `OUT_OF_STOCK`, `QUANTITY_LIMIT`, `EDITION_UNAVAILABLE`, `QUOTE_CHANGED`, `IDEMPOTENCY_CONFLICT`, `WALLET_NOT_CONNECTED` | 409 |
| Cupom | `COUPON_INVALID`, `COUPON_EXPIRED` | 422 |
| Carteira recusou | `WALLET_REJECTED` | 403 |
| Falha transitória | `INTERNAL_ERROR` / `SERVICE_UNAVAILABLE` | 500 / 503 |

No cliente, `toApiError` normaliza tudo em `ApiError` e acrescenta `NETWORK_ERROR`, `TIMEOUT`, `CANCELLED` e `INVALID_RESPONSE` (resposta que viola o schema nunca entra no cache).

**Valores em ETH** trafegam como string decimal (`ethAmountSchema`). Toda aritmética usa `big.js` (`shared/lib/eth.ts`), nunca `number`. Quantidades são inteiras.

## 3. Eventos Socket.IO

Transporte: `socket.io-client` (somente `websocket`) → interceptado pelo MSW com `@mswjs/socket.io-binding`. O token vai no pacote CONNECT (`auth: { token }`).

Envelope (`src/contracts/realtime.ts`):

```ts
{ id: 'evt_000123', type: 'nft.updated' | 'order.updated',
  resource: { type: 'nft' | 'order', id }, version: number, occurredAt, data }
```

| Evento | `data` | Efeito no cliente |
| --- | --- | --- |
| `nft.updated` | preço mínimo, `defaultEditionId`, disponibilidade e edições | Atualiza detalhe, listas, destaques e favoritos (se `version` for maior). Se o NFT está no carrinho: revalida carrinho e cotação via REST e avisa (toast e `aria-live`) quando preço ou estoque afetam o item. |
| `order.updated` | `Order` completo | Atualiza o pedido no cache (se `version` for maior). Em `confirmed`, revalida o carrinho, de onde o servidor removeu os itens comprados. |

**Garantias** (`features/realtime/event-guard.ts`):

- **Duplicatas**: o `id` já processado é ignorado (LRU de 500).
- **Eventos antigos**: `version ≤ última aplicada` ao recurso é ignorado. Os appliers também comparam com a `version` em cache, então nunca regridem um dado vindo do REST.
- **Isolamento**: um socket por sessão. Logout ou troca de usuário encerram o socket e removem os listeners. O servidor só entrega `order.updated` à sessão ativa do dono, e o cliente só aplica com `userId` resolvido.
- **Reconexão**: no `connect` após uma queda, os recursos ativos (`nfts`, carrinho, pedidos) são invalidados e refeitos via REST.

**Limitações do transporte simulado**

- Só WebSocket (o binding não implementa long-polling) e só o namespace `/` (sem rooms). A entrega privada é filtrada por usuário no mock.
- O binding não envia pings do Engine.IO. O mock envia o heartbeat (`"2"`) a cada 20 s para o cliente não encerrar por *ping timeout*.
- O `engine.io-client` captura o construtor `WebSocket` no import. Por isso o app é carregado (`import()`) **depois** de `worker.start()`.
- O estado do servidor vive na aba (memória + `localStorage`). Abas diferentes não compartilham eventos.

## 4. Sessão

- `POST /auth/login|register` devolve `{ token, expiresAt, user }`. O token fica no `localStorage` (`sessionStore`), para sobreviver ao refresh. Os dados do usuário ficam no TanStack Query (`['session', token]`, validado por `GET /auth/session`).
- Senhas: PBKDF2-SHA256 com salt por usuário, também no mock. Nunca são armazenadas em claro.
- **Expiração**, detectada por:
  - `401 SESSION_EXPIRED`, via interceptor do Axios;
  - prazo local vencido (verificação a cada 15 s);
  - o guard `/_auth` ao entrar numa rota privada.

  O `SessionWatcher` limpa os dados privados. Em rota privada, leva a `/login?redirect=<url>&reason=expired`; em rota pública, só avisa. O rascunho do checkout (sessionStorage) permite retomar exatamente de onde parou.
- **Logout e troca de usuário**: `clearSessionScopedData` remove `['private']`, `['cart']` e `['session']` do cache. O token muda, então o `RealtimeProvider` derruba o socket anterior. O carrinho do visitante ganha um novo id.
- **Rotas privadas**: checkout, pedidos, perfil, carteiras e favoritos ficam sob o layout `/_auth` (guard `beforeLoad`). O `redirect` aceita apenas caminhos internos (sem open redirect).

## 5. Carrinho

- O carrinho é do servidor. O visitante é identificado por `X-Cart-Id` (uuid no `localStorage`) e o usuário pelo token. **No login ou cadastro o servidor incorpora o carrinho do visitante** (soma quantidades respeitando disponibilidade e limite por pedido), numa única operação.
- Toda mutation devolve o `Cart` completo. O cache é substituído pela resposta, sem refetch, e o resultado é anunciado.
- `status` por item: `ok | price_changed | insufficient_stock | sold_out | unavailable`. `price_changed` compara o preço atual com o último preço **aceito** pelo colecionador (`POST /cart/acknowledge`).
- Valores: `POST /quotes` é a única fonte de subtotal, desconto, taxa e total. A chave da cotação inclui a `version` do carrinho, então qualquer mudança gera nova cotação.
- Após a confirmação do pagamento, o servidor remove **só os itens e quantidades comprados**. Em recusa ou falha, nada é removido.

## 6. Checkout e pedidos

1. O formulário (Perfil do colecionador, com os mesmos campos e schema de Carteiras) é pré-preenchido pela carteira cadastrada escolhida. O rascunho é persistido.
2. **Carteira e rede**: provedor (WalletConnect/MetaMask/Coinbase) e rede (Ethereum/Polygon/Solana, com taxa por rede) ficam no bloco "Carteira e rede". A conexão é simulada pelo servidor (`connect`, recusa `WALLET_REJECTED` no cenário `wallet-rejected`, `disconnect`). Ao clicar em "Confirmar compra", a carteira é conectada automaticamente se ainda não estiver (sem passo escondido); a recusa é exibida em destaque e nada é enviado. Trocar carteira, provedor ou rede exige reconectar.
3. **Revisão**: ao abrir, o carrinho e a cotação são buscados de novo no servidor. Se os valores diferirem do que estava na tela, aparece "valores atualizados" e é exigida nova confirmação.
4. **Envio**: `POST /orders` com `Idempotency-Key`. A chave é derivada da tentativa (mesmo payload, mesma chave) e persistida no sessionStorage.
   - Cliques repetidos são bloqueados por um ref e pelo estado `pending`.
   - Falhas transitórias (timeout, rede, 5xx) são repetidas automaticamente **com a mesma chave**. O servidor devolve o mesmo pedido (`200`, `Idempotent-Replayed: true`).
   - Mesma chave com outro payload resulta em `409 IDEMPOTENCY_CONFLICT`.
   - `409 QUOTE_CHANGED` / `OUT_OF_STOCK` trazem a nova cotação em `details.quote`, e a revisão passa a exigir nova confirmação.
5. **Pedido**: `pending` → `confirmed` | `declined` (estados terminais).
   - O resultado chega por `order.updated`. Como rede de segurança, há polling de 5 s enquanto o pedido está pendente.
   - O id do pedido pendente fica no `localStorage`, para retomada após refresh ou reconexão.
   - O servidor guarda `resolveAt`: o pagamento é liquidado mesmo se a aba recarregar.
   - O recibo só existe para `confirmed` e é renderizado a partir do **snapshot do pedido**. Mudanças posteriores no catálogo não o alteram.

## 7. Estado assíncrono e cache (TanStack Query)

| Política | Valor | Motivo |
| --- | --- | --- |
| `staleTime` padrão | 30 s | Evita refetch ao navegar; eventos e invalidações mantêm o cache atualizado |
| Destaques | 5 min | Conteúdo editorial |
| Cotação | 60 s, chaveada por `cartVersion` | Muda junto com o carrinho |
| Conexão de carteira | 0 | Estado volátil |
| `retry` (queries) | até 2, só para `NETWORK_ERROR`, `TIMEOUT` e 5xx; backoff de 500 ms × 2ⁿ (máx. 4 s) | 4xx é definitivo |
| `retry` (mutations) | 0 | Repetir escrita só é seguro com idempotência: o pedido tem retry próprio com a mesma chave |
| Cancelamento | `signal` em toda `queryFn` | Trocar filtros aborta a requisição anterior; uma resposta atrasada nunca sobrescreve a chave atual |
| `keepPreviousData` | catálogo e cotação | Atualização em segundo plano sem piscar (`aria-busy` e indicador) |
| Otimista | favoritos | `onMutate` atualiza e `onError` faz rollback, com toast e `aria-live` |

**Chaves** (`shared/api/query-keys.ts`): `['nfts', 'list', query]`, `['nfts', 'detail', id]`, `['cart', owner]`, `['cart', owner, 'quote', network, version]`, `['private', userId, ...]`.

**Invalidação após mutations e eventos**:

| Origem | Efeito |
| --- | --- |
| Mutations de carrinho | `setQueryData` |
| Perfil | Atualiza o perfil e invalida `['session']` |
| Carteiras | Invalida a lista |
| Favoritos | Otimista, depois invalida |
| `nft.updated` | `setQueryData` com checagem de versão + invalidação do carrinho |
| `order.updated` | `setQueryData`, depois invalida a lista de pedidos e o carrinho |

## 8. Mocks (MSW)

- **Ativação**: `VITE_ENABLE_MOCKS=true` (dev e build de demonstração, via `.env.development`/`.env.production`). A camada fica num chunk separado.
- **Banco**: `mocks/db` guarda o estado em memória com espelho no `localStorage`. Fixtures determinísticas: 60 NFTs (PRNG com seed fixa), 2 usuários, cupons e carteiras. `reset` restaura integralmente.
- **Pipeline de cada rota** (`mocks/http.ts`): condições de rede do cenário (latência semeada, fora de ordem, falhas e timeout) → liquidação de pagamentos vencidos → autenticação → handler (validado pelos contratos) → persistência.
- **Eventos**: toda mutação de domínio publica no barramento (`mocks/events.ts`), que alimenta o servidor Socket.IO. REST e eventos refletem sempre o mesmo estado.
- **Cenários**: definidos em `mocks/scenarios.ts`, selecionados por `?mock-scenario=<id>` e reiniciados com `&mock-reset=1`.
- **Controle** (`window.__kurioMock`): reset, latência, falhas, socket (derrubar e ficar offline), alteração de preço/estoque, replay de eventos duplicados ou antigos, expiração de sessões e liquidação de pedidos. É usado pelos testes e para demonstração.

## 9. PWA

- Manifesto, ícones e um **service worker único** (`src/pwa/sw.ts`): precache do shell e dos assets e, em seguida, `importScripts('/mockServiceWorker.js')`. Só pode haver um SW por escopo. O listener de precache é registrado primeiro e interrompe a propagação quando responde; a API segue para o MSW.
- O botão "Instalar app" fica no perfil. Usa `beforeinstallprompt`, capturado no boot. No iOS há instrução manual.

## 10. Acessibilidade

- Link "Pular para o conteúdo", landmarks, um `h1` por página e foco visível (`:focus-visible` laranja).
- Diálogos e drawers via Radix: foco preso, Esc e retorno do foco.
- Formulários com `Field`: `label`, `aria-invalid`, `aria-describedby` (dica e erro) e foco no primeiro campo inválido. Erros da API vão para os campos.
- Regiões `aria-live` (`LiveAnnouncer`) para mutations, mudanças em tempo real e status do pedido. Toasts acessíveis (sonner).
- Estados não dependem só de cor: badges com texto ("Esgotado", "Preço alterado"), `aria-pressed`/`aria-current`.
- `prefers-reduced-motion` desliga shimmer e animações.

## 11. Decisões de UX e desvios do Figma

| Item | Decisão |
| --- | --- |
| Responsividade | Layout único responsivo (390/768/1440) no lugar de telas separadas. No mobile: busca, filtros em drawer e navegação inferior. |
| Login e cadastro | Diálogo sobre fundo esmaecido no desktop, tela cheia no mobile. Fechar sem entrar volta à rota pública anterior ou ao início. |
| Confirmação de pedido | Cartão centralizado com borda laranja (no Figma é um modal sobre fundo vazio). Inclui também os estados pendente e recusado, que não foram desenhados. |
| Revisão do pedido | Diálogo antes do envio, exigido pelo enunciado e ausente do Figma. |
| Pagamento | O "Tipo de carteira" é escolhido no bloco "Carteira e rede", em vez de select duplicado. Seleção de carteira cadastrada como no mobile do Figma. |
| Itens fora do escopo | Criadores, Aprenda, Atividade, Ofertas, Arquivos, Suporte, blog, newsletter, login social e redes sociais ficam visíveis, mas marcados "em breve" ou com aviso informativo. Nunca simulam sucesso. |
| Ícones de redes sociais | O Lucide 1.x não tem ícones de marcas: usamos monogramas decorativos. |
| Fonte | Roboto Mono (variável, self-hosted). |
| Cores derivadas | As cores informadas foram usadas como tokens. Borda, input, estados (sucesso, alerta, erro) e faixa do rodapé foram derivados para manter o contraste AA. |
| Assets | As 4 artes do Figma foram convertidas para WebP em 320/640/960 px (`npm run assets`), com `srcset` e dimensões fixas. |
| Explorador | "Ver no Etherscan (simulado)" abre um **explorador simulado interno** (`/explorer/tx/:hash`, dados de `GET /transactions/:hash` do MSW) com aviso de que a transação não existe em blockchain. Nenhum link aponta para exploradores reais. |
| Separador decimal | Preços em ponto ("1.19 ETH"), como nos cards do Figma. O slider de preço usa vírgula, como no Figma. |

## 12. Limitações conhecidas

- O servidor simulado roda na aba do navegador. Dados não são compartilhados entre navegadores e abas e não são duráveis além do `localStorage`.
- Rede e explorador são simulados. Não há blockchain, extensão de carteira nem gateway reais (fora do escopo).
- O preview do Lighthouse inclui o boot do MSW (registro do SW antes do primeiro render). Ver `lighthouse-reports/summary.md` para os resultados e a análise.
