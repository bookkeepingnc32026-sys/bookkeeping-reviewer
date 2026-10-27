import { notFound } from "next/navigation";
import { AuthForm, type AuthMode } from "@/components/auth-form";
import { configured } from "@/lib/supabase/server";
export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ auth: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { auth } = await params;
  if (
    ![
      "login",
      "signup",
      "forgot-password",
      "reset-password",
      "resend-confirmation",
    ].includes(auth)
  )
    notFound();
  const query = await searchParams;
  const initialError =
    query.error === "confirmation"
      ? "This confirmation link could not be verified. It may have expired, already been used, or require the original signup browser. Request a new confirmation email."
      : query.error === "recovery"
        ? "This password reset link could not be verified. Request a new reset link below."
        : "";
  return (
    <AuthForm
      mode={auth as AuthMode}
      configured={configured()}
      initialError={initialError}
      initialNotice={
        query.notice === "email-confirmed"
          ? "Your email confirmation was received. Please log in to continue."
          : ""
      }
    />
  );
}
