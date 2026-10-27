export const CANONICAL_APP_ORIGIN =
  "https://bookkeeping-reviewer-2xwo.vercel.app";

export const LEGACY_APP_HOSTS: readonly string[] = [
  "bookkeeping-reviewer.vercel.app",
  "bookkeeping-reviewer-bookkeeping2.vercel.app",
  "bookkeeping-reviewer-git-main-bookkeeping2.vercel.app",
];

/** Older emails can contain a token on the homepage when Supabase falls back
 * to its Site URL. Forward it to verification instead of silently ignoring it.
 */
export function getRootAuthRedirect(url: URL): URL | null {
  if (url.pathname !== "/") return null;
  const fields = ["token_hash", "code", "type", "next", "error"];
  if (!["token_hash", "code", "error"].some((key) => url.searchParams.has(key)))
    return null;
  if (fields.some((key) => url.searchParams.getAll(key).length > 1))
    return new URL("/login?error=confirmation", CANONICAL_APP_ORIGIN);
  const target = new URL("/auth/callback", CANONICAL_APP_ORIGIN);
  for (const key of fields) {
    const value = url.searchParams.get(key);
    if (value !== null) target.searchParams.set(key, value);
  }
  return target;
}
