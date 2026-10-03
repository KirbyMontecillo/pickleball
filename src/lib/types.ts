import type { GameFormat, QueueMode, QueueState, Team } from './queue';
import type { PlayerStats } from './stats';
import type { TreeGame } from './tree';

export type QueueKind = 'standard' | 'winlose';
export type SessionStatus = 'setup' | 'active' | 'completed';


/** Global, persistent player record. Reused across sessions. */
export interface SavedPlayer {
  id: string;
  name: string;
  createdAt: string;
}

export interface Settings {
  kind: QueueKind;   // locked once the session is active
  courts: number;
  format: GameFormat;
  mode: QueueMode;   // rotation style used by the Standard queue
  pointsToWin: number;
  winByTwo: boolean;
}

export interface MatchRecord {
  id: string;
  number: number;
  court: number;
  teamA: string[];
  teamB: string[];
  winner: Team;
  at: string;
}

export interface Session {
  id: string;
  name: string;
  status: SessionStatus;
  settings: Settings;
  playerIds: string[];                 // participants (links to SavedPlayer ids)
  away: string[];                      // participants temporarily stepped out
  names: Record<string, string>;       // name snapshot so history stays readable
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  qs: QueueState;                      // Standard queue (or the bench in Win/Lose)
  tree: TreeGame[];                    // Win/Lose game tree
  stats: Record<string, PlayerStats>;
  matches: MatchRecord[];
}