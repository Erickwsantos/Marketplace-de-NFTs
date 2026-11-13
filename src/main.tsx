import { env } from '@/shared/config/env'
import './index.css'

async function bootstrap() {
  // Camada de mocks (MSW REST + Socket.IO) ativada por configuração.
  // Import dinâmico: fora do bundle quando VITE_ENABLE_MOCKS != "true".
  if (env.mocksEnabled) {
    const { enableMocking } = await import('@/mocks/bootstrap')
    await enableMocking()
  }
  // O app (e o socket.io-client) só é avaliado depois dos mocks: o
  // engine.io-client captura o construtor WebSocket no import, e ele precisa
  // ser o interceptado pelo MSW.
  const { renderApp } = await import('@/app/render')
  renderApp(document.getElementById('root')!)
}

void bootstrap()
