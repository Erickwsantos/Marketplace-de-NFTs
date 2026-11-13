import { createRootRouteWithContext, HeadContent, Outlet } from '@tanstack/react-router'
import type { RouterContext } from '@/app/router'
import { Footer } from '@/app/layout/footer'
import { Header, MobileNav } from '@/app/layout/header'
import { SessionWatcher } from '@/features/auth/session-watcher'
import { RealtimeProvider } from '@/features/realtime/realtime-provider'
import { LiveAnnouncer } from '@/shared/a11y/announcer'
import { Toaster } from '@/shared/ui/sonner'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  return (
    <RealtimeProvider>
      <HeadContent />
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo" tabIndex={-1} className="min-h-[60vh] pb-20 outline-none md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileNav />
      <SessionWatcher />
      <LiveAnnouncer />
      <Toaster />
    </RealtimeProvider>
  )
}
