import test from "node:test";
import assert from "node:assert/strict";
import {
  AppUrlConfigurationError,
  getAppOrigin,
  getAuthCallbackUrl,
} from "../src/lib/app-url";
import {
  verifyAuthCallback,
  type AuthVerifier,
} from "../src/lib/auth-callback";
import { safeNext } from "../src/lib/utils";

const origin = "https://bookkeeping-reviewer-2xwo.vercel.app";
const internalRequest = new Request("http://localhost:3000/api/auth", {
  headers: {
    "x-forwarded-host": "attacker.example",
    "x-forwarded-proto": "https",
  },
});

test("production email links use the public origin even when the request URL is internal", () => {
  const env = { NODE_ENV: "production", NEXT_PUBLIC_APP_URL: origin + "/" };
  assert.equal(getAppOrigin(internalRequest, env), origin);
  assert.equal(
    getAuthCallbackUrl(internalRequest, false, env),
    origin + "/auth/callback",
  );
  assert.equal(
    new URL(getAuthCallbackUrl(internalRequest, true, env)).searchParams.get(
      "next",
    ),
    "/reset-password",
  );
  assert.equal(
    new URL(getAuthCallbackUrl(internalRequest, true, env)).origin,
    origin,
  );
});

test("Vercel's stable production domain replaces a stale localhost setting", () => {
  const env = {
    NODE_ENV: "production",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    VERCEL_PROJECT_PRODUCTION_URL: "bookkeeping-reviewer-2xwo.vercel.app",
  };
  assert.equal(getAppOrigin(internalRequest, env), origin);
  assert.equal(
    getAppOrigin(internalRequest, { ...env, VERCEL_ENV: "preview" }),
    origin,
  );
});

test("production fails closed instead of sending loopback, private, insecure or malformed destinations", () => {
  for (const value of [
    "http://localhost:3000",
    "https://localhost",
    "https://foo.localhost",
    "https://127.0.0.1",
    "https://[::1]",
    "https://192.168.1.5",
    "https://10.0.0.1",
    "http://public.example",
    "https://user:password@public.example",
    "https://public.example/path",
    "javascript:alert(1)",
    "not a url",
    "",
  ]) {
    assert.throws(
      () =>
        getAppOrigin(internalRequest, {
          NODE_ENV: "production",
          NEXT_PUBLIC_APP_URL: value,
        }),
      AppUrlConfigurationError,
      value,
    );
  }
  assert.throws(
    () => getAppOrigin(internalRequest, { NODE_ENV: "production" }),
    AppUrlConfigurationError,
  );
});

test("local-only development remains supported and remote requests cannot inherit localhost", () => {
  assert.equal(
    getAppOrigin(internalRequest, {
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    }),
    "http://localhost:3000",
  );
  assert.equal(
    getAppOrigin(new Request("http://127.0.0.1:3000"), {
      NODE_ENV: "development",
    }),
    "http://127.0.0.1:3000",
  );
  assert.throws(
    () =>
      getAppOrigin(new Request(origin), {
        NODE_ENV: "development",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      }),
    AppUrlConfigurationError,
  );
});

function verifier(fail = false) {
  const calls: unknown[] = [];
  const auth: AuthVerifier = {
    verifyOtp: async (input) => {
      calls.push(input);
      return {
        data: { user: fail ? null : { id: "learner-id" } },
        error: fail ? new Error("expired") : null,
      };
    },
    exchangeCodeForSession: async (code) => {
      calls.push(code);
      return { data: { user: { id: "learner-id" } }, error: null };
    },
  };
  return { auth, calls };
}

test("token-hash confirmations work without a PKCE verifier cookie on a second device", async () => {
  const { auth, calls } = verifier();
  const result = await verifyAuthCallback(
    new URL(origin + "/auth/callback?token_hash=test-token&type=email"),
    auth,
  );
  assert.deepEqual(calls, [{ token_hash: "test-token", type: "email" }]);
  assert.deepEqual(result, {
    verified: true,
    userId: "learner-id",
    path: "/learn/dashboard",
  });
});

test("recovery links always lead to password reset; legacy PKCE links remain supported", async () => {
  const { auth } = verifier();
  const recovered = await verifyAuthCallback(
    new URL(
      origin +
        "/auth/callback?token_hash=test-token&type=recovery&next=//other.example",
    ),
    auth,
  );
  assert.equal(recovered.path, "/reset-password");
  assert.equal(
    (
      await verifyAuthCallback(
        new URL(
          origin + "/auth/callback?code=legacy-code&next=/reset-password",
        ),
        auth,
      )
    ).path,
    "/reset-password",
  );
});

test("invalid and expired confirmations return an actionable path without leaking token values", async () => {
  const { auth, calls } = verifier(true);
  const result = await verifyAuthCallback(
    new URL(origin + "/auth/callback?token_hash=secret-token&type=email"),
    auth,
  );
  assert.deepEqual(result, {
    path: "/login?error=confirmation",
    verified: false,
  });
  assert.ok(!JSON.stringify(result).includes("secret-token"));
  calls.length = 0;
  assert.equal(
    (
      await verifyAuthCallback(
        new URL(origin + "/auth/callback?token_hash=secret&type=invalid"),
        auth,
      )
    ).verified,
    false,
  );
  assert.equal(
    (
      await verifyAuthCallback(
        new URL(origin + "/auth/callback?code=one&token_hash=two&type=email"),
        auth,
      )
    ).verified,
    false,
  );
  assert.equal(calls.length, 0);
});

test("redirect targets reject external hosts, backslashes and control-character normalization", async () => {
  const { auth } = verifier();
  for (const next of [
    "https://other.example",
    "//other.example",
    "/\\other.example",
    "/\n/other.example",
    "/\t/other.example",
  ]) {
    assert.equal(safeNext(next), "/learn/dashboard");
    const url = new URL(origin + "/auth/callback?token_hash=token&type=email");
    url.searchParams.set("next", next);
    assert.equal(
      (await verifyAuthCallback(url, auth)).path,
      "/learn/dashboard",
    );
  }
});
