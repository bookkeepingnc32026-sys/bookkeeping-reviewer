import type { NextConfig } from "next";
import { CANONICAL_APP_ORIGIN, LEGACY_APP_HOSTS } from "./src/lib/site-url";
const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  redirects: async () =>
    LEGACY_APP_HOSTS.map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host.replaceAll(".", "\\.") }],
      destination: `${CANONICAL_APP_ORIGIN}/:path*`,
      permanent: false,
    })),
};
export default config;
