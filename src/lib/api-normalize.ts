/** Shared conversions for loosely typed JSON API records. */
export function getRecord(input: unknown): Record<string, unknown> {
  return (input && typeof input === 'object' ? input : {}) as Record<
    string,
    unknown
  >
}

export function toNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return value.trim() || null
}

export function toNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export function toStringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}
