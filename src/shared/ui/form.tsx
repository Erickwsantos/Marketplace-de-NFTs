import { useId, useState, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Controller,
  useForm,
  useFormContext,
  useFormState,
  type FieldValues,
  type Path,
  type Resolver,
  type UseFormProps,
  type UseFormReturn,
} from 'react-hook-form'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import type { z } from 'zod'
import { toApiError } from '@/shared/api/errors'
import { cn } from '@/shared/lib/cn'
import { Input } from './input'
import { Label } from './label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Textarea } from './textarea'

/** Formulário validado pelo mesmo schema Zod do contrato (cliente = servidor). */
export function useZodForm<S extends z.ZodType<FieldValues, FieldValues>>(
  schema: S,
  options?: Omit<UseFormProps<z.input<S>, unknown, z.output<S>>, 'resolver'>,
) {
  return useForm<z.input<S>, unknown, z.output<S>>({
    resolver: zodResolver(schema as never) as unknown as Resolver<z.input<S>, unknown, z.output<S>>,
    // Valida no envio e revalida ao digitar: sem deslocamento de layout no blur
    // (que fazia o clique em "Salvar" se perder).
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    ...options,
  })
}

/**
 * Aplica erros de validação retornados pela API aos campos e foca o primeiro.
 * Retorna a mensagem geral quando o erro não é de campo.
 */
export function applyServerErrors<T extends FieldValues>(form: UseFormReturn<T, unknown, FieldValues>, error: unknown): string | null {
  const apiError = toApiError(error)
  const fields = Object.entries(apiError.fieldErrors)
  // Suporta caminhos aninhados (ex.: "buyer.address", "profile.email").
  const known = fields.filter(([name]) => form.getValues(name as Path<T>) !== undefined)
  known.forEach(([name, message], index) => {
    form.setError(name as Path<T>, { type: 'server', message }, { shouldFocus: index === 0 })
  })
  return known.length > 0 && known.length === fields.length ? null : apiError.message
}

export interface ControlProps {
  id: string
  'aria-invalid': boolean
  'aria-describedby'?: string
  'aria-required'?: boolean
}

/** Label + controle + dica + erro, com associações ARIA corretas. */
export function Field({
  name,
  label,
  required,
  hint,
  className,
  children,
}: {
  name: string
  label: ReactNode
  required?: boolean
  hint?: ReactNode
  className?: string
  children: (props: ControlProps) => ReactNode
}) {
  const id = `${useId()}-${name}`
  const { errors } = useFormState({ name })
  const error = name.split('.').reduce<unknown>((acc, key) => (acc as Record<string, unknown> | undefined)?.[key], errors) as
    | { message?: string }
    | undefined
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error?.message ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id} className="text-xs font-semibold text-foreground">
        {label}
        {required && (
          <span className="text-primary" aria-hidden>
            *
          </span>
        )}
      </Label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy, 'aria-required': required || undefined })}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error?.message && (
        <p id={errorId} className="text-xs font-medium text-destructive">
          {error.message}
        </p>
      )}
    </div>
  )
}

type TextFieldProps = {
  name: string
  label: ReactNode
  required?: boolean
  hint?: ReactNode
  className?: string
} & Omit<React.ComponentProps<'input'>, 'name' | 'id'>

export function TextField({ name, label, required, hint, className, ...input }: TextFieldProps) {
  const { register } = useFormContext()
  return (
    <Field name={name} label={label} required={required} hint={hint} className={className}>
      {(aria) => <Input {...input} {...aria} {...register(name)} />}
    </Field>
  )
}

export function PasswordField({ name, label, required, hint, className, ...input }: TextFieldProps) {
  const { register } = useFormContext()
  const [visible, setVisible] = useState(false)
  return (
    <Field name={name} label={label} required={required} hint={hint} className={className}>
      {(aria) => (
        <div className="relative">
          <Input {...input} {...aria} {...register(name)} type={visible ? 'text' : 'password'} className="pr-11" />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground hover:text-primary"
          >
            {visible ? <EyeOffIcon className="size-4" aria-hidden /> : <EyeIcon className="size-4" aria-hidden />}
          </button>
        </div>
      )}
    </Field>
  )
}

export function TextareaField({
  name,
  label,
  required,
  hint,
  className,
  ...textarea
}: {
  name: string
  label: ReactNode
  required?: boolean
  hint?: ReactNode
  className?: string
} & Omit<React.ComponentProps<'textarea'>, 'name' | 'id'>) {
  const { register } = useFormContext()
  return (
    <Field name={name} label={label} required={required} hint={hint} className={className}>
      {(aria) => <Textarea {...textarea} {...aria} {...register(name)} />}
    </Field>
  )
}

export function SelectField({
  name,
  label,
  required,
  hint,
  className,
  placeholder,
  options,
  disabled,
}: {
  name: string
  label: ReactNode
  required?: boolean
  hint?: ReactNode
  className?: string
  placeholder: string
  options: ReadonlyArray<{ value: string; label: string }>
  disabled?: boolean
}) {
  const { control } = useFormContext()
  return (
    <Field name={name} label={label} required={required} hint={hint} className={className}>
      {(aria) => (
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={disabled}>
              <SelectTrigger {...aria} ref={field.ref} onBlur={field.onBlur}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      )}
    </Field>
  )
}

/** Erro geral do formulário (não associado a um campo). */
export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  )
}
