import { safeNext } from "./utils";

type EmailType = "email" | "signup" | "recovery" | "email_change";
type VerificationResult = {
  data: { user: { id: string } | null };
  error: unknown;
};
export type AuthVerifier = {
  exchangeCodeForSession: (code: string) => Promise<VerificationResult>;
  verifyOtp: (input: {
    token_hash: string;
    type: EmailType;
  }) => Promise<VerificationResult>;
};
export type CallbackResult = {
  path: string;
  userId?: string;
  verified: boolean;
};

/** Token-hash email links work when opened in a different browser/device;
 * legacy PKCE code links remain supported with their original verifier cookie.
 */
export async function verifyAuthCallback(
  url: URL,
  auth: AuthVerifier,
): Promise<CallbackResult> {
  const type = url.searchParams.get("type");
  const recovery =
    type === "recovery" || url.searchParams.get("next") === "/reset-password";
  const failed: CallbackResult = {
    path: recovery
      ? "/forgot-password?error=recovery"
      : "/login?error=confirmation",
    verified: false,
  };
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  if (url.searchParams.has("error") || (code && token_hash)) return failed;
  try {
    let result: VerificationResult;
    if (
      token_hash &&
      ["email", "signup", "recovery", "email_change"].includes(type || "")
    ) {
      result = await auth.verifyOtp({ token_hash, type: type as EmailType });
    } else if (code && !token_hash) {
      result = await auth.exchangeCodeForSession(code);
    } else return failed;
    if (result.error) return failed;
    if (!result.data.user) {
      return { path: "/login?notice=email-confirmed", verified: true };
    }
    return {
      path: recovery
        ? "/reset-password"
        : safeNext(url.searchParams.get("next")),
      userId: result.data.user.id,
      verified: true,
    };
  } catch {
    return failed;
  }
}
