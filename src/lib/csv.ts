import type { Competency } from "./types";
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') {
      if (quoted && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (quoted || cell === "") quoted = !quoted;
      else
        throw new Error("A quotation mark appears inside an unquoted field.");
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && source[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("A quoted CSV field was not closed.");
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
export type ImportRow = {
  line: number;
  text: string;
  errors: string[];
  data: {
    text: string;
    options: string[];
    correct_option: number;
    competency_id: string;
    lesson_id: null;
  };
};
export function validateQuestionCSV(
  text: string,
  competencies: Competency[],
): ImportRow[] {
  const rows = parseCSV(text);
  if (rows.length < 2)
    throw new Error("Include a header row and at least one question.");
  const expected = [
    "question",
    "option a",
    "option b",
    "option c",
    "correct answer",
    "competency",
  ];
  const header = rows[0].map((v) => v.trim().toLowerCase());
  if (header.length !== 6 || expected.some((v, i) => header[i] !== v))
    throw new Error(
      "Use these columns in order: question, option A, option B, option C, correct answer, competency",
    );
  if (rows.length > 501)
    throw new Error("Import up to 500 questions at a time.");
  return rows.slice(1).map((cells, i) => {
    const [question, a, b, c, answer, competency] = cells.map((v) => v.trim());
    const comp = competencies.find(
      (v) =>
        v.id === competency ||
        v.name.toLowerCase() === (competency || "").toLowerCase(),
    );
    const correct = ["A", "B", "C"].indexOf((answer || "").toUpperCase());
    const errors: string[] = [];
    if (cells.length !== 6) errors.push("Expected 6 columns");
    if (!question || question.length > 2000)
      errors.push("Question needs 1–2,000 characters");
    if (!a || !b || !c) errors.push("All three options are required");
    if (new Set([a, b, c]).size !== 3) errors.push("Options must be distinct");
    if (correct < 0) errors.push("Correct answer must be A, B, or C");
    if (!comp) errors.push("Unknown competency");
    return {
      line: i + 2,
      text: question || "",
      errors,
      data: {
        text: question || "",
        options: [a || "", b || "", c || ""],
        correct_option: correct,
        competency_id: comp?.id || "",
        lesson_id: null,
      },
    };
  });
}
export function youtubeId(value: string): string {
  if (/^[\w-]{11}$/.test(value)) return value;
  try {
    const u = new URL(value);
    if (
      ![
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtu.be",
        "www.youtube-nocookie.com",
      ].includes(u.hostname)
    )
      throw new Error();
    const id =
      u.hostname === "youtu.be"
        ? u.pathname.slice(1)
        : u.searchParams.get("v") || u.pathname.split("/").pop() || "";
    if (/^[\w-]{11}$/.test(id)) return id;
  } catch {}
  throw new Error("Enter a valid YouTube video URL or 11-character video ID.");
}
