import type { Bootstrap } from "./types";
const competencyNames = [
  "Journalizing transactions",
  "Posting to the ledger",
  "Preparing a trial balance",
  "Financial statements",
  "Reviewing internal controls",
];
export function demoData(): Bootstrap {
  const date = new Date().toISOString();
  return {
    profile: {
      id: "preview",
      full_name: "Alex Rivera",
      display_name: "Alex",
      role: "learner",
      exam_date: null,
      daily_goal: "steady",
      leaderboard_opt_in: false,
      theme: "light",
      onboarding_done: true,
      timezone: "Asia/Manila",
    },
    competencies: competencyNames.map((name, i) => ({
      id: "c" + i,
      name,
      description: [
        "Record transactions using the double-entry system.",
        "Transfer journal entries to the appropriate accounts.",
        "Check debit and credit balances for accuracy.",
        "Connect the statements that tell a business’s story.",
        "Understand checks that help protect financial records.",
      ][i],
      sort_order: i,
    })),
    lessons: [
      [
        "The accounting equation, made simple",
        "c0",
        840,
        [
          "Assets = Liabilities + Equity.",
          "Every transaction keeps the equation in balance.",
          "Owner investments increase equity.",
        ],
      ],
      [
        "Your first journal entry",
        "c0",
        1080,
        [
          "Identify the accounts affected.",
          "Determine which account is debited and credited.",
          "Check that total debits equal total credits.",
        ],
      ],
      [
        "From journal to general ledger",
        "c1",
        960,
        [
          "Post each entry to its individual account.",
          "Use dates and cross references.",
          "Calculate each account’s running balance.",
        ],
      ],
      [
        "Finding balance: the trial balance",
        "c2",
        780,
        [
          "List ending ledger balances.",
          "Debit and credit columns must total equally.",
          "Equal totals do not rule out every type of error.",
        ],
      ],
      [
        "The story behind the statements",
        "c3",
        1140,
        [
          "The income statement reports performance over a period.",
          "The statement of financial position reports at a date.",
          "Net income increases owner equity.",
        ],
      ],
      [
        "A closer look at internal controls",
        "c4",
        660,
        [
          "Separate authorization, custody, and recording duties.",
          "Reconcile records with independent evidence.",
          "Document approvals and review exceptions.",
        ],
      ],
    ].map(([title, competency_id, duration, summary], i) => ({
      id: "l" + i,
      title: title as string,
      competency_id: competency_id as string,
      duration: duration as number,
      summary: summary as string[],
      youtube_id: "",
      sort_order: i,
    })),
    questions: [
      {
        id: "q0",
        text: "Which equation describes the relationship among assets, liabilities, and equity?",
        options: [
          "Assets = Liabilities + Equity",
          "Assets = Liabilities − Equity",
          "Equity = Assets + Liabilities",
        ],
        correct_option: 0,
        competency_id: "c0",
        lesson_id: "l0",
        explanation:
          "The accounting equation shows that resources are financed by creditors and owners.",
      },
      {
        id: "q1",
        text: "An owner invests cash in the business. Which account is credited?",
        options: ["Cash", "Owner’s Capital", "Accounts Payable"],
        correct_option: 1,
        competency_id: "c0",
        lesson_id: "l1",
        explanation:
          "Debit Cash to increase assets; credit Owner’s Capital to increase equity.",
      },
      {
        id: "q2",
        text: "What is the process of transferring journal entries to individual accounts?",
        options: ["Closing", "Posting", "Auditing"],
        correct_option: 1,
        competency_id: "c1",
        lesson_id: "l2",
        explanation:
          "Posting transfers entries from the journal to the ledger.",
      },
      {
        id: "q3",
        text: "What does a trial balance primarily check?",
        options: [
          "Equality of debit and credit balances",
          "Profitability",
          "Cash available at the bank",
        ],
        correct_option: 0,
        competency_id: "c2",
        lesson_id: "l3",
        explanation:
          "The trial balance checks arithmetic equality; some errors can still exist.",
      },
      {
        id: "q4",
        text: "Which statement reports income and expenses for a period?",
        options: [
          "Statement of financial position",
          "Income statement",
          "Bank statement",
        ],
        correct_option: 1,
        competency_id: "c3",
        lesson_id: "l4",
        explanation:
          "An income statement measures financial performance over a period.",
      },
      {
        id: "q5",
        text: "Which practice is an example of internal control?",
        options: [
          "One person approving and recording all payments",
          "Skipping bank reconciliations",
          "Separating authorization from custody of cash",
        ],
        correct_option: 2,
        competency_id: "c4",
        lesson_id: "l5",
        explanation:
          "Segregating duties reduces opportunities for undetected errors and misuse.",
      },
      {
        id: "q6",
        text: "A cash purchase of equipment increases which asset account?",
        options: ["Equipment", "Sales", "Accounts Payable"],
        correct_option: 0,
        competency_id: "c0",
        lesson_id: null,
        explanation: "Equipment increases by debit; cash decreases by credit.",
      },
      {
        id: "q7",
        text: "A credit balance in Accounts Payable represents what?",
        options: [
          "An amount owed to suppliers",
          "An expense paid in cash",
          "An owner withdrawal",
        ],
        correct_option: 0,
        competency_id: "c1",
        lesson_id: null,
        explanation: "Accounts Payable is a liability.",
      },
      {
        id: "q8",
        text: "Which error may leave a trial balance in balance?",
        options: [
          "Posting only one side of an entry",
          "Omitting an entire transaction",
          "Adding a column incorrectly",
        ],
        correct_option: 1,
        competency_id: "c2",
        lesson_id: null,
        explanation:
          "Omitting both sides leaves total debits and credits equal.",
      },
      {
        id: "q9",
        text: "Which item appears in the statement of financial position?",
        options: [
          "Rent expense for the month",
          "Cash at the reporting date",
          "Monthly sales revenue",
        ],
        correct_option: 1,
        competency_id: "c3",
        lesson_id: null,
        explanation: "Cash is an asset reported at a specific date.",
      },
    ],
    journals: [
      {
        id: "j0",
        transaction_text:
          "The owner invested ₱50,000 cash to start the business.",
        competency_id: "c0",
        accounts: [
          "Cash",
          "Owner’s Capital",
          "Accounts Payable",
          "Equipment",
          "Rent Expense",
          "Service Revenue",
          "Accounts Receivable",
        ],
        debit_account: "Cash",
        credit_account: "Owner’s Capital",
        explanation:
          "Cash increases (debit). The owner’s investment increases equity (credit).",
      },
      {
        id: "j1",
        transaction_text:
          "The business paid ₱8,000 cash for monthly office rent.",
        competency_id: "c0",
        accounts: [
          "Cash",
          "Owner’s Capital",
          "Accounts Payable",
          "Equipment",
          "Rent Expense",
          "Service Revenue",
          "Accounts Receivable",
        ],
        debit_account: "Rent Expense",
        credit_account: "Cash",
        explanation:
          "Rent Expense increases (debit), while Cash decreases (credit).",
      },
      {
        id: "j2",
        transaction_text:
          "The business provided ₱12,000 of services to a client on account.",
        competency_id: "c0",
        accounts: [
          "Cash",
          "Owner’s Capital",
          "Accounts Payable",
          "Equipment",
          "Rent Expense",
          "Service Revenue",
          "Accounts Receivable",
        ],
        debit_account: "Accounts Receivable",
        credit_account: "Service Revenue",
        explanation:
          "The customer owes the business (debit Accounts Receivable). Earned revenue increases (credit Service Revenue).",
      },
    ],
    flashcards: [
      [
        "What is an asset?",
        "A resource controlled by a business that is expected to provide future economic benefits.",
        "c0",
      ],
      [
        "What is a debit?",
        "An entry on the left side of an account. It increases assets and expenses.",
        "c0",
      ],
      [
        "What is a general ledger?",
        "The collection of individual accounts where journal entries are posted.",
        "c1",
      ],
      [
        "What is a trial balance?",
        "A list of ledger balances used to check whether total debits equal total credits.",
        "c2",
      ],
      [
        "What is net income?",
        "The excess of revenue over expenses for an accounting period.",
        "c3",
      ],
      [
        "What is segregation of duties?",
        "Dividing responsibilities so that one person does not control every stage of a transaction.",
        "c4",
      ],
    ].map(([front, back, competency_id], i) => ({
      id: "f" + i,
      front,
      back,
      competency_id,
    })),
    announcements: [
      {
        id: "a0",
        message:
          "A little progress goes a long way. Choose one learning activity to make today count.",
        active: true,
        date,
      },
    ],
    progress: [],
    attempts: [],
    xp: [],
    activity: [],
    results: [],
    flashProgress: [],
    badges: [],
    hints: [],
    journalDone: [],
    settings: {
      question_count: 10,
      time_limit_minutes: 15,
      pass_mark_percent: 70,
      exam_xp: 50,
      flashcard_xp: 10,
    },
    leaderboard: [],
  };
}
export const badgeDefinitions = [
  ["first_lesson", "First Lesson", "Complete your first video lesson."],
  ["streak_5", "5-Day Streak", "Study for 5 consecutive days."],
  ["streak_7", "7-Day Streak", "Study for 7 consecutive days."],
  [
    "journal_starter",
    "Journalizing Starter",
    "Correctly complete your first journal entry.",
  ],
  [
    "ledger_master",
    "Ledger Master",
    "Answer 5 distinct ledger questions correctly.",
  ],
  [
    "flashcard_finisher",
    "Flashcard Finisher",
    "Complete a session with at least 5 flashcards.",
  ],
  [
    "mock_passed",
    "Mock Exam Passed",
    "Reach the configured mock exam pass mark.",
  ],
  [
    "all_lessons",
    "Completed All Lessons",
    "Complete every available video lesson.",
  ],
];
