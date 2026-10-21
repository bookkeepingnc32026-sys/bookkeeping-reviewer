import assert from "node:assert/strict";

// Invalid form values stop before signup, so this check never creates accounts
// or sends confirmation emails. Run against the local development server.
for (const path of ["/api/auth", "/api/platform"]) {
  for (const origin of [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://other.example",
  ]) {
    const response = await fetch(`http://127.0.0.1:3000${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        Host: "localhost:3000",
      },
      body: JSON.stringify({
        action: "signup",
        email: "invalid",
        password: "invalid1",
        full_name: "Origin regression check",
      }),
    });
    const body = await response.json();
    const expected =
      origin === "https://other.example"
        ? 403
        : path === "/api/auth"
          ? 400
          : 401;
    assert.equal(
      response.status,
      expected,
      `${path} from ${origin}: ${JSON.stringify(body)}`,
    );
    if (path === "/api/auth" && expected === 400)
      assert.match(body.error, /valid email/);
    console.log(`${path} · ${origin} → ${response.status} (expected)`);
  }
}
