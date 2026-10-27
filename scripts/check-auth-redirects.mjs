import assert from "node:assert/strict";

// Read-only/error-path checks: no account creation, real tokens, or email sends.
const base = process.env.AUTH_CHECK_BASE_URL || "http://127.0.0.1:3107";
const canonical = "https://bookkeeping-reviewer-2xwo.vercel.app";

const misplaced = await fetch(
  `${base}/?token_hash=validation-only&type=email`,
  {
    redirect: "manual",
  },
);
assert.equal(misplaced.status, 307);
assert.equal(
  new URL(misplaced.headers.get("location"), base).toString(),
  `${canonical}/auth/callback?token_hash=validation-only&type=email`,
);
assert.equal(misplaced.headers.get("referrer-policy"), "no-referrer");
assert.match(misplaced.headers.get("cache-control"), /no-store/);

for (const [query, expectedPath] of [
  ["error=access_denied", "/login?error=confirmation"],
  [
    "error=access_denied&next=/reset-password",
    "/forgot-password?error=recovery",
  ],
]) {
  const response = await fetch(`${base}/auth/callback?${query}`, {
    redirect: "manual",
    headers: { "x-forwarded-host": "untrusted.example" },
  });
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), canonical + expectedPath);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
}

const resend = await fetch(`${base}/resend-confirmation`);
assert.equal(resend.status, 200);
const resendHtml = await resend.text();
assert.match(resendHtml, /Send confirmation link/);
assert.ok(!/<input[^>]+type="password"/.test(resendHtml));

const failedLogin = await fetch(`${base}/login?error=confirmation`);
const loginHtml = await failedLogin.text();
assert.match(loginHtml, /This confirmation link could not be verified/);
assert.match(loginHtml, /href="\/resend-confirmation"/);

for (const [origin, status] of [
  [base, 400],
  ["https://untrusted.example", 403],
]) {
  const response = await fetch(`${base}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({
      action: "signup",
      email: "invalid",
      password: "validation-only",
      full_name: "Validation check",
    }),
  });
  assert.equal(response.status, status);
}
console.log(
  "Built-server auth checks passed: public callback destinations, recovery errors, token-safe headers, resend page, actionable errors, and origin protection. No emails sent.",
);
