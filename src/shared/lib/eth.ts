import Big from 'big.js'
import type { EthAmount } from '@/contracts'

/**
 * Aritmética e formatação de ETH com precisão decimal (big.js), sem passar
 * por `number`. Compartilhado pela UI e pelo motor de cotação dos mocks.
 */
Big.DP = 18
Big.RM = Big.roundHalfUp

export const eth = (value: EthAmount | Big | number): Big => new Big(value)

/** Serializa para string decimal canônica (sem notação científica). */
export const toEth = (value: Big): EthAmount => {
  const fixed = value.toFixed(18)
  return fixed.replace(/\.?0+$/, '') || '0'
}

export const sumEth = (values: EthAmount[]): EthAmount =>
  toEth(values.reduce((acc, v) => acc.plus(v), new Big(0)))

export const multiplyEth = (value: EthAmount, quantity: number): EthAmount =>
  toEth(new Big(value).times(quantity))

export const compareEth = (a: EthAmount, b: EthAmount): number => new Big(a).cmp(b)

export const isEthEqual = (a: EthAmount, b: EthAmount): boolean => compareEth(a, b) === 0

/**
 * Formata para exibição: mínimo de 2 casas, sem perder casas significativas
 * (ex.: "0.016" permanece "0.016"; "2.3" vira "2.30").
 */
export function formatEth(value: EthAmount, { suffix = true }: { suffix?: boolean } = {}): string {
  const big = new Big(value)
  const [intPart = '0', decPart = ''] = toEth(big).split('.')
  const decimals = decPart.padEnd(2, '0')
  const text = `${intPart}.${decimals}`
  return suffix ? `${text} ETH` : text
}
