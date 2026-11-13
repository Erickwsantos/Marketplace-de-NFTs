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

const COPY: Record<Mode, { title: string; description: string; submit: string }> = {
  login: {
    title: 'Entrar',
    description: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
    submit: 'Entrar',
  },
  register: {
    title: 'Criar perfil de colecionador',
    description: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
    submit: 'Criar conta',
  },
}

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
      {/* Fundo decorativo (a home esmaecida do Figma). */}
      <div aria-hidden className="relative min-h-[70vh] overflow-hidden">
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
            // Mobile: página cheia; desktop: modal centralizado.
            'top-0 left-0 h-dvh max-w-none translate-x-0 translate-y-0 content-start overflow-y-auto rounded-none border-0 sm:max-w-none',
            'md:top-1/2 md:left-1/2 md:h-auto md:max-h-[calc(100dvh-2rem)] md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:content-normal md:rounded-lg md:border md:p-8',
          )}
        >
          <DialogClose asChild>
            <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3" aria-label="Fechar">
              <XIcon aria-hidden />
            </Button>
          </DialogClose>

          <div className="flex flex-col items-center gap-6 pt-6 md:hidden">
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
              <h1 className="text-center text-xl font-bold md:sr-only">{copy.title}</h1>
            </DialogTitle>
            <DialogDescription id="auth-description" className="text-center md:text-left">
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
        <TextField name="email" label="E-mail" type="email" autoComplete="email" placeholder="contato@email.com" required />
        <PasswordField name="password" label="Senha" autoComplete="current-password" required />
        <p className="-mt-2 text-right text-xs text-muted-foreground">
          <span aria-disabled="true" className="cursor-not-allowed">
            Esqueceu a senha? (em breve)
          </span>
        </p>
        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
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
        <TextField name="username" label="Nome de usuário" autoComplete="username" spellCheck={false} required />
        <TextField name="email" label="Digite seu e-mail" type="email" autoComplete="email" placeholder="contato@email.com" required />
        <PasswordField name="password" label="Senha" autoComplete="new-password" required />
        <PasswordField name="confirmPassword" label="Confirmar senha" autoComplete="new-password" required />
        <Button type="submit" size="lg" className="w-full" loading={register.isPending}>
          {COPY.register.submit}
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
      <Button type="button" variant="outline" className="w-full" onClick={() => unavailable('Google')}>
        <GoogleIcon /> Continuar com Google
      </Button>
      <Button type="button" variant="outline" className="w-full" onClick={() => unavailable('Facebook')}>
        <FacebookIcon /> Continuar com Facebook
      </Button>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="currentColor"
        d="M21.6 12.23c0-.68-.06-1.36-.18-2.02H12v3.83h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.9-1.74 2.99-4.31 2.99-7.33ZM12 22c2.7 0 4.97-.9 6.62-2.43l-3.23-2.5c-.9.6-2.04.96-3.39.96-2.6 0-4.81-1.76-5.6-4.12H3.07v2.58A10 10 0 0 0 12 22Zm-5.6-8.09a6 6 0 0 1 0-3.82V7.5H3.07a10 10 0 0 0 0 9l3.33-2.59ZM12 5.96c1.47 0 2.79.5 3.83 1.5l2.86-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.5l3.33 2.59C7.19 7.72 9.4 5.96 12 5.96Z"
      />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="currentColor"
        d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z"
      />
    </svg>
  )
}
