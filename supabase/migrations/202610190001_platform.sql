-- Run once in the Supabase SQL editor. No sample learning content is installed.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
 id uuid primary key references auth.users on delete cascade, full_name text not null default '' check(length(full_name)<=80),
 display_name text not null default 'Learner' check(length(display_name) between 3 and 20), role text not null default 'learner' check(role in ('learner','admin')),
 exam_date date, daily_goal text not null default 'steady' check(daily_goal in ('light','steady','intense')),
 leaderboard_opt_in boolean not null default false, theme text not null default 'system' check(theme in ('light','dark','system')),
 onboarding_done boolean not null default false, timezone text not null default 'Asia/Manila', created_at timestamptz not null default now()
);
create table public.competencies(id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120), description text not null default '', sort_order int not null default 0);
-- Configurable starter categories, not official TESDA teaching content.
insert into public.competencies(name,description,sort_order) values
 ('Journalizing transactions','Record and classify business transactions.',1),('Posting to the ledger','Maintain individual account records.',2),('Preparing a trial balance','Check and summarize ledger balances.',3),('Financial statements','Understand and prepare financial reports.',4),('Reviewing internal controls','Review procedures and financial records.',5);
create table public.lessons(id uuid primary key default gen_random_uuid(), title text not null check(length(title) between 1 and 200), youtube_id text not null check(youtube_id ~ '^[A-Za-z0-9_-]{11}$'), competency_id uuid not null references public.competencies on delete restrict, sort_order int not null default 0, duration int not null check(duration>0), summary text[] not null default '{}', created_at timestamptz not null default now());
create table public.questions(id uuid primary key default gen_random_uuid(), competency_id uuid not null references public.competencies on delete restrict, text text not null check(length(text) between 1 and 2000), options text[] not null check(cardinality(options) between 2 and 6), lesson_id uuid references public.lessons on delete set null, created_at timestamptz not null default now());
create table private.question_keys(question_id uuid primary key references public.questions on delete cascade, correct_option int not null check(correct_option>=0), explanation text not null default '');
create table public.journal_items(id uuid primary key default gen_random_uuid(), transaction_text text not null check(length(transaction_text) between 1 and 2000), competency_id uuid not null references public.competencies on delete restrict, accounts text[] not null check(cardinality(accounts)>=2));
create table private.journal_keys(item_id uuid primary key references public.journal_items on delete cascade, debit_account text not null, credit_account text not null, explanation text not null default '');
create table public.flashcards(id uuid primary key default gen_random_uuid(), front text not null check(length(front) between 1 and 1000), back text not null check(length(back) between 1 and 2000), competency_id uuid not null references public.competencies on delete restrict);
create table public.lesson_progress(user_id uuid not null references public.profiles on delete cascade, lesson_id uuid not null references public.lessons on delete cascade, last_position int not null default 0 check(last_position>=0), completed boolean not null default false, updated_at timestamptz not null default now(), primary key(user_id,lesson_id));
create table public.question_attempts(id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade, question_id uuid references public.questions on delete set null, competency_id uuid references public.competencies on delete set null, correct boolean not null, source text not null check(source in ('quick_check','exam')), date timestamptz not null default now());
create table public.journal_attempts(id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade, item_id uuid references public.journal_items on delete set null, competency_id uuid references public.competencies on delete set null, correct boolean not null, date timestamptz not null default now());
create table public.flashcard_progress(user_id uuid not null references public.profiles on delete cascade, card_id uuid not null references public.flashcards on delete cascade, next_review timestamptz not null default now(), interval int not null default 0 check(interval in (0,1,3,7,14)), repetitions int not null default 0, primary key(user_id,card_id));
create table public.xp_events(id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade, action text not null, points int not null check(points>=0), event_key text not null, date timestamptz not null default now(), unique(user_id,event_key));
create table public.learning_activity(id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade, action text not null, activity_key text not null, local_day date not null, date timestamptz not null default now(), unique(user_id,activity_key));
create table public.badges(id text primary key, name text not null, requirement text not null);
insert into public.badges values ('first_lesson','First Lesson','Complete one lesson'),('streak_5','5-Day Streak','Study five consecutive days'),('streak_7','7-Day Streak','Study seven consecutive days'),('journal_starter','Journalizing Starter','Correctly journalize a transaction'),('ledger_master','Ledger Master','Answer five distinct ledger questions correctly'),('flashcard_finisher','Flashcard Finisher','Finish a session of at least five cards'),('mock_passed','Mock Exam Passed','Pass a mock examination'),('all_lessons','Completed All Lessons','Complete all available lessons');
create table public.user_badges(user_id uuid not null references public.profiles on delete cascade, badge_id text not null references public.badges, earned_at timestamptz not null default now(), primary key(user_id,badge_id));
create table public.onboarding(user_id uuid primary key references public.profiles on delete cascade, hints_seen text[] not null default '{}');
create table public.announcements(id uuid primary key default gen_random_uuid(), message text not null check(length(message) between 1 and 1000), active boolean not null default true, date timestamptz not null default now());
create table public.exam_settings(id int primary key default 1 check(id=1), question_count int not null default 40 check(question_count between 1 and 200), time_limit_minutes int not null default 60 check(time_limit_minutes between 1 and 240), pass_mark_percent int not null default 70 check(pass_mark_percent between 1 and 100), exam_xp int not null default 50 check(exam_xp between 0 and 500), flashcard_xp int not null default 10 check(flashcard_xp between 0 and 500));
insert into public.exam_settings(id) values(1);
create table private.exam_attempts(id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade, question_ids uuid[] not null, option_orders jsonb not null, current_index int not null default 0, correct_count int not null default 0, score_by_competency jsonb not null default '{}', pass_mark int not null, xp int not null, expires_at timestamptz not null, finished boolean not null default false, created_at timestamptz not null default now());
create unique index one_active_exam on private.exam_attempts(user_id) where not finished;
create table public.mock_results(id uuid primary key references private.exam_attempts on delete cascade, user_id uuid not null references public.profiles on delete cascade, score numeric not null, correct_count int not null, total int not null, passed boolean not null, score_by_competency jsonb not null, date timestamptz not null default now());
create table private.flash_sessions(id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade, pending uuid[] not null, reviewed uuid[] not null default '{}', finished boolean not null default false, created_at timestamptz not null default now());
create unique index one_active_flash_session on private.flash_sessions(user_id) where not finished;
create index xp_user_date on public.xp_events(user_id,date);
create index activity_user_day on public.learning_activity(user_id,local_day);
create index question_attempt_user on public.question_attempts(user_id,date);
create index journal_attempt_user on public.journal_attempts(user_id,date);
create index lessons_competency on public.lessons(competency_id);
create index questions_competency on public.questions(competency_id);
create index flash_due on public.flashcard_progress(user_id,next_review);

