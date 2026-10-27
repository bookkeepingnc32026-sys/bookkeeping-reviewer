"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import { Brand } from "./brand";
import { Button } from "./ui/button";
export type AuthMode =
  | "login"
  | "signup"
  | "forgot-password"
  | "reset-password"
  | "resend-confirmation";
export function AuthForm({
  mode,
  configured,
  initialError = "",
  initialNotice = "",
}: {
  mode: AuthMode;
  configured: boolean;
  initialError?: string;
  initialNotice?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [success, setSuccess] = useState(initialNotice);
  const signup = mode === "signup",
    forgot = mode === "forgot-password",
    reset = mode === "reset-password",
    resend = mode === "resend-confirmation";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, ...Object.fromEntries(form) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.redirect) window.location.assign(data.redirect);
      else setSuccess(data.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Brand />
        <div>
          <div className="eyebrow">A LITTLE PROGRESS, EVERY DAY</div>
          <h1>
            Your next
            <br />
            chapter starts
            <br />
            with you<span className="brand-dot">.</span>
          </h1>
          <p>
            Make room for learning. Build your confidence. Find your way
            forward.
          </p>
        </div>
        <small>Independent learning tool. Not affiliated with TESDA.</small>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <Link className="back-link" href="/">
            <ArrowLeft size={14} /> Back to home
          </Link>
          <h2>
            {signup
              ? "A fresh start."
              : resend
                ? "Let's confirm your email."
                : forgot
                  ? "Let’s get you back in."
                  : reset
                    ? "Make a fresh start."
                    : "Good to see you again."}
          </h2>
          <p>
            {signup
              ? "Your bookkeeping journey starts with one small step."
              : resend
                ? "Request a fresh link if your confirmation email expired or opened the wrong website."
                : forgot
                  ? "We’ll send you a link to reset your password."
                  : reset
                    ? "Choose a strong password for your account."
                    : "Pick up where you left off. Your next step is waiting."}
          </p>
          {!configured && (
            <div className="setup-notice">
              Account access is waiting for Supabase configuration. You can
              still explore the learning preview below.
            </div>
          )}
          <form className="form-stack" onSubmit={submit}>
            {signup && (
              <label className="field">
                Full name
                <input
                  name="full_name"
                  autoComplete="name"
                  required
                  maxLength={80}
                  placeholder="Your name"
                />
              </label>
            )}
            {!reset && (
              <label className="field">
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                />
              </label>
            )}
            {!forgot && !resend && (
              <label className="field">
                {reset ? "New password" : "Password"}
                <input
                  name="password"
                  type="password"
                  autoComplete={
                    signup || reset ? "new-password" : "current-password"
                  }
                  minLength={8}
                  maxLength={128}
                  required
                  placeholder="At least 8 characters"
                />
              </label>
            )}
            {mode === "login" && (
              <Link href="/forgot-password" className="password-link">
                Forgot your password?
              </Link>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            {success && (
              <p role="status" className="form-success">
                {success}
              </p>
            )}
            <Button type="submit" disabled={busy || !configured}>
              {busy ? <LoaderCircle size={16} className="spin" /> : null}
              {signup
                ? "Create your account"
                : resend
                  ? "Send confirmation link"
                  : forgot
                    ? "Send reset link"
                    : reset
                      ? "Update password"
                      : "Log in"}
              {!busy && <ArrowRight size={16} />}
            </Button>
          </form>
          {signup ? (
            <p className="auth-switch">
              Already have an account? <Link href="/login">Log in</Link>
            </p>
          ) : (
            <p className="auth-switch">
              {forgot || reset || resend ? (
                <Link href="/login">Back to log in</Link>
              ) : (
                <>
                  New here? <Link href="/signup">Start your journey</Link>
                </>
              )}
            </p>
          )}
          {(mode === "login" || (signup && success)) && (
            <p className="auth-switch">
              <Link className="inline-link" href="/resend-confirmation">
                Resend confirmation email
              </Link>
            </p>
          )}
          <Link className="auth-preview" href="/demo/dashboard">
            Just looking? Explore the learning preview →
          </Link>
        </div>
      </main>
    </div>
  );
}
