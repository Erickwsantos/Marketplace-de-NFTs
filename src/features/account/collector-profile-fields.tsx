import type { CollectorProfile } from '@/contracts'
import { NETWORK_LABELS, PROVIDER_LABELS, toOptions } from '@/shared/lib/labels'
import { Input } from '@/shared/ui/input'
import { Field, SelectField, TextField } from '@/shared/ui/form'
import { useFormContext } from 'react-hook-form'

/**
 * Campos do "Perfil do colecionador" (Figma: Pagamento e Carteiras).
 * Um único componente para os dois fluxos; `prefix` posiciona os campos
 * dentro do formulário pai (ex.: "buyer." no checkout, "profile." em carteiras).
 */
export function CollectorProfileFields({
  prefix = '',
  readOnlyAddress = false,
  omit = [],
}: {
  prefix?: string
  readOnlyAddress?: boolean
  /** Campos controlados em outro ponto da tela (ex.: tipo de carteira no checkout). */
  omit?: Array<keyof CollectorProfile>
}) {
  const name = (field: keyof CollectorProfile) => `${prefix}${field}`
  const { register } = useFormContext()

  return (
    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      <TextField name={name('displayName')} label="Nome de exibição" required autoComplete="name" />
      <TextField name={name('nickname')} label="Apelido da carteira" required placeholder="Ex.: Principal" />
      <SelectField name={name('network')} label="Rede" required placeholder="Selecione uma rede" options={toOptions(NETWORK_LABELS)} />
      <TextField name={name('profileName')} label="Nome do perfil" required autoComplete="username" />
      <TextField
        name={name('address')}
        label="Endereço da carteira"
        required
        placeholder="Endereço 0x da carteira"
        spellCheck={false}
        autoComplete="off"
        readOnly={readOnlyAddress}
      />
      <TextField
        name={name('secondaryAddress')}
        label="ENS ou carteira secundária (opcional)"
        placeholder="ENS ou carteira secundária (opcional)"
        spellCheck={false}
      />
      {!omit.includes('provider') && (
        <SelectField
          name={name('provider')}
          label="Tipo de carteira"
          required
          placeholder="Selecione uma carteira"
          options={toOptions(PROVIDER_LABELS)}
        />
      )}
      <TextField name={name('referralCode')} label="Código de indicação" required autoCapitalize="characters" />
      <TextField name={name('email')} label="E-mail" required type="email" autoComplete="email" />
      <Field name={name('ensName')} label="Nome ENS" required>
        {(aria) => (
          <div className="flex">
            <span
              aria-hidden
              className="flex h-10 items-center rounded-l-md border border-r-0 border-input bg-surface px-3 text-sm text-muted-foreground"
            >
              .eth
            </span>
            <Input {...aria} {...register(name('ensName'))} className="rounded-l-none" spellCheck={false} aria-label="Nome ENS (sufixo .eth)" />
          </div>
        )}
      </Field>
    </div>
  )
}

export const EMPTY_COLLECTOR_PROFILE: CollectorProfile = {
  displayName: '',
  nickname: '',
  network: 'ethereum',
  profileName: '',
  address: '',
  secondaryAddress: '',
  provider: 'metamask',
  referralCode: '',
  email: '',
  ensName: '',
}
