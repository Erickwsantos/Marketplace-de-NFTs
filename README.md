# Kurio — Marketplace de NFTs

Desafio frontend: marketplace de NFTs em **React 19 + TypeScript**, com TanStack Router e Query, Axios, Socket.IO, Tailwind CSS v4, shadcn/ui, MSW, Playwright e Lighthouse. Todas as APIs, a autenticação, as carteiras, os pagamentos e o tempo real são **simulados na camada de rede (MSW)**. A aplicação não depende de nenhum backend.

- Arquitetura, contratos REST e eventos, sessão, carrinho, cache e reconciliação: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Plano de execução: [docs/PLAN.md](./docs/PLAN.md) · Checklist do desafio: [docs/CHECKLIST.md](./docs/CHECKLIST.md)

## Requisitos

- Node.js ≥ 20.19 (testado com Node 26) e npm.
- Para os testes E2E: `npx playwright install chromium`.

## Setup e comandos

```bash
npm ci                 # instala exatamente o lockfile
npm run dev            # desenvolvimento com mocks (http://localhost:5173)
npm run build          # typecheck + build otimizado (com mocks: build de demonstração)
npm run preview        # serve o build (http://localhost:4173)
npm run typecheck      # verificação de tipos
npm run lint           # ESLint (inclui regras de acessibilidade jsx-a11y)
npm run test:e2e       # Playwright (faz build e sobe o preview automaticamente)
npm run test:e2e:report  # abre o relatório HTML (traces das falhas incluídos)
npm run test:e2e:update  # regenera as baselines visuais
npm run lighthouse     # build + auditoria (3 execuções por página/perfil, mediana)
npm run assets         # regenera WebP/ícones a partir de design-assets/
```

## Variáveis de ambiente

As variáveis não têm segredos e estão versionadas em `.env.development` e `.env.production`. Referência: `.env.example`.

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | Ativa MSW (REST + Socket.IO). Obrigatória no build de demonstração. |
| `VITE_API_BASE_URL` | `/api` | Base das chamadas Axios |
| `VITE_SOCKET_URL` | `wss://realtime.nft-marketplace.mock` | URL do Socket.IO (interceptada pelo MSW) |
| `VITE_MOCK_SCENARIO` | `default` | Cenário inicial dos mocks |
| `VITE_REQUEST_TIMEOUT_MS` | `8000` | Timeout do Axios (o cenário `order-timeout` o ultrapassa) |

## Credenciais fictícias

| Usuário | E-mail | Senha | Observações |
| --- | --- | --- | --- |
| Ana Ribeiro | `ana@kurio.test` | `kurio1234` | Carteiras principal e secundária, 2 favoritos |
| Bruno Lima | `bruno@kurio.test` | `kurio1234` | Sem carteiras nem favoritos |

Cupons: `KURIO10` (10%), `LANCAMENTO` (5%), `EXPIRADO` (expirado). Qualquer outro código é inválido.

### Exemplo de cadastro de carteira (para teste)

Entre como **Bruno** (`bruno@kurio.test`, sem carteiras), abra **Perfil → Carteiras** e preencha.

**Carteira principal (Ethereum):**

| Campo | Valor |
| --- | --- |
| Nome de exibição | `Bruno Lima` |
| Apelido da carteira | `Principal` |
| Rede | Ethereum |
| Nome do perfil | `bruno.criador` |
| Endereço da carteira | `0x52908400098527886E0F7030069857D2E4169EE7` |
| ENS ou carteira secundária (opcional) | *(vazio)* |
| Tipo de carteira | MetaMask |
| Código de indicação | `KURIO-2026` |
| E-mail | `bruno@kurio.test` |
| Nome ENS (`.eth`) | `bruno-lima` |

**Carteira secundária (Solana):** marque "Igual à carteira principal" para copiar os dados e ajuste:

| Campo | Valor |
| --- | --- |
| Apelido da carteira | `Reserva` |
| Rede | Solana |
| Endereço da carteira | `KurioDemoWa11et11111111111111111111111111111` |
| Tipo de carteira | Coinbase Wallet |

**Regras de validação** (as mesmas no cliente e no servidor simulado):

