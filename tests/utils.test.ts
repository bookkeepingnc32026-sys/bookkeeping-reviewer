import test from "node:test";
import assert from "node:assert/strict";
import {
  localDate,
  streak,
  dayDistance,
  level,
  safeNext,
  shuffle,
} from "../src/lib/utils";
import { parseCSV, validateQuestionCSV, youtubeId } from "../src/lib/csv";
import { allRows } from "../src/lib/pagination";
test("learner history is not truncated at the Supabase page limit", async () => {
  const records = Array.from({ length: 2005 }, (_, id) => ({ id }));
  const result = await allRows({
    range: async (from, to) => ({
      data: records.slice(from, to + 1),
      error: null,
    }),
  });
  assert.equal(result.data.length, 2005);
  assert.equal(result.data.at(-1)?.id, 2004);
  await assert.rejects(
    allRows({
      range: async () => ({
        data: null,
        error: new Error("Database unavailable"),
      }),
    }),
    /Database unavailable/,
  );
});
test("study days honor learner-local midnight and streak grace", () => {
  assert.equal(localDate("2026-10-18T16:30:00Z", "Asia/Manila"), "2026-10-19");
  assert.equal(
    streak(["2026-10-18", "2026-10-18", "2026-10-17"], "2026-10-19"),
    2,
  );
  assert.equal(streak(["2026-10-17"], "2026-10-19"), 0);
  assert.equal(streak(["2026-10-19", "2026-10-17"], "2026-10-19"), 1);
  assert.equal(dayDistance("2026-10-19", "2026-10-25"), 6);
});
test("levels and redirects handle boundaries safely", () => {
  assert.deepEqual(level(250), { current: 2, progress: 0, remaining: 250 });
  for (const path of ["https://evil.test", "//evil.test", "/\\evil.test"])
    assert.equal(safeNext(path), "/learn/dashboard");
  assert.equal(safeNext("/reset-password"), "/reset-password");
  assert.deepEqual(shuffle([1, 2, 3]).sort(), [1, 2, 3]);
});
test("CSV supports quoting, line breaks, BOM and rejects malformed imports", () => {
  assert.deepEqual(
    parseCSV('\uFEFFa,b\r\n"a, b","quote ""test"""\r\n"two\nlines",c'),
    [
      ["a", "b"],
      ["a, b", 'quote "test"'],
      ["two\nlines", "c"],
    ],
  );
  assert.throws(() => parseCSV('"unclosed'));
  const comps = [{ id: "c1", name: "Ledger", description: "", sort_order: 1 }];
  const header =
    "question,option A,option B,option C,correct answer,competency\n";
  assert.equal(
    validateQuestionCSV(header + "A question?,one,two,three,B,Ledger", comps)[0]
      .errors.length,
    0,
  );
  assert.ok(
    validateQuestionCSV(header + "Bad?,same,same,,D,Unknown", comps)[0].errors
      .length >= 4,
  );
  assert.throws(() => validateQuestionCSV("wrong,header\na,b", comps));
});
test("YouTube extraction accepts known hosts and rejects unrelated URLs", () => {
  assert.equal(youtubeId("https://youtu.be/abcdefghijk?t=5"), "abcdefghijk");
  assert.equal(
    youtubeId("https://www.youtube.com/watch?v=abcdefghijk"),
    "abcdefghijk",
  );
  assert.throws(() => youtubeId("https://evil.test/watch?v=abcdefghijk"));
});
