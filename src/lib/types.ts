export type Competency = {
  id: string;
  name: string;
  description: string;
  sort_order: number;
};
export type Lesson = {
  id: string;
  title: string;
  youtube_id: string;
  competency_id: string;
  sort_order: number;
  duration: number;
  summary: string[];
};
export type Question = {
  id: string;
  text: string;
  options: string[];
  competency_id: string;
  lesson_id: string | null;
  correct_option?: number;
  explanation?: string;
};
export type Journal = {
  id: string;
  transaction_text: string;
  competency_id: string;
  accounts: string[];
  explanation?: string;
  debit_account?: string;
  credit_account?: string;
};
export type Flashcard = {
  id: string;
  front: string;
  back: string;
  competency_id: string;
};
export type Profile = {
  id: string;
  full_name: string;
  display_name: string;
  role: "learner" | "admin";
  exam_date: string | null;
  daily_goal: "light" | "steady" | "intense";
  leaderboard_opt_in: boolean;
  theme: "light" | "dark" | "system";
  onboarding_done: boolean;
  timezone: string;
};
export type XPEvent = {
  action: string;
  points: number;
  date: string;
  event_key: string;
};
export type Attempt = { competency_id: string; correct: boolean; date: string };
export type ExamResult = {
  id: string;
  score: number;
  correct_count: number;
  total: number;
  passed: boolean;
  score_by_competency: Record<string, { correct: number; total: number }>;
  date: string;
};
export type Progress = {
  lesson_id: string;
  last_position: number;
  completed: boolean;
};
export type FlashProgress = {
  card_id: string;
  next_review: string;
  interval: number;
};
export type Bootstrap = {
  profile: Profile;
  competencies: Competency[];
  lessons: Lesson[];
  questions: Question[];
  journals: Journal[];
  flashcards: Flashcard[];
  announcements: {
    id: string;
    message: string;
    active: boolean;
    date: string;
  }[];
  progress: Progress[];
  attempts: Attempt[];
  xp: XPEvent[];
  activity: { action: string; local_day: string }[];
  results: ExamResult[];
  flashProgress: FlashProgress[];
  badges: string[];
  hints: string[];
  journalDone: string[];
  settings: {
    question_count: number;
    time_limit_minutes: number;
    pass_mark_percent: number;
    exam_xp: number;
    flashcard_xp: number;
  };
  leaderboard: { display_name: string; points: number; is_me: boolean }[];
  analytics?: {
    learners: number;
    active: number;
    average: number;
    abandoned: { title: string; count: number }[];
    missed: { text: string; count: number }[];
  };
};
export type Section =
  | "dashboard"
  | "lessons"
  | "practice"
  | "flashcards"
  | "exam"
  | "achievements"
  | "leaderboard"
  | "settings";
