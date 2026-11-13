/**
 * Serialização de query params usada pelo Axios e pelos handlers MSW.
 * Arrays viram chaves repetidas (`categories=a&categories=b`).
 */
export function toSearchParams(params: Record<string, unknown>): URLSearchParams {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) value.forEach((v) => search.append(key, String(v)))
    else search.append(key, String(value))
  }
  return search
}

/** Converte URLSearchParams em objeto, respeitando chaves de array e números. */
export function fromSearchParams(
  search: URLSearchParams,
  { arrays = [], numbers = [] }: { arrays?: readonly string[]; numbers?: readonly string[] } = {},
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of new Set(search.keys())) {
    if (arrays.includes(key)) result[key] = search.getAll(key)
    else if (numbers.includes(key)) result[key] = Number(search.get(key))
    else result[key] = search.get(key)
  }
  return result
}
