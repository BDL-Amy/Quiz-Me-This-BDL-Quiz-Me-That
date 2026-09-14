alter table public.grandmaster_winners
  drop constraint if exists grandmaster_winners_pkey;

alter table public.grandmaster_winners
  add constraint grandmaster_winners_pkey
  primary key (competition_year, player_id);

comment on table public.grandmaster_winners is
  'Official annual BDL Grandmaster title holders. More than one player may hold the title in the same year when the highest final score is tied.';

grant delete on table public.grandmaster_winners to service_role;

create or replace function public.award_grandmaster_winners(p_year integer)
returns setof public.grandmaster_winners
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_brussels_year integer := extract(
    year from current_timestamp at time zone 'Europe/Brussels'
  )::integer;
begin
  if p_year < 2026 or p_year >= current_brussels_year then
    raise exception 'Grandmaster titles can only be awarded for a completed quiz year';
  end if;

  delete from public.grandmaster_winners
  where competition_year = p_year;

  insert into public.grandmaster_winners (
    competition_year,
    player_id,
    player_name,
    grandmaster_score,
    correct_score,
    participation_score,
    accuracy_score,
    title_points_score,
    supreme_score,
    weekly_score
  )
  select
    p_year,
    standings.player_id,
    standings.player_name,
    standings.grandmaster_score,
    standings.correct_score,
    standings.participation_score,
    standings.accuracy_score,
    standings.title_points_score,
    standings.supreme_score,
    standings.weekly_score
  from public.get_grandmaster_standings(p_year) as standings
  where standings.rank = 1;

  return query
  select winners.*
  from public.grandmaster_winners as winners
  where winners.competition_year = p_year
  order by winners.player_name;
end;
$$;

revoke all on function public.award_grandmaster_winners(integer)
  from public, anon, authenticated;
grant execute on function public.award_grandmaster_winners(integer)
  to service_role;

comment on function public.award_grandmaster_winners(integer) is
  'Stores every rank-1 player as an official BDL Grandmaster for a completed year. Equal highest final scores therefore create shared title holders.';
