import { notFound } from "next/navigation";
import { Portal } from "@/components/portal";
export default async function DemoPage({
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
  return <Portal section={section} demo admin={false} />;
}
