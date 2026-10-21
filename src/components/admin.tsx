"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Users,
  TrendingUp,
  Target,
  BookOpen,
  ArrowUpRight,
  LoaderCircle,
  FileQuestion,
  Check,
  Info,
  Download,
} from "lucide-react";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { AccountSettings } from "./learning-tools";
import { Empty, PageHeading, Stat } from "./learner";
import type { ToolProps } from "./portal";
import { validateQuestionCSV, youtubeId, type ImportRow } from "@/lib/csv";
type ContentItem = { id: string; [key: string]: unknown };
const definitions: Record<
  string,
  { kind: string; title: string; copy: string; label: string }
> = {
  lessons: {
    kind: "lessons",
    title: "A little clarity goes a long way.",
    copy: "Create video lessons that help each concept click.",
    label: "lesson",
  },
  questions: {
    kind: "questions",
    title: "Questions that build understanding.",
    copy: "Manage your question bank and lesson quick checks.",
    label: "question",
  },
  journal: {
    kind: "journal_items",
    title: "Make room for hands-on learning.",
    copy: "Create transactions that put bookkeeping concepts into practice.",
    label: "transaction",
  },
  flashcards: {
    kind: "flashcards",
    title: "A little reminder, right on time.",
    copy: "Build a deck of clear concepts and useful explanations.",
    label: "flashcard",
  },
  announcements: {
    kind: "announcements",
    title: "Keep everyone in the loop.",
    copy: "Share a helpful note with your learning community.",
    label: "announcement",
  },
  competencies: {
    kind: "competencies",
    title: "A clear path for every learner.",
    copy: "Edit the five competency categories used throughout the platform.",
    label: "competency",
  },
};
export function AdminContent({
  section,
  ...props
}: ToolProps & { section: string }) {
  const { data: d, action, notify } = props;
  const [editing, setEditing] = useState<ContentItem | null>(null),
    [adding, setAdding] = useState(false),
    [removing, setRemoving] = useState<ContentItem | null>(null),
    [busy, setBusy] = useState(false),
    [importing, setImporting] = useState(false),
    [error, setError] = useState("");
  if (section === "settings") return <AccountSettings {...props} />;
  if (section === "overview") {
    const a = d.analytics;
    return (
      <>
        <PageHeading
          title={`A little guidance makes a difference.`}
          copy="A clear view of your learners and the learning experience."
        >
          <Button asChild size="sm">
            <Link href="/admin/lessons">
              Manage lessons
              <ArrowUpRight size={14} />
            </Link>
          </Button>
        </PageHeading>
        <div className="stats-grid">
          <Stat
            icon={Users}
            value={a?.learners ?? 0}
            label="Registered learners"
          />
          <Stat
            icon={TrendingUp}
            value={a?.active ?? 0}
            label="Active this week"
          />
          <Stat
            icon={Target}
            value={`${a?.average ?? 0}%`}
            label="Average mock exam score"
          />
          <Stat
            icon={BookOpen}
            value={d.lessons.length}
            label="Published lessons"
          />
        </div>
        <div className="two-column">
          <section className="panel">
            <div className="panel-title">
              <h2>Lessons still in progress</h2>
            </div>
            {a?.abandoned.length ? (
              <div className="analytics-list">
                {a.abandoned.map((v, i) => (
                  <div key={i}>
                    {v.title}
                    <span>{v.count} unfinished</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-small">No unfinished lesson records yet.</p>
            )}
          </section>
          <section className="panel">
            <div className="panel-title">
              <h2>Questions worth another look</h2>
            </div>
            {a?.missed.length ? (
              <div className="analytics-list">
                {a.missed.map((v, i) => (
                  <div key={i}>
                    {v.text}
                    <span>{v.count} missed</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-small">
                Missed questions will appear as learners practice.
              </p>
            )}
          </section>
        </div>
        <section className="panel spaced">
          <div className="panel-title">
            <h2>A good place to start</h2>
          </div>
          <div className="feature-grid">
            {[
              [
                "lessons",
                "Add a video lesson",
                `${d.lessons.length} available`,
              ],
              [
                "questions",
                "Build your question bank",
                `${d.questions.length} questions`,
              ],
              [
                "journal",
                "Add a practice transaction",
                `${d.journals.length} exercises`,
              ],
              [
                "flashcards",
                "Create a review deck",
                `${d.flashcards.length} cards`,
              ],
            ].map(([to, title, copy]) => (
              <Link className="feature-card" href={`/admin/${to}`} key={to}>
                <span className="feature-icon">
                  <Plus size={19} />
                </span>
                <h3 style={{ marginTop: 20, fontSize: 15 }}>{title}</h3>
                <p style={{ minHeight: 0, marginBottom: 0 }}>{copy}</p>
              </Link>
            ))}
          </div>
        </section>
      </>
    );
  }
  if (section === "exam-settings") return <ExamSettings {...props} />;
  const def = definitions[section];
  if (!def) return null;
  const raw =
    section === "lessons"
      ? d.lessons
      : section === "questions"
        ? d.questions
        : section === "journal"
          ? d.journals
          : section === "flashcards"
            ? d.flashcards
            : section === "announcements"
              ? d.announcements
              : d.competencies;
  const rows = raw as unknown as ContentItem[];
  return (
    <>
      <PageHeading title={def.title} copy={def.copy}>
        <div style={{ display: "flex", gap: 9 }}>
          {section === "questions" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setImporting(true)}
            >
              <Upload size={14} />
              Import CSV
            </Button>
          )}
          {section !== "competencies" && (
            <Button
              size="sm"
              onClick={() => {
                setError("");
                setAdding(true);
              }}
            >
              <Plus size={15} />
              Add {def.label}
            </Button>
          )}
        </div>
      </PageHeading>
      {section === "questions" && (
        <div className="hint">
          <Info size={16} />
          <span>
            Assign a question to a lesson for its quick check. All valid
            questions are eligible for the mock exam. Answer keys stay private.
          </span>
        </div>
      )}
      {rows.length ? (
        <div className="admin-list">
          {rows.map((item) => (
            <article className="admin-row" key={item.id}>
              <div>
                <h3>
                  {String(
                    item.title ||
                      item.text ||
                      item.transaction_text ||
                      item.front ||
                      item.message ||
                      item.name,
                  )}
                </h3>
                <p>
                  {item.competency_id
                    ? d.competencies.find((c) => c.id === item.competency_id)
                        ?.name
                    : section === "announcements"
                      ? item.active
                        ? "Published"
                        : "Inactive"
                      : String(item.description || "")}
                  {item.lesson_id
                    ? ` · Quick check: ${d.lessons.find((l) => l.id === item.lesson_id)?.title}`
                    : ""}
                  {section === "lessons"
                    ? ` · ${item.duration} seconds · Order ${item.sort_order}`
                    : ""}
                </p>
              </div>
              <div className="admin-row-actions">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Edit ${def.label}`}
                  onClick={() => {
                    setError("");
                    setEditing(item);
                  }}
                >
                  <Pencil size={16} />
                </Button>
                {section !== "competencies" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${def.label}`}
                    onClick={() => setRemoving(item)}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          icon={section === "questions" ? FileQuestion : BookOpen}
          title={`Your first ${def.label} starts here.`}
          copy={`Use “Add ${def.label}” to publish your own learning content. No sample content is added to live accounts.`}
        />
      )}
      {(adding || editing) && (
        <Dialog
          title={`${editing ? "Edit" : "Add"} ${def.label}`}
          onClose={() => {
            if (!busy) {
              setEditing(null);
              setAdding(false);
            }
          }}
        >
          <h2>{editing ? "A little refinement." : `A new ${def.label}.`}</h2>
          <p>Make it clear, helpful, and ready to learn from.</p>
          <ContentForm
            key={editing?.id || "new"}
            {...props}
            kind={def.kind}
            item={editing}
            busy={busy}
            error={error}
            onCancel={() => {
              setAdding(false);
              setEditing(null);
            }}
            onSave={async (values) => {
              setBusy(true);
              setError("");
              try {
                await action("admin_save", {
                  kind: def.kind,
                  id: editing?.id,
                  data: values,
                });
                setEditing(null);
                setAdding(false);
                notify(
                  `${def.label[0].toUpperCase() + def.label.slice(1)} saved.`,
                );
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not save content.",
                );
              } finally {
                setBusy(false);
              }
            }}
          />
        </Dialog>
      )}
      {removing && (
        <Dialog
          title={`Delete ${def.label}`}
          onClose={() => !busy && setRemoving(null)}
        >
          <h2>Remove this {def.label}?</h2>
          <p>
            This removes it from the learning platform. Related progress records
            may be removed. Historical scores remain saved.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-footer">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setRemoving(null)}
            >
              Keep it
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await action("admin_delete", {
                    kind: def.kind,
                    id: removing.id,
                  });
                  setRemoving(null);
                  notify("Content removed.");
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Could not remove.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy && <LoaderCircle size={14} className="spin" />}Remove{" "}
              {def.label}
            </Button>
          </div>
        </Dialog>
      )}
      {importing && (
        <CSVImport {...props} onClose={() => setImporting(false)} />
      )}
    </>
  );
}

function ContentForm({
  data: d,
  kind,
  item,
  busy,
  error,
  onSave,
  onCancel,
}: {
  data: ToolProps["data"];
  kind: string;
  item: ContentItem | null;
  busy: boolean;
  error: string;
  onSave: (values: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [options, setOptions] = useState(
    ((item?.options || item?.accounts) as string[] | undefined)?.join("\n") ||
      (kind === "journal_items"
        ? "Cash\nOwner’s Capital\nAccounts Payable\nEquipment\nRent Expense\nService Revenue"
        : ""),
  );
  const [localError, setLocalError] = useState("");
  const lines = options
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
  const val = (key: string, fallback = "") => String(item?.[key] ?? fallback);
  const isQuestion = kind === "questions",
    isJournal = kind === "journal_items";
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setLocalError("");
        try {
          const f = Object.fromEntries(new FormData(e.currentTarget));
          let result: Record<string, unknown> = { ...f };
          if (kind === "lessons") {
            const summary = String(f.summary)
              .split("\n")
              .map((v) => v.trim())
              .filter(Boolean);
            if (summary.length < 3 || summary.length > 5)
              throw new Error("Add 3–5 summary points, one per line.");
            result = {
              ...f,
              youtube_id: youtubeId(String(f.youtube_id)),
              summary,
              duration: Number(f.duration),
              sort_order: Number(f.sort_order),
            };
          }
          if (isQuestion) {
            if (
              lines.length < 2 ||
              lines.length > 6 ||
              new Set(lines).size !== lines.length
            )
              throw new Error("Add 2–6 distinct answer options.");
            result = {
              ...f,
              options: lines,
              correct_option: Number(f.correct_option),
              lesson_id: f.lesson_id || null,
            };
          }
          if (isJournal) {
            if (lines.length < 2 || new Set(lines).size !== lines.length)
              throw new Error("Add at least two distinct account names.");
            if (f.debit_account === f.credit_account)
              throw new Error("Debit and credit accounts must differ.");
            result = { ...f, accounts: lines };
          }
          if (kind === "competencies")
            result = { ...f, sort_order: Number(f.sort_order) };
          if (kind === "announcements")
            result = { ...f, active: f.active === "on" };
          await onSave(result);
        } catch (e) {
          setLocalError(e instanceof Error ? e.message : "Check your form.");
        }
      }}
    >
      {kind === "lessons" && (
        <>
          <label className="field">
            Lesson title
            <input
              name="title"
              required
              maxLength={200}
              defaultValue={val("title")}
            />
          </label>
          <label className="field">
            YouTube link or video ID
            <input
              name="youtube_id"
              required
              defaultValue={val("youtube_id")}
              placeholder="https://www.youtube.com/watch?v=…"
            />
            <small>Use an unlisted video that allows embedding.</small>
          </label>
          <div className="field-row">
            <label className="field">
              Duration (seconds)
              <input
                name="duration"
                type="number"
                required
                min={1}
                max={86400}
                defaultValue={val("duration", "600")}
              />
            </label>
            <label className="field">
              Lesson order
              <input
                name="sort_order"
                type="number"
                required
                min={0}
                defaultValue={val("sort_order", String(d.lessons.length))}
              />
            </label>
          </div>
          <label className="field">
            Key takeaways · one per line
            <textarea
              name="summary"
              required
              rows={5}
              defaultValue={((item?.summary as string[]) || []).join("\n")}
            />
            <small>Add 3–5 concise points.</small>
          </label>
        </>
      )}
      {isQuestion && (
        <>
          <label className="field">
            Question
            <textarea
              name="text"
              required
              maxLength={2000}
              defaultValue={val("text")}
            />
          </label>
          <label className="field">
            Answer options · one per line
            <textarea
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              required
              rows={4}
            />
            <small>2–6 distinct options.</small>
          </label>
          <label className="field">
            Correct answer
            <select
              name="correct_option"
              defaultValue={val("correct_option", "0")}
              required
            >
              {lines.map((text, i) => (
                <option key={i} value={i}>
                  {String.fromCharCode(65 + i)} · {text}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Quick-check lesson (optional)
            <select name="lesson_id" defaultValue={val("lesson_id")}>
              <option value="">Question bank only</option>
              {d.lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
            <small>
              Lesson questions appear in quick checks and may also appear in
              exams.
            </small>
          </label>
        </>
      )}
      {isJournal && (
        <>
          <label className="field">
            Transaction
            <textarea
              name="transaction_text"
              required
              maxLength={2000}
              defaultValue={val("transaction_text")}
            />
          </label>
          <label className="field">
            Available accounts · one per line
            <textarea
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              rows={5}
              required
            />
          </label>
          <div className="field-row">
            <label className="field">
              Correct debit
              <select
                name="debit_account"
                defaultValue={val("debit_account")}
                required
              >
                <option value="">Choose account</option>
                {lines.map((s, i) => (
                  <option key={i}>{s}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Correct credit
              <select
                name="credit_account"
                defaultValue={val("credit_account")}
                required
              >
                <option value="">Choose account</option>
                {lines.map((s, i) => (
                  <option key={i}>{s}</option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}
      {(isQuestion || isJournal) && (
        <label className="field">
          Answer explanation
          <textarea name="explanation" defaultValue={val("explanation")} />
        </label>
      )}
      {kind === "flashcards" && (
        <>
          <label className="field">
            Front · the question
            <textarea
              name="front"
              required
              maxLength={1000}
              defaultValue={val("front")}
            />
          </label>
          <label className="field">
            Back · the explanation
            <textarea
              name="back"
              required
              maxLength={2000}
              defaultValue={val("back")}
            />
          </label>
        </>
      )}
      {kind === "announcements" && (
        <>
          <label className="field">
            Announcement
            <textarea
              name="message"
              required
              maxLength={1000}
              rows={5}
              defaultValue={val("message")}
            />
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              name="active"
              defaultChecked={item ? Boolean(item.active) : true}
            />
            <span>Publish to learner pages</span>
          </label>
        </>
      )}
      {kind === "competencies" && (
        <>
          <label className="field">
            Competency name
            <input
              name="name"
              required
              maxLength={120}
              defaultValue={val("name")}
            />
          </label>
          <label className="field">
            Description
            <textarea name="description" defaultValue={val("description")} />
          </label>
          <label className="field">
            Display order
            <input
              name="sort_order"
              type="number"
              min={0}
              required
              defaultValue={val("sort_order", "0")}
            />
          </label>
        </>
      )}
      {!["announcements", "competencies"].includes(kind) && (
        <label className="field">
          Competency
          <select
            name="competency_id"
            required
            defaultValue={val("competency_id", d.competencies[0]?.id || "")}
          >
            {d.competencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {(localError || error) && (
        <p className="form-error" role="alert">
          {localError || error}
        </p>
      )}
      <div className="modal-footer">
        <Button
          variant="outline"
          type="button"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <LoaderCircle size={14} className="spin" />}Save content
          <Check size={14} />
        </Button>
      </div>
    </form>
  );
}

function ExamSettings({ data: d, action, notify }: ToolProps) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <PageHeading
        title="A well-balanced assessment."
        copy="Set the rules for new exam attempts. Active attempts keep their original settings."
      />
      <form
        className="panel form-stack"
        style={{ maxWidth: 720 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const f = new FormData(e.currentTarget);
          try {
            await action("admin_settings", {
              settings: Object.fromEntries(
                [...f].map(([k, v]) => [k, Number(v)]),
              ),
            });
            notify("Exam settings saved. New attempts will use these values.");
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Could not save exam settings.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="field-row">
          <label className="field">
            Question count
            <input
              name="question_count"
              type="number"
              required
              min={1}
              max={200}
              defaultValue={d.settings.question_count}
            />
            <small>{d.questions.length} questions available in the bank.</small>
          </label>
          <label className="field">
            Time limit (minutes)
            <input
              name="time_limit_minutes"
              type="number"
              required
              min={1}
              max={240}
              defaultValue={d.settings.time_limit_minutes}
            />
          </label>
        </div>
        <label className="field">
          Passing percentage
          <input
            name="pass_mark_percent"
            type="number"
            required
            min={1}
            max={100}
            defaultValue={d.settings.pass_mark_percent}
          />
        </label>
        <div className="field-row">
          <label className="field">
            Completed exam XP
            <input
              name="exam_xp"
              type="number"
              required
              min={0}
              max={500}
              defaultValue={d.settings.exam_xp}
            />
          </label>
          <label className="field">
            Flashcard session XP
            <input
              name="flashcard_xp"
              type="number"
              required
              min={0}
              max={500}
              defaultValue={d.settings.flashcard_xp}
            />
          </label>
        </div>
        <p className="text-small">
          Exam and flashcard XP can be earned once per learner-local day.
          Flashcard sessions need at least five distinct cards.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div>
          <Button type="submit" disabled={busy}>
            {busy && <LoaderCircle size={14} className="spin" />}Save exam
            settings
            <Check size={14} />
          </Button>
        </div>
      </form>
    </>
  );
}

function CSVImport({
  data: d,
  action,
  notify,
  onClose,
}: ToolProps & { onClose: () => void }) {
  const [rows, setRows] = useState<ImportRow[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Dialog title="Import question bank CSV" onClose={() => !busy && onClose()}>
      <h2>A whole set of possibilities.</h2>
      <p>
        Import up to 500 questions. The entire import is validated before
        anything is saved.
      </p>
      <div className="form-stack">
        <label className="field">
          Question bank CSV
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={busy}
            onChange={async (e) => {
              setError("");
              setRows([]);
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 2_000_000) {
                setError("Choose a CSV smaller than 2 MB.");
                return;
              }
              try {
                setRows(validateQuestionCSV(await file.text(), d.competencies));
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not read CSV.",
                );
              }
            }}
          />
          <small>
            Columns: question, option A, option B, option C, correct answer,
            competency. Use A/B/C for the correct answer and an exact competency
            name or ID.
          </small>
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {rows.length > 0 && (
          <>
            <p className="text-small">
              {rows.length} rows · {rows.filter((r) => r.errors.length).length}{" "}
              with errors
            </p>
            <div className="csv-preview">
              <table>
                <thead>
                  <tr>
                    <th>Line</th>
                    <th>Question</th>
                    <th>Validation</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.line}
                      className={r.errors.length ? "invalid" : ""}
                    >
                      <td>{r.line}</td>
                      <td>{r.text}</td>
                      <td>{r.errors.join("; ") || "Ready"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <div className="modal-footer">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy || !rows.length || rows.some((r) => r.errors.length)}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await action("admin_import", { rows: rows.map((r) => r.data) });
                notify(`${rows.length} questions imported.`);
                onClose();
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Import could not be saved.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <LoaderCircle size={14} className="spin" />}Import
            questions
            <Upload size={14} />
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
