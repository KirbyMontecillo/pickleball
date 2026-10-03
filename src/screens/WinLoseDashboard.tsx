import { useState } from 'react';
import { Button, Card, Title } from '../components/ui';
import type { Team } from '../lib/queue';
import type { GameStatus, TreeGame } from '../lib/tree';

interface Props {
  names: Record<string, string>;
  games: TreeGame[];
  courts: number;
  bench: string[];
  playerCount: number;
  canRebuild: boolean;
  onRebuild: () => void;
  onStartNext: () => void;
  onResult: (game: number, winner: Team) => void;
}

const chip: Record<GameStatus, string> = {
  pending: 'bg-gray-100 text-gray-400',
  ready: 'bg-pink-100 text-pink-600',
  playing: 'bg-pink-400 text-white',
  completed: 'bg-gray-50 text-gray-400',
};
const order: Record<GameStatus, number> = { playing: 0, ready: 1, pending: 2, completed: 3 };

export default function WinLoseDashboard({ names, games, courts, bench, playerCount, canRebuild, onRebuild, onStartNext, onResult }: Props) {
  const [active, setActive] = useState<TreeGame | null>(null);
  const label = (ids: string[]) => ids.map((id) => names[id]).join(' + ');
  const onCourt = (c: number) => games.find((g) => g.status === 'playing' && g.court === c);
  const canStart = games.some((g) => g.status === 'ready') && Array.from({ length: courts }, (_, i) => i + 1).some((c) => !onCourt(c));
  const list = [...games].sort((a, b) => order[a.status] - order[b.status] || a.number - b.number);
  const sourceText = (g: TreeGame) =>
    g.source ? `${g.source.take === 'winners' ? 'Winners' : 'Losers'} of G${g.source.a} + G${g.source.b}` : 'Opening game';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Pickleball Session</h1>
        <p className="mt-1 text-gray-400">{playerCount} players · {courts} {courts === 1 ? 'court' : 'courts'}</p>
      </header>

      {Array.from({ length: courts }, (_, i) => {
        const g = onCourt(i + 1);
        return (
          <Card key={i}>
            <Title>Court {i + 1}</Title>
            {g ? (
              <>
                <p className="text-sm text-gray-400">Game {g.number}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{label(g.teamA)}</p>
                <p className="my-2 text-sm font-medium text-pink-300">vs</p>
                <p className="text-2xl font-semibold text-gray-900">{label(g.teamB)}</p>
                <Button className="mt-5" onClick={() => setActive(g)}>Record result</Button>
              </>
            ) : (
              <p className="py-4 text-gray-400">Empty.</p>
            )}
          </Card>
        );
      })}

      {canStart && <Button onClick={onStartNext}>Start next game</Button>}

      <Card>
        <Title>Game tree</Title>
        {games.length === 0 && <p className="text-gray-400">Needs at least 4 players to create games.</p>}
        <ul className="space-y-4">
          {list.map((g) => (
            <li key={g.number} className={g.status === 'completed' ? 'opacity-60' : ''}>
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">Game {g.number}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${chip[g.status]}`}>{g.status}</span>
              </div>
              <p className="text-sm text-gray-400">{sourceText(g)}</p>
              {g.status !== 'pending' && (
                <p className="mt-1 text-gray-900">
                  {label(g.teamA)} <span className="text-pink-300">vs</span> {label(g.teamB)}
                </p>
              )}
              {g.status === 'completed' && (
                <p className="text-sm text-pink-500">Won: {label(g.winner === 'A' ? g.teamA : g.teamB)}</p>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {bench.length > 0 && (
        <Card>
          <Title>Bench</Title>
          <p className="text-gray-900">{bench.map((id) => names[id]).join(', ')}</p>
          <p className="mt-2 text-sm text-gray-400">Not part of the tree yet.</p>
          {canRebuild && <Button variant="soft" className="mt-4" onClick={onRebuild}>Rebuild with all players</Button>}
        </Card>
      )}

      {active && (
        <div className="fixed inset-0 z-20 flex items-end bg-black/20" onClick={() => setActive(null)}>
          <div className="mx-auto w-full max-w-md space-y-3 rounded-t-3xl bg-white p-6 pb-10" onClick={(e) => e.stopPropagation()}>
            <p className="mb-2 text-center text-sm font-semibold uppercase tracking-widest text-pink-400">
              Game {active.number}: who won?
            </p>
            {(['A', 'B'] as Team[]).map((t) => (
              <Button
                key={t}
                variant={t === 'A' ? 'primary' : 'soft'}
                onClick={() => { onResult(active.number, t); setActive(null); }}
              >
                {label(t === 'A' ? active.teamA : active.teamB)}
              </Button>
            ))}
            <button className="w-full py-3 text-gray-400" onClick={() => setActive(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}