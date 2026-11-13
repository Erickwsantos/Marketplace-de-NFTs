import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { FormProvider } from 'react-hook-form'
import { XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { loginInputSchema, registerInputSchema } from '@/contracts'
import { announce } from '@/shared/a11y/announcer'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog'
import { applyServerErrors, FormAlert, PasswordField, TextField, useZodForm } from '@/shared/ui/form'
import { isPrivatePath } from './redirect'
import { useAuth, useLogin, useRegister } from './session'

type Mode = 'login' | 'register'

const COPY = {
  login: {
    title: 'Entrar',
    description: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
    submit: 'Entrar',
  },
  register: {
    title: 'Criar perfil de colecionador',
    description: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
    submit: 'Criar conta',
    submitMobile: 'Criar perfil',
  },
} satisfies Record<Mode, { title: string; description: string; submit: string; submitMobile?: string }>

/**
 * Figma: campos só com placeholder (o rótulo continua para leitores de tela via
 * `hideLabel`). No mobile o input é mais alto, arredondado e com fundo escuro.
 */
const AUTH_FIELD =
  'max-md:[&_input]:h-11 max-md:[&_input]:rounded-xl max-md:[&_input]:border-border max-md:[&_input]:bg-surface max-md:[&_input+button]:rounded-r-xl'
const AUTH_SUBMIT = 'w-full max-md:rounded-xl'
/** Login social discreto (Figma, mobile e desktop): fundo escuro, borda sutil, ícone colorido. */
const SOCIAL_BUTTON = 'w-full border border-border bg-surface text-foreground hover:bg-surface-raised max-md:h-11 max-md:rounded-xl'

const registerFormSchema = registerInputSchema
  .extend({ confirmPassword: z.string().min(1, 'Confirme a senha') })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })

function useAuthSearch() {
  const search = useSearch({ strict: false })
  return { redirect: search.redirect, reason: search.reason }
}

/** Após autenticar: volta ao destino (já validado como caminho interno) ou à home. */
function useGoToDestination() {
  const navigate = useNavigate()
  const { redirect } = useAuthSearch()
  return () => (redirect ? navigate({ href: redirect, replace: true }) : navigate({ to: '/', replace: true }))
}