| Campo | Regra |
| --- | --- |
| Endereço Ethereum/Polygon | `0x` + 40 caracteres hexadecimais |
| Endereço Solana | Base58, de 32 a 44 caracteres (sem `0`, `O`, `I`, `l`) |
| Código de indicação | 4 a 16 caracteres: letras, números e `-` |
| Nome ENS | Minúsculas, números e `-`, de 3 a 32 caracteres. O sufixo `.eth` já aparece ao lado do campo. |
| Nome de exibição, apelido e nome do perfil | Mínimo de 2 caracteres |
| E-mail | Formato válido |

**Para ver os erros de validação:**
- Endereço `0x123` → "Endereço inválido: use 0x seguido de 40 caracteres hexadecimais".
- Nome ENS `Bruno Lima` → "Use letras minúsculas, números e "-"".
- Código de indicação `ab` → "Informe o código de indicação".

Os endereços acima são fictícios e servem só para o fluxo simulado. Nenhuma blockchain é acessada.

## Cenários dos mocks

Para selecionar um cenário, adicione `?mock-scenario=<id>` à URL. A escolha persiste entre refreshes. Para restaurar o estado inicial (dados, falhas e contadores), adicione `&mock-reset=1`.

Exemplo: `http://localhost:5173/?mock-scenario=slow&mock-reset=1`

| id | O que simula |
| --- | --- |
| `default` | Dados completos, latência curta (60–220 ms, semeada) e pagamento aprovado |
| `instant` | Igual ao padrão, sem latência (usado nos testes) |
| `empty` | Busca do catálogo sem resultados |
| `slow` | Todas as respostas em 2,5 s (skeletons) |
| `variable-latency` | Latência entre 0,2 e 2,5 s, reproduzível |
| `out-of-order` | Consultas do catálogo alternam entre lenta e rápida: respostas chegam fora de ordem |
| `offline` | Toda requisição falha por conexão e o socket não conecta |
| `server-error` | Catálogo responde 500 três vezes e o detalhe 503 uma vez; depois recuperam |
| `favorite-failure` | A primeira inclusão de favorito falha (rollback otimista) |
| `session-expired` | Sessões expiram 45 s após o login |
| `price-change` | Ao enviar o pedido, o preço de um item muda (evento + 409) |
| `sold-out` | Ao enviar o pedido, uma edição esgota |
| `order-timeout` | O pedido é criado, mas a 1ª resposta expira; o reenvio recupera o mesmo pedido |
| `payment-declined` | O pagamento é recusado |
| `slow-payment` | O pedido fica pendente por 20 s (desconexão e retomada) |
| `wallet-rejected` | A carteira recusa a conexão |

### Controle manual (console do navegador)

```js
__kurioMock.reset('default')                                   // restaura um cenário
__kurioMock.nft.update('emerald-ape-042', { editionId: 'emerald-ape-042-1-50', priceEth: '1.50' }) // preço muda (REST + nft.updated)
__kurioMock.nft.update('emerald-ape-042', { editionId: 'emerald-ape-042-1-50', available: 0 })      // esgota
__kurioMock.events.replayLast()                                // reenvia o último evento (duplicata)
__kurioMock.events.replayStale('emerald-ape-042')              // reenvia versão antiga
__kurioMock.socket.drop()                                      // derruba a conexão (cliente reconecta)
__kurioMock.socket.setOnline(false)                            // socket offline até setOnline(true)
__kurioMock.session.expireAll()                                // expira sessões ativas
__kurioMock.orders.list(); __kurioMock.orders.resolve(id, 'declined')
```

## Como reproduzir os fluxos de falha

1. **Preço alterado com o NFT no carrinho**: entre como Ana, adicione `Emerald Ape #042` e abra `/cart` ou `/checkout`. No console, rode `__kurioMock.nft.update('emerald-ape-042', { editionId: 'emerald-ape-042-1-50', priceEth: '1.50' })`. A interface avisa, atualiza o resumo e bloqueia a confirmação até você aceitar os novos preços.
2. **Cotação desatualizada no envio**: use `?mock-scenario=price-change&mock-reset=1` e faça uma compra. O servidor recusa e a revisão mostra os novos valores, exigindo nova confirmação.
3. **Timeout com idempotência**: em `?mock-scenario=order-timeout&mock-reset=1`, confirme a compra. Após cerca de 8 s o cliente reenvia com a mesma chave e abre o mesmo pedido. `__kurioMock.orders.list()` mostra um único pedido.
4. **Pagamento recusado**: em `?mock-scenario=payment-declined&mock-reset=1`, o pedido termina como recusado e o carrinho permanece intacto.
5. **Desconexão com pedido pendente**: em `?mock-scenario=slow-payment&mock-reset=1`, confirme a compra. Na tela do pedido, rode `__kurioMock.socket.setOnline(false)` e recarregue a página. O pedido continua pendente e é o mesmo. Depois rode `__kurioMock.socket.setOnline(true)`: o status confirmado chega por evento ou reconciliação.
6. **Sessão expirada no checkout**: em `?mock-scenario=session-expired&mock-reset=1`, entre, preencha o pagamento e aguarde 45 s (ou rode `__kurioMock.session.expireAll()`). Você é levado ao login e, após entrar, volta ao checkout com o rascunho preservado.
7. **Falhas de rede**: `?mock-scenario=offline` (erro e "Tentar novamente"), `server-error` (erro após os retries e recuperação) e `slow` (skeletons).

