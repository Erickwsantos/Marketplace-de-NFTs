import { useEffect, useRef } from 'react'
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { LogOutIcon } from 'lucide-react'
import { useLogout } from '@/features/auth/session'
import { announce } from '@/shared/a11y/announcer'
import { cn } from '@/shared/lib/cn'
import { ScreenHeader } from '@/shared/ui/screen-header'
import { InstallApp } from './install-app'

type NavItem = { label: string; to: '/profile' | '/profile/wallets' | '/profile/favorites' } | { label: string; to?: undefined }

/** Itens do Figma; os sem rota estão fora do escopo e aparecem como "(em breve)". */
const NAV_ITEMS: NavItem[] = [
  { label: 'Dados do perfil', to: '/profile' },
  { label: 'Carteiras', to: '/profile/wallets' },
  { label: 'Atividade' },
  { label: 'Lista de interesse', to: '/profile/favorites' },
  { label: 'Ofertas' },
  { label: 'Arquivos baixados' },
  { label: 'Suporte' },
]

/** Título do cabeçalho mobile (é o <h1> no mobile; as páginas escondem o próprio). */
const MOBILE_TITLES: Record<string, string> = {
  '/profile': 'Meu perfil',
  '/profile/wallets': 'Carteiras',
  '/profile/favorites': 'Lista de interesse',
}

const itemBase =
  'relative flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm transition-colors md:rounded-none md:border-l-2 md:px-4'

export function ProfileLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname }).replace(/\/$/, '') || '/'
  const navigate = useNavigate()
  const logout = useLogout()
  const listRef = useRef<HTMLUListElement>(null)

  // Mobile: abas em rolagem horizontal — mantém a aba ativa visível (sem rolar a página).
  // Observa o tamanho da lista: no primeiro carregamento ela pode ainda não ter largura.
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const center = () => {
      const current = list.querySelector<HTMLElement>('[aria-current=page]')
      if (!current || list.scrollWidth <= list.clientWidth) return
      const listBox = list.getBoundingClientRect()
      const itemBox = current.getBoundingClientRect()
      list.scrollLeft += itemBox.left - listBox.left - (listBox.width - itemBox.width) / 2
    }
    center()
    const observer = new ResizeObserver(center)
    observer.observe(list)
    return () => observer.disconnect()
  }, [pathname])

  const signOut = () => {
    if (logout.isPending) return
    logout.mutate(undefined, {
      onSettled: () => {
        announce('Você saiu da sua conta.')
        void navigate({ to: '/', replace: true })
      },
    })
  }

  return (
    <div className="container-page grid gap-4 pb-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 md:py-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
      {/* Mobile: cabeçalho de app (voltar + título); md:hidden não ocupa célula do grid. */}
      <ScreenHeader title={MOBILE_TITLES[pathname] ?? 'Meu perfil'} className="mb-0" />
      <aside className="flex min-w-0 flex-col gap-4">
        <nav aria-label="Meu perfil" className="min-w-0 rounded-md bg-surface max-md:rounded-2xl md:py-4">
          <p className="hidden px-4 pb-3 text-base font-bold md:block">Meu perfil</p>
          <ul ref={listRef} className="flex gap-1 overflow-x-auto p-1.5 [scrollbar-width:none] md:flex-col md:gap-0 md:overflow-visible md:p-0 [&::-webkit-scrollbar]:hidden">
            {NAV_ITEMS.map((item) => {
              if (!item.to) {
                return (
                  <li key={item.label}>
                    <span aria-disabled="true" className={cn(itemBase, 'cursor-not-allowed border-transparent text-muted-foreground/70')}>
                      {item.label}
                      <span className="text-[10px]">(em breve)</span>
                    </span>
                  </li>
                )
              }
              const active = pathname === item.to
              return (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    activeOptions={{ exact: true }}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      itemBase,
                      active
                        ? 'bg-primary/10 font-semibold text-primary md:border-primary md:bg-transparent'
                        : 'border-transparent text-foreground hover:text-primary',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
            <li>
              <button
                type="button"
                onClick={signOut}
                disabled={logout.isPending}
                className={cn(itemBase, 'w-full border-transparent text-foreground hover:text-primary disabled:opacity-50')}
              >
                <LogOutIcon className="size-4" aria-hidden /> Sair
              </button>
            </li>
          </ul>
        </nav>
        <InstallApp className="hidden md:flex" />
      </aside>

      <div className="flex min-w-0 flex-col gap-8">
        <Outlet />
        <InstallApp className="md:hidden" />
      </div>
    </div>
  )
}
