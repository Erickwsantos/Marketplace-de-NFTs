import { z } from 'zod'
import { emailField, passwordField, usernameField } from './auth'

export const displayNameField = z
  .string()
  .trim()
  .min(2, 'Informe o nome de exibição')
  .max(40, 'Use no máximo 40 caracteres')

export const nicknameField = z
  .string()
  .trim()
  .min(2, 'Informe o apelido da carteira')
  .max(32, 'Use no máximo 32 caracteres')

/** Nome ENS sem o sufixo (".eth" é escolhido no seletor ao lado). */
export const ensNameField = z
  .string()
  .trim()
  .min(3, 'Informe o nome ENS')
  .max(32, 'Use no máximo 32 caracteres')
  .regex(/^[a-z0-9-]+$/, 'Use letras minúsculas, números e "-"')

export const profileInputSchema = z.object({
  displayName: displayNameField,
  username: usernameField,
  email: emailField,
  ensName: ensNameField,
  walletNickname: nicknameField,
})
export type ProfileInput = z.infer<typeof profileInputSchema>

export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  newPassword: passwordField,
})
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
