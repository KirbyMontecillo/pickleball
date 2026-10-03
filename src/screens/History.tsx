import { useState } from 'react';
import { Button, Card, Title } from '../components/ui';
import { durationLabel, modeLabel, statsList } from '../lib/session';
import type { Session } from '../lib/types';
import Leaderboard from './Leaderboard';

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

interface Props {
  sessions: Session[]; // completed, newest first
  onPlayAgain: (s: Session) => void;
}

export default function History({ sessions, onPlayAgain }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = sessions.find((s) => s.id === openId);

  if (open) {
    const nm = (ids: string[]) => ids.map((id) => open.names[id] ?? '?').join(' + ');
    const duration = durationLabel(open);
    return (
      <div className="space-y-6">
        <button onClick={() => setOpenId(null)} className="min-h-11 text-sm font-semibold text-pink-400">← History</button>
        <header>
          <h1 className="text-3xl font-bold text-gray-900">{open.name}</h1>
          <p className="mt-1 text-gray-400">
            {fmtDate(open.endedAt)} · {modeLabel(open.settings.kind)} · {open.playerIds.length} players · {open.settings.courts}{' '}
            {open.settings.courts === 1 ? 'court' : 'courts'}{duration && ` · ${duration}`}
          </p>
        </header>
        <Button onClick={() => onPlayAgain(open)}>Play Again</Button>

        <Card>
          <Title>Players</Title>
          <p className="text-lg text-gray-900">{open.playerIds.map((id) => open.names[id] ?? '?').join(', ')}</p>
        </Card>

        <Leaderboard stats={statsList(open)} embedded />

        <Card>
          <Title>Games ({open.matches.length})</Title>
          {open.matches.length === 0 && <p className="text-gray-400">No games were played.</p>}
          <ul className="space-y-5">
            {open.matches.map((m) => (
              <li key={m.id}>
                <p className="text-sm text-gray-400">Game {m.number}{m.court ? ` · Court ${m.court}` : ''}</p>
                <p className={m.winner === 'A' ? 'text-lg font-semibold text-pink-500' : 'text-lg text-gray-400'}>
                  {m.winner === 'A' && '🏆 '}{nm(m.teamA)}
                </p>
                <p className={m.winner === 'B' ? 'text-lg font-semibold text-pink-500' : 'text-lg text-gray-400'}>
                  {m.winner === 'B' && '🏆 '}{nm(m.teamB)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">History</h1>
        <p className="mt-1 text-gray-400">Completed sessions</p>
      </header>
      {sessions.length === 0 && <p className="py-8 text-center text-gray-400">Finished sessions show up here.</p>}
      {sessions.map((s) => {
        const duration = durationLabel(s);
        return (
          <button key={s.id} onClick={() => setOpenId(s.id)} className="w-full rounded-3xl border border-pink-100 bg-white p-5 text-left">
            <p className="text-xl font-semibold text-gray-900">{s.name}</p>
            <p className="mt-1 text-gray-400">{fmtDate(s.endedAt)}</p>
            <p className="mt-3 text-gray-900">{modeLabel(s.settings.kind)}</p>
            <p className="text-gray-400">
              {s.playerIds.length} players · {s.settings.courts} {s.settings.courts === 1 ? 'court' : 'courts'}
            </p>
            <p className="mt-2 text-sm font-semibold text-pink-500">Completed{duration && ` · ${duration}`}</p>
          </button>
        );
      })}
    </div>
  );
}