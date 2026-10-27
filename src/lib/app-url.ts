export type AppUrlEnvironment = {
  NEXT_PUBLIC_APP_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  VERCEL_ENV?: string;
  NODE_ENV?: string;
};

export class AppUrlConfigurationError extends Error {
  constructor() {
    super(
      "Account email links are not configured for remote access. Set NEXT_PUBLIC_APP_URL to the public HTTPS website URL and redeploy.",
    );
    this.name = "AppUrlConfigurationError";
  }
}

function parseOrigin(value: string | undefined): URL | null {
  if (!value || /[\u0000-\u0020\u007f]/.test(value.trim())) return null;
  try {
    const url = new URL(value.trim());
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      return null;
    return url;
  } catch {
    return null;
  }
}

function isLocalHost(host: string): boolean {
  const name = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    name === "localhost" ||
    name.endsWith(".localhost") ||
    name.endsWith(".local") ||
    name.endsWith(".internal") ||
    name === "::" ||
    name === "::1" ||
    name.startsWith("::ffff:") ||
    (/^(fc|fd|fe80:)/.test(name) && name.includes(":")) ||
    (!name.includes(".") && !name.includes(":"))
  )
    return true;
  const octets = name.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
  )
    return false;
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function publicOrigin(url: URL | null): string | null {
  return url?.protocol === "https:" && !isLocalHost(url.hostname)
    ? LEGACY_APP_HOSTS.includes(url.hostname)
      ? CANONICAL_APP_ORIGIN
      : url.origin
    : null;
}

/** Canonical destinations come from trusted configuration, never forwarding
 * headers or caller-supplied redirect URLs. Production cannot email localhost.
 */
export function getAppOrigin(
  request: Request,
  env: AppUrlEnvironment = process.env,
): string {
  const configured = parseOrigin(env.NEXT_PUBLIC_APP_URL);
  const canonical = publicOrigin(configured);
  if (canonical) return canonical;

  // Vercel supplies the stable production domain even on preview deployments.
  const productionHost = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const vercel =
    productionHost && !productionHost.includes("://")
      ? publicOrigin(parseOrigin(`https://${productionHost}`))
      : null;
  if (vercel) return vercel;

  const production =
    env.NODE_ENV === "production" ||
    Boolean(env.VERCEL_ENV && env.VERCEL_ENV !== "development");
  const current = new URL(request.url);
  if (!production && isLocalHost(current.hostname)) {
    if (configured && isLocalHost(configured.hostname))
      return configured.origin;
    if (!env.NEXT_PUBLIC_APP_URL) return current.origin;
  }
  throw new AppUrlConfigurationError();
}

export function getAuthCallbackUrl(
  request: Request,
  recovery = false,
  env: AppUrlEnvironment = process.env,
): string {
  const url = new URL("/auth/callback", getAppOrigin(request, env));
  if (recovery) url.searchParams.set("next", "/reset-password");
  return url.toString();
}
import { CANONICAL_APP_ORIGIN, LEGACY_APP_HOSTS } from "./site-url";
