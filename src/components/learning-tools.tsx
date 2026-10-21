"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowLeft,
  Layers3,
  RotateCcw,
  Check,
  Sparkles,
  Clock3,
  Award,
  Trophy,
  LockKeyhole,
  CheckCircle2,
  ShieldCheck,
  Info,
  LoaderCircle,
  Settings,
  LogOut,
  CalendarDays,
  Zap,
} from "lucide-react";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { PageHeading, Empty, ProgressBar } from "./learner";
import type { ToolProps } from "./portal";
import type { ExamResult, Profile, Question } from "@/lib/types";
import { badgeDefinitions } from "@/lib/demo";
import { formatDuration, localDate } from "@/lib/utils";
type FlashSession = {
  id: string;
  pending: string[];
  reviewed: string[];
  total?: number;
  done?: boolean;
};
export function Flashcards({ data: d, action, notify }: ToolProps) {
  const [session, setSession] = useState<FlashSession | null>(null),
    [flipped, setFlipped] = useState(false),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [direction, setDirection] = useState(0);
  const [total, setTotal] = useState(0);
  const reduced = useReducedMotion();
  const due = d.flashcards.filter(
    (f) =>
      !d.flashProgress.some(
        (p) => p.card_id === f.id && Date.parse(p.next_review) > Date.now(),
      ),
  ).length;
  const card = d.flashcards.find((f) => f.id === session?.pending[0]);
  async function start() {
    setBusy(true);
    try {
      const next = await action<FlashSession>("start_flash");
      setSession(next);
      setTotal(next.total || 0);
      setDone(Boolean(next.done));
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not start a review.");
    } finally {
      setBusy(false);
    }
  }
  async function review(known: boolean) {
    if (!session || !card) return;
    setBusy(true);
    setDirection(known ? 1 : -1);
    try {
      const next = await action<FlashSession>("review_flash", {
        session_id: session.id,
        card_id: card.id,
        known,
      });
      setFlipped(false);
      setSession(next);
      setDone(Boolean(next.done));
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not save your review.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="A little review goes a long way."
        copy="Keep the ideas fresh. Give your knowledge a little room to grow."
      />
      {!d.flashcards.length ? (
        <Empty
          icon={Layers3}
          title="Your deck is on its way."
          copy="Your instructor hasn’t added any flashcards yet. Try a lesson while your review deck takes shape."
        />
      ) : (
        <div className="flash-session">
          {done ? (
            <div className="session-complete panel">
              <Award size={48} />
              <h2>
                {total ? "That’s a little win." : "You’re all caught up."}
              </h2>
              <p>
                {total
                  ? "Your review is saved. The concepts you knew will return in 1, 3, 7, then 14 days."
                  : "Nothing is due for review right now. Come back when your next review is ready."}
              </p>
              <Button
                onClick={() => {
                  setDone(false);
                  setSession(null);
                }}
              >
                Back to my deck
                <ArrowLeft size={15} />
              </Button>
            </div>
          ) : !session ? (
            <section className="panel exam-hero">
              <span className="feature-icon">
                <Layers3 size={27} />
              </span>
              <h2>Make a little room for recall.</h2>
              <p>
                {due} of {d.flashcards.length} cards are ready for review. Flip
                a card, think it through, and choose how well you knew it.
              </p>
              <Button onClick={() => void start()} disabled={busy || !due}>
                {busy && <LoaderCircle size={15} className="spin" />}Start
                reviewing
                <ArrowRight size={16} />
              </Button>
              <p className="flash-helper">
                “Review again” returns a card later in this session.
              </p>
            </section>
          ) : card ? (
            <>
              <div className="flash-top">
                <span>
                  Card {Math.min(total, total - session.pending.length + 1)} of{" "}
                  {total}
                </span>
                <span>{session.pending.length} remaining</span>
              </div>
              <ProgressBar
                value={
                  ((total - session.pending.length) / Math.max(1, total)) * 100
                }
              />
              <AnimatePresence mode="wait">
                <motion.div
                  key={card.id}
                  initial={reduced ? false : { opacity: 0, x: direction * 35 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduced ? undefined : { opacity: 0, x: direction * 70 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    className={"flash-card" + (flipped ? " flipped" : "")}
                    onClick={() => setFlipped(!flipped)}
                    aria-label={
                      flipped
                        ? "Card answer. Activate to return to the question."
                        : "Flashcard question. Activate to reveal the answer."
                    }
                    disabled={busy}
                  >
                    <div className="flash-inner">
                      <div className="flash-front" aria-hidden={flipped}>
                        <span className="eyebrow">
                          {
                            d.competencies.find(
                              (c) => c.id === card.competency_id,
                            )?.name
                          }
                        </span>
                        <h2>{card.front}</h2>
                        <span className="flip-hint">
                          <RotateCcw size={12} /> Tap, Space, or Enter to reveal
                        </span>
                      </div>
                      <div className="flash-back" aria-hidden={!flipped}>
                        <span className="eyebrow">THE LITTLE REMINDER</span>
                        <p>{card.back}</p>
                        <span className="flip-hint">
                          <RotateCcw size={12} />
                          Tap to see the question
                        </span>
                      </div>
                    </div>
                  </button>
                </motion.div>
              </AnimatePresence>
              <div className="flash-actions">
                <Button
                  variant="outline"
                  disabled={!flipped || busy}
                  onClick={() => void review(false)}
                >
                  <RotateCcw size={16} />
                  Review again
                </Button>
                <Button
                  disabled={!flipped || busy}
                  onClick={() => void review(true)}
                >
                  <Check size={16} />I knew it
                </Button>
              </div>
              <p className="flash-helper">
                No pressure. Honest answers help you learn better.
              </p>
            </>
          ) : null}
        </div>
      )}
    </>
  );
}

type ExamView = {
  id: string;
  index: number;
  total: number;
  expires_at: string;
  question: Question;
  result?: ExamResult;
};
export function MockExam({ data: d, action, base, demo, notify }: ToolProps) {
  const [view, setView] = useState<ExamView | null>(null),
    [result, setResult] = useState<ExamResult | null>(null),
    [selected, setSelected] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [seconds, setSeconds] = useState(0),
    [confirm, setConfirm] = useState(false);
  const submitting = useRef(false),
    actionRef = useRef(action),
    notifyRef = useRef(notify);
  actionRef.current = action;
  notifyRef.current = notify;
  const storageKey = `bookkeep-exam-${demo ? "preview" : d.profile.id}`;
  const receive = useCallback(
    (next: ExamView) => {
      setSelected(null);
      if (next.result) {
        setResult(next.result);
        setView(null);
        localStorage.removeItem(storageKey);
      } else {
        setView(next);
        setSeconds(
          Math.max(
            0,
            Math.ceil((Date.parse(next.expires_at) - Date.now()) / 1000),
          ),
        );
        localStorage.setItem(storageKey, next.id);
      }
    },
    [storageKey],
  );
  useEffect(() => {
    const id = localStorage.getItem(storageKey);
    if (id) {
      setBusy(true);
      actionRef
        .current<ExamView>("get_exam", { id })
        .then(receive)
        .catch((e) => {
          localStorage.removeItem(storageKey);
          notifyRef.current(
            e instanceof Error
              ? e.message
              : "Your prior exam could not be resumed.",
          );
        })
        .finally(() => setBusy(false));
    }
  }, [storageKey, receive]);
  const finish = useCallback(
    async (id: string) => {
      if (submitting.current) return;
      submitting.current = true;
      setBusy(true);
      try {
        receive(await actionRef.current<ExamView>("finish_exam", { id }));
        setConfirm(false);
      } catch (e) {
        notifyRef.current(
          e instanceof Error
            ? e.message
            : "Could not submit. Please try again.",
        );
      } finally {
        submitting.current = false;
        setBusy(false);
      }
    },
    [receive],
  );
  useEffect(() => {
    if (!view) return;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((Date.parse(view.expires_at) - Date.now()) / 1000),
      );
      setSeconds(remaining);
      if (remaining === 0 && !submitting.current) void finish(view.id);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [view?.id, view?.expires_at, finish]);
  async function start() {
    setBusy(true);
    try {
      setResult(null);
      receive(await action<ExamView>("start_exam"));
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not start the exam.");
    } finally {
      setBusy(false);
    }
  }
  async function answer() {
    if (!view || selected === null || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      receive(
        await action<ExamView>("exam_answer", {
          id: view.id,
          question_id: view.question.id,
          option: selected,
        }),
      );
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not save your answer.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title={
          view
            ? "One question. One step forward."
            : result
              ? "A clearer picture of your progress."
              : "A little practice for the big day."
        }
        copy={
          view
            ? "Take your time. Read carefully. You’ve got this."
            : result
              ? "See what’s clicking, and find your next learning step."
              : "Get familiar with a timed assessment and discover where to focus next."
        }
      />
      {result ? (
        <div className="exam-intro">
          <div className="result-hero">
            <Award size={43} />
            <strong>{result.score}%</strong>
            <h2>
              {result.passed
                ? "A milestone worth celebrating."
                : "A useful step on your journey."}
            </h2>
            <p>
              {result.correct_count} correct out of {result.total} ·{" "}
              {result.passed ? "Passed" : "Keep practicing"} ·{" "}
              {new Date(result.date).toLocaleDateString()}
            </p>
          </div>
          <section className="panel">
            <div className="panel-title">
              <h2>Your competency breakdown</h2>
              <span className="text-small muted">
                Below 70%? Give it another look.
              </span>
            </div>
            {Object.entries(result.score_by_competency).map(([id, score]) => {
              const pct = score.total
                ? Math.round((score.correct / score.total) * 100)
                : 0;
              return (
                <div className="competency-row" key={id}>
                  <div className="competency-row-head">
                    {d.competencies.find((c) => c.id === id)?.name ||
                      "Competency"}
                    <span>
                      {score.correct}/{score.total} · {pct}%
                    </span>
                  </div>
                  <ProgressBar value={pct} />
                  {pct < 70 && (
                    <Link
                      className="feature-link"
                      style={{ marginTop: 9 }}
                      href={`${base}/lessons?competency=${id}`}
                    >
                      Review this competency
                      <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
              );
            })}
          </section>
          <div className="result-actions">
            <Button onClick={() => void start()} disabled={busy}>
              Try another exam
              <RotateCcw size={15} />
            </Button>
            <Button asChild variant="outline">
              <Link href={`${base}/dashboard`}>Back to my dashboard</Link>
            </Button>
          </div>
        </div>
      ) : view ? (
        <div className="exam-question">
          <div className="exam-question-top">
            <span>
              Question {view.index + 1} of {view.total}
            </span>
            <span
              className={"timer" + (seconds <= 60 ? " urgent" : "")}
              role="timer"
              aria-label={`${seconds} seconds remaining`}
            >
              <Clock3 size={15} />
              {formatDuration(seconds)}
            </span>
          </div>
          <ProgressBar value={(view.index / view.total) * 100} />
          <section className="panel">
            <span className="category-tag">
              {
                d.competencies.find((c) => c.id === view.question.competency_id)
                  ?.name
              }
            </span>
            <h2 className="question-title">{view.question.text}</h2>
            {view.question.options.map((o, i) => (
              <button
                className={"option" + (selected === i ? " selected" : "")}
                key={`${view.question.id}-${i}`}
                disabled={busy || seconds === 0}
                onClick={() => setSelected(i)}
              >
                <span>{String.fromCharCode(65 + i)}</span>
                {o}
              </button>
            ))}
            <div className="flex-between">
              <span className="text-small muted">
                Submitted answers are final.
              </span>
              <Button
                disabled={busy || selected === null || seconds === 0}
                onClick={() => void answer()}
              >
                {busy && <LoaderCircle size={14} className="spin" />}
                {view.index === view.total - 1
                  ? "Finish exam"
                  : "Next question"}
                <ArrowRight size={15} />
              </Button>
            </div>
          </section>
          <button
            className="back-link spaced"
            onClick={() => setConfirm(true)}
            disabled={busy}
          >
            End and submit now
          </button>
        </div>
      ) : (
        <div className="exam-intro">
          <div className="exam-hero">
            <span className="feature-icon">
              <Clock3 size={27} />
            </span>
            <h2>A clearer path to assessment day.</h2>
            <p>
              This practice exam helps you check your understanding across the
              available competencies. Your results help you decide what to learn
              next.
            </p>
          </div>
          <div className="exam-specs">
            <div>
              <strong>{d.settings.question_count}</strong>
              <small>Questions</small>
            </div>
            <div>
              <strong>
                {d.settings.time_limit_minutes}{" "}
                <span style={{ fontSize: 14 }}>min</span>
              </strong>
              <small>Time limit</small>
            </div>
            <div>
              <strong>{d.settings.pass_mark_percent}%</strong>
              <small>Passing score</small>
            </div>
          </div>
          <section className="panel exam-instructions">
            <h3>A few things before you begin.</h3>
            <ul>
              <li>Questions and options are shuffled for each attempt.</li>
              <li>
                You’ll see one question at a time. Each submitted answer is
                final.
              </li>
              <li>
                The timer continues if you leave. Return here to resume your
                attempt.
              </li>
              <li>Your exam submits automatically when time is up.</li>
              <li>Unanswered questions count toward the total score.</li>
            </ul>
          </section>
          {d.questions.length < d.settings.question_count && (
            <div className="hint">
              <Info size={17} />
              <span>
                Your instructor needs to add at least{" "}
                {d.settings.question_count} questions. {d.questions.length} are
                currently available.
              </span>
            </div>
          )}
          <div className="text-center">
            <Button
              disabled={busy || d.questions.length < d.settings.question_count}
              onClick={() => void start()}
            >
              {busy && <LoaderCircle size={15} className="spin" />}Start my mock
              exam
              <ArrowRight size={16} />
            </Button>
            <p className="flash-helper">
              Independent practice content. This is not an official TESDA
              examination.
            </p>
          </div>
          {d.results.length > 0 && (
            <section className="panel spaced">
              <div className="panel-title">
                <h2>Your previous attempts</h2>
              </div>
              {d.results.slice(0, 5).map((r) => (
                <div className="needs-work-item" key={r.id}>
                  <span>
                    {new Date(r.date).toLocaleDateString()}
                    <small>
                      {r.correct_count} of {r.total} correct
                    </small>
                  </span>
                  <button className="feature-link" onClick={() => setResult(r)}>
                    {r.score}% · View results
                    <ChevronRightIcon />
                  </button>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
      {confirm && view && (
        <Dialog
          title="Submit this examination?"
          onClose={() => !busy && setConfirm(false)}
        >
          <h2>Ready to wrap up?</h2>
          <p>
            Unanswered questions will count as incorrect. Your current answers
            will be saved and this attempt will end.
          </p>
          <div className="modal-footer">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              Keep going
            </Button>
            <Button disabled={busy} onClick={() => void finish(view.id)}>
              Submit exam
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
function ChevronRightIcon() {
  return <ArrowRight size={12} />;
}

export function Achievements({ data: d }: ToolProps) {
  return (
    <>
      <PageHeading
        title="Every little win counts."
        copy={`${d.badges.length} of ${badgeDefinitions.length} milestones earned. Keep showing up for your future self.`}
      />
      <div className="achievement-grid">
        {badgeDefinitions.map(([id, name, copy]) => {
          const earned = d.badges.includes(id);
          return (
            <article
              className={"achievement-card" + (earned ? "" : " locked")}
              key={id}
            >
              <span className="badge-icon">
                {id.includes("streak") ? (
                  <Zap size={29} />
                ) : id === "mock_passed" ? (
                  <Trophy size={29} />
                ) : (
                  <Award size={29} />
                )}
              </span>
              <h3>{name}</h3>
              <p>{copy}</p>
              <span className={"status-tag" + (earned ? " complete" : "")}>
                {earned ? (
                  <>
                    <CheckCircle2 size={11} />
                    You earned this
                  </>
                ) : (
                  <>
                    <LockKeyhole size={11} />A little further ahead
                  </>
                )}
              </span>
            </article>
          );
        })}
      </div>
    </>
  );
}
export function Leaderboard({ data: d, base }: ToolProps) {
  return (
    <>
      <PageHeading
        title="A little friendly motivation."
        copy="Celebrate the effort. A new week brings a fresh start."
      />
      <section className="panel">
        <div className="panel-title">
          <h2>This week’s learning wins</h2>
          <span className="text-small muted">Resets Monday · Asia/Manila</span>
        </div>
        {d.leaderboard.length ? (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Learner</th>
                <th>Weekly XP</th>
              </tr>
            </thead>
            <tbody>
              {d.leaderboard.map((p, i) => (
                <tr key={i} className={p.is_me ? "me" : ""}>
                  <td className="rank">
                    {i < 3 ? (
                      <Trophy size={17} />
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </td>
                  <td>
                    <span className="person">
                      <span className="avatar">
                        {p.display_name.slice(0, 2).toUpperCase()}
                      </span>
                      {p.display_name}
                      {p.is_me && <small>(you)</small>}
                    </span>
                  </td>
                  <td>
                    <b>{p.points.toLocaleString()}</b> XP
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty
            icon={Trophy}
            title="A fresh page for this week."
            copy="No participating learners have earned XP this week. Your next learning activity could be a great start."
          />
        )}
        <div className="leaderboard-info">
          <ShieldCheck size={16} />
          <span>
            Only learners who opt in appear here. Your email and full name stay
            private.
          </span>
        </div>
        {!d.profile.leaderboard_opt_in && (
          <div className="hint spaced">
            <Info size={16} />
            <span>
              Want to join in? Turn on leaderboard participation in your account
              settings.
            </span>
            <Button asChild variant="ghost" size="sm">
              <Link href={`${base}/settings`}>
                Settings
                <ArrowRight size={13} />
              </Link>
            </Button>
          </div>
        )}
      </section>
    </>
  );
}

export function AccountSettings({ data: d, action, demo, notify }: ToolProps) {
  const [profile, setProfile] = useState<Profile>(d.profile),
    [busy, setBusy] = useState(false),
    [credentialBusy, setCredentialBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [reset, setReset] = useState(false);
  const admin = d.profile.role === "admin";
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await action("save_profile", { profile });
      setSuccess("Your settings are saved. A little more you.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    if (demo) {
      window.location.assign("/");
      return;
    }
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      window.location.assign("/");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not sign out.");
    }
  }
  return (
    <>
      <PageHeading
        title="Make this space yours."
        copy="A few preferences to make your learning journey feel a little more personal."
      />
      <div className="settings-layout">
        <form className="panel form-stack" onSubmit={save}>
          <h2>About you</h2>
          <div className="field-row">
            <label className="field">
              Full name
              <input
                required
                maxLength={80}
                value={profile.full_name}
                onChange={(e) =>
                  setProfile({ ...profile, full_name: e.target.value })
                }
              />
            </label>
            <label className="field">
              Display name
              <input
                required
                minLength={3}
                maxLength={20}
                value={profile.display_name}
                onChange={(e) =>
                  setProfile({ ...profile, display_name: e.target.value })
                }
              />
              <small>3–20 characters. This appears on the leaderboard.</small>
            </label>
          </div>
          {!admin && (
            <>
              <label className="field">
                Assessment date
                <input
                  type="date"
                  value={profile.exam_date || ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      exam_date: e.target.value || null,
                    })
                  }
                />
              </label>
              <label className="field">
                Daily study goal
                <select
                  value={profile.daily_goal}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      daily_goal: e.target.value as Profile["daily_goal"],
                    })
                  }
                >
                  <option value="light">Light · 1 activity per day</option>
                  <option value="steady">Steady · 3 activities per day</option>
                  <option value="intense">
                    Intense · 5 activities per day
                  </option>
                </select>
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={profile.leaderboard_opt_in}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      leaderboard_opt_in: e.target.checked,
                    })
                  }
                />
                <span>
                  Join the weekly leaderboard
                  <small>
                    Share only your display name and weekly XP. You can leave at
                    any time.
                  </small>
                </span>
              </label>
            </>
          )}
          <div className="field-row">
            <label className="field">
              Theme
              <select
                aria-label="Theme"
                value={profile.theme}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    theme: e.target.value as Profile["theme"],
                  })
                }
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">Follow device</option>
              </select>
            </label>
            <label className="field">
              Study timezone
              <select
                value={profile.timezone}
                onChange={(e) =>
                  setProfile({ ...profile, timezone: e.target.value })
                }
              >
                {[
                  ...new Set([
                    profile.timezone,
                    "Asia/Manila",
                    "Asia/Singapore",
                    "Asia/Tokyo",
                    "Australia/Sydney",
                    "Europe/London",
                    "America/New_York",
                    "America/Los_Angeles",
                    "UTC",
                  ]),
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <small>Used for daily goals and streaks.</small>
            </label>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="form-success" role="status">
              {success}
            </p>
          )}
          <div>
            <Button disabled={busy} type="submit">
              {busy && <LoaderCircle size={14} className="spin" />}Save my
              preferences
              <Check size={15} />
            </Button>
          </div>
        </form>
        <div className="column-stack">
          <form
            className="panel form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const values = new FormData(form);
              setCredentialBusy(true);
              try {
                await action("update_credentials", {
                  current_password: values.get("current_password"),
                  ...(values.get("email")
                    ? { email: values.get("email") }
                    : {}),
                  ...(values.get("password")
                    ? { password: values.get("password") }
                    : {}),
                });
                notify(
                  "Account update requested. Email changes need confirmation; check your inbox.",
                );
                form.reset();
              } catch (e) {
                notify(
                  e instanceof Error
                    ? e.message
                    : "Could not update your account.",
                );
              } finally {
                setCredentialBusy(false);
              }
            }}
          >
            <h2>Account security</h2>
            {demo && (
              <p className="text-small">
                Email and password changes are available for live accounts.
              </p>
            )}
            <label className="field">
              Current password
              <input
                type="password"
                name="current_password"
                required
                autoComplete="current-password"
                disabled={demo}
              />
            </label>
            <label className="field">
              New email address
              <input
                type="email"
                name="email"
                placeholder="Leave blank to keep your email"
                disabled={demo}
              />
              <small>Changes require email verification.</small>
            </label>
            <label className="field">
              New password
              <input
                type="password"
                name="password"
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                disabled={demo}
              />
            </label>
            <Button
              variant="outline"
              disabled={demo || credentialBusy}
              type="submit"
            >
              {credentialBusy && <LoaderCircle size={14} className="spin" />}
              Update account
            </Button>
          </form>
          <section className="panel">
            <h3 style={{ fontSize: 16 }}>A little pause?</h3>
            <p className="text-small" style={{ marginTop: 10 }}>
              Your progress will be here when you come back.
            </p>
            <div className="settings-actions">
              <Button variant="outline" onClick={() => void logout()}>
                <LogOut size={15} />
                Sign out
              </Button>
              {demo && (
                <Button variant="ghost" onClick={() => setReset(true)}>
                  Reset preview
                </Button>
              )}
            </div>
          </section>
        </div>
      </div>
      {reset && (
        <Dialog title="Reset sample progress" onClose={() => setReset(false)}>
          <h2>A fresh preview?</h2>
          <p>This clears the sample progress saved in this browser.</p>
          <div className="modal-footer">
            <Button variant="outline" onClick={() => setReset(false)}>
              Keep progress
            </Button>
            <Button
              onClick={() => {
                [
                  "bookkeep-preview-v1",
                  "bookkeep-preview-exam",
                  "bookkeep-preview-flash",
                  "bookkeep-exam-preview",
                ].forEach((k) => localStorage.removeItem(k));
                window.location.reload();
              }}
            >
              Reset preview
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}

export function WelcomeSetup({ data: d, action, base, notify }: ToolProps) {
  const [date, setDate] = useState(d.profile.exam_date || ""),
    [goal, setGoal] = useState<Profile["daily_goal"]>(d.profile.daily_goal),
    [busy, setBusy] = useState(false);
  async function complete(start: boolean) {
    setBusy(true);
    try {
      await action("save_profile", {
        profile: {
          ...d.profile,
          exam_date: date || null,
          daily_goal: goal,
          onboarding_done: true,
          timezone:
            Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Manila",
        },
      });
      if (start)
        window.location.assign(
          `${base}/lessons${d.lessons[0] ? "?lesson=" + d.lessons[0].id : ""}`,
        );
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not save your setup.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title="Welcome to your next chapter"
      onClose={() => !busy && void complete(false)}
    >
      <span className="feature-icon">
        <Sparkles size={23} />
      </span>
      <h2>
        A little plan.
        <br />A great place to start.
      </h2>
      <p>Make this journey yours. You can change these preferences anytime.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void complete(true);
        }}
        className="form-stack"
      >
        <label className="field">
          When is your assessment?
          <input
            type="date"
            min={localDate(new Date(), d.profile.timezone)}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <small>No date yet? That’s okay.</small>
        </label>
        <div className="field">
          Choose your daily pace
          <div className="onboard-goals">
            {(["light", "steady", "intense"] as const).map((g, i) => (
              <button
                className={goal === g ? "selected" : ""}
                type="button"
                key={g}
                onClick={() => setGoal(g)}
              >
                {g[0].toUpperCase() + g.slice(1)}
                <small>
                  {[1, 3, 5][i]} {i ? "activities" : "activity"} / day
                </small>
              </button>
            ))}
          </div>
        </div>
        <Button disabled={busy} type="submit">
          {busy && <LoaderCircle size={15} className="spin" />}Start lesson one
          <ArrowRight size={16} />
        </Button>
        <button
          type="button"
          className="text-small"
          disabled={busy}
          onClick={() => void complete(false)}
        >
          Skip for now
        </button>
      </form>
    </Dialog>
  );
}
