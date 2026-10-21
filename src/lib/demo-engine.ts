import type { Bootstrap, ExamResult, Question } from "./types";
import { localDate, shuffle, streak } from "./utils";
type ExamState = {
  id: string;
  index: number;
  total: number;
  expires_at: string;
  questions: Question[];
  correct: number;
  breakdown: ExamResult["score_by_competency"];
};
type FlashState = {
  id: string;
  pending: string[];
  reviewed: string[];
  total: number;
};
export function runPreview(
  source: Bootstrap,
  action: string,
  p: Record<string, unknown>,
): { data: Bootstrap; response: unknown } {
  const d = structuredClone(source);
  const now = new Date().toISOString(),
    today = localDate(now, d.profile.timezone);
  const reward = (name: string, points: number, key: string) => {
    if (!d.xp.some((e) => e.event_key === key))
      d.xp.unshift({ action: name, points, event_key: key, date: now });
  };
  const activity = (name: string) => {
    if (!d.activity.some((a) => a.action === name && a.local_day === today))
      d.activity.push({ action: name, local_day: today });
  };
  const badge = (id: string) => {
    if (!d.badges.includes(id)) d.badges.push(id);
  };
  let response: unknown = { ok: true };
  if (action === "save_profile")
    d.profile = { ...d.profile, ...(p.profile as object) };
  if (action === "hint") d.hints = [...new Set([...d.hints, p.hint as string])];
  if (action === "save_lesson") {
    const lesson = d.lessons.find((l) => l.id === p.lesson_id);
    if (!lesson) throw new Error("Lesson not found.");
    const complete =
      Boolean(p.complete) && Number(p.position) >= lesson.duration * 0.9;
    let progress = d.progress.find((v) => v.lesson_id === p.lesson_id);
    if (!progress) {
      progress = { lesson_id: lesson.id, last_position: 0, completed: false };
      d.progress.unshift(progress);
    }
    progress.last_position = Number(p.position);
    progress.completed = progress.completed || complete;
    if (complete) {
      reward("lesson", 20, "lesson:" + lesson.id);
      activity("lesson");
      badge("first_lesson");
    }
    response = { completed: complete };
  }
  if (action === "answer_question") {
    const q = d.questions.find((q) => q.id === p.question_id);
    if (!q) throw new Error("Question not found.");
    const correct = q.correct_option === p.option;
    d.attempts.push({ competency_id: q.competency_id, correct, date: now });
    activity("quick_check");
    if (correct) reward("quick_check", 10, "question:" + q.id);
    response = {
      correct,
      correct_option: q.correct_option,
      explanation: q.explanation,
    };
  }
  if (action === "answer_journal") {
    const j = d.journals.find((j) => j.id === p.item_id);
    if (!j) throw new Error("Transaction not found.");
    const correct =
      j.debit_account === p.debit && j.credit_account === p.credit;
    d.attempts.push({ competency_id: j.competency_id, correct, date: now });
    d.journalDone = [...new Set([...d.journalDone, j.id])];
    activity("journal");
    if (correct) {
      reward("journal", 15, "journal:" + j.id);
      badge("journal_starter");
    }
    response = {
      correct,
      debit_account: j.debit_account,
      credit_account: j.credit_account,
      explanation: j.explanation,
    };
  }
  if (
    ["start_exam", "get_exam", "exam_answer", "finish_exam"].includes(action)
  ) {
    let e: ExamState | null = JSON.parse(
      localStorage.getItem("bookkeep-preview-exam") || "null",
    );
    if (action === "start_exam" && !e) {
      const qs = shuffle(d.questions)
        .slice(0, d.settings.question_count)
        .map((q) => {
          const options = shuffle(
            q.options.map((text, i) => ({
              text,
              correct: i === q.correct_option,
            })),
          );
          return {
            ...q,
            options: options.map((o) => o.text),
            correct_option: options.findIndex((o) => o.correct),
          };
        });
      e = {
        id: crypto.randomUUID(),
        index: 0,
        total: qs.length,
        expires_at: new Date(
          Date.now() + d.settings.time_limit_minutes * 60000,
        ).toISOString(),
        questions: qs,
        correct: 0,
        breakdown: {},
      };
    }
    if (!e) throw new Error("No active preview exam. Start a new one.");
    const expired = Date.now() >= Date.parse(e.expires_at);
    if (action === "exam_answer" && !expired) {
      const q = e.questions[e.index];
      if (q.id !== p.question_id)
        throw new Error("This question was already answered.");
      const correct = q.correct_option === p.option;
      e.correct += correct ? 1 : 0;
      e.index++;
      e.breakdown[q.competency_id] ??= { correct: 0, total: 0 };
      e.breakdown[q.competency_id].correct += correct ? 1 : 0;
      d.attempts.push({ competency_id: q.competency_id, correct, date: now });
    }
    if (action === "finish_exam" || expired || e.index >= e.total) {
      e.questions.forEach((q) => {
        e!.breakdown[q.competency_id] ??= { correct: 0, total: 0 };
        e!.breakdown[q.competency_id].total++;
      });
      const score = Math.round((1000 * e.correct) / e.total) / 10;
      const result: ExamResult = {
        id: e.id,
        score,
        correct_count: e.correct,
        total: e.total,
        passed: score >= d.settings.pass_mark_percent,
        score_by_competency: e.breakdown,
        date: now,
      };
      d.results.unshift(result);
      if (e.index >= e.total)
        reward("exam", d.settings.exam_xp, "exam:" + today);
      if (result.passed) badge("mock_passed");
      activity("exam");
      localStorage.removeItem("bookkeep-preview-exam");
      response = { result };
    } else {
      localStorage.setItem("bookkeep-preview-exam", JSON.stringify(e));
      const q = e.questions[e.index];
      response = {
        id: e.id,
        index: e.index,
        total: e.total,
        expires_at: e.expires_at,
        question: {
          id: q.id,
          text: q.text,
          options: q.options,
          competency_id: q.competency_id,
        },
      };
    }
  }
  if (["start_flash", "review_flash"].includes(action)) {
    let session: FlashState | null = JSON.parse(
      localStorage.getItem("bookkeep-preview-flash") || "null",
    );
    if (!session) {
      const pending = d.flashcards
        .filter(
          (f) =>
            !d.flashProgress.some(
              (x) =>
                x.card_id === f.id && Date.parse(x.next_review) > Date.now(),
            ),
        )
        .map((f) => f.id);
      session = {
        id: crypto.randomUUID(),
        pending,
        reviewed: [],
        total: pending.length,
      };
    }
    if (action === "review_flash") {
      if (session.pending[0] !== p.card_id)
        throw new Error("This card was already reviewed.");
      const card = String(p.card_id),
        known = Boolean(p.known);
      const old = d.flashProgress.find((f) => f.card_id === card);
      const interval = known
        ? ({ 0: 1, 1: 3, 3: 7, 7: 14, 14: 14 }[old?.interval ?? 0] ?? 1)
        : 0;
      d.flashProgress = d.flashProgress.filter((f) => f.card_id !== card);
      d.flashProgress.push({
        card_id: card,
        interval,
        next_review: new Date(Date.now() + interval * 86400000).toISOString(),
      });
      session.pending.shift();
      if (!known) session.pending.push(card);
      session.reviewed = [...new Set([...session.reviewed, card])];
    }
    const done = session.pending.length === 0;
    if (done) {
      if (session.reviewed.length >= 5) {
        reward("flashcards", d.settings.flashcard_xp, "flashcards:" + today);
        badge("flashcard_finisher");
      }
      if (session.reviewed.length) activity("flashcards");
      localStorage.removeItem("bookkeep-preview-flash");
    } else
      localStorage.setItem("bookkeep-preview-flash", JSON.stringify(session));
    response = { ...session, done };
  }
  if (
    streak(
      d.activity.map((a) => a.local_day),
      today,
    ) >= 5
  )
    badge("streak_5");
  if (
    streak(
      d.activity.map((a) => a.local_day),
      today,
    ) >= 7
  )
    badge("streak_7");
  if (
    d.lessons.length &&
    d.progress.filter((p) => p.completed).length >= d.lessons.length
  )
    badge("all_lessons");
  if (
    d.progress.some((p) => p.completed) &&
    d.activity.some((a) => a.action === "quick_check") &&
    d.journalDone.length &&
    d.flashProgress.length >= 5 &&
    d.results.length
  )
    reward("onboarding", 50, "onboarding");
  localStorage.setItem("bookkeep-preview-v1", JSON.stringify(d));
  return { data: d, response };
}