export function AuthPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const { redirect, reason } = useAuthSearch()
  const { isAuthenticated } = useAuth()
  const goToDestination = useGoToDestination()
  const [submitted, setSubmitted] = useState(false)
  const copy = COPY[mode]

  // Já autenticado ao abrir /login ou /register: segue para o destino.
  useEffect(() => {
    if (isAuthenticated && !submitted) void goToDestination()
  }, [isAuthenticated, submitted]) // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    const isPrivate = redirect && isPrivatePath(redirect)
    if (redirect && !isPrivate) void navigate({ href: redirect })
    else void navigate({ to: '/' })
  }

  const tab = (target: Mode) =>
    cn(
      'flex-1 border-b-2 pb-2 text-center text-sm transition-colors hover:text-primary',
      target === mode ? 'border-primary font-semibold text-primary' : 'border-border text-muted-foreground',
    )

  return (
    <>
      {/* Fundo decorativo (a home esmaecida do Figma). No mobile a tela é cheia e sólida. */}
      <div aria-hidden className="relative min-h-[70vh] overflow-hidden max-md:hidden">
        <img
          src="/nfts/monkey-green-640.webp"
          alt=""
          width={640}
          height={640}
          className="absolute inset-0 size-full scale-110 object-cover opacity-40 blur-2xl"
        />
        <div className="absolute inset-0 bg-background/70" />
      </div>

      <Dialog open onOpenChange={(open) => !open && close()}>
        <DialogContent
          showCloseButton={false}
          aria-describedby="auth-description"
          onOpenAutoFocus={(event) => {
            // Foco inicial no primeiro campo do formulário (não no botão fechar).
            const first = (event.currentTarget as HTMLElement | null)?.querySelector<HTMLInputElement>('form input')
            if (first) {
              event.preventDefault()
              first.focus()
            }
          }}
          className={cn(
            'gap-5 border-border bg-background p-6',
            // Mobile (Figma): tela cheia sólida, sem cara de diálogo (sem animação de zoom
            // que revelaria o fundo); desktop: modal centralizado.
            'top-0 left-0 h-dvh max-w-none translate-x-0 translate-y-0 content-start overflow-y-auto rounded-none border-0 sm:max-w-none',
            'max-md:gap-6 max-md:shadow-none max-md:px-6 max-md:pt-12 max-md:pb-[calc(2rem+env(safe-area-inset-bottom))] max-md:data-[state=open]:animate-none',
            'md:top-1/2 md:left-1/2 md:h-auto md:max-h-[calc(100dvh-2rem)] md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:content-normal md:rounded-lg md:border md:p-8',
          )}
        >
          {/* Mobile: sem X (tela cheia; volta pelo navegador). Esc continua fechando. */}
          <DialogClose asChild>
            <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3 max-md:hidden" aria-label="Fechar">
              <XIcon aria-hidden />
            </Button>
          </DialogClose>

          <div className="flex justify-center md:hidden">
            <span aria-hidden className="text-3xl font-bold tracking-[0.3em]">
              KURIO
            </span>
          </div>

          <nav aria-label="Acesso à conta" className="hidden md:block">
            <ul className="flex gap-4 pr-8">
              <li className="flex flex-1">
                <Link to="/login" search={{ redirect }} replace className={tab('login')} aria-current={mode === 'login' ? 'page' : undefined}>
                  Entrar
                </Link>
              </li>
              <li className="flex flex-1">
                <Link
                  to="/register"
                  search={{ redirect }}
                  replace
                  className={tab('register')}
                  aria-current={mode === 'register' ? 'page' : undefined}
                >
                  Criar conta
                </Link>
              </li>
            </ul>
          </nav>

          <div className="flex flex-col gap-2">
            <DialogTitle asChild>
              <h1 className="text-center text-2xl font-bold md:sr-only">{copy.title}</h1>
            </DialogTitle>
            {/* Mobile (Figma): sem o parágrafo visível; continua descrevendo o diálogo. */}
            <DialogDescription id="auth-description" className="max-md:sr-only md:text-left">
              {copy.description}
            </DialogDescription>
          </div>

          {reason === 'expired' && (
            <p role="status" className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
              Sua sessão expirou. Entre novamente para continuar de onde parou.
            </p>
          )}

          {mode === 'login' ? (
            <LoginForm onSubmitted={() => setSubmitted(true)} onSuccess={goToDestination} />
          ) : (
            <RegisterForm onSubmitted={() => setSubmitted(true)} onSuccess={goToDestination} />
          )}

          <SocialLogin />

          <p className="text-center text-sm text-muted-foreground md:hidden">
            {mode === 'login' ? (
              <>
                Novo na Kurio?{' '}
                <Link to="/register" search={{ redirect }} replace className="font-semibold text-primary hover:underline">
                  Crie uma conta
                </Link>
              </>
            ) : (
              <>
                Já tem uma conta?{' '}
                <Link to="/login" search={{ redirect }} replace className="font-semibold text-primary hover:underline">
                  Entre
                </Link>
              </>
            )}
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface FormCallbacks {
  onSubmitted: () => void
  onSuccess: () => void
}

function LoginForm({ onSubmitted, onSuccess }: FormCallbacks) {
  const login = useLogin()
  const [alert, setAlert] = useState<string | null>(null)
  const form = useZodForm(loginInputSchema, { defaultValues: { email: '', password: '' } })

  const onSubmit = form.handleSubmit((values) => {
    if (login.isPending) return
    setAlert(null)
    onSubmitted()
    login.mutate(values, {
      onSuccess: (session) => {
        announce(`Bem-vindo de volta, ${session.user.displayName}.`)
        onSuccess()
      },
      onError: (error) => {
        const message = applyServerErrors(form, error)
        setAlert(message)
        if (message) announce(message, 'assertive')
      },
    })
  })

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormAlert message={alert} />
        <TextField
          name="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="contato@email.com"
          required
          hideLabel
          className={AUTH_FIELD}
        />
        <PasswordField name="password" label="Senha" autoComplete="current-password" placeholder="Senha" required hideLabel className={AUTH_FIELD} />
        {/* Fora do escopo da demonstração: não é link e não simula sucesso. */}
        <p className="-mt-2 text-right text-xs">
          <span aria-disabled="true" className="cursor-not-allowed text-primary/80">
            Esqueceu a senha? <span className="text-muted-foreground">(em breve)</span>
          </span>
        </p>
        <Button type="submit" size="lg" className={AUTH_SUBMIT} loading={login.isPending}>
          {COPY.login.submit}
        </Button>
      </form>
    </FormProvider>
  )
}

