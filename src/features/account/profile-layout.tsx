import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { LogOutIcon } from 'lucide-react'
import { useLogout } from '@/features/auth/session'
import { announce } from '@/shared/a11y/announcer'
import { cn } from '@/shared/lib/cn'
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

const itemBase =
  'relative flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors md:rounded-none md:border-l-2 md:px-4'

export function ProfileLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname }).replace(/\/$/, '') || '/'
  const navigate = useNavigate()
  const logout = useLogout()

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
    <div className="container-page grid gap-6 py-6 md:grid-cols-[220px_minmax(0,1fr)] md:py-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
      <aside className="flex min-w-0 flex-col gap-4">
        <nav aria-label="Meu perfil" className="min-w-0 rounded-md bg-surface md:py-4">
          <p className="hidden px-4 pb-3 text-base font-bold md:block">Meu perfil</p>
          <ul className="flex gap-1 overflow-x-auto p-2 md:flex-col md:gap-0 md:overflow-visible md:p-0">
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
