// Win/Lose rotation: a game tree / dependency graph. Not a FIFO queue.
// Pure logic, no React or Supabase. Independent from queue.ts.
import type { Team } from './queue';

export type GameStatus = 'pending' | 'ready' | 'playing' | 'completed';

export interface TreeGame {
  number: number;
  /** null for opening games. Otherwise: winners/losers of games a and b. */
  source: { a: number; b: number; take: 'winners' | 'losers' } | null;
  teamA: string[]; // empty until the game is ready
  teamB: string[];
  status: GameStatus;
  court?: number;
  winner?: Team;
  doneSeq?: number; // completion order, used for "recent partners"
}

const LOOKAHEAD = 8; // how many unfinished games to keep generated ahead
const RECENT_GAMES = 6;

const key = (team: string[]) => [...team].sort().join('|');

/** Combine two pairs into two new teams, always splitting the old partners.
 *  Picks the option that repeats the fewest recent partnerships. Easy to improve later. */
export function mixPairs(p1: string[], p2: string[], recent: Set<string>) {
  const options = [
    { teamA: [p1[0], p2[0]], teamB: [p1[1], p2[1]] },
    { teamA: [p1[0], p2[1]], teamB: [p1[1], p2[0]] },
  ];
  const cost = (o: (typeof options)[number]) =>
    Number(recent.has(key(o.teamA))) + Number(recent.has(key(o.teamB)));
  return cost(options[1]) < cost(options[0]) ? options[1] : options[0];
}

const split = (g: TreeGame) =>
  g.winner === 'A' ? { win: g.teamA, lose: g.teamB } : { win: g.teamB, lose: g.teamA };

function recentPartners(games: TreeGame[]) {
  const recent = games
    .filter((g) => g.status === 'completed')
    .sort((a, b) => (b.doneSeq ?? 0) - (a.doneSeq ?? 0))
    .slice(0, RECENT_GAMES);
  return new Set(recent.flatMap((g) => [key(g.teamA), key(g.teamB)]));
}

/** Pending games whose two source games are done become Ready, with mixed teams. */
function resolveReady(games: TreeGame[]): TreeGame[] {
  const byNumber = new Map(games.map((g) => [g.number, g]));
  const recent = recentPartners(games);
  return games.map((g) => {
    if (g.status !== 'pending' || !g.source) return g;
    const a = byNumber.get(g.source.a);
    const b = byNumber.get(g.source.b);
    if (!a || !b || a.status !== 'completed' || b.status !== 'completed') return g;
    const pick = (x: TreeGame) => (g.source!.take === 'winners' ? split(x).win : split(x).lose);
    return { ...g, ...mixPairs(pick(a), pick(b), recent), status: 'ready' as const };
  });
}

/** Games are paired in order: (1,2), (3,4), (5,6)... Each pair spawns a winners game
 *  then a losers game. Generated lazily so the tree can go on indefinitely. */
function expand(games: TreeGame[]): TreeGame[] {
  const openingCount = games.filter((g) => !g.source).length;
  const out = [...games];
  for (;;) {
    const pair = (out.length - openingCount) / 2 + 1;
    const a = 2 * pair - 1;
    const b = 2 * pair;
    const open = out.filter((g) => g.status !== 'completed').length;
    if (b > out.length || open >= LOOKAHEAD) break;
    for (const take of ['winners', 'losers'] as const) {
      out.push({ number: out.length + 1, source: { a, b, take }, teamA: [], teamB: [], status: 'pending' });
    }
  }
  return out;
}

/** Opening games use groups of 4 in the given order. Leftover players go on the bench. */
export function createTree(playerIds: string[]) {
  const count = Math.floor(playerIds.length / 4);
  const opening: TreeGame[] = Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    source: null,
    teamA: [playerIds[4 * i], playerIds[4 * i + 1]],
    teamB: [playerIds[4 * i + 2], playerIds[4 * i + 3]],
    status: 'ready' as const,
  }));
  return { games: expand(opening), bench: playerIds.slice(count * 4) };
}

export const readyGames = (games: TreeGame[]) =>
  games.filter((g) => g.status === 'ready').sort((a, b) => a.number - b.number);

export const startGame = (games: TreeGame[], number: number, court: number): TreeGame[] =>
  games.map((g) => (g.number === number ? { ...g, status: 'playing', court } : g));

export const cancelGame = (games: TreeGame[], number: number): TreeGame[] =>
  games.map((g) => (g.number === number ? { ...g, status: 'ready', court: undefined } : g));

export function completeGame(games: TreeGame[], number: number, winner: Team): TreeGame[] {
  const seq = Math.max(0, ...games.map((g) => g.doneSeq ?? 0)) + 1;
  const marked = games.map((g): TreeGame =>
    g.number === number ? { ...g, status: 'completed', winner, court: undefined, doneSeq: seq } : g
  );
  return resolveReady(expand(marked));
}