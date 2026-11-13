import { useId, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormProvider, useFormContext } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { changePasswordInputSchema, profileInputSchema, type ProfileInput, type User } from '@/contracts'
import { useAuth } from '@/features/auth/session'
import { announce } from '@/shared/a11y/announcer'
import { errorMessage } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/ui/button'
import { applyServerErrors, Field, FormAlert, PasswordField, TextField, useZodForm } from '@/shared/ui/form'
import { Input } from '@/shared/ui/input'
import { Skeleton } from '@/shared/ui/primitives'
import { QueryState } from '@/shared/ui/query-state'
import { accountQueries, profileApi } from './api'
import { AVATAR_ACCEPT, initials, resizeAvatar, validateAvatarFile } from './avatar'

const passwordFormSchema = changePasswordInputSchema
  .extend({ confirmNewPassword: z.string().min(1, 'Confirme a nova senha') })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    path: ['confirmNewPassword'],
    message: 'As senhas não conferem',
  })

const toProfileValues = (user: User): ProfileInput => ({
  displayName: user.displayName,
  username: user.username,
  email: user.email,
  ensName: user.ensName ?? '',
  walletNickname: user.walletNickname ?? '',
})

function notify(message: string) {
  toast.success(message)
  announce(message)
}

/** Atualiza o perfil no cache privado e revalida a sessão (o header mostra o nome/avatar). */
function useStoreUser() {
  const queryClient = useQueryClient()
  return (user: User) => {
    queryClient.setQueryData(queryKeys.profile(user.id), user)
    void queryClient.invalidateQueries({ queryKey: ['session'] })
  }
}

export function ProfilePage() {
  const { userId } = useAuth()
  const query = useQuery({ ...accountQueries.profile(userId ?? ''), enabled: Boolean(userId) })

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-xl font-bold text-primary md:text-2xl">Perfil do colecionador</h1>
      <QueryState query={query} skeleton={<ProfileSkeleton />} errorTitle="Não foi possível carregar o perfil">
        {(user) => <ProfileForm key={user.id} user={user} />}
      </QueryState>
      <PasswordForm />
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}

function ProfileForm({ user }: { user: User }) {
  const storeUser = useStoreUser()
  const [alert, setAlert] = useState<string | null>(null)
  const form = useZodForm(profileInputSchema, { defaultValues: toProfileValues(user) })
  const update = useMutation({ mutationFn: profileApi.update, meta: { silent: true } })

  const onSubmit = form.handleSubmit((values) => {
    if (update.isPending) return
    setAlert(null)
    update.mutate(values, {
      onSuccess: (saved) => {
        storeUser(saved)
        form.reset(toProfileValues(saved))
        notify('Perfil atualizado.')
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
      <form onSubmit={onSubmit} noValidate aria-labelledby="profile-data-title" className="flex flex-col gap-5">
        <h2 id="profile-data-title" className="sr-only">
          Dados do perfil
        </h2>
        <FormAlert message={alert} />
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <TextField name="displayName" label="Nome de exibição" required autoComplete="name" />
          <TextField name="username" label="Nome de usuário" required autoComplete="username" spellCheck={false} />
          <TextField name="email" label="E-mail" required type="email" autoComplete="email" />
          <EnsField />
          <TextField name="walletNickname" label="Apelido da carteira" required />
          <AvatarEditor user={user} />
        </div>
        <div className="flex justify-end">
          <Button type="submit" className="w-full sm:w-auto sm:min-w-40" loading={update.isPending}>
            Salvar
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}

/** Nome ENS com o adorno ".eth", no mesmo padrão de CollectorProfileFields. */
function EnsField() {
  const { register } = useFormContext<ProfileInput>()
  return (
    <Field name="ensName" label="Nome ENS" required>
      {(aria) => (
        <div className="flex">
          <span
            aria-hidden
            className="flex h-10 items-center rounded-l-md border border-r-0 border-input bg-surface px-3 text-sm text-muted-foreground"
          >
            .eth
          </span>
          <Input {...aria} {...register('ensName')} className="rounded-l-none" spellCheck={false} aria-label="Nome ENS (sufixo .eth)" />
        </div>
      )}
    </Field>
  )
}

function AvatarEditor({ user }: { user: User }) {
  const storeUser = useStoreUser()
  const inputRef = useRef<HTMLInputElement>(null)
  const errorId = useId()
  const [error, setError] = useState<string | null>(null)

  const upload = useMutation({
    mutationFn: async (file: File) => profileApi.uploadAvatar(await resizeAvatar(file)),
    meta: { silent: true },
  })
  const remove = useMutation({ mutationFn: profileApi.removeAvatar, meta: { silent: true } })
  const busy = upload.isPending || remove.isPending

  const fail = (err: unknown) => {
    const message = errorMessage(err)
    setError(message)
    announce(message, 'assertive')
  }

  const onFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || busy) return
    const invalid = validateAvatarFile(file)
    setError(invalid)
    if (invalid) {
      announce(invalid, 'assertive')
      return
    }
    upload.mutate(file, {
      onSuccess: (saved) => {
        storeUser(saved)
        notify('Avatar atualizado.')
      },
      onError: fail,
    })
  }

  const onRemove = () => {
    if (busy) return
    setError(null)
    remove.mutate(undefined, {
      onSuccess: (saved) => {
        storeUser(saved)
        notify('Avatar removido.')
      },
      onError: fail,
    })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold">Avatar</span>
      <div className="flex items-center gap-4">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={`Avatar de ${user.displayName}`}
            width={64}
            height={64}
            className="size-16 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <span
            role="img"
            aria-label={`Sem avatar: iniciais de ${user.displayName}`}
            className="grid size-16 shrink-0 place-items-center rounded-full bg-surface-raised text-lg font-bold text-primary"
          >
            {initials(user.displayName)}
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_ACCEPT}
          onChange={onFile}
          tabIndex={-1}
          className="sr-only"
          aria-label="Escolher imagem do avatar"
        />
        <Button
          type="button"
          size="sm"
          loading={upload.isPending}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          aria-describedby={error ? errorId : undefined}
        >
          Alterar
        </Button>
        {user.avatarUrl && (
          <Button type="button" variant="link" size="sm" loading={remove.isPending} disabled={busy} onClick={onRemove}>
            Remover
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">PNG, JPG ou WEBP até 2 MB.</p>
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function PasswordForm() {
  const [alert, setAlert] = useState<string | null>(null)
  const form = useZodForm(passwordFormSchema, {
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  })
  const change = useMutation({ mutationFn: profileApi.changePassword, meta: { silent: true } })

  const onSubmit = form.handleSubmit(({ currentPassword, newPassword }) => {
    if (change.isPending) return
    setAlert(null)
    change.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          form.reset()
          notify('Senha alterada.')
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
      <form onSubmit={onSubmit} noValidate aria-labelledby="password-title" className="flex flex-col gap-5 border-t border-border pt-8">
        <h2 id="password-title" className="text-base font-bold text-primary md:text-lg">
          Alterar senha
        </h2>
        <FormAlert message={alert} />
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <PasswordField name="currentPassword" label="Senha atual" required autoComplete="current-password" className="sm:col-span-2 sm:max-w-[calc(50%-0.75rem)]" />
          <PasswordField name="newPassword" label="Nova senha" required autoComplete="new-password" />
          <PasswordField name="confirmNewPassword" label="Confirmar nova senha" required autoComplete="new-password" />
        </div>
        <div className="flex justify-end">
          <Button type="submit" className="w-full sm:w-auto sm:min-w-40" loading={change.isPending}>
            Salvar
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
