import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { allRows } from "@/lib/pagination";
import { isAllowedRequestOrigin } from "@/lib/request-origin";
const uuid = z.uuid();
const profileSchema = z.object({
  full_name: z.string().trim().min(1).max(80),
  display_name: z.string().trim().min(3).max(20),
  exam_date: z.iso.date().nullable(),
  daily_goal: z.enum(["light", "steady", "intense"]),
  leaderboard_opt_in: z.boolean(),
  theme: z.enum(["light", "dark", "system"]),
  onboarding_done: z.boolean(),
  timezone: z.string().refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Choose a valid timezone"),
});
function fail(e: unknown) {
  const message =
    e instanceof z.ZodError
      ? e.issues.map((i) => i.message).join(" ")
      : e instanceof Error
        ? e.message
        : typeof e === "object" && e !== null && "message" in e
          ? String(e.message)
          : "The request could not be completed.";
  return NextResponse.json(
    {
      error:
        message.includes("schema cache") || message.includes("does not exist")
          ? "The database needs setup. Run both SQL files in supabase/migrations in filename order in your Supabase SQL editor, then reload."
          : message,
    },
    { status: 400 },
  );
}
export async function GET() {
  try {
    const db = await supabaseServer();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user)
      return NextResponse.json(
        { error: "Please log in to continue." },
        { status: 401 },
      );
    const { data: profile, error } = await db
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (error) throw error;
    const queries = await Promise.all([
      allRows(
        db.from("competencies").select("*").order("sort_order").order("id"),
      ),
      allRows(db.from("lessons").select("*").order("sort_order").order("id")),
      allRows(db.from("questions").select("*").order("id")),
      allRows(db.from("journal_items").select("*").order("id")),
      allRows(db.from("flashcards").select("*").order("id")),
      allRows(
        db
          .from("announcements")
          .select("*")
          .order("date", { ascending: false })
          .order("id"),
      ),
      allRows(
        db
          .from("lesson_progress")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .order("lesson_id"),
      ),
      allRows(
        db
          .from("question_attempts")
          .select("competency_id,correct,date")
          .eq("user_id", user.id)
          .order("id"),
      ),
      allRows(
        db
          .from("journal_attempts")
          .select("item_id,competency_id,correct,date")
          .eq("user_id", user.id)
          .order("id"),
      ),
      allRows(
        db
          .from("xp_events")
          .select("action,points,date,event_key")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .order("id"),
      ),
      allRows(
        db
          .from("mock_results")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .order("id"),
      ),
      allRows(
        db
          .from("flashcard_progress")
          .select("*")
          .eq("user_id", user.id)
          .order("card_id"),
      ),
      allRows(
        db
          .from("user_badges")
          .select("badge_id")
          .eq("user_id", user.id)
          .order("badge_id"),
      ),
      db
        .from("onboarding")
        .select("hints_seen")
        .eq("user_id", user.id)
        .single(),
      db.from("exam_settings").select("*").eq("id", 1).single(),
      db.rpc("weekly_leaderboard"),
      allRows(
        db
          .from("learning_activity")
          .select("action,local_day")
          .eq("user_id", user.id)
          .order("id"),
      ),
    ]);
    for (const result of queries) if (result.error) throw result.error;
    const [
      competencies,
      lessons,
      questions,
      journals,
      flashcards,
      announcements,
      progress,
      questionAttempts,
      journalAttempts,
      xp,
      results,
      flashProgress,
      badges,
      onboarding,
      settings,
      leaderboard,
      activity,
    ] = queries.map((q) => q.data);
    let adminContent: { questions?: unknown; journals?: unknown } = {},
      analytics;
    if (profile.role === "admin") {
      const [content, stats] = await Promise.all([
        db.rpc("admin_content"),
        db.rpc("admin_analytics"),
      ]);
      if (content.error) throw content.error;
      if (stats.error) throw stats.error;
      adminContent = content.data;
      analytics = stats.data;
    }
    return NextResponse.json(
      {
        profile,
        competencies,
        lessons,
        questions: adminContent.questions || questions,
        journals: adminContent.journals || journals,
        flashcards,
        announcements,
        progress,
        attempts: [
          ...(questionAttempts as unknown[]),
          ...(journalAttempts as unknown[]),
        ],
        xp,
        results,
        flashProgress,
        badges: (badges as { badge_id: string }[]).map((b) => b.badge_id),
        hints: (onboarding as { hints_seen: string[] }).hints_seen,
        settings,
        leaderboard,
        activity,
        journalDone: [
          ...new Set(
            (journalAttempts as { item_id: string }[]).map((j) => j.item_id),
          ),
        ],
        analytics,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request) {
  try {
    if (!isAllowedRequestOrigin(request))
      return NextResponse.json(
        { error: "Request origin is not allowed." },
        { status: 403 },
      );
    const db = await supabaseServer();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user)
      return NextResponse.json(
        { error: "Please log in to continue." },
        { status: 401 },
      );
    const body = await request.json();
    let result;
    switch (body.action) {
      case "save_lesson":
        result = await db.rpc("save_lesson", {
          p_lesson: uuid.parse(body.lesson_id),
          p_position: z.number().int().min(0).max(86400).parse(body.position),
          p_complete: z.boolean().parse(body.complete ?? false),
        });
        break;
      case "answer_question":
        result = await db.rpc("answer_question", {
          p_question: uuid.parse(body.question_id),
          p_option: z.number().int().min(0).max(5).parse(body.option),
        });
        break;
      case "answer_journal":
        result = await db.rpc("answer_journal", {
          p_item: uuid.parse(body.item_id),
          p_debit: z.string().min(1).max(120).parse(body.debit),
          p_credit: z.string().min(1).max(120).parse(body.credit),
        });
        break;
      case "start_exam":
        result = await db.rpc("start_exam");
        break;
      case "get_exam":
        result = await db.rpc("get_exam", { p_id: uuid.parse(body.id) });
        break;
      case "exam_answer":
        result = await db.rpc("submit_exam_answer", {
          p_id: uuid.parse(body.id),
          p_question: uuid.parse(body.question_id),
          p_option: z.number().int().min(0).max(5).parse(body.option),
        });
        break;
      case "finish_exam":
        result = await db.rpc("finish_exam", { p_id: uuid.parse(body.id) });
        break;
      case "start_flash":
        result = await db.rpc("start_flash_session");
        break;
      case "review_flash":
        result = await db.rpc("review_flashcard", {
          p_session: uuid.parse(body.session_id),
          p_card: uuid.parse(body.card_id),
          p_known: z.boolean().parse(body.known),
        });
        break;
      case "save_profile": {
        const profile = profileSchema.parse(body.profile);
        result = await db.from("profiles").update(profile).eq("id", user.id);
        break;
      }
      case "hint": {
        const hint = z
          .enum(["lessons", "practice", "flashcards", "exam", "leaderboard"])
          .parse(body.hint);
        const { data, error } = await db
          .from("onboarding")
          .select("hints_seen")
          .eq("user_id", user.id)
          .single();
        if (error) throw error;
        result = await db
          .from("onboarding")
          .update({ hints_seen: [...new Set([...data.hints_seen, hint])] })
          .eq("user_id", user.id);
        break;
      }
      case "update_credentials": {
        const changes: z.infer<typeof credentialSchema> =
          credentialSchema.parse(body);
        const { data, error } = await db.auth.signInWithPassword({
          email: user.email!,
          password: changes.current_password,
        });
        if (error || !data.user)
          throw new Error("Your current password is incorrect.");
        const update = await db.auth.updateUser({
          ...(changes.password ? { password: changes.password } : {}),
          ...(changes.email ? { email: changes.email } : {}),
        });
        result = update;
        break;
      }
      case "admin_save": {
        const kind = z
          .enum([
            "lessons",
            "questions",
            "journal_items",
            "flashcards",
            "announcements",
            "competencies",
          ])
          .parse(body.kind);
        if (typeof body.data !== "object" || !body.data)
          throw new Error("Content is required");
        result = await db.rpc("admin_save", {
          p_kind: kind,
          p_data: body.data,
          p_id: body.id ? uuid.parse(body.id) : null,
        });
        break;
      }
      case "admin_delete":
        result = await db.rpc("admin_delete", {
          p_kind: z
            .enum([
              "lessons",
              "questions",
              "journal_items",
              "flashcards",
              "announcements",
            ])
            .parse(body.kind),
          p_id: uuid.parse(body.id),
        });
        break;
      case "admin_import":
        result = await db.rpc("admin_import_questions", {
          p_rows: z
            .array(z.record(z.string(), z.unknown()))
            .min(1)
            .max(500)
            .parse(body.rows),
        });
        break;
      case "admin_settings": {
        const s = z
          .object({
            question_count: z.number().int().min(1).max(200),
            time_limit_minutes: z.number().int().min(1).max(240),
            pass_mark_percent: z.number().int().min(1).max(100),
            exam_xp: z.number().int().min(0).max(500),
            flashcard_xp: z.number().int().min(0).max(500),
          })
          .parse(body.settings);
        result = await db.rpc("admin_exam_settings", {
          p_count: s.question_count,
          p_minutes: s.time_limit_minutes,
          p_pass: s.pass_mark_percent,
          p_exam_xp: s.exam_xp,
          p_flash_xp: s.flashcard_xp,
        });
        break;
      }
      default:
        throw new Error("Unsupported action");
    }
    if (result.error) throw result.error;
    return NextResponse.json(result.data ?? { ok: true });
  } catch (e) {
    return fail(e);
  }
}
const credentialSchema = z
  .object({
    current_password: z.string().min(1),
    password: z.string().min(8).max(128).optional(),
    email: z.email().optional(),
  })
  .refine(
    (v) => v.password || v.email,
    "Enter a new password or email address",
  );
