import type { ApiErrorCode } from '@/contracts'

/** Mensagens padrão do servidor simulado (exibidas pela UI quando não há texto mais específico). */
export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  VALIDATION_FAILED: 'Verifique os campos destacados.',
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos.',
  UNAUTHENTICATED: 'Entre na sua conta para continuar.',
  SESSION_EXPIRED: 'Sua sessão expirou. Entre novamente para continuar.',
  FORBIDDEN: 'Você não tem permissão para acessar este recurso.',
  NOT_FOUND: 'Recurso não encontrado.',
  EMAIL_TAKEN: 'Este e-mail já está cadastrado.',
  USERNAME_TAKEN: 'Este nome de usuário já está em uso.',
  OUT_OF_STOCK: 'A disponibilidade de um item mudou.',
  QUANTITY_LIMIT: 'Quantidade acima do limite permitido para esta edição.',
  EDITION_UNAVAILABLE: 'Esta edição não está disponível para venda.',
  QUOTE_CHANGED: 'Os valores do pedido mudaram. Revise e confirme novamente.',
  IDEMPOTENCY_CONFLICT: 'Esta tentativa de compra já foi usada com outros dados.',
  COUPON_INVALID: 'Cupom inválido.',
  COUPON_EXPIRED: 'Este cupom expirou.',
  WALLET_REJECTED: 'A carteira recusou a conexão.',
  WALLET_NOT_CONNECTED: 'Conecte a carteira antes de confirmar a compra.',
  INTERNAL_ERROR: 'Erro interno no servidor. Tente novamente.',
  SERVICE_UNAVAILABLE: 'Serviço temporariamente indisponível. Tente novamente.',
}