function RegisterForm({ onSubmitted, onSuccess }: FormCallbacks) {
  const register = useRegister()
  const [alert, setAlert] = useState<string | null>(null)
  const form = useZodForm(registerFormSchema, {
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })

  const onSubmit = form.handleSubmit(({ username, email, password }) => {
    if (register.isPending) return
    setAlert(null)
    onSubmitted()
    register.mutate(
      { username, email, password },
      {
        onSuccess: (session) => {
          toast.success('Conta criada com sucesso.')
          announce(`Conta criada. Bem-vindo, ${session.user.displayName}.`)
          onSuccess()
        },
        onError: (error) => {
          const message = applyServerErrors(form, error)
          setAlert(message)
          if (message) announce(message, 'assertive')
        },
      },
    )
  })

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormAlert message={alert} />
        <TextField
          name="username"
          label="Nome de usuário"
          autoComplete="username"
          placeholder="Nome de usuário"
          spellCheck={false}
          required
          hideLabel
          className={AUTH_FIELD}
        />
        <TextField
          name="email"
          label="Digite seu e-mail"
          type="email"
          autoComplete="email"
          placeholder="Digite seu e-mail"
          required
          hideLabel
          className={AUTH_FIELD}
        />
        <PasswordField name="password" label="Senha" autoComplete="new-password" placeholder="Senha" required hideLabel className={AUTH_FIELD} />
        <PasswordField
          name="confirmPassword"
          label="Confirmar senha"
          autoComplete="new-password"
          placeholder="Confirmar senha"
          required
          hideLabel
          className={AUTH_FIELD}
        />
        <Button type="submit" size="lg" className={AUTH_SUBMIT} loading={register.isPending}>
          {/* Figma: "Criar perfil" no mobile; o desktop mantém "Criar conta" (texto visível = nome acessível). */}
          <span className="md:hidden">{COPY.register.submitMobile}</span>
          <span className="max-md:hidden">{COPY.register.submit}</span>
        </Button>
      </form>
    </FormProvider>
  )
}

/** Login social está fora do escopo da demonstração: informa sem simular sucesso. */
function SocialLogin() {
  const unavailable = (provider: string) =>
    toast.info(`Login com ${provider} não está disponível na demonstração. Use e-mail e senha.`, { id: 'social-login' })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" aria-hidden />
        Ou continue com
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>
      <Button type="button" variant="secondary" className={SOCIAL_BUTTON} onClick={() => unavailable('Google')}>
        <GoogleIcon /> Continuar com Google
      </Button>
      <Button type="button" variant="secondary" className={SOCIAL_BUTTON} onClick={() => unavailable('Facebook')}>
        <FacebookIcon /> Continuar com Facebook
      </Button>
    </div>
  )
}

/** "G" com as cores da marca (ícone decorativo; o nome vem do texto do botão). */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29A11.99 11.99 0 0 0 0 12c0 1.94.47 3.76 1.29 5.38l3.98-3.09Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.5 11.5 0 0 0 12 0 11.99 11.99 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <circle cx="12" cy="12" r="9.5" fill="#fff" />
      <path
        fill="#1877F2"
        d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z"
      />
    </svg>
  )
}
