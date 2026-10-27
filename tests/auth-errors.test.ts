import test from "node:test";
import assert from "node:assert/strict";
import { AuthApiError } from "@supabase/supabase-js";
import { z } from "zod";
import { authErrorDetails } from "../src/lib/auth-errors";
import { AppUrlConfigurationError } from "../src/lib/app-url";

test("email delivery limits retain HTTP 429 and never claim that an email was sent", () => {
  const result = authErrorDetails(
    new AuthApiError(
      "email rate limit exceeded",
      429,
      "over_email_send_rate_limit",
    ),
  );
  assert.equal(result.status, 429);
  assert.equal(result.body.code, "email_rate_limited");
  assert.match(result.body.error, /sending limit/);
  assert.equal("message" in result.body, false);
});

test("restricted SMTP recipients get delivery guidance without leaking provider diagnostics", () => {
  const result = authErrorDetails(
    new AuthApiError(
      "recipient learner@example.com is not authorized by the SMTP provider",
      400,
      "email_address_not_authorized",
    ),
  );
  assert.equal(result.status, 503);
  assert.equal(result.body.code, "email_delivery_unavailable");
  assert.ok(!result.body.error.includes("learner@example.com"));
});

test("request throttles, validation and invalid callback configuration remain distinct", () => {
  assert.equal(
    authErrorDetails(
      new AuthApiError("rate limit", 429, "over_request_rate_limit"),
    ).status,
    429,
  );
  const invalid = z.email().safeParse("invalid");
  assert.equal(invalid.success, false);
  assert.equal(authErrorDetails(invalid.error).status, 400);
  assert.equal(authErrorDetails(new AppUrlConfigurationError()).status, 503);
  assert.equal(
    authErrorDetails(
      new AuthApiError("Email not confirmed", 400, "email_not_confirmed"),
    ).body.error,
    "Email not confirmed",
  );
});
