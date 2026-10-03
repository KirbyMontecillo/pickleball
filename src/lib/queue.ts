// Pure queue logic: no React, no Supabase. Easy to unit test.

export type GameFormat = 'singles' | 'doubles';
export type QueueMode = 'four_off_four_on' | 'winners_stay' | 'custom';
export type Team = 'A' | 'B';

export interface Court {
  number: number;
  teamA: string[]; // player ids
  teamB: string[];
}

export interface QueueState {
  queue: string[];              // available players not on a court, in order
  courts: (Court | null)[];     // index 0 = court 1; null = empty court
}

export const teamSize = (f: GameFormat) => (f === 'doubles' ? 2 : 1);

/** Add a player to the queue. Ignores duplicates (accidentally added twice). */
export function enqueue(state: QueueState, playerId: string): QueueState {
  const onCourt = state.courts.some(
    (c) => c && [...c.teamA, ...c.teamB].includes(playerId)
  );
  if (onCourt || state.queue.includes(playerId)) return state;
  return { ...state, queue: [...state.queue, playerId] };
}

/** Remove a player everywhere (left the session or marked unavailable).
 *  If they were mid-game, that court is cleared and the others return to the front of the queue. */
export function removePlayer(state: QueueState, playerId: string): QueueState {
  let queue = state.queue.filter((id) => id !== playerId);
  const courts = state.courts.map((c) => {
    if (!c) return c;
    const all = [...c.teamA, ...c.teamB];
    if (!all.includes(playerId)) return c;
    queue = [...all.filter((id) => id !== playerId), ...queue];
    return null;
  });
  return { queue, courts };
}

/** Put players on every empty court while the queue has enough people. */
export function fillCourts(state: QueueState, format: GameFormat): QueueState {
  const size = teamSize(format);
  const queue = [...state.queue];
  const courts = state.courts.map((c, i) => {
    if (c || queue.length < size * 2) return c;
    const players = queue.splice(0, size * 2);
    return { number: i + 1, teamA: players.slice(0, size), teamB: players.slice(size) };
  });
  return { queue, courts };
}

/** A rotation strategy decides who stays on the court and who goes to the back. */
interface RotationResult {
  stay: string[];   // players who remain on the court (may be empty)
  toBack: string[]; // players appended to the queue, in order
}
type Strategy = (court: Court, winner: Team) => RotationResult;

export const strategies: Record<QueueMode, Strategy> = {
  four_off_four_on: (court) => ({
    stay: [],
    toBack: [...court.teamA, ...court.teamB],
  }),
  winners_stay: (court, winner) => ({
    stay: winner === 'A' ? court.teamA : court.teamB,
    toBack: winner === 'A' ? court.teamB : court.teamA,
  }),
  // Add new modes here; nothing else needs to change.
  custom: (court) => ({ stay: [], toBack: [...court.teamA, ...court.teamB] }),
};

/** Apply a finished game on one court and refill. Other courts are untouched. */
export function finishGame(
  state: QueueState,
  courtNumber: number,
  winner: Team,
  mode: QueueMode,
  format: GameFormat
): QueueState {
  const idx = courtNumber - 1;
  const court = state.courts[idx];
  if (!court) return state;

  const { stay, toBack } = strategies[mode](court, winner);
  const size = teamSize(format);
  const queue = [...state.queue, ...toBack];
  const courts = [...state.courts];

  if (stay.length === 0 || queue.length < size) {
    // Nobody stays, or not enough challengers: free the court and refill normally.
    courts[idx] = null;
    return fillCourts({ queue: [...stay, ...queue], courts }, format);
  }

  const challengers = queue.splice(0, size);
  const winnersAreA = winner === 'A';
  courts[idx] = {
    number: courtNumber,
    teamA: winnersAreA ? stay : challengers,
    teamB: winnersAreA ? challengers : stay,
  };
  return { queue, courts };
}