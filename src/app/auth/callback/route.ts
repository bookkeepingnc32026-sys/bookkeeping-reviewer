import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getAppOrigin } from "@/lib/app-url";
import { verifyAuthCallback } from "@/lib/auth-callback";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const headers = {
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
  };
  try {
    const origin = getAppOrigin(request);
    const db = await supabaseServer();
    const result = await verifyAuthCallback(url, db.auth);
    if (
      result.verified &&
      result.userId &&
      !url.searchParams.has("next") &&
      url.searchParams.get("type") !== "recovery"
    ) {
      const { data: profile } = await db
        .from("profiles")
        .select("role")
        .eq("id", result.userId)
        .single();
      if (profile?.role === "admin") result.path = "/admin/overview";
    }
    return NextResponse.redirect(new URL(result.path, origin), { headers });
  } catch {
    return NextResponse.json(
      {
        error:
          "Email confirmation is temporarily unavailable. Please contact the site administrator or try again later.",
      },
      { status: 503, headers },
    );
  }
}
