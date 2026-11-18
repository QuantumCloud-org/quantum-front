/** Normalizes the token format shared by the login body and response header. */
export function stripBearerPrefix(token?: string | null) {
  return (
    token
      ?.trim()
      .replace(/^Bearer\s+/i, '')
      .trim() ?? ''
  )
}
