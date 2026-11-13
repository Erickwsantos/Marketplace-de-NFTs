# Checklist do desafio — rastreabilidade

Legenda: ✅ implementado e verificado · 🧪 coberto por teste E2E (arquivo em `e2e/`) · ⚠️ com ressalva (ver nota)

## 2. Stack obrigatória (uso efetivo)

| Tecnologia | Onde participa | Status |
| --- | --- | --- |
| React 19 | Toda a UI (`src/features`, `src/app`) | ✅ |
| TypeScript (strict) | Projeto inteiro, contratos inferidos de Zod | ✅ |
| TanStack Router | Rotas file-based, search params validados, guard `/_auth`, 404, loaders (`src/routes`) | ✅ |
| TanStack Query | Consultas, mutations, otimista, invalidação, cancelamento (`features/*/api.ts`, `hooks.ts`) | ✅ |
| Axios | Único cliente REST, interceptors de auth/erro (`shared/api/http.ts`) | ✅ |
| REST APIs | Contratos em `src/contracts`, tabela `API_ROUTES` | ✅ |
| Socket.IO | `socket.io-client` em `features/realtime`; servidor mock via `@mswjs/socket.io-binding` | ✅ |
| Tailwind CSS v4 | Tokens do Figma em `src/index.css` | ✅ |
| shadcn/ui | `src/shared/ui` (Button, Dialog, Sheet, Select, Tabs, Slider, RadioGroup, Checkbox, Sonner…) adaptados à marca | ✅ |
| MSW | REST + WebSocket, cenários, persistência, reset (`src/mocks`) | ✅ |
| Playwright | E2E + regressão visual (`e2e/`, `playwright.config.ts`) | 🧪 |
| Lighthouse | `scripts/lighthouse.mjs`, `lighthouse-reports/` | ✅ |

## 3. Telas e fluxos

| Tela | Funcionalidades | Status |
| --- | --- | --- |
| Início | Destaques (carrossel), catálogo, busca, filtros, ordenação, paginação, navegação ao NFT | ✅ 🧪 `catalog.spec.ts` |
| Detalhe | Galeria + zoom, informações, edição, quantidade, favoritos, compra | ✅ 🧪 `nft-detail.spec.ts` |
| Carrinho | Quantidades, remoção, cupom, resumo de valores | ✅ 🧪 `cart.spec.ts` |
| Pagamento | Dados do colecionador, carteira cadastrada, provedor e rede, conexão/recusa/desconexão, revisão, envio | ✅ 🧪 `checkout.spec.ts` |
| Confirmação | Resultado, ID da transação, itens, taxas, total (snapshot) | ✅ 🧪 `checkout.spec.ts` |
| Login | Autenticação, validação, retorno ao fluxo anterior | ✅ 🧪 `auth.spec.ts` |
| Cadastro | Criação, validação, conflito | ✅ 🧪 `auth.spec.ts` |
| Perfil | Dados, avatar, senha | ✅ 🧪 `account.spec.ts` |
| Carteiras | Principal e secundária (cadastro e edição) | ✅ 🧪 `account.spec.ts` |
| Mobile | Todas as telas responsivas (390/768/1440), incluindo perfil, carteiras e confirmação | ✅ 🧪 projeto `chromium-mobile` |
| Fora do escopo | Itens visíveis marcados "em breve"/aviso informativo, sem simular sucesso | ✅ |

### Catálogo e detalhe
- [x] Busca, filtros, ordenação e paginação na URL; sobrevivem a refresh e histórico — 🧪
- [x] Filtros combináveis; mudança de filtro reinicia a paginação — 🧪
- [x] Consulta reflete os parâmetros enviados; vazio, falha e respostas fora de ordem — 🧪 (`empty`, `server-error`, `out-of-order`)
- [x] Detalhe: acesso direto, inexistente, edição indisponível, limite de quantidade — 🧪
- [x] Favoritos persistem para o usuário autenticado — 🧪

### Carrinho
- [x] Adicionar/alterar/remover respeitando disponibilidade por NFT e edição — 🧪
- [x] Persistência após refresh; itens do visitante preservados ao autenticar (merge no servidor) — 🧪
- [x] Cupom aplicar/remover; inválido e expirado — 🧪
- [x] Subtotal, desconto, taxa e total vindos da cotação da API — ✅
- [x] Alterações de preço/disponibilidade em tempo real com o carrinho aberto — 🧪 `realtime.spec.ts`
- [x] ETH como string decimal (big.js), quantidades inteiras, cotação da API como referência — ✅

