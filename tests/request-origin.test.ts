import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedRequestOrigin } from "../src/lib/request-origin";

const request = (origin: string, headers: Record<string, string> = {}) =>
  new Request("http://127.0.0.1:3000/api/auth", {
    method: "POST",
    headers: { origin, ...headers },
  });

test("allows the public localhost URL when Next uses its loopback bind address", () => {
  assert.equal(
    isAllowedRequestOrigin(
      request("http://localhost:3000"),
      "http://localhost:3000",
    ),
    true,
  );
  assert.equal(
    isAllowedRequestOrigin(
      request("http://localhost:3000", { host: "localhost:3000" }),
      "",
    ),
    true,
  );
  assert.equal(
    isAllowedRequestOrigin(
      request("http://127.0.0.1:3000"),
      "http://localhost:3000",
    ),
    true,
  );
});

test("supports a configured HTTPS origin behind an internal proxy", () => {
  assert.equal(
    isAllowedRequestOrigin(
      request("https://bookkeep.example"),
      "https://bookkeep.example",
    ),
    true,
  );
  assert.equal(
    isAllowedRequestOrigin(
      request("https://bookkeep.example:8443"),
      "https://bookkeep.example",
    ),
    false,
  );
});

test("rejects foreign origins, malformed values and forged forwarding headers", () => {
  for (const origin of [
    "https://other.example",
    "null",
    "http://localhost:3001",
    "http://localhost:3000/path",
    "http://localhost:3000.evil.example",
  ]) {
    assert.equal(
      isAllowedRequestOrigin(
        request(origin, { host: "localhost:3000" }),
        "http://localhost:3000",
      ),
      false,
      origin,
    );
  }
  assert.equal(
    isAllowedRequestOrigin(
      request("https://other.example", {
        "x-forwarded-host": "other.example",
        "x-forwarded-proto": "https",
      }),
      "http://localhost:3000",
    ),
    false,
  );
  assert.equal(
    isAllowedRequestOrigin(
      request("http://localhost:3000", { "sec-fetch-site": "cross-site" }),
      "http://localhost:3000",
    ),
    false,
  );
});

test("allows non-browser requests without Origin, but rejects cross-site metadata", () => {
  assert.equal(
    isAllowedRequestOrigin(
      new Request("http://localhost:3000/api/auth"),
      "http://localhost:3000",
    ),
    true,
  );
  assert.equal(
    isAllowedRequestOrigin(
      new Request("http://localhost:3000/api/auth", {
        headers: { "sec-fetch-site": "cross-site" },
      }),
      "http://localhost:3000",
    ),
    false,
  );
});
