/** Check browser mutations against the public app origin and incoming host.
 * Next.js can normalize request.url to its bind address (127.0.0.1), even
 * when the browser opened localhost. Do not trust client-forwarded headers.
 */
export function isAllowedRequestOrigin(
  request: Request,
  appUrl = process.env.NEXT_PUBLIC_APP_URL,
): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const source = new URL(origin);
    if (
      !["http:", "https:"].includes(source.protocol) ||
      source.origin !== origin
    )
      return false;

    const target = new URL(request.url);
    const allowed = new Set([target.origin]);
    if (appUrl) allowed.add(new URL(appUrl).origin);

    const host = request.headers.get("host");
    if (host) {
      const incoming = new URL(`${target.protocol}//${host}`);
      // Reject malformed Host values with credentials, paths, or fragments.
      if (
        incoming.host === host &&
        incoming.origin === `${target.protocol}//${host}`
      )
        allowed.add(incoming.origin);
    }
    return allowed.has(source.origin);
  } catch {
    return false;
  }
}
