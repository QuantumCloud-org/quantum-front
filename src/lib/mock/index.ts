/**
 * Local demo mock rule.
 *
 * When `VITE_FEATURE_MOCK=true` is passed to `bun run dev`, the auth/session and
 * menu-router network egress is short-circuited to the fixtures in this
 * directory, so a generated page can be driven end-to-end without a live
 * backend. The flag is injected by vite.config from the shell env (never a
 * committed .env file — see the G4 gate) and is force-pinned to 'false' in
 * production builds.
 *
 * The short-circuit call sites (`src/app/auth/api.ts`,
 * `src/app/navigation/api.ts`) compare `import.meta.env.VITE_FEATURE_MOCK`
 * DIRECTLY rather than calling a helper: in a production build vite pins the
 * value to the literal `'false'`, so the bare comparison folds to `if (false)`
 * and the mock branches + fixtures are dead-code-eliminated out of the bundle. A
 * helper call would defeat that constant-folding and leak the fixtures into prod.
 *
 * `parseMockFlag` is the single, unit-testable definition of the rule the call
 * sites inline: only the exact string `'true'` enables mock — every other value
 * (including `undefined`) keeps it OFF, so mock can never be on by omission (the
 * safe default). It is verified in index.test.ts and cross-referenced by the
 * call-site comments.
 *
 * @param flag - Raw flag value.
 */
export function parseMockFlag(flag: string | undefined): boolean {
  return flag === 'true'
}
