import type { QuoteLine } from '@/contracts'
import { formatEth } from '@/shared/lib/eth'
import { NftImage } from '@/shared/ui/primitives'

/**
 * Linhas de itens com quantidade e subtotal. Mesmo componente no resumo do
 * pagamento, na revisão e no recibo (que recebe o snapshot do pedido).
 */
export function QuoteLines({ lines, caption }: { lines: QuoteLine[]; caption: string }) {
  return (
    <table className="w-full text-xs">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="text-left text-[11px] text-muted-foreground">
          <th scope="col" className="pb-2 font-semibold">NFTs</th>
          <th scope="col" className="pb-2 text-center font-semibold">Edições</th>
          <th scope="col" className="pb-2 text-right font-semibold">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => (
          <tr key={line.itemId} className="border-t border-border/60">
            <td className="py-2">
              <div className="flex items-center gap-2">
                <div className="w-10 shrink-0 overflow-hidden rounded">
                  <NftImage image={line.image} sizes="40px" alt="" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{line.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    ID do token: {line.tokenId} · {line.editionLabel}
                  </p>
                </div>
              </div>
            </td>
            <td className="py-2 text-center text-muted-foreground">
              <span aria-label={`${line.quantity} unidades`}>(x {line.quantity})</span>
            </td>
            <td className="py-2 text-right font-semibold text-primary">{formatEth(line.lineTotalEth)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
