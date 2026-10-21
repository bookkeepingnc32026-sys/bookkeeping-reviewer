"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Flame,
  Zap,
  TrendingUp,
  Target,
  ArrowRight,
  ChevronRight,
  Check,
  BookOpen,
  CalendarDays,
  Award,
  PenLine,
  Sparkles,
  Search,
  Play,
  Clock3,
  ArrowLeft,
  LoaderCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Button } from "./ui/button";
import type { ToolProps } from "./portal";
import type { Lesson, Question } from "@/lib/types";
import { badgeDefinitions } from "@/lib/demo";
import {
  dayDistance,
  formatDuration,
  level,
  localDate,
  streak,
} from "@/lib/utils";
export {
  Flashcards,
  MockExam,
  Achievements,
  Leaderboard,
  AccountSettings,
  WelcomeSetup,
} from "./learning-tools";
export function PageHeading({
  title,
  copy,
  children,
}: {
  title: string;
  copy: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      {children}
    </div>
  );
}
export function Empty({
  title,
  copy,
  icon: Icon = BookOpen,
}: {
  title: string;
  copy: string;
  icon?: typeof BookOpen;
}) {
  return (
    <div className="empty-state">
      <Icon size={33} />
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  );
}
export function ProgressBar({ value }: { value: number }) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: Math.min(100, Math.max(0, value)) + "%" }} />
    </div>
  );
}
export function Stat({
  icon: Icon,
  value,
  label,
  progress,
}: {
  icon: typeof Flame;
  value: React.ReactNode;
  label: string;
  progress?: number;
}) {
  return (
    <div className="stat-card">
      <span className="stat-icon">
        <Icon size={20} />
      </span>
      <div style={{ flex: 1 }}>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {progress !== undefined && (
          <div style={{ marginTop: 8 }}>
            <ProgressBar value={progress} />
          </div>
        )}
      </div>
    </div>
  );
}
export function Dashboard({ data: d, base }: ToolProps) {
  const today = localDate(new Date(), d.profile.timezone),
    xp = d.xp.reduce((n, e) => n + e.points, 0),
    lv = level(xp),
    days = streak(
      d.activity.map((a) => a.local_day),
      today,
    );
  const completed = d.progress.filter((p) => p.completed).length;
  const last = d.progress.find((p) => !p.completed);
  const lesson =
    d.lessons.find((l) => l.id === last?.lesson_id) ||
    d.lessons.find(
      (l) => !d.progress.some((p) => p.lesson_id === l.id && p.completed),
    ) ||
    d.lessons[0];
  const goal = { light: 1, steady: 3, intense: 5 }[d.profile.daily_goal];
  const activities = d.activity.filter((a) => a.local_day === today).length;
  const checklist = [
    ["Watch your first lesson", completed > 0, "lessons"],
    [
      "Answer a quick check",
      d.activity.some((a) => a.action === "quick_check"),
      "lessons",
    ],
    ["Try a journal entry", d.journalDone.length > 0, "practice"],
    ["Review five flashcards", d.flashProgress.length >= 5, "flashcards"],
    ["Take a mock examination", d.results.length > 0, "exam"],
  ] as const;
  const done = checklist.every(([, checked]) => checked);
  const performance = d.competencies.map((c) => {
    const attempts = d.attempts.filter((a) => a.competency_id === c.id);
    return {
      ...c,
      score: attempts.length
        ? Math.round(
            (attempts.filter((a) => a.correct).length / attempts.length) * 100,
          )
        : null,
    };
  });
  const weak = performance
    .filter((c) => c.score !== null && c.score < 70)
    .sort((a, b) => a.score! - b.score!)
    .slice(0, 2);
  return (
    <>
      <PageHeading
        title={`A little progress, ${d.profile.display_name.split(" ")[0]}.`}
        copy="Every small step brings you closer. Let’s make today count."
      >
        <span className="heading-meta">
          <CalendarDays size={15} />
          {d.profile.exam_date
            ? `${Math.max(0, dayDistance(today, d.profile.exam_date))} days until your assessment`
            : "Your journey, at your pace"}
        </span>
      </PageHeading>
      <div className="stats-grid">
        <Stat
          icon={Flame}
          value={
            <>
              {days} <small>{days === 1 ? "day" : "days"}</small>
            </>
          }
          label="Current study streak"
        />
        <Stat icon={Zap} value={xp.toLocaleString()} label="Total XP earned" />
        <Stat
          icon={TrendingUp}
          value={`Level ${lv.current}`}
          label={`${lv.remaining} XP to your next level`}
          progress={(lv.progress / 250) * 100}
        />
        <Stat
          icon={BookOpen}
          value={
            <>
              {completed}
              <small> / {d.lessons.length}</small>
            </>
          }
          label="Lessons completed"
        />
      </div>
      <div className="dashboard-grid">
        <div className="column-stack">
          <div className="continue-card">
            <div className="continue-info">
              <div className="eyebrow">
                {last ? "PICK UP WHERE YOU LEFT OFF" : "YOUR NEXT SMALL STEP"}
              </div>
              <h2>{lesson?.title || "Your learning journey starts here."}</h2>
              <p>
                {lesson
                  ? `${d.competencies.find((c) => c.id === lesson.competency_id)?.name} · ${formatDuration(lesson.duration)}${last ? " · Resume at " + formatDuration(last.last_position) : ""}`
                  : "Lessons will appear here when your instructor publishes them."}
              </p>
              <Button asChild variant="secondary">
                <Link
                  href={
                    lesson
                      ? `${base}/lessons?lesson=${lesson.id}`
                      : `${base}/lessons`
                  }
                >
                  {last ? "Continue learning" : "Explore lessons"}
                  <ArrowRight size={14} />
                </Link>
              </Button>
            </div>
            <div className="continue-art">
              <BookOpen />
            </div>
          </div>
          <section className="panel">
            <div className="panel-title">
              <h2>Your learning path</h2>
              <Link href={`${base}/lessons`}>
                View lessons <ChevronRight size={12} />
              </Link>
            </div>
            {d.competencies.map((c) => {
              const lessons = d.lessons.filter((l) => l.competency_id === c.id);
              const n = lessons.filter((l) =>
                d.progress.some((p) => p.lesson_id === l.id && p.completed),
              ).length;
              const percent = lessons.length
                ? Math.round((n / lessons.length) * 100)
                : 0;
              return (
                <div className="competency-row" key={c.id}>
                  <Link
                    href={`${base}/lessons?competency=${c.id}`}
                    className="competency-row-head"
                  >
                    {c.name}
                    <span>{percent}%</span>
                  </Link>
                  <ProgressBar value={percent} />
                </div>
              );
            })}
          </section>
          <section className="panel">
            <div className="panel-title">
              <h2>A little extra attention</h2>
              <span className="text-small muted">Your next growth areas</span>
            </div>
            {weak.length ? (
              weak.map((c) => (
                <div className="needs-work-item" key={c.id}>
                  <span>
                    {c.name}
                    <small>
                      {c.score}% accuracy · A little practice will help.
                    </small>
                  </span>
                  <Link href={`${base}/lessons?competency=${c.id}`}>
                    Review <ArrowRight size={12} />
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-small">
                {d.attempts.length
                  ? "You’re doing well. Keep practicing to make your knowledge stick."
                  : "Complete a quick check or practice activity to discover what’s clicking and what needs work."}
              </p>
            )}
          </section>
        </div>
        <div className="column-stack">
          <section className="panel">
            <div className="panel-title">
              <h2>Today’s little goal</h2>
              <Target size={17} />
            </div>
            <div className="daily-goal-top">
              <span>
                {d.profile.daily_goal[0].toUpperCase() +
                  d.profile.daily_goal.slice(1)}{" "}
                & consistent
              </span>
              <strong>
                {Math.min(activities, goal)}
                <small> / {goal} activities</small>
              </strong>
            </div>
            <ProgressBar value={(activities / goal) * 100} />
            <p className="goal-meta">
              <Sparkles size={12} />
              {activities >= goal
                ? "You did it. A little win worth celebrating."
                : "A few focused minutes can make a difference."}
            </p>
          </section>
          {!done && (
            <section className="panel">
              <div className="panel-title">
                <h2>A good place to start</h2>
                <span className="text-small muted">
                  {checklist.filter(([, v]) => v).length}/5
                </span>
              </div>
              <ul className="checklist">
                {checklist.map(([label, checked, to]) => (
                  <li className={checked ? "done" : ""} key={label}>
                    <span>{checked && <Check size={11} />}</span>
                    <Link href={`${base}/${to}`}>
                      {label}
                      {!checked && <ChevronRight size={11} />}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="bonus-note">
                <Zap size={12} /> A little bonus: +50 XP when you finish all
                five.
              </div>
            </section>
          )}
          <section className="panel">
            <div className="panel-title">
              <h2>Little wins, collected</h2>
              <Link href={`${base}/achievements`}>
                View all <ChevronRight size={12} />
              </Link>
            </div>
            <div className="badge-strip">
              {[
                badgeDefinitions[0],
                badgeDefinitions[3],
                badgeDefinitions[5],
              ].map(([id, name]) => (
                <div
                  className={
                    "badge-small" + (d.badges.includes(id) ? "" : " locked")
                  }
                  key={id}
                >
                  <span>
                    <Award size={23} />
                  </span>
                  <small>{name}</small>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export function Lessons(props: ToolProps) {
  const { data: d, action, notify } = props;
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState(""),
    [selected, setSelected] = useState("");
  useEffect(() => {
    const url = new URL(window.location.href);
    setFilter(url.searchParams.get("competency") || "");
    setSelected(url.searchParams.get("lesson") || "");
  }, []);
  const lesson = d.lessons.find((l) => l.id === selected);
  function select(id: string) {
    setSelected(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("lesson", id);
    else url.searchParams.delete("lesson");
    window.history.replaceState(null, "", url);
  }
  if (lesson)
    return (
      <LessonDetail
        {...props}
        lesson={lesson}
        onBack={() => select("")}
        onNext={() => {
          const i = d.lessons.findIndex((l) => l.id === lesson.id);
          select(d.lessons[i + 1]?.id || "");
        }}
      />
    );
  const lessons = d.lessons.filter(
    (l) =>
      (!filter || l.competency_id === filter) &&
      l.title.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title="A little learning, a lot of possibility."
        copy="Find your next lesson. Build your confidence, one concept at a time."
      />
      <div className="tool-bar">
        <label className="search-input">
          <Search size={15} />
          <input
            className="input"
            aria-label="Search lessons"
            placeholder="Find a lesson…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          className="input"
          aria-label="Filter by competency"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All competencies</option>
          {d.competencies.map((c) => (
            <option value={c.id} key={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {!lessons.length ? (
        <Empty
          title={
            d.lessons.length
              ? "Let’s try another search."
              : "Your first lesson is on its way."
          }
          copy={
            d.lessons.length
              ? "Try a different search or competency."
              : "Your instructor hasn’t published any lessons yet. Come back soon, or explore another learning tool."
          }
        />
      ) : (
        <div className="lesson-grid">
          {lessons.map((l, i) => {
            const progress = d.progress.find((p) => p.lesson_id === l.id);
            return (
              <article className="lesson-card" key={l.id}>
                <button
                  className="lesson-cover"
                  aria-label={`Open ${l.title}`}
                  onClick={() => select(l.id)}
                >
                  <small>
                    LESSON {String(l.sort_order + 1).padStart(2, "0")}
                  </small>
                  {i % 2 ? <PenLine /> : <BookOpen />}
                  <span className="duration-tag">
                    <Clock3
                      size={9}
                      style={{ display: "inline", marginRight: 4 }}
                    />
                    {formatDuration(l.duration)}
                  </span>
                </button>
                <div className="lesson-card-body">
                  <span className="category-tag">
                    {d.competencies.find((c) => c.id === l.competency_id)?.name}
                  </span>
                  <h3>{l.title}</h3>
                  <p>
                    {l.summary[0] ||
                      "Take the next step on your learning journey."}
                  </p>
                  <div className="lesson-card-footer">
                    <span
                      className={
                        "status-tag" + (progress?.completed ? " complete" : "")
                      }
                    >
                      {progress?.completed ? (
                        <>
                          <CheckCircle2 size={12} /> Complete
                        </>
                      ) : progress?.last_position ? (
                        `At ${formatDuration(progress.last_position)}`
                      ) : (
                        "Ready when you are"
                      )}
                    </span>
                    <button
                      className="feature-link"
                      onClick={() => select(l.id)}
                    >
                      {progress?.completed
                        ? "Revisit"
                        : progress?.last_position
                          ? "Resume"
                          : "Start lesson"}
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

function LessonDetail({
  lesson,
  onBack,
  onNext,
  ...props
}: ToolProps & { lesson: Lesson; onBack: () => void; onNext: () => void }) {
  const { data: d, action, demo, notify } = props;
  const [busy, setBusy] = useState(false);
  const checks = d.questions.filter((q) => q.lesson_id === lesson.id);
  const progress = d.progress.find((p) => p.lesson_id === lesson.id);
  useEffect(() => {
    void action("save_lesson", {
      lesson_id: lesson.id,
      position: progress?.last_position || 0,
      complete: false,
    }).catch((error: unknown) =>
      notify(
        error instanceof Error
          ? error.message
          : "This lesson could not be saved.",
      ),
    );
    // Record opening once; subsequent player events save the current position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);
  return (
    <>
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={14} />
        All lessons
      </button>
      <PageHeading
        title={lesson.title}
        copy={
          d.competencies.find((c) => c.id === lesson.competency_id)?.name ||
          "Video lesson"
        }
      />
      <div className="lesson-layout">
        <div>
          <VideoPlayer
            key={lesson.id}
            lesson={lesson}
            position={progress?.last_position || 0}
            action={action}
            notify={notify}
            demo={demo}
          />
          {demo && (
            <div className="hint">
              <Info size={16} />
              <span>
                This sample lesson has no video. Read the summary, then try the
                quick check.
              </span>
            </div>
          )}
          <section className="panel spaced">
            <div className="panel-title">
              <h2>The key takeaways</h2>
              <BookOpen size={17} />
            </div>
            <ul className="summary-list">
              {lesson.summary.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>
          <div className="flex-between spaced">
            <span className="status-tag complete">
              {progress?.completed && (
                <>
                  <CheckCircle2 size={14} />
                  Lesson complete
                </>
              )}
            </span>
            {demo && !progress?.completed ? (
              <Button
                size="sm"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await action("save_lesson", {
                      lesson_id: lesson.id,
                      position: lesson.duration,
                      complete: true,
                    });
                  } catch (e) {
                    notify(e instanceof Error ? e.message : "Could not save.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Complete preview lesson
                <Check size={14} />
              </Button>
            ) : (
              <Button onClick={onNext} size="sm">
                Next lesson
                <ArrowRight size={14} />
              </Button>
            )}
          </div>
        </div>
        <div className="column-stack">
          <section className="panel">
            <div className="panel-title">
              <h2>A quick check</h2>
              <Zap size={17} />
            </div>
            {checks.length ? (
              checks.map((q) => (
                <QuickCheck
                  key={q.id}
                  question={q}
                  action={action}
                  notify={notify}
                />
              ))
            ) : (
              <p className="text-small">
                No quick checks have been added to this lesson yet.
              </p>
            )}
          </section>
          <section className="panel practice-tip">
            <h3>No need to rush.</h3>
            <p>
              Pause, take a few notes, and try explaining the idea in your own
              words. Understanding grows with a little practice.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
function QuickCheck({
  question: q,
  action,
  notify,
}: {
  question: Question;
  action: ToolProps["action"];
  notify: ToolProps["notify"];
}) {
  const [selected, setSelected] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [answer, setAnswer] = useState<{
      correct: boolean;
      correct_option: number;
      explanation: string;
    } | null>(null);
  return (
    <div style={{ marginBottom: 25 }}>
      <h3 className="question-title">{q.text}</h3>
      {q.options.map((o, i) => (
        <button
          className={
            "option" +
            (selected === i ? " selected" : "") +
            (answer && i === answer.correct_option ? " correct" : "")
          }
          key={i}
          disabled={busy || !!answer}
          onClick={() => setSelected(i)}
        >
          <span>{String.fromCharCode(65 + i)}</span>
          {o}
        </button>
      ))}
      {answer ? (
        <div role="status" className="feedback">
          <strong>
            {answer.correct
              ? "That’s it! A little win."
              : "A good moment to learn."}
          </strong>
          <p>
            {answer.explanation ||
              `The correct answer is ${q.options[answer.correct_option]}.`}
          </p>
        </div>
      ) : (
        <Button
          size="sm"
          disabled={selected === null || busy}
          onClick={async () => {
            setBusy(true);
            try {
              setAnswer(
                await action("answer_question", {
                  question_id: q.id,
                  option: selected,
                }),
              );
            } catch (e) {
              notify(
                e instanceof Error ? e.message : "Could not check your answer.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? <LoaderCircle size={14} className="spin" /> : null}Check my
          answer
        </Button>
      )}
    </div>
  );
}

type YTPlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  setPlaybackRate: (rate: number) => void;
  destroy: () => void;
};
type YTConstructor = new (
  element: HTMLElement,
  options: {
    videoId: string;
    playerVars: Record<string, unknown>;
    events: {
      onReady: () => void;
      onStateChange: (event: { data: number }) => void;
      onError: () => void;
    };
  },
) => YTPlayer;
declare global {
  interface Window {
    YT?: { Player: YTConstructor };
    onYouTubeIframeAPIReady?: () => void;
  }
}
function VideoPlayer({
  lesson,
  position,
  action,
  notify,
  demo,
}: {
  lesson: Lesson;
  position: number;
  action: ToolProps["action"];
  notify: ToolProps["notify"];
  demo: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    player = useRef<YTPlayer | null>(null),
    api = useRef({ action, notify });
  api.current = { action, notify };
  const [speed, setSpeed] = useState("1"),
    [error, setError] = useState("");
  useEffect(() => {
    if (!lesson.youtube_id || demo || !host.current) return;
    let disposed = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const save = async (complete = false) => {
      const p = player.current;
      if (!p) return;
      try {
        const result = await api.current.action<{ completed: boolean }>(
          "save_lesson",
          {
            lesson_id: lesson.id,
            position: Math.floor(p.getCurrentTime()),
            complete,
          },
        );
        if (complete && !result.completed)
          api.current.notify(
            "The video duration does not match this lesson. Ask your instructor to check its duration.",
          );
      } catch (e) {
        if (!disposed)
          api.current.notify(
            e instanceof Error
              ? e.message
              : "Watch position could not be saved.",
          );
      }
    };
    const init = () => {
      if (disposed || !window.YT || !host.current) return;
      player.current = new window.YT.Player(host.current, {
        videoId: lesson.youtube_id,
        playerVars: {
          start: position,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            timer = setInterval(() => void save(), 5000);
          },
          onStateChange: (event) => {
            if (event.data === 0) void save(true);
            if (event.data === 2) void save();
          },
          onError: () =>
            setError(
              "This video could not be loaded. Check your connection or ask your instructor to verify the video link.",
            ),
        },
      });
    };
    if (window.YT?.Player) init();
    else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        init();
      };
      if (!document.querySelector("script[data-youtube-api]")) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.dataset.youtubeApi = "true";
        script.onerror = () =>
          setError(
            "The video player could not load. Check your connection and reload.",
          );
        document.body.appendChild(script);
      }
    }
    return () => {
      disposed = true;
      if (timer) clearInterval(timer);
      const current = player.current;
      if (current) {
        void save();
        current.destroy();
        player.current = null;
      }
    };
  }, [lesson.id, lesson.youtube_id, demo]);
  return (
    <>
      <div className="video-wrap">
        {lesson.youtube_id && !demo ? (
          <div ref={host} style={{ width: "100%", height: "100%" }} />
        ) : (
          <div className="video-placeholder">
            <Play size={36} />
            <p>
              Sample lesson preview
              <br />
              Your instructor’s video will appear here.
            </p>
          </div>
        )}
      </div>
      {error && (
        <div role="alert" className="form-error spaced">
          {error}
        </div>
      )}
      <div className="video-controls">
        <span>
          {demo
            ? "Preview lesson"
            : position
              ? `Resume from ${formatDuration(position)}`
              : "Your watch position saves automatically."}
        </span>
        <label>
          Speed{" "}
          <select
            aria-label="Playback speed"
            value={speed}
            disabled={demo}
            onChange={(e) => {
              setSpeed(e.target.value);
              player.current?.setPlaybackRate(Number(e.target.value));
            }}
          >
            {["0.75", "1", "1.25", "1.5", "2"].map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}

export function JournalPractice({ data: d, action, notify }: ToolProps) {
  const [index, setIndex] = useState(0),
    [debit, setDebit] = useState(""),
    [credit, setCredit] = useState(""),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState<{
      correct: boolean;
      debit_account: string;
      credit_account: string;
      explanation: string;
    } | null>(null);
  const item = d.journals[index % d.journals.length];
  return (
    <>
      <PageHeading
        title="Let’s put it into practice."
        copy="One transaction. Two accounts. A little more confidence."
      />
      {!item ? (
        <Empty
          icon={PenLine}
          title="Practice is on its way."
          copy="Your instructor hasn’t added any journal exercises yet. Try a lesson or come back soon."
        />
      ) : (
        <div className="two-column">
          <section className="panel">
            <div className="panel-title">
              <h2>Journal entry practice</h2>
              <span className="text-small muted">
                Transaction {(index % d.journals.length) + 1} of{" "}
                {d.journals.length}
              </span>
            </div>
            <div className="practice-scenario">
              <small>HERE’S WHAT HAPPENED</small>
              {item.transaction_text}
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  setFeedback(
                    await action("answer_journal", {
                      item_id: item.id,
                      debit,
                      credit,
                    }),
                  );
                } catch (e) {
                  notify(
                    e instanceof Error
                      ? e.message
                      : "Could not submit your entry.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="practice-accounts">
                <label className="field">
                  Debit account
                  <select
                    aria-label="Debit account"
                    value={debit}
                    onChange={(e) => setDebit(e.target.value)}
                    required
                    disabled={busy || !!feedback}
                  >
                    <option value="">Choose an account</option>
                    {item.accounts.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Credit account
                  <select
                    aria-label="Credit account"
                    value={credit}
                    onChange={(e) => setCredit(e.target.value)}
                    required
                    disabled={busy || !!feedback}
                  >
                    <option value="">Choose an account</option>
                    {item.accounts.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </label>
              </div>
              {debit && debit === credit && (
                <p className="form-error" role="alert">
                  Choose two different accounts.
                </p>
              )}
              {!feedback && (
                <Button
                  disabled={busy || !debit || !credit || debit === credit}
                  type="submit"
                >
                  {busy && <LoaderCircle className="spin" size={15} />}Check my
                  entry
                  <ArrowRight size={15} />
                </Button>
              )}
            </form>
            {feedback && (
              <>
                <div className="feedback" role="status">
                  <strong>
                    {feedback.correct
                      ? "Nicely balanced!"
                      : "Let’s work through this one."}
                  </strong>
                  <p>{feedback.explanation}</p>
                  <div className="entry-line">
                    <span>Debit</span>
                    <b>{feedback.debit_account}</b>
                  </div>
                  <div className="entry-line">
                    <span>Credit</span>
                    <b>{feedback.credit_account}</b>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setIndex(index + 1);
                    setDebit("");
                    setCredit("");
                    setFeedback(null);
                  }}
                >
                  Next transaction
                  <ArrowRight size={15} />
                </Button>
              </>
            )}
          </section>
          <div className="column-stack">
            <section className="panel practice-tip">
              <span className="feature-icon" style={{ marginBottom: 20 }}>
                <BookOpen size={21} />
              </span>
              <h3>A quick refresher.</h3>
              <p>
                Every transaction affects at least two accounts. Total debits
                always equal total credits.
              </p>
              <ul>
                <li>Assets and expenses increase with a debit.</li>
                <li>
                  Liabilities, equity, and revenue increase with a credit.
                </li>
              </ul>
              <div className="example">
                <p>FOR EXAMPLE · A CASH EQUIPMENT PURCHASE</p>
                <div className="entry-line">
                  <span>Equipment</span>
                  <b>Debit</b>
                </div>
                <div className="entry-line indent">
                  <span>Cash</span>
                  <b>Credit</b>
                </div>
              </div>
            </section>
            <section className="panel practice-tip">
              <h3>Small wins add up.</h3>
              <p>
                Earn 15 XP the first time you correctly answer each transaction.
                Revisit it anytime to strengthen your understanding.
              </p>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
