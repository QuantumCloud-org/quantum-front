const RELOAD_MARKER = 'quantum.preload-recovery'

/** Reloads once per page in this tab when Vite reports a failed preload. */
export function registerPreloadRecovery() {
  window.addEventListener('vite:preloadError', (event) => {
    const { href } = window.location
    try {
      if (window.sessionStorage.getItem(RELOAD_MARKER) === href) return
      window.sessionStorage.setItem(RELOAD_MARKER, href)
    } catch {
      // Preserve the route error when storage cannot guard against reload loops.
      return
    }
    event.preventDefault()
    window.location.reload()
  })
}

/** Retries a failed module import in a fresh page, even after automatic recovery. */
export function retryPageLoad() {
  window.location.reload()
}
