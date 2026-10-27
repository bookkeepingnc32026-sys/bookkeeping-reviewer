import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { isAllowedRequestOrigin } from "@/lib/request-origin";
import { AppUrlConfigurationError, getAuthCallbackUrl } from "@/lib/app-url";
export async function POST(request: Request) {
  try {
    if (!isAllowedRequestOrigin(request))
      return NextResponse.json(
        { error: "Request origin is not allowed." },
        { status: 403 },
      );
    const body = await request.json();
    const db = await supabaseServer();
    if (body.action === "logout") {
      const { error } = await db.auth.signOut();
      if (error) throw error;
      return NextResponse.json({ redirect: "/" });
    }
    if (body.action === "reset-password") {
      const password = z.string().min(8).max(128).parse(body.password);
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user)
        throw new Error(
          "Open the reset link in your email before choosing a new password.",
        );
      const { error } = await db.auth.updateUser({ password });
      if (error) throw error;
      return NextResponse.json({ redirect: "/learn/dashboard" });
    }
    const email = z.email().parse(body.email);
    if (body.action === "forgot-password") {
      const { error } = await db.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthCallbackUrl(request, true),
      });
      if (error) throw error;
      return NextResponse.json({
        message:
          "If an account exists for this address, a password reset link will arrive shortly.",
      });
    }
    if (body.action === "resend-confirmation") {
      const { error } = await db.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: getAuthCallbackUrl(request) },
      });
      if (error) throw error;
      return NextResponse.json({
        message:
          "If this address has an unconfirmed account, a new confirmation link will arrive shortly. Use the newest email.",
      });
    }
    const password = z.string().min(8).max(128).parse(body.password);
    if (body.action === "signup") {
      const full_name = z.string().trim().min(1).max(80).parse(body.full_name);
      const { error } = await db.auth.signUp({
        email,
        password,
        options: {
          data: { full_name },
          emailRedirectTo: getAuthCallbackUrl(request),
        },
      });
      if (error) throw error;
      return NextResponse.json({
        message: "Check your inbox to confirm your email address, then log in.",
      });
    }
    if (body.action !== "login")
      throw new Error("Unsupported authentication action.");
    const { data, error } = await db.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    const { data: profile } = await db
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    return NextResponse.json({
      redirect:
        profile?.role === "admin" ? "/admin/overview" : "/learn/dashboard",
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof z.ZodError
            ? "Please check the form. Use a valid email and a password of at least eight characters."
            : e instanceof Error
              ? e.message
              : "Unable to complete authentication.",
      },
      { status: e instanceof AppUrlConfigurationError ? 503 : 400 },
    );
  }
}
