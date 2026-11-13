import { AVATAR_MAX_BYTES, AVATAR_TYPES } from '@/contracts'

export const AVATAR_SIZE = 256
export const AVATAR_ACCEPT = AVATAR_TYPES.join(',')

/** Validação no cliente (o servidor repete as mesmas regras). */
export function validateAvatarFile(file: File): string | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return 'Use uma imagem PNG, JPG ou WEBP.'
  if (file.size > AVATAR_MAX_BYTES) return 'A imagem deve ter até 2 MB.'
  return null
}

/** Recorta ao centro e redimensiona para 256x256 em WEBP antes do envio. */
export async function resizeAvatar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const side = Math.min(bitmap.width, bitmap.height)
    const sx = (bitmap.width - side) / 2
    const sy = (bitmap.height - side) / 2
    const canvas = document.createElement('canvas')
    canvas.width = AVATAR_SIZE
    canvas.height = AVATAR_SIZE
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas indisponível')
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Falha ao converter a imagem'))), 'image/webp', 0.9),
    )
  } finally {
    bitmap.close()
  }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? `${parts[0]![0]}${parts[parts.length - 1]![0]}` : (parts[0]?.slice(0, 2) ?? '')
  return letters.toUpperCase() || '?'
}
