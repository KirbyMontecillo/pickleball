import type { Team } from './queue';

export interface PlayerStats {
  playerId: string;
  name: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  waitingCount: number;
  consecutiveGames: number;
  currentStreak: number;
  longestStreak: number;
}

export const emptyStats = (playerId: string, name: string): PlayerStats => ({
  playerId, name, gamesPlayed: 0, wins: 0, losses: 0,
  waitingCount: 0, consecutiveGames: 0, currentStreak: 0, longestStreak: 0,
});

export const winPct = (s: PlayerStats) =>
  s.gamesPlayed === 0 ? 0 : (s.wins / s.gamesPlayed) * 100;

/** Update stats after one game. `waitingIds` = everyone still in the queue. */
export function applyResult(
  stats: Record<string, PlayerStats>,
  winners: string[],
  losers: string[],
  waitingIds: string[]
): Record<string, PlayerStats> {
  const next = { ...stats };
  const bump = (id: string, won: boolean) => {
    const s = next[id];
    if (!s) return;
    const streak = won ? s.currentStreak + 1 : 0;
    next[id] = {
      ...s,
      gamesPlayed: s.gamesPlayed + 1,
      wins: s.wins + (won ? 1 : 0),
      losses: s.losses + (won ? 0 : 1),
      currentStreak: streak,
      longestStreak: Math.max(s.longestStreak, streak),
      consecutiveGames: s.consecutiveGames + 1,
      waitingCount: s.waitingCount,
    };
  };
  winners.forEach((id) => bump(id, true));
  losers.forEach((id) => bump(id, false));
  waitingIds.forEach((id) => {
    const s = next[id];
    if (s) next[id] = { ...s, waitingCount: s.waitingCount + 1, consecutiveGames: 0 };
  });
  return next;
}

/** Default ranking: most wins, then win %, then most games played. */
export type Comparator = (a: PlayerStats, b: PlayerStats) => number;

export const defaultRanking: Comparator = (a, b) =>
  b.wins - a.wins || winPct(b) - winPct(a) || b.gamesPlayed - a.gamesPlayed;

export const rank = (
  stats: PlayerStats[],
  cmp: Comparator = defaultRanking
): PlayerStats[] => [...stats].sort(cmp);

/** Rebuild stats from a list of non-voided matches. This is how "undo" works:
 *  void the match, then recompute. Matches must be in chronological order. */
export interface MatchRecord {
  winners: string[];
  losers: string[];
  waiting: string[]; // ids in the queue when the game finished
}

export function computeStats(
  players: { id: string; name: string }[],
  matches: MatchRecord[]
): Record<string, PlayerStats> {
  let stats: Record<string, PlayerStats> = {};
  players.forEach((p) => (stats[p.id] = emptyStats(p.id, p.name)));
  matches.forEach((m) => (stats = applyResult(stats, m.winners, m.losers, m.waiting)));
  return stats;
}

export type { Team };