"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  LayoutDashboard,
  BookOpen,
  PenLine,
  Layers3,
  Clock3,
  Award,
  Trophy,
  Settings,
  ChevronRight,
  Menu,
  X,
  Zap,
  Sparkles,
  ArrowUpRight,
  LoaderCircle,
  Check,
  Users,
  FileQuestion,
  Megaphone,
  SlidersHorizontal,
  FolderOpen,
  UserRound,
} from "lucide-react";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { demoData } from "@/lib/demo";
import { runPreview } from "@/lib/demo-engine";
import type { Bootstrap } from "@/lib/types";
import {
  Dashboard,
  Lessons,
  JournalPractice,
  Flashcards,
  MockExam,
  Achievements,
  Leaderboard,
  AccountSettings,
  WelcomeSetup,
} from "./learner";
import { AdminContent } from "./admin";
import { usePortalData } from "./portal-data";
export type Action = <T = Record<string, unknown>>(
  action: string,
  payload?: Record<string, unknown>,
) => Promise<T>;
export type ToolProps = {
  data: Bootstrap;
  action: Action;
  base: string;
  demo: boolean;
  notify: (message: string) => void;
};
const navigation = [
  ["dashboard", "Overview", LayoutDashboard],
  ["lessons", "Video lessons", BookOpen],
  ["practice", "Journal practice", PenLine],
  ["flashcards", "Flashcards", Layers3],
  ["exam", "Mock examination", Clock3],
  ["achievements", "Achievements", Award],
  ["leaderboard", "Leaderboard", Trophy],
] as const;
const adminNavigation = [
  ["overview", "Overview", LayoutDashboard],
  ["lessons", "Lessons", BookOpen],
  ["questions", "Question bank", FileQuestion],
  ["journal", "Journal exercises", PenLine],
  ["flashcards", "Flashcards", Layers3],
  ["announcements", "Announcements", Megaphone],
  ["competencies", "Competencies", FolderOpen],
  ["exam-settings", "Exam settings", SlidersHorizontal],
] as const;
export function Portal({
  section,
  demo,
  admin,
}: {
  section: string;
  demo: boolean;
  admin: boolean;
}) {
  const { data, setData } = usePortalData();
  const dataRef = useRef<Bootstrap | null>(data);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [ready, setReady] = useState(Boolean(data));
  const [visibleHint, setVisibleHint] = useState<string | null>(null);
  const visitedHints = useRef(new Set<string>());
  const reduce = useReducedMotion();
  const base = demo ? "/demo" : admin ? "/admin" : "/learn";
  const items = admin ? adminNavigation : navigation;
  const title =
    section === "settings"
      ? "Account settings"
      : items.find((i) => i[0] === section)?.[1] || "Overview";
  const notify = useCallback((message: string) => setToast(message), []);
  const load = useCallback(async () => {
    try {
      setError("");
      if (demo) {
        let saved: Bootstrap | null = null;
        try {
          saved = JSON.parse(
            localStorage.getItem("bookkeep-preview-v1") || "null",
          );
        } catch {
          localStorage.removeItem("bookkeep-preview-v1");
        }
        const next = saved?.activity ? saved : demoData();
        setData(next);
        dataRef.current = next;
      } else {
        const response = await fetch("/api/platform", { cache: "no-store" });
        const next = await response.json();
        if (!response.ok) throw new Error(next.error);
        setData(next);
        dataRef.current = next;
      }
      setReady(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load your learning space.",
      );
    }
  }, [demo, setData]);
  useEffect(() => {
    void load();
  }, [load, section]);
  useEffect(() => {
    setOpen(false);
  }, [section]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!data) return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      document.documentElement.classList.toggle(
        "theme-dark",
        data.profile.theme === "dark" ||
          (data.profile.theme === "system" && media.matches),
      );
    apply();
    media.addEventListener("change", apply);
    return () => {
      media.removeEventListener("change", apply);
      document.documentElement.classList.remove("theme-dark");
    };
  }, [data?.profile.theme]);
  const action: Action = useCallback(
    async <T,>(name: string, payload: Record<string, unknown> = {}) => {
      const old = dataRef.current;
      if (!old) throw new Error("Please wait for your learning space to load.");
      let response: T;
      if (demo) {
        const result = runPreview(old, name, payload);
        setData(result.data);
        dataRef.current = result.data;
        response = result.response as T;
      } else {
        const res = await fetch("/api/platform", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: name, ...payload }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        response = result as T;
        if (name !== "save_lesson" || payload.complete) await load();
      }
      const next = dataRef.current;
      const earned =
        (next?.xp.reduce((n, e) => n + e.points, 0) || 0) -
        old.xp.reduce((n, e) => n + e.points, 0);
      if (earned > 0) notify(`A little progress! +${earned} XP earned.`);
      return response;
    },
    [demo, load, notify],
  );
  useEffect(() => {
    const current = dataRef.current;
    if (!ready || !current || admin) return;
    const key = `${current.profile.id}:${section}`;
    if (visitedHints.current.has(key)) return;
    visitedHints.current.add(key);
    const isTool = [
      "lessons",
      "practice",
      "flashcards",
      "exam",
      "leaderboard",
    ].includes(section);
    if (isTool && !current.hints.includes(section)) {
      setVisibleHint(section);
      void action("hint", { hint: section }).catch((error: unknown) => {
        notify(
          error instanceof Error
            ? error.message
            : "Your first-visit tip could not be saved.",
        );
      });
    } else setVisibleHint(null);
  }, [ready, admin, section, action, notify]);
  async function dismissHint() {
    setVisibleHint(null);
    try {
      await action("hint", { hint: section });
    } catch (e) {
      notify(String(e));
    }
  }
  const hints: Record<string, string> = {
    lessons:
      "Start with a video lesson. Your watch position is saved so you can pick up where you left off.",
    practice:
      "Choose one debit and one credit account. Submit your entry to see feedback and an explanation.",
    flashcards:
      "Tap a card to flip it. “Review again” brings it back later; “I knew it” schedules your next review.",
    exam: "Your exam is timed. Each answer is final, so take a moment before moving on.",
    leaderboard:
      "A little friendly motivation. Join in through your account settings; only your display name is shared.",
  };
  const props = data
    ? { data, action, base: demo ? "/demo" : "/learn", demo, notify }
    : null;
  return (
    <div className="portal">
      <aside className={"sidebar" + (open ? " open" : "")}>
        <Brand />
        <div className="nav-label">
          {admin ? "ADMINISTRATION" : "YOUR LEARNING SPACE"}
        </div>
        <nav
          className="side-nav"
          aria-label={
            admin ? "Administrator navigation" : "Learning navigation"
          }
        >
          {items.map(([id, label, Icon]) => (
            <Link
              href={`${base}/${id}`}
              className={section === id ? "active" : ""}
              key={id}
              aria-current={section === id ? "page" : undefined}
            >
              <Icon size={18} />
              {label}
              {section === id && (
                <ChevronRight size={13} className="nav-arrow" />
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Sparkles size={20} />
            <h4>
              {admin ? "Make learning possible." : "Little steps. Big things."}
            </h4>
            <p>
              {admin
                ? "A clear lesson can be someone’s next turning point."
                : "You don’t have to be perfect. Just keep showing up."}
            </p>
            <Link
              href={admin ? "/learn/dashboard" : "/"}
              className="inline-link"
            >
              {admin ? "Preview learner portal" : "Back to home"}{" "}
              <ArrowUpRight size={10} />
            </Link>
          </div>
          <nav className="side-nav">
            <Link
              href={`${base}/settings`}
              className={section === "settings" ? "active" : ""}
            >
              <Settings size={18} />
              Account settings
            </Link>
          </nav>
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="portal-frame">
        <header className="portal-topbar">
          <button
            className="mobile-menu-button"
            aria-label="Open navigation"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            <span>{admin ? "Admin portal" : "My learning"}</span>
            <ChevronRight size={12} />
            <b>{title}</b>
          </div>
          <div className="topbar-right">
            <span className="xp-pill">
              <Zap size={14} />
              {data?.xp.reduce((n, e) => n + e.points, 0) || 0} XP
            </span>
            <Link
              href={`${base}/settings`}
              className="avatar"
              aria-label="Account settings"
              aria-busy={!data}
            >
              {data?.profile.display_name ? (
                data.profile.display_name.slice(0, 2).toUpperCase()
              ) : (
                <UserRound size={15} aria-hidden="true" />
              )}
            </Link>
          </div>
        </header>
        {demo && (
          <div className="preview-banner">
            <Sparkles size={12} />
            <span>
              Learning preview · Sample content, saved in this browser.
            </span>
            <Link href="/signup">
              Create your account{" "}
              <ArrowUpRight size={10} style={{ display: "inline" }} />
            </Link>
          </div>
        )}
        <main className="portal-content">
          {error && (
            <div className="form-error app-error" role="alert">
              {error}{" "}
              <button className="inline-link" onClick={() => void load()}>
                Try again
              </button>
            </div>
          )}
          {!ready && !error && (
            <div className="loading-state">
              <LoaderCircle size={24} className="spin" />
              Getting your learning space ready…
            </div>
          )}
          {data && props && (
            <>
              {data.announcements
                .filter((a) => a.active)
                .map((a) => (
                  <div className="announcement" key={a.id}>
                    <Megaphone size={16} />
                    <span>{a.message}</span>
                  </div>
                ))}
              {hints[section] && !admin && visibleHint === section && (
                <div className="hint">
                  <Sparkles size={16} />
                  <span>{hints[section]}</span>
                  <button
                    aria-label="Dismiss tip"
                    onClick={() => void dismissHint()}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <motion.div
                key={`${base}/${section}`}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
              >
                {admin ? (
                  <AdminContent {...props} section={section} />
                ) : section === "dashboard" ? (
                  <Dashboard {...props} />
                ) : section === "lessons" ? (
                  <Lessons {...props} />
                ) : section === "practice" ? (
                  <JournalPractice {...props} />
                ) : section === "flashcards" ? (
                  <Flashcards {...props} />
                ) : section === "exam" ? (
                  <MockExam {...props} />
                ) : section === "achievements" ? (
                  <Achievements {...props} />
                ) : section === "leaderboard" ? (
                  <Leaderboard {...props} />
                ) : (
                  <AccountSettings {...props} />
                )}
              </motion.div>
              {!data.profile.onboarding_done && !admin && (
                <WelcomeSetup {...props} />
              )}
            </>
          )}
        </main>
      </div>
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            role="status"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
          >
            <Check size={16} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
