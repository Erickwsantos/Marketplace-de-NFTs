import { createFileRoute } from '@tanstack/react-router'
import { ExplorerPage } from '@/features/explorer/explorer-page'

export const Route = createFileRoute('/explorer/tx/$hash')({
  head: () => ({ meta: [{ title: 'Transação (simulada) | Kurio' }, { name: 'robots', content: 'noindex' }] }),
  component: ExplorerPage,
})
