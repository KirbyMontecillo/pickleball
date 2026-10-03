// Pure session operations: Session in, Session out. No React.
import { enqueue, fillCourts, finishGame, removePlayer, type QueueState, type Team } from './queue';
import { applyResult, emptyStats, type PlayerStats } from './stats';
import { completeGame, createTree, readyGames, startGame } from './tree';
import type { MatchRecord, Session, Settings } from './types';

export const defaultSettings: Settings = {
  kind: 'standard', courts: 1, format: 'doubles', mode: 'four_off_four_on', pointsToWin: 11, winByTwo: true,
};

export const modeLabel = (kind: Settings['kind']) => (kind === 'winlose' ? '🏆 Win/Lose Rotation' : '🏓 Standard Queue');

export function newSession(name: string, settings: Settings, playerIds: string[]): Session {
  return {
    id: crypto.randomUUID(), name, status: 'setup', settings, playerIds, away: [], names: {},
    createdAt: new Date().toISOString(), qs: { queue: [], courts: [] }, tree: [], stats: {}, matches: [],
  };
}

/** SETUP -> ACTIVE: build the fresh queue or tree. Never copies old games. */
export function beginSession(s: Session, names: Record<string, string>): Session {
  const { courts, format, kind } = s.settings;
  const empty = Array(courts).fill(null);
  const stats = Object.fromEntries(s.playerIds.map((id) => [id, emptyStats(id, names[id] ?? '?')]));
  let qs: QueueState;
  let tree = [] as Session['tree'];
  if (kind === 'winlose') {
    const t = createTree(s.playerIds);
    tree = t.games;
    qs = { queue: t.bench, courts: empty };
  } else {
    qs = fillCourts({ queue: [...s.playerIds], courts: empty }, format);
  }
  return { ...s, status: 'active', startedAt: new Date().toISOString(), names: { ...names }, stats, qs, tree, matches: [], away: [] };
}

export const endSession = (s: Session): Session => ({ ...s, status: 'completed', endedAt: new Date().toISOString() });

export const hasPlaying = (s: Session) =>
  s.settings.kind === 'winlose' ? s.tree.some((g) => g.status === 'playing') : s.qs.courts.some(Boolean);

export const playerLocked = (s: Session, id: string) =>
  s.settings.kind === 'winlose' && s.tree.some((g) => g.teamA.includes(id) || g.teamB.includes(id));

export const canRebuild = (s: Session) =>
  s.settings.kind === 'winlose' && !s.tree.some((g) => g.status === 'playing' || g.status === 'completed');

const record = (s: Session, number: number, court: number, a: string[], b: string[], winner: Team): MatchRecord[] => [
  ...s.matches,
  { id: crypto.randomUUID(), number, court, teamA: a, teamB: b, winner, at: new Date().toISOString() },
];

export function recordStandard(s: Session, courtNumber: number, winner: Team): Session {
  const court = s.qs.courts[courtNumber - 1];
  if (!court) return s;
  const winners = winner === 'A' ? court.teamA : court.teamB;
  const losers = winner === 'A' ? court.teamB : court.teamA;
  return {
    ...s,
    stats: applyResult(s.stats, winners, losers, s.qs.queue),
    qs: finishGame(s.qs, courtNumber, winner, s.settings.mode, s.settings.format),
    matches: record(s, s.matches.length + 1, courtNumber, court.teamA, court.teamB, winner),
  };
}

export function recordTree(s: Session, number: number, winner: Team): Session {
  const g = s.tree.find((x) => x.number === number);
  if (!g) return s;
  const winners = winner === 'A' ? g.teamA : g.teamB;
  const losers = winner === 'A' ? g.teamB : g.teamA;
  const waiting = s.tree.filter((x) => x.status === 'ready').flatMap((x) => [...x.teamA, ...x.teamB]);
  return {
    ...s,
    stats: applyResult(s.stats, winners, losers, waiting),
    tree: completeGame(s.tree, number, winner),
    matches: record(s, number, g.court ?? 0, g.teamA, g.teamB, winner),
  };
}

export function startNextTree(s: Session): Session {
  let games = s.tree;
  for (let c = 1; c <= s.settings.courts; c++) {
    if (games.some((g) => g.status === 'playing' && g.court === c)) continue;
    const next = readyGames(games)[0];
    if (!next) break;
    games = startGame(games, next.number, c);
  }
  return { ...s, tree: games };
}

export function rebuildTree(s: Session): Session {
  const ids = s.playerIds.filter((id) => !s.away.includes(id));
  const t = createTree(ids);
  return { ...s, tree: t.games, qs: { queue: t.bench, courts: Array(s.settings.courts).fill(null) } };
}

/** Late joiner: added to the queue (Standard) or the bench (Win/Lose). */
export function addToSession(s: Session, id: string, name: string): Session {
  if (s.playerIds.includes(id)) return s;
  return {
    ...s, playerIds: [...s.playerIds, id], names: { ...s.names, [id]: name },
    stats: { ...s.stats, [id]: emptyStats(id, name) }, qs: enqueue(s.qs, id),
  };
}

export function toggleAway(s: Session, id: string): Session {
  if (playerLocked(s, id)) return s;
  const isAway = s.away.includes(id);
  return {
    ...s,
    away: isAway ? s.away.filter((x) => x !== id) : [...s.away, id],
    qs: isAway ? enqueue(s.qs, id) : removePlayer(s.qs, id),
  };
}

export function updateSettings(s: Session, patch: Partial<Settings>): Session {
  const settings = { ...s.settings, ...patch };
  if (s.status !== 'active' || patch.courts === undefined) return { ...s, settings };
  const n = patch.courts;
  const courts = s.qs.courts.slice(0, n);
  const dropped = s.qs.courts.slice(n).flatMap((c) => (c ? [...c.teamA, ...c.teamB] : []));
  while (courts.length < n) courts.push(null);
  return { ...s, settings, qs: { queue: [...dropped, ...s.qs.queue], courts } };
}

export const statsList = (s: Session): PlayerStats[] =>
  Object.values(s.stats).map((st) => ({ ...st, name: s.names[st.playerId] ?? st.name }));

/** Totals per player across every started session (including the active one). */
export function overallStats(sessions: Session[]): PlayerStats[] {
  const total: Record<string, PlayerStats> = {};
  for (const s of sessions) {
    if (s.status === 'setup') continue;
    for (const st of statsList(s)) {
      const t = total[st.playerId] ?? emptyStats(st.playerId, st.name);
      total[st.playerId] = {
        ...t,
        name: st.name,
        gamesPlayed: t.gamesPlayed + st.gamesPlayed,
        wins: t.wins + st.wins,
        losses: t.losses + st.losses,
        waitingCount: t.waitingCount + st.waitingCount,
        longestStreak: Math.max(t.longestStreak, st.longestStreak),
      };
    }
  }
  return Object.values(total).filter((t) => t.gamesPlayed > 0);
}

export function durationLabel(s: Session) {
  if (!s.startedAt || !s.endedAt) return '';
  const m = Math.max(1, Math.round((Date.parse(s.endedAt) - Date.parse(s.startedAt)) / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
}