### Pagamento e confirmação
- [x] Validação dos campos do layout e revisão antes do envio — 🧪
- [x] Carteiras cadastradas, seleção de rede (bloco "Carteira e rede"), conexão automática ao confirmar, recusa e desconexão simuladas — 🧪
- [x] Revalidação de preço, disponibilidade, cupom e taxas antes de confirmar; mudanças exigem nova confirmação — 🧪
- [x] Sem pedidos duplicados (clique repetido, reenvio após timeout) — 🧪
- [x] Pendente/confirmado/recusado com recuperação após refresh ou reconexão — 🧪
- [x] Confirmação só para pedido confirmado pela simulação — ✅
- [x] Itens preservados em falha; após confirmação remove só itens/quantidades comprados — 🧪
- [x] Recibo a partir do snapshot do pedido (verificado: mudar o preço no catálogo não altera o recibo); referências de transação e explorador **simulados** (rota interna `/explorer/tx/:hash`) — ✅ 🧪

### Conta e sessão
- [x] Cadastro, login, logout e sessão via API simulada — 🧪
- [x] Checkout, perfil, carteiras, favoritos e pedidos exigem autenticação — 🧪
- [x] Sessão recuperável após refresh — ✅
- [x] Expiração durante navegação e checkout, preservando contexto — 🧪
- [x] Logout/troca de usuário limpam cache privado e subscriptions — 🧪
- [x] Validação de cadastro, perfil, senha e carteiras, incluindo erros da API — 🧪
- [x] Alterações persistem após refresh; senhas com hash (PBKDF2) — 🧪

## 4. Integração e estado

- [x] Contratos tipados entre transporte, estado e interface (Zod → tipos; respostas validadas) — ✅
- [x] Estados de carregamento, vazio, erro, sucesso e atualização em segundo plano — ✅
- [x] Invalidação coerente após mutations e eventos — ✅ (ARCHITECTURE §7)
- [x] Cancelamento/descarte de respostas obsoletas (`signal`, chaves por parâmetros) — 🧪 `out-of-order`
- [x] Isolamento por usuário e por parâmetros — 🧪
- [x] Recuperação de falhas sem duplicar operações — 🧪
- [x] Rotas inexistentes e acesso direto a qualquer tela — 🧪
- [x] Atualização otimista com rollback (favoritos) — 🧪
- [x] Política de cache, retries e sincronização documentada — ✅ ARCHITECTURE §7

## 5. Contratos REST

- [x] Sessão e conta, NFTs, favoritos, carrinho, cotação, pedidos (idempotentes), perfil, carteiras — ✅ ARCHITECTURE §2
- [x] Erros: validação, sessão inválida, permissão, inexistente, conflito de disponibilidade, falha transitória — ✅
- [x] Idempotency-Key: mesma tentativa → mesmo pedido; chave reutilizada com conteúdo diferente → 409 — ✅ 🧪

## 6. Mocking com MSW

- [x] Mocks na camada de rede, reutilizados em dev, demo e testes; UI sem respostas fictícias (regra ESLint) — ✅
- [x] Estado consistente entre catálogo, favoritos, carrinho, perfil, carteiras e pedidos; persistência e reset — ✅
- [x] Lentidão, latência variável, timeouts, sem conexão, HTTP 4xx/5xx, configuráveis e reproduzíveis — ✅ 🧪
- [x] Fixtures com variedade (60 NFTs, 9 categorias, 3 redes), 2 usuários — ✅
- [x] Cenários determinísticos: sucesso/vazio, latência/fora de ordem, conexão/4xx/5xx, sessão expirada/não autorizado, conflito de cadastro/validação, cupom inválido/expirado, preço alterado/esgotado, timeout com idempotência, pagamento confirmado/recusado — ✅ README
- [x] Socket.IO via `@mswjs/socket.io-binding`, exercitando `socket.io-client`; transporte e limitações documentados — ✅ ARCHITECTURE §3
- [x] Ativado por configuração e disponível no build de demonstração — ✅
- [x] Mudanças refletidas em REST e eventos (barramento único) — ✅

## 7. Tempo real

