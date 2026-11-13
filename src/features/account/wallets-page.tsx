import { useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormProvider, type UseFormReturn } from 'react-hook-form'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { updateWalletInputSchema, type CollectorProfile, type UpdateWalletInput, type Wallet, type WalletRole } from '@/contracts'
import { useAuth } from '@/features/auth/session'
import { announce } from '@/shared/a11y/announcer'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { applyServerErrors, FormAlert, useZodForm } from '@/shared/ui/form'
import { Label } from '@/shared/ui/label'
import { Skeleton } from '@/shared/ui/primitives'
import { QueryState } from '@/shared/ui/query-state'
import { accountQueries, walletsApi } from './api'
import { CollectorProfileFields, EMPTY_COLLECTOR_PROFILE } from './collector-profile-fields'

const ROLE_LABEL: Record<WalletRole, string> = { primary: 'Carteira principal', secondary: 'Carteira secundária' }

type WalletForm = UseFormReturn<UpdateWalletInput, unknown, UpdateWalletInput>

const useWalletForm = (profile: CollectorProfile) => useZodForm(updateWalletInputSchema, { defaultValues: { profile } })

export function WalletsPage() {
  const { userId } = useAuth()
  const query = useQuery({ ...accountQueries.wallets(userId ?? ''), enabled: Boolean(userId) })

  return (
    <div className="flex flex-col gap-10">
      <h1 className="sr-only">Carteiras</h1>
      <QueryState query={query} skeleton={<WalletsSkeleton />} errorTitle="Não foi possível carregar suas carteiras">
        {({ items }) => {
          const primary = items.find((w) => w.role === 'primary') ?? null
          const secondary = items.find((w) => w.role === 'secondary') ?? null
          return (
            <div className="flex flex-col gap-12">
              <WalletSection
                walletRole="primary"
                wallet={primary}
                description="Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados."
                emptyText="Você ainda não adicionou uma carteira principal."
              />
              <WalletSection
                walletRole="secondary"
                wallet={secondary}
                primary={primary}
                emptyText="Você ainda não adicionou uma carteira secundária."
              />
            </div>
          )
        }}
      </QueryState>
    </div>
  )
}

function WalletsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-full max-w-md" />
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

function WalletSection({
  walletRole: role,
  wallet,
  primary = null,
  description,
  emptyText,
}: {
  walletRole: WalletRole
  wallet: Wallet | null
  primary?: Wallet | null
  description?: string
  emptyText: string
}) {
  const titleId = useId()
  const [adding, setAdding] = useState(false)

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="text-lg font-bold text-primary md:text-xl">
            {ROLE_LABEL[role]}
          </h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {role === 'primary' && !wallet && !adding && (
          <Button variant="link" onClick={() => setAdding(true)} aria-label={`Adicionar ${ROLE_LABEL[role].toLowerCase()}`}>
            <PlusIcon aria-hidden /> Adicionar
          </Button>
        )}
      </div>

      {wallet ? (
        <EditWallet key={`${wallet.id}-${wallet.version}`} wallet={wallet} />
      ) : (
        <NewWallet role={role} primary={primary} adding={adding} onAdd={() => setAdding(true)} onCancel={() => setAdding(false)} emptyText={emptyText} />
      )}
    </section>
  )
}

function EditWallet({ wallet }: { wallet: Wallet }) {
  const form = useWalletForm(wallet.profile)
  return <WalletFormBody form={form} role={wallet.role} wallet={wallet} />
}

/** Sem carteira: texto vazio, "Igual à carteira principal" (secundária) e o formulário de criação. */
function NewWallet({
  role,
  primary,
  adding,
  onAdd,
  onCancel,
  emptyText,
}: {
  role: WalletRole
  primary: Wallet | null
  adding: boolean
  onAdd: () => void
  onCancel: () => void
  emptyText: string
}) {
  const form = useWalletForm(EMPTY_COLLECTOR_PROFILE)
  const [sameAsPrimary, setSameAsPrimary] = useState(false)
  const checkboxId = useId()

  /** Copia os dados da principal, exceto o apelido (que identifica cada carteira). */
  const applySame = (checked: boolean) => {
    setSameAsPrimary(checked)
    const nickname = form.getValues('profile.nickname')
    const base = checked && primary ? primary.profile : EMPTY_COLLECTOR_PROFILE
    form.reset({ profile: { ...base, nickname } }, { keepDirty: false })
  }

  return (
    <div className="flex flex-col gap-5">
      {!adding && <p className="rounded-md bg-surface p-4 text-sm text-muted-foreground">{emptyText}</p>}
      {role === 'secondary' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id={checkboxId}
                checked={sameAsPrimary}
                disabled={!primary}
                onCheckedChange={(checked) => applySame(checked === true)}
                aria-describedby={!primary ? `${checkboxId}-hint` : undefined}
              />
              <Label htmlFor={checkboxId} className="text-sm">
                Igual à carteira principal
              </Label>
            </div>
            {!primary && (
              <span id={`${checkboxId}-hint`} className="pl-6 text-xs text-muted-foreground">
                Cadastre a carteira principal primeiro.
              </span>
            )}
          </div>
          {!adding && (
            <Button variant="outline" size="sm" onClick={onAdd}>
              <PlusIcon aria-hidden /> Adicionar
            </Button>
          )}
        </div>
      )}
      {adding && <WalletFormBody form={form} role={role} wallet={null} onCancel={onCancel} />}
    </div>
  )
}

function WalletFormBody({
  form,
  role,
  wallet,
  onCancel,
}: {
  form: WalletForm
  role: WalletRole
  wallet: Wallet | null
  onCancel?: () => void
}) {
  const { userId } = useAuth()
  const queryClient = useQueryClient()
  const [alert, setAlert] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: ({ profile }: UpdateWalletInput) => (wallet ? walletsApi.update(wallet.id, profile) : walletsApi.create(role, profile)),
    meta: { silent: true },
  })

  const onSubmit = form.handleSubmit((values) => {
    if (save.isPending) return
    setAlert(null)
    save.mutate(values, {
      onSuccess: async () => {
        const message = `${ROLE_LABEL[role]} ${wallet ? 'atualizada' : 'adicionada'}.`
        toast.success(message)
        announce(message)
        if (userId) await queryClient.invalidateQueries({ queryKey: queryKeys.wallets(userId) })
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
      <form onSubmit={onSubmit} noValidate aria-label={ROLE_LABEL[role]} className="flex flex-col gap-5">
        <FormAlert message={alert} />
        <CollectorProfileFields prefix="profile." />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={save.isPending}>
              Cancelar
            </Button>
          )}
          <Button type="submit" className="sm:min-w-44" loading={save.isPending}>
            Salvar carteira
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
