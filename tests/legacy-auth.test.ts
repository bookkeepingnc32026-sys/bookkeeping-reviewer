import test from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_APP_ORIGIN,
  LEGACY_APP_HOSTS,
  getRootAuthRedirect,
} from "../src/lib/site-url";
import { getAppOrigin } from "../src/lib/app-url";

test("legacy deployment settings always generate the canonical public email destination", () => {
  for (const host of LEGACY_APP_HOSTS) {
    assert.equal(
      getAppOrigin(new Request(`https://${host}/api/auth`), {
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: `https://${host}/`,
      }),
      CANONICAL_APP_ORIGIN,
    );
    assert.equal(
      getAppOrigin(new Request(`https://${host}/api/auth`), {
        NODE_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: host,
      }),
      CANONICAL_APP_ORIGIN,
    );
  }
});

test("a confirmation token misplaced on an old homepage reaches verification on the public website", () => {
  const source = new URL(
    `https://${LEGACY_APP_HOSTS[1]}/?token_hash=example-token&type=email&utm_source=mail`,
  );
  const target = getRootAuthRedirect(source);
  assert.ok(target);
  assert.equal(target.origin, CANONICAL_APP_ORIGIN);
  assert.equal(target.pathname, "/auth/callback");
  assert.equal(target.searchParams.get("token_hash"), "example-token");
  assert.equal(target.searchParams.get("type"), "email");
  assert.equal(target.searchParams.has("utm_source"), false);
});

test("misrouted legacy PKCE and recovery links retain their verification parameters", () => {
  const target = getRootAuthRedirect(
    new URL(
      `${CANONICAL_APP_ORIGIN}/?code=example-code&next=%2Freset-password`,
    ),
  );
  assert.equal(target?.searchParams.get("code"), "example-code");
  assert.equal(target?.searchParams.get("next"), "/reset-password");
});

test("ordinary homepage traffic stays unchanged and ambiguous tokens are rejected", () => {
  assert.equal(
    getRootAuthRedirect(new URL(`${CANONICAL_APP_ORIGIN}/?utm_source=mail`)),
    null,
  );
  assert.equal(
    getRootAuthRedirect(
      new URL(`${CANONICAL_APP_ORIGIN}/learn/dashboard?code=example`),
    ),
    null,
  );
  const target = getRootAuthRedirect(
    new URL(
      `${CANONICAL_APP_ORIGIN}/?token_hash=one&token_hash=two&type=email`,
    ),
  );
  assert.equal(
    target?.toString(),
    `${CANONICAL_APP_ORIGIN}/login?error=confirmation`,
  );
});
