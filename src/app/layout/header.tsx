import { useRef, useState, type RefObject } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { CompassIcon, HeartIcon, HomeIcon, LogInIcon, SearchIcon, ShoppingCartIcon, UserIcon } from 'lucide-react'
import { useAuth } from '@/features/auth/session'
import { useCart } from '@/features/cart/hooks'
import { useMobileChrome } from './mobile-chrome'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('text-sm font-bold tracking-[0.25em] text-foreground', className)} aria-label="Kurio — página inicial">
      KURIO
    </Link>
  )
}

/** Itens fora do escopo: visíveis como no Figma, mas sem aparentar funcionar. */
function SoonItem({ label }: { label: string }) {
  return (
    <span aria-disabled="true" title="Em breve" className="cursor-not-allowed text-sm text-muted-foreground/70">
      {label}
      <span className="sr-only"> (em breve)</span>
    </span>
  )
}

function useActiveSection(): 'home' | 'market' | 'other' {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/nfts') || pathname.startsWith('/cart') || pathname.startsWith('/checkout')) return 'market'
  return 'other'
}

export function CartCount({ className }: { className?: string }) {
  const { data } = useCart()
  const count = data?.itemCount ?? 0
  if (count === 0) return null
  return (
    <span
      className={cn(
        'absolute -top-1.5 -right-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 font-bold text-primary-foreground',
        className,
      )}
    >
      {count}
    </span>
  )
}

function useCartLabel() {
  const { data } = useCart()
  const count = data?.itemCount ?? 0
  return count > 0 ? `Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}` : 'Carrinho vazio'
}

function SearchDialog({
  open,
  onOpenChange,
  triggerRef,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Botão que abriu o diálogo: recebe o foco de volta ao fechar (o Radix só faz isso com DialogTrigger). */
  triggerRef: RefObject<HTMLButtonElement | null>
}) {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          triggerRef.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>Buscar NFTs</DialogTitle>
          <DialogDescription>Pesquise por nome, coleção, criador ou ID do token.</DialogDescription>
        </DialogHeader>
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault()
            onOpenChange(false)
            void navigate({ to: '/', search: (prev) => ({ ...prev, q: value.trim() || undefined, page: undefined }), hash: 'catalogo' })
          }}
          className="flex gap-2"
        >
          <label htmlFor="header-search" className="sr-only">
            Termo de busca
          </label>
          <Input id="header-search" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Explorar coleções" />
          <Button type="submit">Buscar</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function Header() {
  const section = useActiveSection()
  const { user, isResolving } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)
  const searchButtonRef = useRef<HTMLButtonElement>(null)
  const cartLabel = useCartLabel()

  const navLink = (active: boolean) =>
    cn(
      'border-b-2 pb-1 text-sm transition-colors hover:text-primary',
      active ? 'border-primary font-semibold text-primary' : 'border-transparent text-foreground',
    )

  return (
    // No mobile cada tela tem o próprio cabeçalho (Figma): o header global é só desktop/tablet.
    <header className="sticky top-0 z-40 hidden border-b border-border/60 bg-background/95 backdrop-blur md:block">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-8">
            <li>
              <Link to="/" className={navLink(section === 'home')} aria-current={section === 'home' ? 'page' : undefined}>
                Início
              </Link>
            </li>
            <li>
              <Link to="/" hash="catalogo" className={navLink(section === 'market')}>
                Mercado
              </Link>
            </li>
            <li>
              <SoonItem label="Criadores" />
            </li>
            <li>
              <SoonItem label="Aprenda" />
            </li>
          </ul>
        </nav>
        <div className="flex items-center gap-2 md:gap-3">
          <Button ref={searchButtonRef} variant="ghost" size="icon-sm" onClick={() => setSearchOpen(true)} aria-label="Buscar NFTs">
            <SearchIcon aria-hidden />
          </Button>
          <Button variant="ghost" size="icon-sm" asChild className="relative hidden md:inline-flex">
            <Link to="/cart" aria-label={cartLabel}>
              <ShoppingCartIcon aria-hidden />
              <CartCount />
            </Link>
          </Button>
          {user ? (
            <Link
              to="/profile"
              className="hidden items-center gap-2 rounded-md border border-primary px-2 py-1 text-xs text-primary hover:bg-primary/10 md:inline-flex"
            >
              <UserIcon className="size-4" aria-hidden />
              <span className="max-w-28 truncate">{user.displayName}</span>
            </Link>
          ) : (
            <Button variant="outline" size="sm" asChild className={cn('hidden md:inline-flex', isResolving && 'invisible')}>
              <Link to="/login" search={{ redirect: undefined }}>
                <LogInIcon aria-hidden /> Entrar
              </Link>
            </Button>
          )}
        </div>
      </div>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} triggerRef={searchButtonRef} />
    </header>
  )
}

/**
 * Navegação inferior flutuante do mobile (Figma): só ícones (com nome
 * acessível) e botão central em destaque para explorar o mercado.
 * Oculta nas telas imersivas (detalhe, carrinho, pagamento, login).
 */
export function MobileNav() {
  const { pathname, bottomNav } = useMobileChrome()
  const { user } = useAuth()
  const cartLabel = useCartLabel()
  if (!bottomNav) return null
  const item = (active: boolean) =>
    cn(
      'relative grid size-11 place-items-center rounded-full transition-colors',
      active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
    )
  const profileActive = pathname.startsWith('/profile') && pathname !== '/profile/favorites'

  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 rounded-2xl border border-border/70 bg-surface/95 shadow-lg shadow-black/40 backdrop-blur md:hidden"
    >
      <ul className="flex items-center justify-around px-2 py-1.5">
        <li>
          <Link to="/" className={item(pathname === '/')} aria-label="Início" aria-current={pathname === '/' ? 'page' : undefined}>
            <HomeIcon className="size-5" aria-hidden />
          </Link>
        </li>
        <li>
          <Link
            to="/profile/favorites"
            className={item(pathname === '/profile/favorites')}
            aria-label="Favoritos"
            aria-current={pathname === '/profile/favorites' ? 'page' : undefined}
          >
            <HeartIcon className="size-5" aria-hidden />
          </Link>
        </li>
        <li>
          <Link
            to="/"
            hash="catalogo"
            aria-label="Explorar o mercado"
            className="-mt-8 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition-colors hover:bg-primary-hover"
          >
            <CompassIcon className="size-6" aria-hidden />
          </Link>
        </li>
        <li>
          <Link to="/cart" className={item(pathname === '/cart')} aria-label={cartLabel}>
            <ShoppingCartIcon className="size-5" aria-hidden />
            <CartCount className="top-0.5 right-0.5" />
          </Link>
        </li>
        <li>
          <Link
            to={user ? '/profile' : '/login'}
            className={item(profileActive)}
            aria-label={user ? 'Perfil' : 'Entrar'}
            aria-current={profileActive ? 'page' : undefined}
          >
            <UserIcon className="size-5" aria-hidden />
          </Link>
        </li>
      </ul>
    </nav>
  )
}
