import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getLearnerProfile } from "../src/lib/learner-profile";

test("profile recovery repairs missing records without granting access to another account", async () => {
  const db = new PGlite();
  const learner = "00000000-0000-4000-8000-000000000001";
  const admin = "00000000-0000-4000-8000-000000000002";
  const other = "00000000-0000-4000-8000-000000000003";
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated;
      grant execute on function auth.uid() to authenticated;`);
    const migrations = (await readdir("supabase/migrations"))
      .filter((name) => name.endsWith(".sql"))
      .sort();
    for (const file of migrations.filter(
      (name) => !name.includes("recover_learner_profiles"),
    )) {
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    }
    await db.query(
      `insert into auth.users(id, raw_user_meta_data) values
      ($1, '{"full_name":"Restored Learner","role":"admin"}'),
      ($2, '{"full_name":"Administrator"}'),
      ($3, '{"full_name":"Other Learner"}')`,
      [learner, admin, other],
    );
    await db.query(
      "update public.profiles set role='admin', display_name='Keep My Name' where id=$1",
      [admin],
    );
    await db.query("delete from public.profiles where id=$1", [learner]);
    const migration = migrations.find((name) =>
      name.includes("recover_learner_profiles"),
    );
    assert.ok(migration);
    await db.exec(await readFile(`supabase/migrations/${migration}`, "utf8"));
    const restored = (
      await db.query<{ role: string; full_name: string }>(
        "select role,full_name from public.profiles where id=$1",
        [learner],
      )
    ).rows[0];
    assert.deepEqual(restored, {
      role: "learner",
      full_name: "Restored Learner",
    });
    assert.equal(
      (
        await db.query(
          "select user_id from public.onboarding where user_id=$1",
          [learner],
        )
      ).rows.length,
      1,
    );

    // Remove two profiles again after migration; the learner may repair only their own.
    await db.query("delete from public.profiles where id in ($1,$2)", [
      learner,
      other,
    ]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      learner,
    ]);
    await db.exec("set role authenticated");
    const result = (
      await db.query<{
        profile: { id: string; role: string; display_name: string };
      }>("select public.ensure_learner_profile() as profile")
    ).rows[0].profile;
    assert.equal(result.id, learner);
    assert.equal(result.role, "learner");
    assert.equal(result.display_name, "Restored Learner");
    await assert.rejects(
      db.query("insert into public.profiles(id) values($1)", [other]),
      /permission denied/,
    );
    await db.exec("reset role");
    assert.equal(
      (await db.query("select id from public.profiles where id=$1", [other]))
        .rows.length,
      0,
    );
    assert.equal(
      (
        await db.query("select * from public.onboarding where user_id=$1", [
          learner,
        ])
      ).rows.length,
      1,
    );

    // Idempotent repair preserves the administrator's existing role, name and hints.
    await db.query(
      "update public.onboarding set hints_seen='{welcome}' where user_id=$1",
      [admin],
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      admin,
    ]);
    await db.exec("set role authenticated");
    for (let i = 0; i < 2; i++) {
      const profile = (
        await db.query<{ profile: { role: string; display_name: string } }>(
          "select public.ensure_learner_profile() as profile",
        )
      ).rows[0].profile;
      assert.equal(profile.role, "admin");
      assert.equal(profile.display_name, "Keep My Name");
    }
    assert.deepEqual(
      (
        await db.query<{ hints_seen: string[] }>(
          "select hints_seen from public.onboarding where user_id=auth.uid()",
        )
      ).rows[0].hints_seen,
      ["welcome"],
    );
    await db.exec("reset role");
    await db.query("delete from public.onboarding where user_id=$1", [admin]);
    await db.exec("set role authenticated");
    await db.query("select public.ensure_learner_profile()");
    assert.equal(
      (
        await db.query(
          "select user_id from public.onboarding where user_id=auth.uid()",
        )
      ).rows.length,
      1,
    );

    await db.exec("reset role; set role anon");
    await assert.rejects(
      db.query("select public.ensure_learner_profile()"),
      /permission denied/,
    );
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub','',false)");
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("select public.ensure_learner_profile()"),
      /Authentication required/,
    );
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      "00000000-0000-4000-8000-000000000099",
    ]);
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("select public.ensure_learner_profile()"),
      /Authentication required/,
    );
  } finally {
    await db.close();
  }
});

test("account loading uses the database's authenticated repair", async () => {
  const db = {
    rpc: async (name: string) => {
      assert.equal(name, "ensure_learner_profile");
      return { data: { id: "learner", role: "learner" }, error: null };
    },
  } as unknown as SupabaseClient;
  assert.equal((await getLearnerProfile(db, "learner")).id, "learner");
  await assert.rejects(
    getLearnerProfile(db, "someone-else"),
    /setting up your learning account/,
  );
});

test("existing accounts keep working before the recovery migration is installed", async () => {
  const db = {
    rpc: async () => ({ data: null, error: { code: "PGRST202" } }),
    from: (table: string) => {
      assert.equal(table, "profiles");
      return {
        select: () => ({
          eq: (column: string, id: string) => {
            assert.equal(column, "id");
            assert.equal(id, "learner");
            return {
              maybeSingle: async () => ({
                data: { id, role: "learner" },
                error: null,
              }),
            };
          },
        }),
      };
    },
  } as unknown as SupabaseClient;
  assert.equal((await getLearnerProfile(db, "learner")).id, "learner");
});

test("missing profiles get actionable feedback and permission failures are never bypassed", async () => {
  const missing = {
    rpc: async () => ({ data: null, error: null }),
  } as unknown as SupabaseClient;
  await assert.rejects(
    getLearnerProfile(missing, "learner"),
    /setting up your learning account/,
  );
  const forbidden = { code: "42501", message: "permission denied" };
  const db = {
    rpc: async () => ({ data: null, error: forbidden }),
  } as unknown as SupabaseClient;
  await assert.rejects(
    getLearnerProfile(db, "learner"),
    (error: unknown) => error === forbidden,
  );
});
