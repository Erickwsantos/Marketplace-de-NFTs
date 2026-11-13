# Plano de execução (waves)

Plano aprovado em 2026-11-13. Cada wave entrega código verificável (typecheck, lint e, a partir da Wave 4, testes E2E da própria feature).

| Wave | Escopo | Status |
| --- | --- | --- |
| 0 | Tokens do Figma, inventário de telas, assets (`design-assets/` → `npm run assets`) | ✅ |
| 1 | Scaffold (Vite 8, React 19, TS strict, ESLint, Prettier), Tailwind v4 + shadcn/ui, contratos Zod, `vercel.json` | ✅ |
| 2 | MSW: mock DB persistente, handlers REST, motor de cotação, pedidos idempotentes, cenários, condições de rede, Socket.IO mock, API de controle | ✅ |
| 3 | Axios + erros normalizados, TanStack Query (política de cache), TanStack Router (guards, search params), sessão, realtime, layout e primitivos | ✅ |
| 4 | Features: início/catálogo, detalhe + favoritos, auth, carrinho, perfil/carteiras/PWA | ✅ |
| 5 | Checkout, pedidos idempotentes, recibo, tempo real ponta a ponta | ✅ |
| 6 | Qualidade transversal: responsividade, a11y, PWA, performance | ✅ |
| 7 | Playwright: E2E, regressão visual, relatórios | ✅ |
| 8 | Lighthouse, README, ARCHITECTURE, CHECKLIST, verificação de checkout limpo | ✅ |

## Princípios

- **Contrato como fonte única**: `src/contracts` (Zod) tipa transporte, cache, formulários e handlers MSW.
- **Regra de negócio só no servidor simulado**: preço, cupom, taxa, estoque e total vêm da cotação da API.
- **Primitivos compartilhados**: `QueryState`, `Field`/`TextField`, `EthAmount`, `NftImage`, `Skeleton`, `QuantityStepper`, `NftCard`, `NftCarousel`, `CollectorProfileFields`.
- **Isolamento por usuário**: chaves `['private', userId, ...]` e `['cart', owner]`; logout/troca limpam tudo e recriam o socket.
