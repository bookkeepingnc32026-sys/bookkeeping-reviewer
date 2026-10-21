import { notFound, redirect } from "next/navigation";
import { configured, supabaseServer } from "@/lib/supabase/server";
import { Portal } from "@/components/portal";
export default async function LearnerPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (
    ![
      "dashboard",
      "lessons",
      "practice",
      "flashcards",
      "exam",
      "achievements",
      "leaderboard",
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
  return <Portal section={section} demo={false} admin={false} />;
}
