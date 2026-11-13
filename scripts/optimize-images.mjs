/**
 * Gera as artes otimizadas a partir dos originais do Figma (design-assets/).
 * Saída: public/nfts/<arte>-<largura>.webp e ícones PWA em public/icons.
 * Uso: npm run assets
 */
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '..')
const source = path.join(root, 'design-assets')
const nftOut = path.join(root, 'public', 'nfts')
const iconOut = path.join(root, 'public', 'icons')

export const ARTS = ['monkey-green', 'monkey-orange', 'monkey-purple', 'monkey-white']
export const WIDTHS = [320, 640, 960]

await mkdir(nftOut, { recursive: true })
await mkdir(iconOut, { recursive: true })

for (const art of ARTS) {
  const input = path.join(source, `${art}.png`)
  for (const width of WIDTHS) {
    await sharp(input)
      .resize(width, width)
      .webp({ quality: 74, effort: 6 })
      .toFile(path.join(nftOut, `${art}-${width}.webp`))
  }
  // Placeholder borrado embutível (LQIP) não é usado: skeletons cobrem o carregamento.
}

// Ícones PWA a partir da arte principal, com fundo da marca.
const BG = '#140D0A'
const iconSource = path.join(source, 'monkey-green.png')
for (const size of [192, 512]) {
  await sharp(iconSource).resize(size, size).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile(path.join(iconOut, `icon-${size}.png`))
}
const inner = await sharp(iconSource).resize(410, 410).png().toBuffer()
await sharp({ create: { width: 512, height: 512, channels: 4, background: BG } })
  .composite([{ input: inner, gravity: 'center' }])
  .png({ palette: true, quality: 90, compressionLevel: 9 })
  .toFile(path.join(iconOut, 'icon-maskable-512.png'))
await sharp(iconSource).resize(180, 180).png({ palette: true, quality: 90 }).toFile(path.join(iconOut, 'apple-touch-icon.png'))

console.log('Imagens geradas em public/nfts e public/icons')
