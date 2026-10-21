import { notFound } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { configured } from "@/lib/supabase/server";
export default async function AuthPage({
  params,
}: {
  params: Promise<{ auth: string }>;
}) {
  const { auth } = await params;
  if (!["login", "signup", "forgot-password", "reset-password"].includes(auth))
    notFound();
  return (
    <AuthForm
      mode={auth as "login" | "signup" | "forgot-password" | "reset-password"}
      configured={configured()}
    />
  );
}
