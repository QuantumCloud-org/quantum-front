/** Accepts only absolute paths within this application. */
export function sanitizeRedirect(target: unknown): string | undefined {
  if (
    typeof target !== 'string' ||
    !target.startsWith('/') ||
    target.startsWith('//') ||
    target.includes('\\') ||
    Array.from(target).some((char) => {
      const code = char.charCodeAt(0)
      return code < 32 || code === 127
    })
  ) {
    return undefined
  }

  return target
}
