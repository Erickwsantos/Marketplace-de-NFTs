import { z } from 'zod'
import { isoDateSchema } from './common'

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
  ensName: z.string().nullable(),
  walletNickname: z.string().nullable(),
  createdAt: isoDateSchema,
})
export type User = z.infer<typeof userSchema>

// Regras de campo compartilhadas entre cadastro, perfil, senha e carteiras.
export const usernameField = z
  .string()
  .trim()
  .min(3, 'Use ao menos 3 caracteres')
  .max(24, 'Use no máximo 24 caracteres')
  .regex(/^[a-z0-9_.]+$/i, 'Use apenas letras, números, "." e "_"')

export const emailField = z
  .string()
  .trim()
  .min(1, 'Informe o e-mail')
  .pipe(z.email({ error: 'E-mail inválido' }))

export const passwordField = z
  .string()
  .min(8, 'A senha deve ter ao menos 8 caracteres')
  .regex(/[A-Za-z]/, 'Inclua ao menos uma letra')
  .regex(/\d/, 'Inclua ao menos um número')

export const loginInputSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Informe a senha'),
})
export type LoginInput = z.infer<typeof loginInputSchema>

export const registerInputSchema = z.object({
  username: usernameField,
  email: emailField,
  password: passwordField,
})
export type RegisterInput = z.infer<typeof registerInputSchema>

export const sessionSchema = z.object({
  token: z.string(),
  expiresAt: isoDateSchema,
  user: userSchema,
})
export type Session = z.infer<typeof sessionSchema>

export const currentSessionSchema = sessionSchema.omit({ token: true })
export type CurrentSession = z.infer<typeof currentSessionSchema>
