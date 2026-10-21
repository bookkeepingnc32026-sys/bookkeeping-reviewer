import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("combined setup installs the schema and preserves accounts registered before setup", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;
      create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      insert into auth.users(id,raw_user_meta_data) values('00000000-0000-4000-8000-000000000001','{"full_name":"Existing Learner","role":"admin"}');`);
    const sql = await readFile("supabase/setup.sql", "utf8");
    assert.equal((sql.match(/^begin;$/gim) || []).length, 1);
    assert.equal((sql.match(/^commit;$/gim) || []).length, 1);
    await db.exec(sql);
    assert.equal((await db.query("select * from auth.users")).rows.length, 1);
    const profiles = (
      await db.query<{ role: string; full_name: string }>(
        "select role,full_name from public.profiles",
      )
    ).rows;
    assert.deepEqual(profiles, [
      { role: "learner", full_name: "Existing Learner" },
    ]);
    assert.equal(
      (await db.query("select * from public.onboarding")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from public.competencies")).rows.length,
      5,
    );
    assert.equal(
      (await db.query("select * from public.exam_settings")).rows.length,
      1,
    );
  } finally {
    await db.close();
  }
});