create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;
create function private.local_day() returns date language sql stable security definer set search_path='' as $$ select (now() at time zone coalesce((select timezone from public.profiles where id=auth.uid()),'Asia/Manila'))::date $$;
create function private.new_user() returns trigger language plpgsql security definer set search_path='' as $$ declare v_name text; begin v_name:=left(coalesce(new.raw_user_meta_data->>'full_name',''),20);if length(v_name)<3 then v_name:='Learner';end if;insert into public.profiles(id,full_name,display_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),80),v_name); insert into public.onboarding(user_id) values(new.id); return new; end $$;
-- Ignore all client metadata role values; new users are always learners.
create trigger on_auth_user_created after insert on auth.users for each row execute function private.new_user();

do $$ declare t text; begin
 foreach t in array array['profiles','competencies','lessons','questions','journal_items','flashcards','lesson_progress','question_attempts','journal_attempts','flashcard_progress','xp_events','learning_activity','badges','user_badges','onboarding','announcements','exam_settings','mock_results'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;
 foreach t in array array['competencies','lessons','questions','journal_items','flashcards','badges','exam_settings'] loop
 execute format('create policy content_read on public.%I for select to authenticated using(true)',t);
 execute format('create policy admin_write on public.%I for all to authenticated using(private.is_admin()) with check(private.is_admin())',t);
 -- Questions and journal keys are changed only through transactional RPCs.
 if t not in ('questions','journal_items','badges','exam_settings') then execute format('grant insert, update, delete on public.%I to authenticated',t); end if;
 end loop;
 foreach t in array array['profiles','lesson_progress','question_attempts','journal_attempts','flashcard_progress','xp_events','learning_activity','user_badges','onboarding','mock_results'] loop
 execute format('create policy own_read on public.%I for select to authenticated using(%I=auth.uid())',t,case when t='profiles' then 'id' else 'user_id' end);
 end loop;
end $$;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;
revoke all on all tables in schema private from anon,authenticated;
create policy profile_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
grant update(full_name,display_name,exam_date,daily_goal,leaderboard_opt_in,theme,onboarding_done,timezone) on public.profiles to authenticated;
create policy hints_update on public.onboarding for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant update(hints_seen) on public.onboarding to authenticated;
create policy announcements_read on public.announcements for select to authenticated using(active or private.is_admin());
create policy announcements_manage on public.announcements for all to authenticated using(private.is_admin()) with check(private.is_admin());
grant insert,update,delete on public.announcements to authenticated;

create function private.award(p_action text,p_points int,p_key text) returns void language sql security definer set search_path='' as $$ insert into public.xp_events(user_id,action,points,event_key) values(auth.uid(),p_action,p_points,p_key) on conflict(user_id,event_key) do nothing $$;
create function private.badge(p_id text) returns void language sql security definer set search_path='' as $$ insert into public.user_badges(user_id,badge_id) values(auth.uid(),p_id) on conflict do nothing $$;
create function private.record_activity(p_action text,p_key text) returns void language plpgsql security definer set search_path='' as $$
declare v_streak int; v_total int; v_done int; v_checks boolean; v_journal boolean; v_flash boolean; v_exam boolean;
begin
 insert into public.learning_activity(user_id,action,activity_key,local_day) values(auth.uid(),p_action,p_key,private.local_day()) on conflict do nothing;
 with days as(select distinct local_day from public.learning_activity where user_id=auth.uid()), ranked as(select local_day,row_number() over(order by local_day desc)::int-1 as n from days) select count(*) into v_streak from ranked where local_day=private.local_day()-n;
 if v_streak>=5 then perform private.badge('streak_5'); end if;
 if v_streak>=7 then perform private.badge('streak_7'); end if;
 select count(*) into v_total from public.lessons;
 select count(*) into v_done from public.lesson_progress where user_id=auth.uid() and completed;
 if v_done>0 then perform private.badge('first_lesson'); end if;
 if v_total>0 and v_done>=v_total then perform private.badge('all_lessons'); end if;
 select exists(select 1 from public.question_attempts where user_id=auth.uid() and source='quick_check') into v_checks;
 select exists(select 1 from public.journal_attempts where user_id=auth.uid()) into v_journal;
 select exists(select 1 from private.flash_sessions where user_id=auth.uid() and cardinality(reviewed)>=5) into v_flash;
 select exists(select 1 from public.mock_results where user_id=auth.uid()) into v_exam;
 if v_done>0 and v_checks and v_journal and v_flash and v_exam then perform private.award('onboarding',50,'onboarding'); end if;
end $$;

create function public.save_lesson(p_lesson uuid,p_position int,p_complete boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_duration int; v_complete boolean;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select duration into v_duration from public.lessons where id=p_lesson;
 if v_duration is null then raise exception 'Lesson not found'; end if;
 v_complete:=p_complete and p_position>=v_duration*0.9;
 insert into public.lesson_progress(user_id,lesson_id,last_position,completed) values(auth.uid(),p_lesson,greatest(0,least(p_position,v_duration)),v_complete) on conflict(user_id,lesson_id) do update set last_position=excluded.last_position, completed=public.lesson_progress.completed or excluded.completed,updated_at=now();
 if v_complete then perform private.award('lesson',20,'lesson:'||p_lesson); perform private.record_activity('lesson','lesson:'||p_lesson); end if;
 return jsonb_build_object('completed',v_complete);
end $$;
create function public.answer_question(p_question uuid,p_option int) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_key private.question_keys; v_q public.questions; v_correct boolean; v_ledger uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into v_q from public.questions where id=p_question and lesson_id is not null;
 if not found or p_option<0 or p_option>=cardinality(v_q.options) then raise exception 'Invalid quick check answer'; end if;
 select * into v_key from private.question_keys where question_id=p_question;
 if not found then raise exception 'This question is not ready'; end if;
 v_correct:=p_option=v_key.correct_option;
 insert into public.question_attempts(user_id,question_id,competency_id,correct,source) values(auth.uid(),p_question,v_q.competency_id,v_correct,'quick_check');
 if v_correct then perform private.award('quick_check',10,'question:'||p_question); end if;
 select id into v_ledger from public.competencies order by sort_order,id offset 1 limit 1;
 if (select count(distinct question_id) from public.question_attempts where user_id=auth.uid() and competency_id=v_ledger and correct)>=5 then perform private.badge('ledger_master'); end if;
 perform private.record_activity('quick_check','quick:'||p_question||':'||private.local_day());
 return jsonb_build_object('correct',v_correct,'correct_option',v_key.correct_option,'explanation',v_key.explanation);
end $$;
create function public.answer_journal(p_item uuid,p_debit text,p_credit text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_key private.journal_keys; v_comp uuid; v_correct boolean;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into v_key from private.journal_keys where item_id=p_item;
 if not found then raise exception 'Transaction not found'; end if;
 select competency_id into v_comp from public.journal_items where id=p_item;
 v_correct:=p_debit=v_key.debit_account and p_credit=v_key.credit_account;
 insert into public.journal_attempts(user_id,item_id,competency_id,correct) values(auth.uid(),p_item,v_comp,v_correct);
 if v_correct then perform private.award('journal',15,'journal:'||p_item);perform private.badge('journal_starter');end if;
 perform private.record_activity('journal','journal:'||p_item||':'||private.local_day());
 return jsonb_build_object('correct',v_correct,'debit_account',v_key.debit_account,'credit_account',v_key.credit_account,'explanation',v_key.explanation);
end $$;

create function private.finish_exam(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v private.exam_attempts; v_score numeric; v_pass boolean; v_result public.mock_results; v_c uuid; v_break jsonb;
begin
 select * into v from private.exam_attempts where id=p_id and user_id=auth.uid() for update;
 if not found then raise exception 'Examination not found'; end if;
 if v.finished then select * into v_result from public.mock_results where id=p_id;return to_jsonb(v_result);end if;
 v_score:=round(100.0*v.correct_count/cardinality(v.question_ids),1); v_pass:=v_score>=v.pass_mark;
 v_break:=v.score_by_competency;
 -- Include unanswered questions in each competency's denominator.
 for v_c in select distinct competency_id from public.questions where id=any(v.question_ids) loop
 v_break:=jsonb_set(v_break,array[v_c::text],jsonb_build_object('correct',coalesce((v_break->v_c::text->>'correct')::int,0),'total',(select count(*) from public.questions where id=any(v.question_ids) and competency_id=v_c)));
 end loop;
 insert into public.mock_results(id,user_id,score,correct_count,total,passed,score_by_competency) values(v.id,auth.uid(),v_score,v.correct_count,cardinality(v.question_ids),v_pass,v_break) returning * into v_result;
 update private.exam_attempts set finished=true where id=p_id;
 -- One exam XP award per learner-local day; retakes still save results.
 if v.current_index=cardinality(v.question_ids) then perform private.award('exam',v.xp,'exam:'||private.local_day()); end if;
 if v_pass then perform private.badge('mock_passed'); end if;
 perform private.record_activity('exam','exam:'||v.id);
 return to_jsonb(v_result);
end $$;
create function public.get_exam(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v private.exam_attempts; v_q public.questions; v_options jsonb; v_order jsonb;
begin
 select * into v from private.exam_attempts where id=p_id and user_id=auth.uid() for update;
 if not found then raise exception 'Examination not found'; end if;
 if v.finished or now()>=v.expires_at or v.current_index>=cardinality(v.question_ids) then return jsonb_build_object('result',private.finish_exam(p_id)); end if;
 select * into v_q from public.questions where id=v.question_ids[v.current_index+1];
 if not found then raise exception 'Examination content was removed. Ask the administrator to restore it.'; end if;
 v_order:=v.option_orders->v.current_index;
 select jsonb_agg(v_q.options[value::int+1] order by ordinality) into v_options from jsonb_array_elements_text(v_order) with ordinality;
 return jsonb_build_object('id',v.id,'index',v.current_index,'total',cardinality(v.question_ids),'expires_at',v.expires_at,'question',jsonb_build_object('id',v_q.id,'text',v_q.text,'options',v_options,'competency_id',v_q.competency_id));
end $$;
create function public.start_exam() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_settings public.exam_settings; v_ids uuid[]; v_id uuid; v_orders jsonb; v_count int;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 -- Serialize starts to enforce one attempt even on duplicate HTTP requests.
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text||':exam'));
 select id into v_id from private.exam_attempts where user_id=auth.uid() and not finished;
 if found then return public.get_exam(v_id); end if;
 select * into v_settings from public.exam_settings where id=1;
 select count(*) into v_count from public.questions q join private.question_keys k on k.question_id=q.id;
 if v_count<v_settings.question_count then raise exception 'The question bank needs at least % questions before this exam can start.',v_settings.question_count; end if;
 with ranked as(select q.id,row_number() over(partition by q.competency_id order by random()) as rn from public.questions q join private.question_keys k on k.question_id=q.id), picked as(select id from ranked order by rn,random() limit v_settings.question_count) select array_agg(id) into v_ids from picked;
 select jsonb_agg(ord.options order by ids.n) into v_orders from unnest(v_ids) with ordinality ids(id,n) join public.questions q on q.id=ids.id cross join lateral(select jsonb_agg(x.i order by random()) as options from generate_series(0,cardinality(q.options)-1) x(i)) ord;
 insert into private.exam_attempts(user_id,question_ids,option_orders,pass_mark,xp,expires_at) values(auth.uid(),v_ids,v_orders,v_settings.pass_mark_percent,v_settings.exam_xp,now()+make_interval(mins=>v_settings.time_limit_minutes)) returning id into v_id;
 return public.get_exam(v_id);
end $$;
create function public.submit_exam_answer(p_id uuid,p_question uuid,p_option int) returns jsonb language plpgsql security definer set search_path='' as $$
declare v private.exam_attempts; v_q public.questions; v_correct boolean; v_original int; v_order jsonb; v_break jsonb; v_key int;
begin
 select * into v from private.exam_attempts where id=p_id and user_id=auth.uid() for update;
 if not found then raise exception 'Examination not found'; end if;
 if v.finished or now()>=v.expires_at then return jsonb_build_object('result',private.finish_exam(p_id)); end if;
 if v.question_ids[v.current_index+1]<>p_question then raise exception 'This answer is no longer current. Reload to resume.'; end if;
 v_order:=v.option_orders->v.current_index;
 if p_option<0 or p_option>=jsonb_array_length(v_order) then raise exception 'Choose a valid option'; end if;
 v_original:=(v_order->>p_option)::int;
 select * into v_q from public.questions where id=p_question;
 select correct_option into v_key from private.question_keys where question_id=p_question;
 v_correct:=coalesce(v_original=v_key,false);
 insert into public.question_attempts(user_id,question_id,competency_id,correct,source) values(auth.uid(),p_question,v_q.competency_id,v_correct,'exam');
 v_break:=jsonb_set(v.score_by_competency,array[v_q.competency_id::text],jsonb_build_object('correct',coalesce((v.score_by_competency->v_q.competency_id::text->>'correct')::int,0)+case when v_correct then 1 else 0 end));
 update private.exam_attempts set current_index=current_index+1,correct_count=correct_count+case when v_correct then 1 else 0 end,score_by_competency=v_break where id=p_id;
 return public.get_exam(p_id);
end $$;
create function public.finish_exam(p_id uuid) returns jsonb language sql security definer set search_path='' as $$ select jsonb_build_object('result',private.finish_exam(p_id)) $$;

create function public.start_flash_session() returns jsonb language plpgsql security definer set search_path='' as $$
declare v private.flash_sessions; v_ids uuid[];
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text||':flash'));
 select * into v from private.flash_sessions where user_id=auth.uid() and not finished;
 if not found then
 select array_agg(f.id order by f.id) into v_ids from public.flashcards f left join public.flashcard_progress p on p.card_id=f.id and p.user_id=auth.uid() where p.next_review is null or p.next_review<=now();
 if coalesce(cardinality(v_ids),0)=0 then return jsonb_build_object('done',true,'total',0); end if;
 insert into private.flash_sessions(user_id,pending) values(auth.uid(),v_ids) returning * into v;
 end if;
 return jsonb_build_object('id',v.id,'pending',v.pending,'reviewed',v.reviewed,'total',cardinality(v.pending)+cardinality(v.reviewed));
end $$;
create function public.review_flashcard(p_session uuid,p_card uuid,p_known boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare v private.flash_sessions; v_interval int; v_reps int; v_pending uuid[]; v_reviewed uuid[]; v_xp int;
begin
 select * into v from private.flash_sessions where id=p_session and user_id=auth.uid() for update;
 if not found or v.finished then raise exception 'Review session is no longer active'; end if;
 if v.pending[1]<>p_card then raise exception 'This flashcard is no longer current'; end if;
 select interval,repetitions into v_interval,v_reps from public.flashcard_progress where user_id=auth.uid() and card_id=p_card;
 v_interval:=case when not p_known then 0 when coalesce(v_interval,0)=0 then 1 when v_interval=1 then 3 when v_interval=3 then 7 else 14 end;
 insert into public.flashcard_progress(user_id,card_id,next_review,interval,repetitions) values(auth.uid(),p_card,now()+make_interval(days=>v_interval),v_interval,case when p_known then coalesce(v_reps,0)+1 else 0 end) on conflict(user_id,card_id) do update set next_review=excluded.next_review,interval=excluded.interval,repetitions=excluded.repetitions;
 v_pending:=v.pending[2:];if not p_known then v_pending:=array_append(v_pending,p_card);end if;
 select array_agg(distinct x) into v_reviewed from unnest(array_append(v.reviewed,p_card)) x;
 update private.flash_sessions set pending=coalesce(v_pending,'{}'),reviewed=v_reviewed,finished=coalesce(cardinality(v_pending),0)=0 where id=p_session;
 if coalesce(cardinality(v_pending),0)=0 then
 if cardinality(v_reviewed)>=5 then select flashcard_xp into v_xp from public.exam_settings where id=1;perform private.award('flashcards',v_xp,'flashcards:'||private.local_day());perform private.badge('flashcard_finisher');end if;
 perform private.record_activity('flashcards','flashcards:'||p_session);
 end if;
 return jsonb_build_object('id',v.id,'pending',coalesce(v_pending,'{}'),'reviewed',v_reviewed,'done',coalesce(cardinality(v_pending),0)=0);
end $$;

create function public.weekly_leaderboard() returns table(display_name text,points bigint,is_me boolean) language sql stable security definer set search_path='' as $$
 select p.display_name,sum(x.points),p.id=auth.uid() from public.xp_events x join public.profiles p on p.id=x.user_id where p.leaderboard_opt_in and p.role='learner' and (x.date at time zone 'Asia/Manila')>=date_trunc('week',now() at time zone 'Asia/Manila') group by p.id order by sum(x.points) desc,p.display_name limit 100
$$;

-- Content writes, keys and configuration are validated in the same transaction.
create function public.admin_save(p_kind text,p_data jsonb,p_id uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid:=coalesce(p_id,gen_random_uuid()); v_options text[]; v_summary text[]; v_youtube text; v_count int;
begin
 if not private.is_admin() then raise exception 'Administrator access required'; end if;
 if p_kind='questions' then
 select array_agg(value order by ordinality) into v_options from jsonb_array_elements_text(p_data->'options') with ordinality;
 if (p_data->>'correct_option')::int<0 or (p_data->>'correct_option')::int>=cardinality(v_options) then raise exception 'Correct answer must match an option'; end if;
 if p_id is not null and exists(select 1 from private.exam_attempts where not finished and p_id=any(question_ids)) then raise exception 'This question is used by an active examination';end if;
 insert into public.questions(id,text,options,competency_id,lesson_id) values(v_id,p_data->>'text',v_options,(p_data->>'competency_id')::uuid,nullif(p_data->>'lesson_id','')::uuid) on conflict(id) do update set text=excluded.text,options=excluded.options,competency_id=excluded.competency_id,lesson_id=excluded.lesson_id;
 insert into private.question_keys(question_id,correct_option,explanation) values(v_id,(p_data->>'correct_option')::int,coalesce(p_data->>'explanation','')) on conflict(question_id) do update set correct_option=excluded.correct_option,explanation=excluded.explanation;
 elsif p_kind='journal_items' then
 select array_agg(value order by ordinality) into v_options from jsonb_array_elements_text(p_data->'accounts') with ordinality;
 if not(p_data->>'debit_account'=any(v_options)) or not(p_data->>'credit_account'=any(v_options)) or p_data->>'debit_account'=p_data->>'credit_account' then raise exception 'Debit and credit must be different listed accounts'; end if;
 insert into public.journal_items(id,transaction_text,competency_id,accounts) values(v_id,p_data->>'transaction_text',(p_data->>'competency_id')::uuid,v_options) on conflict(id) do update set transaction_text=excluded.transaction_text,competency_id=excluded.competency_id,accounts=excluded.accounts;
 insert into private.journal_keys(item_id,debit_account,credit_account,explanation) values(v_id,p_data->>'debit_account',p_data->>'credit_account',coalesce(p_data->>'explanation','')) on conflict(item_id) do update set debit_account=excluded.debit_account,credit_account=excluded.credit_account,explanation=excluded.explanation;
 elsif p_kind='lessons' then
 select coalesce(array_agg(value order by ordinality),'{}') into v_summary from jsonb_array_elements_text(p_data->'summary') with ordinality;
 if cardinality(v_summary) not between 3 and 5 then raise exception 'Add 3–5 summary points';end if;
 v_youtube:=p_data->>'youtube_id';
 insert into public.lessons(id,title,youtube_id,competency_id,sort_order,duration,summary) values(v_id,p_data->>'title',v_youtube,(p_data->>'competency_id')::uuid,(p_data->>'sort_order')::int,(p_data->>'duration')::int,v_summary) on conflict(id) do update set title=excluded.title,youtube_id=excluded.youtube_id,competency_id=excluded.competency_id,sort_order=excluded.sort_order,duration=excluded.duration,summary=excluded.summary;
 elsif p_kind='flashcards' then
 insert into public.flashcards(id,front,back,competency_id) values(v_id,p_data->>'front',p_data->>'back',(p_data->>'competency_id')::uuid) on conflict(id) do update set front=excluded.front,back=excluded.back,competency_id=excluded.competency_id;
 elsif p_kind='announcements' then
 insert into public.announcements(id,message,active) values(v_id,p_data->>'message',(p_data->>'active')::boolean) on conflict(id) do update set message=excluded.message,active=excluded.active;
 elsif p_kind='competencies' then
 if p_id is null then select count(*) into v_count from public.competencies;if v_count>=5 then raise exception 'Edit one of the five existing competency categories';end if;end if;
 insert into public.competencies(id,name,description,sort_order) values(v_id,p_data->>'name',coalesce(p_data->>'description',''),(p_data->>'sort_order')::int) on conflict(id) do update set name=excluded.name,description=excluded.description,sort_order=excluded.sort_order;
 else raise exception 'Unknown content type';end if;return v_id;
end $$;
create function public.admin_delete(p_kind text,p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.is_admin() then raise exception 'Administrator access required';end if;
 if p_kind not in ('lessons','questions','journal_items','flashcards','announcements') then raise exception 'Unsupported delete';end if;
 if p_kind='questions' and exists(select 1 from private.exam_attempts where not finished and p_id=any(question_ids)) then raise exception 'This question is in an active examination';end if;
 if p_kind='flashcards' and exists(select 1 from private.flash_sessions where not finished and p_id=any(pending)) then raise exception 'This card is in an active review session';end if;
 execute format('delete from public.%I where id=$1',p_kind) using p_id;
end $$;
create function public.admin_content() returns jsonb language plpgsql security definer set search_path='' as $$ begin
 if not private.is_admin() then raise exception 'Administrator access required';end if;
 return jsonb_build_object('questions',coalesce((select jsonb_agg(to_jsonb(q)||jsonb_build_object('correct_option',k.correct_option,'explanation',k.explanation)) from public.questions q join private.question_keys k on k.question_id=q.id),'[]'),'journals',coalesce((select jsonb_agg(to_jsonb(j)||jsonb_build_object('debit_account',k.debit_account,'credit_account',k.credit_account,'explanation',k.explanation)) from public.journal_items j join private.journal_keys k on k.item_id=j.id),'[]'));
end $$;
create function public.admin_exam_settings(p_count int,p_minutes int,p_pass int,p_exam_xp int,p_flash_xp int) returns void language plpgsql security definer set search_path='' as $$begin
 if not private.is_admin() then raise exception 'Administrator access required';end if;
 update public.exam_settings set question_count=p_count,time_limit_minutes=p_minutes,pass_mark_percent=p_pass,exam_xp=p_exam_xp,flashcard_xp=p_flash_xp where id=1;
end $$;
create function public.admin_analytics() returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not private.is_admin() then raise exception 'Administrator access required';end if;
 return jsonb_build_object('learners',(select count(*) from public.profiles where role='learner'),'active',(select count(distinct user_id) from public.learning_activity where date>=date_trunc('week',now() at time zone 'Asia/Manila') at time zone 'Asia/Manila'),'average',(select coalesce(round(avg(score),1),0) from public.mock_results),'abandoned',coalesce((select jsonb_agg(s) from(select l.title,count(*) as count from public.lesson_progress p join public.lessons l on l.id=p.lesson_id where not p.completed group by l.title order by count(*) desc limit 5)s),'[]'),'missed',coalesce((select jsonb_agg(s) from(select q.text,count(*) as count from public.question_attempts a join public.questions q on q.id=a.question_id where not a.correct group by q.text order by count(*) desc limit 5)s),'[]'));
end $$;
-- Prevent direct or accidental execution of internal SECURITY DEFINER functions.
create function public.admin_import_questions(p_rows jsonb) returns int language plpgsql security definer set search_path='' as $$declare v_row jsonb;v_count int:=0;begin
 if not private.is_admin() then raise exception 'Administrator access required';end if;
 if jsonb_array_length(p_rows) not between 1 and 500 then raise exception 'Import 1–500 questions at a time';end if;
 for v_row in select value from jsonb_array_elements(p_rows) loop perform public.admin_save('questions',v_row);v_count:=v_count+1;end loop;return v_count;
end $$;
revoke all on function public.admin_import_questions(jsonb) from public,anon;
grant execute on function public.admin_import_questions(jsonb) to authenticated;
revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.is_admin() to authenticated;
do $$ declare r record;begin for r in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('save_lesson','answer_question','answer_journal','get_exam','start_exam','submit_exam_answer','finish_exam','start_flash_session','review_flashcard','weekly_leaderboard','admin_save','admin_delete','admin_content','admin_exam_settings','admin_analytics') loop execute format('revoke all on function %s from public,anon',r.signature);execute format('grant execute on function %s to authenticated',r.signature);end loop;end $$;
commit;