## Testes (Playwright)

- Rodam contra o **build otimizado com mocks**, em Chromium, nos projetos `chromium-desktop` (1440×900) e `chromium-mobile` (390×844).
- Cada teste começa com contexto e cenário isolados. Relógio, latência e eventos são controlados nos cenários sensíveis a tempo.
- Os eventos passam pelo `socket.io-client` e as chamadas REST pelos handlers MSW.
- Relatório HTML em `playwright-report/`. Traces e screenshots das falhas em `test-results/`.
- As baselines visuais ficam versionadas em `e2e/__screenshots__/`. Elas dependem do sistema operacional: as atuais foram geradas no Windows. Para outro SO, regenere com `npm run test:e2e:update`.

## Performance (Lighthouse)

`npm run lighthouse` audita início e detalhe (`/nfts/emerald-ape-042`), nos perfis mobile e desktop, com 3 execuções cada. A configuração está em `scripts/lighthouse.config.mjs`. Os relatórios HTML e JSON de cada execução, o `summary.json` e o `summary.md` (mediana, LCP, CLS, TBT, versões, ambiente e condições) ficam em `lighthouse-reports/`.

**Resultado** (mediana de 3 execuções, build otimizado, cenário `default`; Lighthouse 13.6.0, Node 26, Chromium do Playwright, Windows 11, i7-13700HX):

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | mobile | 94 | 100 | 100 | 100 | 2,86 s | 0,009 | 132 ms |
| Início | desktop | 100 | 100 | 100 | 100 | 0,61 s | 0,013 | 0 ms |
| Detalhe | mobile | 92 | 100 | 100 | 100 | 3,01 s | 0,001 | 170 ms |
| Detalhe | desktop | 100 | 100 | 100 | 100 | 0,61 s | 0,002 | 0 ms |

Todas as metas foram atingidas.

**Análise.** O LCP mobile (~3 s com 4G lento simulado e CPU 4x) é a métrica que mais pesa e tem três causas:

1. O primeiro render espera o **boot do MSW**: registro do service worker e inicialização do banco simulado. Isso é necessário para que nenhuma requisição escape dos mocks na demonstração.
2. O **bundle inicial** (React, Router, Query, Zod), que precisa ser baixado e avaliado antes do render.
3. O download da imagem LCP, que só começa quando a página termina de carregar.

A auditoria usa as imagens, fontes e funcionalidades reais da entrega, sem simplificações exclusivas para melhorar a pontuação.

**Otimizações aplicadas:**
- Code splitting por rota e mocks em chunk próprio.
- `socket.io-client` carregado sob demanda (de 91 para 94 no início mobile).
- Arte do destaque em WebP com `preload` e `fetchpriority=high`.
- `srcset`/`sizes` em todas as imagens e dimensões reservadas (CLS ≈ 0).
- Fonte self-hosted (Roboto Mono variável).
- Ícones PWA comprimidos.

Em produção, com backend real e sem MSW, o item 1 deixa de existir.

## Deploy

O deploy na Vercel usa `vercel.json`: rewrite de SPA (acesso direto e refresh em qualquer rota) e cabeçalhos para os service workers. Build: `npm run build`. Saída: `dist`. Nenhuma variável precisa ser configurada no painel.

## LGPD e dados

Todos os dados são fictícios. Senhas são armazenadas apenas como hash PBKDF2 com salt, inclusive no servidor simulado. Nenhum token, chave ou credencial real é usado.
