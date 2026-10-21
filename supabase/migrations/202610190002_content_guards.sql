-- Follow-up guards; run after 202610190001_platform.sql.
begin;
-- Support accounts that existed before the initial migration. Metadata never
-- controls roles, and existing profile records are preserved.
insert into public.profiles(id,full_name,display_name)
select id,left(coalesce(raw_user_meta_data->>'full_name',''),80),
 case when length(coalesce(raw_user_meta_data->>'full_name',''))>=3 then left(raw_user_meta_data->>'full_name',20) else 'Learner' end
from auth.users on conflict(id) do nothing;
insert into public.onboarding(user_id) select id from public.profiles on conflict do nothing;
do $$declare t text;begin
 foreach t in array array['profiles','competencies','lessons','questions','journal_items','flashcards','lesson_progress','question_attempts','journal_attempts','flashcard_progress','xp_events','learning_activity','badges','user_badges','onboarding','announcements','exam_settings','mock_results'] loop
 execute format('revoke all on public.%I from public',t);
 end loop;
end $$;
create function private.check_lesson_question() returns trigger language plpgsql security definer set search_path='' as $$
declare v_comp uuid;v_count int;
begin
 if new.lesson_id is null then return new;end if;
 select competency_id into v_comp from public.lessons where id=new.lesson_id for update;
 if new.competency_id<>v_comp then raise exception 'The question competency must match its lesson';end if;
 select count(*) into v_count from public.questions where lesson_id=new.lesson_id and id<>new.id;
 if v_count>=5 then raise exception 'A lesson can contain at most five quick-check questions';end if;
 return new;
end $$;
create trigger lesson_question_guard before insert or update of lesson_id,competency_id on public.questions for each row execute function private.check_lesson_question();
create function private.ledger_badge() returns trigger language plpgsql security definer set search_path='' as $$
declare v_ledger uuid;
begin
 select id into v_ledger from public.competencies order by sort_order,id offset 1 limit 1;
 if new.correct and new.competency_id=v_ledger and (select count(distinct question_id) from public.question_attempts where user_id=new.user_id and competency_id=v_ledger and correct)>=5 then
 insert into public.user_badges(user_id,badge_id) values(new.user_id,'ledger_master') on conflict do nothing;
 end if;return new;
end $$;
create trigger ledger_milestone after insert on public.question_attempts for each row execute function private.ledger_badge();
create function private.valid_timezone() returns trigger language plpgsql set search_path='' as $$begin
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.timezone) then raise exception 'Choose a valid timezone';end if;return new;
end $$;
create trigger profile_timezone before insert or update of timezone on public.profiles for each row execute function private.valid_timezone();
revoke all on function private.check_lesson_question(),private.ledger_badge(),private.valid_timezone() from public,anon,authenticated;
commit;