- [x] `nft.updated` (catálogo, detalhe, carrinho) e `order.updated` — ✅ 🧪
- [x] Identidade, recurso e versão; tolera duplicatas e eventos antigos — 🧪
- [x] Reconciliação com REST após reconexão; sem vazamento entre sessões; listeners liberados — ✅ 🧪
- [x] Cenário: NFT no carrinho → mudança → UI informa e atualiza resumo → checkout impede cotação desatualizada — 🧪
- [x] Interrupção com pedido pendente → reconectar/recarregar recupera sem nova compra; estados terminais — 🧪

## 8. Interface, responsividade e acessibilidade

- [x] Tipografia, cores, espaçamentos e composição do Figma; shadcn adaptado — ✅ (desvios em ARCHITECTURE §11)
- [x] 390, 768, 1440 sem overflow horizontal — ✅ 🧪
- [x] Skeletons com shimmer preservando dimensões; `prefers-reduced-motion` — ✅ 🧪
- [x] Teclado e foco visível; foco em diálogos/drawers; semântica, labels e erros associados; alt text; contraste; estados não só por cor; feedback acessível (aria-live); zoom sem perda — ✅ 🧪 `a11y.spec.ts`
- [x] Assets do Figma locais (WebP otimizado), fonte self-hosted; substituições documentadas — ✅

## 9. Testes (Playwright)

Ver `e2e/` — resultados e contagem na seção "Resultados" abaixo.

## 10. Lighthouse

Ver `lighthouse-reports/summary.md` — mediana de 3 execuções por página/perfil, LCP/CLS/TBT, versões e ambiente.

## 12. Entrega

- [x] Código, lockfile, assets, mocks, fixtures, testes, configuração de auditoria — ✅
- [x] `vercel.json` (SPA rewrite, acesso direto/refresh) — ✅
- [x] README (setup, env, credenciais, cenários, reset, comandos, fluxos de falha) e ARCHITECTURE — ✅
- [x] Comandos: dev, build, preview, typecheck, lint, test:e2e, lighthouse — ✅
- [x] Checkout limpo sem serviços privados — ✅
- [ ] Repositório e deploy público — responsabilidade do autor (repositório/Vercel)

## Resultados

### Verificações estáticas
- `npm run typecheck`: sem erros.
- `npm run lint` (inclui jsx-a11y): 0 erros e 0 avisos.

### Playwright (`npx playwright test`)

| Arquivo | Testes por projeto |
| --- | --- |
| catalog | 6 |
| nft-detail | 5 |
| auth | 7 |
| favorites | 2 |
| cart | 4 |
| checkout | 7 |
| realtime | 4 |
| account | 5 |
| a11y | 6 |
| visual | 4 |

- **Total:** 100 testes (50 × `chromium-desktop` 1440 + 50 × `chromium-mobile` 390). 99 passaram e 1 foi pulado por não se aplicar: o drawer de filtros só existe no mobile.
- **Estabilidade:** execuções completas repetidas sem falhas nem flaky; os specs sensíveis a tempo rodaram com `--repeat-each=3`.
- **Baselines visuais:** 8, versionadas em `e2e/__screenshots__/`.

### Lighthouse
Mediana de 3 execuções por página e perfil, em `lighthouse-reports/summary.md`:

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | mobile | 94 | 100 | 100 | 100 | 2,86 s | 0,009 | 132 ms |
| Início | desktop | 100 | 100 | 100 | 100 | 0,61 s | 0,013 | 0 ms |
| Detalhe | mobile | 92 | 100 | 100 | 100 | 3,01 s | 0,001 | 170 ms |
| Detalhe | desktop | 100 | 100 | 100 | 100 | 0,61 s | 0,002 | 0 ms |

Todas as metas foram atingidas. A análise do LCP mobile está no README, seção "Performance".

### Bugs encontrados pelos testes e auditorias (todos corrigidos)
- **`pendingComponent` do detalhe:** a página quebrava com code splitting.
- **Foco:** não voltava ao botão de busca ao fechar o diálogo, e ia para o rádio errado quando faltava conectar a carteira.
- **Carrossel:** quebrava quando o container tinha largura 0.
- **Validação no blur:** deslocava o layout e fazia o clique em "Salvar" se perder; passou a validar no envio e revalidar ao digitar.
- **Acessibilidade apontada pelo Lighthouse:** pontos dos carrosséis com área de toque abaixo de 24 px, contraste insuficiente em textos "em breve" e ausência de `robots.txt`.
- **Toasts:** erro de cupom aparecia duplicado, e havia aviso de carrinho alterado após a própria compra.
