import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("migration, scoring, authorization and assessment workflows", async (t) => {
  const db = new PGlite();
  const admin = "00000000-0000-4000-8000-000000000001",
    learner = "00000000-0000-4000-8000-000000000002",
    other = "00000000-0000-4000-8000-000000000003";
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}'::jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
    );
    await db.exec(
      await readFile("supabase/migrations/202610190001_platform.sql", "utf8"),
    );
    await db.exec(
      await readFile(
        "supabase/migrations/202610190002_content_guards.sql",
        "utf8",
      ),
    );
    await db.query(
      `insert into auth.users(id,raw_user_meta_data) values($1,'{"full_name":"Admin"}'),($2,'{"full_name":"Al","role":"admin"}'),($3,'{"full_name":"Other Learner"}')`,
      [admin, learner, other],
    );
    await db.query(`update public.profiles set role='admin' where id=$1`, [
      admin,
    ]);
    const login = async (id: string) => {
      await db.exec("reset role");
      await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [
        id,
      ]);
      await db.exec("set role authenticated");
    };
    const scalar = async <T = unknown>(sql: string, args: unknown[] = []) =>
      Object.values((await db.query<Record<string, T>>(sql, args)).rows[0])[0];
    const rpc = async <T = unknown>(name: string, args: unknown[] = []) =>
      scalar<T>(
        `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")})`,
        args,
      );
    const categories = (
      await db.query<{ id: string }>(
        "select id from public.competencies order by sort_order",
      )
    ).rows.map((v) => v.id);
    let lesson = "",
      journal = "";
    const qs: string[] = [];
    const cards: string[] = [];
    await t.test(
      "new users cannot provision their own administrator role",
      async () => {
        await login(learner);
        assert.equal(
          await scalar("select role from public.profiles where id=auth.uid()"),
          "learner",
        );
        assert.equal(
          await scalar(
            "select display_name from public.profiles where id=auth.uid()",
          ),
          "Learner",
        );
        await assert.rejects(
          db.query(
            `update public.profiles set role='admin' where id=auth.uid()`,
          ),
          /permission denied/,
        );
        await assert.rejects(
          db.query("select * from private.question_keys"),
          /permission denied/,
        );
        await assert.rejects(
          db.query(
            `insert into public.xp_events(user_id,action,points,event_key) values(auth.uid(),'fake',100,'fake')`,
          ),
          /permission denied/,
        );
        assert.equal(
          (await db.query("select * from public.profiles")).rows.length,
          1,
        );
        await assert.rejects(
          rpc("admin_analytics"),
          /Administrator access required/,
        );
      },
    );
    await t.test(
      "administrator content and configuration persist transactionally",
      async () => {
        await login(admin);
        lesson = await rpc<string>("admin_save", [
          "lessons",
          JSON.stringify({
            title: "Test lesson",
            youtube_id: "abcdefghijk",
            competency_id: categories[0],
            sort_order: 0,
            duration: 120,
            summary: ["Point one", "Point two", "Point three"],
          }),
        ]);
        for (let i = 0; i < 6; i++)
          qs.push(
            await rpc<string>("admin_save", [
              "questions",
              JSON.stringify({
                text: "Question " + i,
                options: ["Right", "Wrong", "Also wrong"],
                correct_option: 0,
                competency_id: categories[i % 5],
                lesson_id: i === 0 ? lesson : null,
                explanation: "Right is correct.",
              }),
            ]),
          );
        journal = await rpc<string>("admin_save", [
          "journal_items",
          JSON.stringify({
            transaction_text: "Owner invests cash",
            competency_id: categories[0],
            accounts: ["Cash", "Capital"],
            debit_account: "Cash",
            credit_account: "Capital",
            explanation: "Cash is debited, Capital is credited.",
          }),
        ]);
        for (let i = 0; i < 6; i++)
          cards.push(
            await rpc<string>("admin_save", [
              "flashcards",
              JSON.stringify({
                front: "Front " + i,
                back: "Back " + i,
                competency_id: categories[0],
              }),
            ]),
          );
        await rpc("admin_exam_settings", [5, 1, 70, 50, 10]);
        assert.equal(
          await scalar("select count(*)::int from public.questions"),
          6,
        );
        const before = await scalar(
          "select count(*)::int from public.questions",
        );
        await assert.rejects(
          rpc("admin_import_questions", [
            JSON.stringify([
              {
                text: "Good row",
                options: ["A", "B"],
                correct_option: 0,
                competency_id: categories[0],
              },
              {
                text: "Bad row",
                options: ["A", "B"],
                correct_option: 5,
                competency_id: categories[0],
              },
            ]),
          ]),
          /Correct answer/,
        );
        assert.equal(
          await scalar("select count(*)::int from public.questions"),
          before,
        );
      },
    );
    await t.test(
      "lesson and correct-answer XP cannot be awarded twice",
      async () => {
        await login(learner);
        await rpc("save_lesson", [lesson, 5, true]);
        assert.equal(
          await scalar("select count(*)::int from public.xp_events"),
          0,
        );
        await rpc("save_lesson", [lesson, 120, true]);
        await rpc("save_lesson", [lesson, 120, true]);
        const answer = await rpc<{ correct: boolean }>("answer_question", [
          qs[0],
          0,
        ]);
        assert.equal(answer.correct, true);
        await rpc("answer_question", [qs[0], 0]);
        await rpc("answer_journal", [journal, "Cash", "Capital"]);
        await rpc("answer_journal", [journal, "Cash", "Capital"]);
        assert.equal(
          await scalar("select sum(points)::int from public.xp_events"),
          45,
        );
        assert.deepEqual(
          (
            await db.query<{ badge_id: string }>(
              "select badge_id from public.user_badges order by badge_id",
            )
          ).rows.map((b) => b.badge_id),
          ["all_lessons", "first_lesson", "journal_starter"],
        );
      },
    );
    await t.test(
      "flashcards schedule future reviews and award a completed-session badge",
      async () => {
        const session = await rpc<{ id: string; pending: string[] }>(
          "start_flash_session",
        );
        for (const id of session.pending)
          await rpc("review_flashcard", [session.id, id, true]);
        assert.equal(
          await scalar(
            "select count(*)::int from public.flashcard_progress where interval=1 and next_review>now()",
          ),
          6,
        );
        assert.equal(
          await scalar(
            `select count(*)::int from public.user_badges where badge_id='flashcard_finisher'`,
          ),
          1,
        );
        assert.deepEqual(await rpc("start_flash_session"), {
          done: true,
          total: 0,
        });
      },
    );
    await t.test(
      "timed exams hide keys, prevent replay and grade shuffled options",
      async () => {
        type View = {
          id: string;
          index: number;
          total: number;
          question: { id: string; options: string[] };
          result?: { score: number; passed: boolean };
        };
        let exam = await rpc<View>("start_exam");
        assert.equal(exam.total, 5);
        assert.equal("correct_option" in exam.question, false);
        assert.equal((await rpc<View>("start_exam")).id, exam.id);
        const attemptId = exam.id;
        await login(other);
        await assert.rejects(rpc("get_exam", [attemptId]), /not found/);
        await login(learner);
        const first = exam.question.id;
        exam = await rpc<View>("submit_exam_answer", [
          exam.id,
          first,
          exam.question.options.indexOf("Right"),
        ]);
        await assert.rejects(
          rpc("submit_exam_answer", [exam.id, first, 0]),
          /no longer current/,
        );
        while (!exam.result)
          exam = await rpc<View>("submit_exam_answer", [
            exam.id,
            exam.question.id,
            exam.question.options.indexOf("Right"),
          ]);
        assert.equal(exam.result.score, 100);
        assert.equal(exam.result.passed, true);
        assert.equal(
          (await rpc<View>("get_exam", [attemptId])).result?.score,
          100,
        );
        assert.equal(
          await scalar(
            `select count(*)::int from public.xp_events where action='exam'`,
          ),
          1,
        );
        assert.equal(
          await scalar(
            `select count(*)::int from public.xp_events where action='onboarding'`,
          ),
          1,
        );
        const expired = await rpc<View>("start_exam");
        await db.exec("reset role");
        await db.query(
          `update private.exam_attempts set expires_at=now()-interval '1 second' where id=$1`,
          [expired.id],
        );
        await login(learner);
        const timed = await rpc<View>("get_exam", [expired.id]);
        assert.equal(timed.result?.score, 0);
      },
    );
    await t.test(
      "leaderboard exposes only explicit participants and safe fields",
      async () => {
        assert.deepEqual(
          (await db.query("select * from public.weekly_leaderboard()")).rows,
          [],
        );
        await db.exec(
          "update public.profiles set leaderboard_opt_in=true where id=auth.uid()",
        );
        const rows = (
          await db.query<Record<string, unknown>>(
            "select * from public.weekly_leaderboard()",
          )
        ).rows;
        assert.equal(rows.length, 1);
        assert.deepEqual(Object.keys(rows[0]).sort(), [
          "display_name",
          "is_me",
          "points",
        ]);
        await login(admin);
        const analytics = await rpc<{ learners: number }>("admin_analytics");
        assert.equal(analytics.learners, 2);
        const content = await rpc<{ questions: { correct_option: number }[] }>(
          "admin_content",
        );
        assert.equal(content.questions[0].correct_option, 0);
      },
    );
    await t.test("lesson limits, category matching, ledger milestones and timezone guards", async () => {
      await login(admin);
      const ledgerLesson = await rpc<string>("admin_save", ["lessons", JSON.stringify({title:"Ledger lesson", youtube_id:"abcdefghijk", competency_id:categories[1], sort_order:1, duration:120, summary:["One","Two","Three"]})]);
      const ledgerQuestions:string[]=[];
      for(let i=0;i<5;i++) ledgerQuestions.push(await rpc<string>("admin_save", ["questions", JSON.stringify({text:"Ledger item "+i,options:["Right","Wrong"],correct_option:0,competency_id:categories[1],lesson_id:ledgerLesson})]));
      await assert.rejects(rpc("admin_save", ["questions", JSON.stringify({text:"Sixth item",options:["Right","Wrong"],correct_option:0,competency_id:categories[1],lesson_id:ledgerLesson})]), /at most five/);
      await assert.rejects(rpc("admin_save", ["questions", JSON.stringify({text:"Mismatched item",options:["Right","Wrong"],correct_option:0,competency_id:categories[0],lesson_id:ledgerLesson})]), /must match/);
      await login(learner);
      await assert.rejects(db.query("update public.profiles set timezone='Invalid/Timezone' where id=auth.uid()"), /valid timezone/);
      for(const id of ledgerQuestions) await rpc("answer_question",[id,0]);
      assert.equal(await scalar("select count(*)::int from public.user_badges where badge_id='ledger_master'"),1);
    });
  } finally {
    await db.close();
  }
});
