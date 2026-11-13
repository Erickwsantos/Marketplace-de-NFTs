import { useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { HeartIcon, HomeIcon, LogInIcon, SearchIcon, ShoppingCartIcon, UserIcon } from 'lucide-react'
import { useAuth } from '@/features/auth/session'
import { useCart } from '@/features/cart/hooks'
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

function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
  const cartLabel = useCartLabel()

  const navLink = (active: boolean) =>
    cn(
      'border-b-2 pb-1 text-sm transition-colors hover:text-primary',
      active ? 'border-primary font-semibold text-primary' : 'border-transparent text-foreground',
    )

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
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
          <Button variant="ghost" size="icon-sm" onClick={() => setSearchOpen(true)} aria-label="Buscar NFTs">
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
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  )
}

/** Navegação inferior no mobile (Figma: Início, Favoritos, Carrinho, Perfil). */
export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { user } = useAuth()
  const cartLabel = useCartLabel()
  const item = (active: boolean) =>
    cn('relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]', active ? 'text-primary' : 'text-muted-foreground')

  return (
    <nav aria-label="Navegação inferior" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="flex">
        <li className="flex flex-1">
          <Link to="/" className={item(pathname === '/')} aria-current={pathname === '/' ? 'page' : undefined}>
            <HomeIcon className="size-5" aria-hidden /> Início
          </Link>
        </li>
        <li className="flex flex-1">
          <Link to="/profile/favorites" className={item(pathname === '/profile/favorites')}>
            <HeartIcon className="size-5" aria-hidden /> Favoritos
          </Link>
        </li>
        <li className="flex flex-1">
          <Link to="/cart" className={item(pathname === '/cart')} aria-label={cartLabel}>
            <span className="relative">
              <ShoppingCartIcon className="size-5" aria-hidden />
              <CartCount />
            </span>
            <span aria-hidden>Carrinho</span>
          </Link>
        </li>
        <li className="flex flex-1">
          <Link to={user ? '/profile' : '/login'} className={item(pathname.startsWith('/profile') || pathname === '/login')}>
            <UserIcon className="size-5" aria-hidden /> {user ? 'Perfil' : 'Entrar'}
          </Link>
        </li>
      </ul>
    </nav>
  )
}
