import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getRootAuthRedirect } from "./lib/site-url";
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    const target = getRootAuthRedirect(new URL(request.url));
    return target
      ? NextResponse.redirect(target, {
          headers: {
            "Cache-Control": "private, no-store",
            "Referrer-Policy": "no-referrer",
          },
        })
      : NextResponse.next({ request });
  }
  let response = NextResponse.next({ request });
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
    return response;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (values) => {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  await supabase.auth.getUser();
  return response;
}
export const config = {
  matcher: [
    "/",
    "/learn/:path*",
    "/admin/:path*",
    "/api/:path*",
    "/auth/:path*",
  ],
};
