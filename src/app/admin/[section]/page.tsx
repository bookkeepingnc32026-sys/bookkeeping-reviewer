import { notFound, redirect } from "next/navigation";
import { configured, supabaseServer } from "@/lib/supabase/server";
import { Portal } from "@/components/portal";
export default async function AdminPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (
    ![
      "overview",
      "lessons",
      "questions",
      "journal",
      "flashcards",
      "announcements",
      "competencies",
      "exam-settings",
      "settings",
    ].includes(section)
  )
    notFound();
  if (!configured()) redirect("/login");
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/learn/dashboard");
  return <Portal section={section} demo={false} admin />;
}
