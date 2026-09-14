create table if not exists public.grandmaster_winners (
  competition_year integer primary key,
  player_id text not null,
  player_name text not null,
  grandmaster_score numeric(6,2) not null check (grandmaster_score between 0 and 100),
  correct_score numeric(6,2) not null check (correct_score between 0 and 45),
  participation_score numeric(6,2) not null check (participation_score between 0 and 25),
  accuracy_score numeric(6,2) not null check (accuracy_score between 0 and 15),
  title_points_score numeric(6,2) not null check (title_points_score between 0 and 10),
  supreme_score numeric(6,2) not null check (supreme_score between 0 and 4),
  weekly_score numeric(6,2) not null check (weekly_score between 0 and 1),
  awarded_at timestamp with time zone not null default now(),
  check (competition_year >= 2026)
);

comment on table public.grandmaster_winners is
  'Official annual BDL Grandmaster title holders and their final weighted score breakdown.';

alter table public.grandmaster_winners enable row level security;

drop policy if exists deny_public_grandmaster_winners on public.grandmaster_winners;
create policy deny_public_grandmaster_winners
  on public.grandmaster_winners
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.grandmaster_winners from public, anon, authenticated;
grant select, insert, update on table public.grandmaster_winners to service_role;

create or replace function public.get_grandmaster_standings(p_year integer)
returns table (
  rank bigint,
  player_id text,
  player_name text,
  available_questions integer,
  played integer,
  correct integer,
  accuracy numeric,
  smartest_wins integer,
  supreme_wins integer,
  title_points integer,
  possible_weekly_points integer,
  possible_supreme_points integer,
  possible_title_points integer,
  correct_score numeric,
  participation_score numeric,
  accuracy_score numeric,
  title_points_score numeric,
  supreme_score numeric,
  weekly_score numeric,
  grandmaster_score numeric
)
language sql
stable
security invoker
set search_path = ''
as $function$
  with local_clock as (
    select case
      when (current_timestamp at time zone 'Europe/Brussels')::time < time '08:00'
        then (current_timestamp at time zone 'Europe/Brussels')::date - 1
      else (current_timestamp at time zone 'Europe/Brussels')::date
    end as effective_date
  ),
  bounds as (
    select
      greatest(make_date(p_year, 1, 1), date '2026-08-11') as start_date,
      least(make_date(p_year, 12, 31), effective_date) as end_date,
      effective_date
    from local_clock
    where p_year between 2026 and 2100
  ),
  limits as (
    select
      greatest(0, end_date - start_date + 1)::integer as available_questions,
      (select count(*)::integer
       from public.weekly_winners ww
       where extract(year from ww.week_end)::integer = p_year
         and ww.week_end <= bounds.end_date) as possible_weekly_points,
      (select (count(*) * 4)::integer
       from public.monthly_winners mw
       where extract(year from mw.month_end)::integer = p_year
         and mw.month_end <= bounds.end_date) as possible_supreme_points
    from bounds
  ),
  answer_totals as (
    select
      qa.player_id,
      max(qa.player_name) as player_name,
      count(distinct qa.quiz_date)::integer as played,
      count(distinct qa.quiz_date) filter (
        where qa.quiz_date < bounds.effective_date and qa.is_correct is true
      )::integer as correct,
      count(distinct qa.quiz_date) filter (
        where qa.quiz_date < bounds.effective_date
      )::integer as released_played
    from public.quiz_answers qa
    cross join bounds
    where qa.quiz_date between bounds.start_date and bounds.end_date
      and qa.player_id is not null
      and btrim(qa.player_id) <> ''
      and qa.player_name is not null
      and lower(btrim(qa.player_name)) not in ('amy', 'amy.test', 'drbdl', 'drbdl.test')
    group by qa.player_id, bounds.effective_date
  ),
  weekly_totals as (
    select ww.player_id, count(*)::integer as smartest_wins
    from public.weekly_winners ww
    cross join bounds
    where extract(year from ww.week_end)::integer = p_year
      and ww.week_end <= bounds.end_date
      and lower(btrim(ww.player_name)) not in ('amy', 'amy.test', 'drbdl', 'drbdl.test')
    group by ww.player_id
  ),
  supreme_totals as (
    select mw.player_id, count(*)::integer as supreme_wins
    from public.monthly_winners mw
    cross join bounds
    where extract(year from mw.month_end)::integer = p_year
      and mw.month_end <= bounds.end_date
      and lower(btrim(mw.player_name)) not in ('amy', 'amy.test', 'drbdl', 'drbdl.test')
    group by mw.player_id
  ),
  components as (
    select
      a.player_id,
      a.player_name,
      l.available_questions,
      a.played,
      a.correct,
      case when a.released_played > 0
        then (a.correct::numeric / a.released_played) * 100 else 0::numeric end as accuracy,
      coalesce(w.smartest_wins, 0) as smartest_wins,
      coalesce(s.supreme_wins, 0) as supreme_wins,
      coalesce(w.smartest_wins, 0) + (coalesce(s.supreme_wins, 0) * 4) as title_points,
      l.possible_weekly_points,
      l.possible_supreme_points,
      l.possible_weekly_points + l.possible_supreme_points as possible_title_points,
      case when l.available_questions > 0
        then (a.correct::numeric / l.available_questions) * 45 else 0::numeric end as correct_score,
      case when l.available_questions > 0
        then (a.played::numeric / l.available_questions) * 25 else 0::numeric end as participation_score,
      case when a.released_played > 0
        then (a.correct::numeric / a.released_played) * 15 else 0::numeric end as accuracy_score,
      case when (l.possible_weekly_points + l.possible_supreme_points) > 0
        then ((coalesce(w.smartest_wins, 0) + (coalesce(s.supreme_wins, 0) * 4))::numeric
          / (l.possible_weekly_points + l.possible_supreme_points)) * 10
        else 0::numeric end as title_points_score,
      case when l.possible_supreme_points > 0
        then ((coalesce(s.supreme_wins, 0) * 4)::numeric / l.possible_supreme_points) * 4
        else 0::numeric end as supreme_score,
      case when l.possible_weekly_points > 0
        then (coalesce(w.smartest_wins, 0)::numeric / l.possible_weekly_points)
        else 0::numeric end as weekly_score
    from answer_totals a
    cross join limits l
    left join weekly_totals w using (player_id)
    left join supreme_totals s using (player_id)
  ),
  scored as (
    select c.*,
      c.correct_score + c.participation_score + c.accuracy_score
      + c.title_points_score + c.supreme_score + c.weekly_score as raw_grandmaster_score
    from components c
  ),
  ranked as (
    select rank() over (order by round(raw_grandmaster_score, 2) desc) as rank, s.*
    from scored s
  )
  select
    ranked.rank, ranked.player_id, ranked.player_name, ranked.available_questions,
    ranked.played, ranked.correct, round(ranked.accuracy, 2), ranked.smartest_wins,
    ranked.supreme_wins, ranked.title_points, ranked.possible_weekly_points,
    ranked.possible_supreme_points, ranked.possible_title_points,
    round(ranked.correct_score, 2), round(ranked.participation_score, 2),
    round(ranked.accuracy_score, 2), round(ranked.title_points_score, 2),
    round(ranked.supreme_score, 2), round(ranked.weekly_score, 2),
    round(ranked.raw_grandmaster_score, 2)
  from ranked
  order by ranked.rank, ranked.player_name;
$function$;

revoke all on function public.get_grandmaster_standings(integer) from public, anon, authenticated;
grant execute on function public.get_grandmaster_standings(integer) to service_role;
