import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const url = Deno.env.get("SUPABASE_URL")!;
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(url, key, { auth: { persistSession: false } });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
};

const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", ...cors },
});

const validDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
const validMonth = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-01$/.test(value);
const addDays = (value: string, days: number) => {
  const date = new Date(value + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const monthEnd = (value: string) => {
  const date = new Date(value + "T00:00:00Z");
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(0);
  return date.toISOString().slice(0, 10);
};
const QUIZ_START = "2026-08-11";
const maxDate = (a: string, b: string) => a > b ? a : b;
const minDate = (a: string, b: string) => a < b ? a : b;

function effectiveQuizDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  let date = `${get("year")}-${get("month")}-${get("day")}`;
  if (Number(get("hour") || 0) < 8) date = addDays(date, -1);
  return date;
}

function availableDays(start: string, end: string, effective: string) {
  const first = maxDate(start, QUIZ_START);
  const last = minDate(end, effective);
  if (last < first) return 0;
  return Math.floor(
    (Date.parse(last + "T00:00:00Z") - Date.parse(first + "T00:00:00Z")) / 86400000,
  ) + 1;
}

function normalizedName(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
}

const isInternalPlayer = (name: unknown) =>
  ["amy", "amy.test", "drbdl", "drbdl.test"].includes(normalizedName(name));

function weightedAccuracy(correct: number, played: number, available: number) {
  if (available <= 0) return 0;
  return Math.round(((0.75 * correct) + (0.25 * played)) / available * 100);
}

const isReleased = (row: any, effective: string) => String(row.quiz_date || "") < effective;

function ownStats(rows: any[], playerId: string, effective: string) {
  const mine = rows.filter((row: any) => String(row.player_id || "") === playerId);
  const played = new Set(mine.map((row: any) => String(row.quiz_date || "")).filter(Boolean)).size;
  const released = mine.filter((row: any) => isReleased(row, effective));
  const releasedPlayed = new Set(
    released.map((row: any) => String(row.quiz_date || "")).filter(Boolean),
  ).size;
  const correct = released.filter((row: any) => row.is_correct === true).length;
  const incorrect = released.filter((row: any) => row.is_correct === false).length;
  return {
    played,
    correct,
    incorrect,
    accuracy: releasedPlayed ? Math.round(correct / releasedPlayed * 100) : 0,
  };
}

async function playerOwnsIdentity(playerId: string, playerName: string) {
  if (!playerId || !playerName) return false;
  const { data, error } = await db.from("quiz_username_claims")
    .select("allowed_player_ids")
    .eq("normalized_name", normalizedName(playerName))
    .maybeSingle();
  if (error || !data) return false;
  const ids = Array.isArray(data.allowed_player_ids)
    ? data.allowed_player_ids.map(String)
    : [];
  return ids.includes(playerId);
}

async function isInternalPlayerId(playerId: string) {
  if (!playerId) return false;
  const { data, error } = await db.from("quiz_username_claims")
    .select("normalized_name,allowed_player_ids")
    .in("normalized_name", ["amy", "amy.test", "drbdl", "drbdl.test"]);
  if (error) return false;
  return (data ?? []).some((row: any) => {
    const ids = Array.isArray(row.allowed_player_ids)
      ? row.allowed_player_ids.map(String)
      : [];
    return ids.includes(playerId);
  });
}

function publicRankRow(row: any) {
  return {
    player_name: row.player_name,
    correct: row.correct,
    played: row.played,
    accuracy: row.accuracy,
    rank: row.rank,
  };
}

function buildLeaderboard(
  rows: any[],
  playerId: string,
  allowed: Set<string>,
  available: number,
  effective: string,
  limit: number | null = null,
) {
  const by = new Map<string, any>();
  for (const row of rows) {
    const name = String(row.player_name || "").trim();
    const pid = String(row.player_id || "").trim();
    if (!pid || !name || isInternalPlayer(name) || !allowed.has(pid)) continue;
    let player = by.get(pid);
    if (!player) {
      player = { player_id: pid, player_name: name, correct: 0, dates: new Set<string>() };
      by.set(pid, player);
    }
    player.player_name = name;
    if (isReleased(row, effective) && row.is_correct === true) player.correct++;
    if (row.quiz_date) player.dates.add(String(row.quiz_date));
  }
  const sorted = [...by.values()]
    .map((player) => ({
      player_id: player.player_id,
      player_name: player.player_name,
      correct: player.correct,
      played: player.dates.size,
      accuracy: weightedAccuracy(player.correct, player.dates.size, available),
    }))
    .sort((a, b) =>
      b.correct - a.correct || b.played - a.played ||
      a.player_name.localeCompare(b.player_name)
    );
  let lastKey = "";
  let rank = 0;
  const ranked = sorted.map((player, index) => {
    const key = `${player.correct}|${player.played}`;
    if (key !== lastKey) {
      rank = index + 1;
      lastKey = key;
    }
    return { ...player, rank };
  });
  const own = ranked.find((player) => player.player_id === playerId) || null;
  const visible = limit ? ranked.slice(0, limit) : ranked;
  return {
    player: own ? publicRankRow(own) : null,
    total_players: ranked.length,
    available_days: available,
    leaderboard: visible.map(publicRankRow),
  };
}

const hiddenLeaderboard = (available: number) => ({
  player: null,
  total_players: 0,
  available_days: available,
  leaderboard: [],
});

const numberValue = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

function publicGrandmasterRow(row: any, rank = numberValue(row.rank)) {
  return {
    rank,
    player_name: String(row.player_name || ""),
    available_questions: numberValue(row.available_questions),
    played: numberValue(row.played),
    correct: numberValue(row.correct),
    accuracy: numberValue(row.accuracy),
    smartest_wins: numberValue(row.smartest_wins),
    supreme_wins: numberValue(row.supreme_wins),
    title_points: numberValue(row.title_points),
    possible_weekly_points: numberValue(row.possible_weekly_points),
    possible_supreme_points: numberValue(row.possible_supreme_points),
    possible_title_points: numberValue(row.possible_title_points),
    correct_score: numberValue(row.correct_score),
    participation_score: numberValue(row.participation_score),
    accuracy_score: numberValue(row.accuracy_score),
    title_points_score: numberValue(row.title_points_score),
    supreme_score: numberValue(row.supreme_score),
    weekly_score: numberValue(row.weekly_score),
    grandmaster_score: numberValue(row.grandmaster_score),
  };
}

function visibleGrandmasterRows(rows: any[], allowed: Set<string>) {
  const visible = rows.filter((row) => allowed.has(String(row.player_id || "")));
  let previousScore: number | null = null;
  let rank = 0;
  return visible.map((row, index) => {
    const score = numberValue(row.grandmaster_score);
    if (previousScore === null || score !== previousScore) rank = index + 1;
    previousScore = score;
    return publicGrandmasterRow(row, rank);
  });
}

const publicWeeklyWinner = (row: any, showStats: boolean) => ({
  week_start: row.week_start,
  week_end: row.week_end,
  player_name: row.player_name,
  ...(showStats
    ? { correct_answers: row.correct_answers, days_played: row.days_played }
    : {}),
});

const publicMonthlyWinner = (row: any, showStats: boolean) => ({
  month_start: row.month_start,
  month_end: row.month_end,
  player_name: row.player_name,
  ...(showStats
    ? { correct_answers: row.correct_answers, days_played: row.days_played }
    : {}),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return out({ success: false, error: "method_not_allowed" }, 405);
  const body = await req.json().catch(() => null);
  if (!body) return out({ success: false, error: "invalid_json" }, 400);

  if (body.action === "week_summary") {
    const pid = String(body.player_id || "").trim();
    const name = String(body.player_name || "").trim();
    if (!pid || !name || !validDate(body.week_start)) {
      return out({ success: false, error: "invalid_request" }, 400);
    }
    if (!(await playerOwnsIdentity(pid, name))) {
      return out({ success: false, error: "not_authorized" }, 403);
    }
    const end = addDays(body.week_start, 6);
    const effective = effectiveQuizDate();
    const { data, error } = await db.from("quiz_answers")
      .select("quiz_date,question_num,answer,is_correct,player_name")
      .eq("player_id", pid)
      .gte("quiz_date", body.week_start)
      .lte("quiz_date", end)
      .order("quiz_date", { ascending: true });
    if (error) return out({ success: false, error: error.message }, 500);
    const rows = data ?? [];
    const released = rows.filter((row: any) => isReleased(row, effective));
    const safeAnswers = rows.map((row: any) =>
      isReleased(row, effective) ? row : { ...row, is_correct: null }
    );
    return out({
      success: true,
      week_start: body.week_start,
      week_end: end,
      player_name: rows.at(-1)?.player_name ?? name,
      answered: rows.length,
      correct: released.filter((row: any) => row.is_correct === true).length,
      answers: safeAnswers,
    });
  }

  if (body.action === "weekly_winner") {
    if (!validDate(body.week_start)) {
      return out({ success: false, error: "invalid_week_start" }, 400);
    }
    const { data, error } = await db.from("weekly_winners")
      .select("week_start,week_end,player_name")
      .eq("week_start", body.week_start)
      .maybeSingle();
    if (error) return out({ success: false, error: error.message }, 500);
    return out({
      success: true,
      winner: data ? { player_name: data.player_name } : null,
      week_start: body.week_start,
      week_end: data?.week_end ?? addDays(body.week_start, 6),
    });
  }

  if (body.action === "dashboard") {
    const pid = String(body.player_id || "").trim();
    const name = String(body.player_name || "").trim();
    if (!pid || !validDate(body.week_start) || !validMonth(body.month_start)) {
      return out({ success: false, error: "invalid_request" }, 400);
    }

    if (!name) {
      if (await isInternalPlayerId(pid)) return out({ success: true, health: true });
      return out({ success: false, error: "invalid_request" }, 400);
    }

    if (!(await playerOwnsIdentity(pid, name))) {
      return out({ success: false, error: "not_authorized" }, 403);
    }

    const weekEnd = addDays(body.week_start, 6);
    const currentMonthEnd = monthEnd(body.month_start);
    const effective = effectiveQuizDate();
    const grandmasterYear = Number(effective.slice(0, 4));
    const weeklyAvailable = availableDays(body.week_start, weekEnd, effective);
    const monthlyAvailable = availableDays(body.month_start, currentMonthEnd, effective);
    const allTimeAvailable = availableDays(QUIZ_START, effective, effective);

    const [week, month, all, lifetime, weeklyWinners, monthlyWinners, preferences, grandmaster, official] =
      await Promise.all([
        db.from("quiz_answers").select("player_id,player_name,quiz_date,is_correct")
          .gte("quiz_date", body.week_start).lte("quiz_date", weekEnd),
        db.from("quiz_answers").select("player_id,player_name,quiz_date,is_correct")
          .gte("quiz_date", body.month_start).lte("quiz_date", currentMonthEnd),
        db.from("quiz_answers").select("player_id,player_name,quiz_date,is_correct"),
        db.from("quiz_answers").select("quiz_date,is_correct,player_name").eq("player_id", pid),
        db.from("weekly_winners")
          .select("week_start,week_end,player_name,correct_answers,days_played")
          .order("week_start", { ascending: false }).limit(100),
        db.from("monthly_winners")
          .select("month_start,month_end,player_name,correct_answers,days_played")
          .order("month_start", { ascending: false }).limit(100),
        db.from("quiz_ranking_preferences").select("player_id,share_ranking"),
        db.rpc("get_grandmaster_standings", { p_year: grandmasterYear }),
        db.from("grandmaster_winners")
          .select("competition_year,player_name,grandmaster_score,awarded_at")
          .order("competition_year", { ascending: false }).limit(20),
      ]);

    const error = week.error || month.error || all.error || lifetime.error ||
      weeklyWinners.error || monthlyWinners.error || preferences.error ||
      grandmaster.error || official.error;
    if (error) return out({ success: false, error: error.message }, 500);

    const allowed = new Set(
      (preferences.data ?? [])
        .filter((row: any) => row.share_ranking === true)
        .map((row: any) => String(row.player_id)),
    );
    const viewerCanSee = allowed.has(pid) || isInternalPlayer(name);
    const lifetimeRows = lifetime.data ?? [];
    const lifetimePlayed = new Set(
      lifetimeRows.map((row: any) => String(row.quiz_date)),
    ).size;
    const lifetimeReleased = lifetimeRows.filter((row: any) => isReleased(row, effective));
    const lifetimeReleasedPlayed = new Set(
      lifetimeReleased.map((row: any) => String(row.quiz_date)),
    ).size;
    const lifetimeCorrect = lifetimeReleased.filter((row: any) => row.is_correct === true).length;
    const lifetimeIncorrect = lifetimeReleased.filter((row: any) => row.is_correct === false).length;

    const weeklyAll = (weeklyWinners.data ?? []).filter((row: any) => !isInternalPlayer(row.player_name));
    const monthlyAll = (monthlyWinners.data ?? []).filter((row: any) => !isInternalPlayer(row.player_name));
    const weeklyHistory = weeklyAll.slice(1);
    const monthlyHistory = monthlyAll.slice(1);
    const weekBoard = viewerCanSee
      ? buildLeaderboard(week.data ?? [], pid, allowed, weeklyAvailable, effective)
      : hiddenLeaderboard(weeklyAvailable);
    const monthBoard = viewerCanSee
      ? buildLeaderboard(month.data ?? [], pid, allowed, monthlyAvailable, effective)
      : hiddenLeaderboard(monthlyAvailable);
    const topBoard = viewerCanSee
      ? buildLeaderboard(all.data ?? [], pid, allowed, allTimeAvailable, effective, 20)
      : hiddenLeaderboard(allTimeAvailable);
    const weekOwn = ownStats(week.data ?? [], pid, effective);
    const monthOwn = ownStats(month.data ?? [], pid, effective);

    const grandmasterRows = grandmaster.data ?? [];
    const grandmasterOwn = grandmasterRows.find(
      (row: any) => String(row.player_id || "") === pid,
    );
    const grandmasterVisible = viewerCanSee
      ? visibleGrandmasterRows(grandmasterRows, allowed)
      : [];
    const firstGrandmasterRow = grandmasterRows[0] ?? {};

    return out({
      success: true,
      ranking_access: viewerCanSee,
      internal_account: isInternalPlayer(name),
      lifetime: {
        played: lifetimePlayed,
        correct: lifetimeCorrect,
        incorrect: lifetimeIncorrect,
        accuracy: lifetimeReleasedPlayed
          ? Math.round(lifetimeCorrect / lifetimeReleasedPlayed * 100)
          : 0,
      },
      week: { start: body.week_start, end: weekEnd, ...weekBoard, player: weekOwn, own_player: weekOwn },
      month: {
        start: body.month_start,
        end: currentMonthEnd,
        ...monthBoard,
        player: monthOwn,
        own_player: monthOwn,
      },
      top20: topBoard,
      grandmaster: {
        year: grandmasterYear,
        weights: {
          correct: 45,
          participation: 25,
          accuracy: 15,
          title_points: 10,
          supreme: 4,
          weekly: 1,
        },
        available_questions: numberValue(firstGrandmasterRow.available_questions),
        possible_title_points: numberValue(firstGrandmasterRow.possible_title_points),
        possible_supreme_points: numberValue(firstGrandmasterRow.possible_supreme_points),
        possible_weekly_points: numberValue(firstGrandmasterRow.possible_weekly_points),
        player: grandmasterOwn ? publicGrandmasterRow(grandmasterOwn) : null,
        total_players: grandmasterVisible.length,
        leaderboard: grandmasterVisible.slice(0, 20),
        official_winners: official.data ?? [],
      },
      history: {
        weekly: weeklyHistory.map((row: any) => publicWeeklyWinner(row, viewerCanSee)),
        monthly: monthlyHistory.map((row: any) => publicMonthlyWinner(row, viewerCanSee)),
      },
    });
  }

  return out({ success: false, error: "unknown_action" }, 400);
});
