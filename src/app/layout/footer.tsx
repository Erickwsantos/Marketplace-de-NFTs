import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { CATEGORY_LABELS } from '@/shared/lib/labels'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Logo } from './header'

const FEATURES = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

/** Fora do escopo (páginas editoriais/suporte): texto sem link, sem aparentar funcionar. */
function Soon({ children }: { children: string }) {
  return (
    <span className="text-muted-foreground/70" title="Em breve">
      {children}
      <span className="sr-only"> (em breve)</span>
    </span>
  )
}

const FOOTER_CATEGORIES = ['arte-digital', 'fotografia', 'musica', 'arte-3d', 'utilidade'] as const

function Newsletter() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Informe um e-mail válido')
      return
    }
    setError(null)
    // Newsletter não faz parte da entrega: informa em vez de simular sucesso.
    toast.info('A inscrição na newsletter ainda não está disponível nesta demonstração.')
  }
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2">
      <h2 className="text-sm font-bold">Antecipe-se ao próximo lançamento</h2>
      <div className="flex gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          E-mail para newsletter
        </label>
        <Input
          id="newsletter-email"
          type="email"
          placeholder="Digite seu e-mail..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'newsletter-error' : 'newsletter-hint'}
          className="h-9"
        />
        <Button type="submit" size="sm" className="h-9">
          Enviar
        </Button>
      </div>
      {error ? (
        <p id="newsletter-error" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p id="newsletter-hint" className="text-xs text-muted-foreground">
          Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
        </p>
      )}
    </form>
  )
}

export function Footer() {
  return (
    <footer className="mt-16 pb-20 md:pb-0">
      <div className="container-page">
        <div className="grid gap-6 rounded-t-md bg-surface p-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.letter} className="flex flex-col gap-2 lg:border-r lg:border-border lg:pr-6">
              <span aria-hidden className="grid size-10 place-items-center rounded-full bg-primary font-bold text-primary-foreground">
                {f.letter}
              </span>
              <h2 className="text-sm font-bold">{f.title}</h2>
              <p className="text-xs text-muted-foreground">{f.text}</p>
            </div>
          ))}
          <Newsletter />
        </div>
        <div className="grid gap-3 bg-band px-6 py-5 text-xs sm:grid-cols-2 lg:grid-cols-4 lg:items-center">
          <Logo />
          <p>Feito para colecionadores, criadores e cultura</p>
          <p>contato@email.com</p>
          <p>+55 11 4002 8922</p>
        </div>
        <div className="grid gap-8 rounded-b-md bg-surface px-6 py-8 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <nav aria-label="Rodapé: meu perfil">
            <h2 className="mb-3 text-sm font-bold">Meu perfil</h2>
            <ul className="flex flex-col gap-2">
              <li><Link to="/profile" className="hover:text-primary">Meu perfil</Link></li>
              <li><Soon>Minha coleção</Soon></li>
              <li><Soon>Atividade</Soon></li>
              <li><Soon>Estúdio do criador</Soon></li>
              <li><Link to="/profile/favorites" className="hover:text-primary">Lista de interesse</Link></li>
            </ul>
          </nav>
          <div>
            <h2 className="mb-3 text-sm font-bold">Central de ajuda</h2>
            <ul className="flex flex-col gap-2">
              {['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'].map((label) => (
                <li key={label}><Soon>{label}</Soon></li>
              ))}
            </ul>
          </div>
          <nav aria-label="Rodapé: coleções">
            <h2 className="mb-3 text-sm font-bold">Coleções</h2>
            <ul className="flex flex-col gap-2">
              {FOOTER_CATEGORIES.map((category) => (
                <li key={category}>
                  <Link to="/" search={{ categories: [category] }} hash="catalogo" className="hover:text-primary">
                    {CATEGORY_LABELS[category]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="mb-3 text-sm font-bold">Redes sociais</h2>
              <ul className="flex gap-2" aria-label="Redes sociais (em breve)">
                {['f', 'ig', 'x', 'in', 'yt'].map((mark) => (
                  <li key={mark} aria-hidden className="grid size-7 place-items-center rounded border border-primary/60 text-[10px] font-bold text-primary/80">
                    {mark}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="mb-2 text-sm font-bold">Carteiras compatíveis</h2>
              <ul className="flex flex-wrap gap-1.5">
                {['MetaMask', 'WalletConnect', 'Coinbase'].map((w) => (
                  <li key={w} className="rounded-full border border-primary/50 px-2 py-0.5 text-[10px] uppercase text-primary">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <p className="py-6 text-center text-xs text-muted-foreground">© 2026 Kurio. Propriedade digital para todos.</p>
      </div>
    </footer>
  )
}
