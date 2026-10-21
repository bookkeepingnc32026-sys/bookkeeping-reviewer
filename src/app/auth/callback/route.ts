import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const db = await supabaseServer();
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  if (code) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(safeNext(url.searchParams.get("next")), url.origin),
      );
  }
  if (token_hash) {
    const type = url.searchParams.get("type");
    if (
      type === "email" ||
      type === "recovery" ||
      type === "signup" ||
      type === "email_change"
    ) {
      const { error } = await db.auth.verifyOtp({ token_hash, type });
      if (!error)
        return NextResponse.redirect(
          new URL(
            type === "recovery"
              ? "/reset-password"
              : safeNext(url.searchParams.get("next")),
            url.origin,
          ),
        );
    }
  }
  return NextResponse.redirect(
    new URL("/login?error=confirmation", url.origin),
  );
}
