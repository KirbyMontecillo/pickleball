import { useState } from 'react';
import { Button, Card, Segmented, Title } from '../components/ui';
import { teamSize, type Court, type QueueState, type Team } from '../lib/queue';
import type { Settings } from '../lib/types';

interface Props {
  names: Record<string, string>;
  qs: QueueState;
  settings: Settings;
  playerCount: number;
  onSettings: (p: Partial<Settings>) => void;
  onStart: () => void;
  onResult: (court: number, winner: Team) => void;
}

export default function Dashboard({ names, qs, settings, playerCount, onSettings, onStart, onResult }: Props) {
  const [active, setActive] = useState<Court | null>(null);
  const label = (ids: string[]) => ids.map((id) => names[id]).join(' + ');
  const size = teamSize(settings.format);
  const nextUp = qs.queue.slice(0, size * 2);
  const waiting = qs.queue.slice(size * 2);
  const canStart = qs.courts.some((c) => !c) && qs.queue.length >= size * 2;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Pickleball Session</h1>
        <p className="mt-1 text-gray-400">
          {playerCount} players · {settings.courts} {settings.courts === 1 ? 'court' : 'courts'}
        </p>
      </header>

      {qs.courts.map((court, i) => (
        <Card key={i}>
          <Title>Court {i + 1}</Title>
          {court ? (
            <>
              <p className="text-2xl font-semibold text-gray-900">{label(court.teamA)}</p>
              <p className="my-2 text-sm font-medium text-pink-300">vs</p>
              <p className="text-2xl font-semibold text-gray-900">{label(court.teamB)}</p>
              <Button className="mt-5" onClick={() => setActive(court)}>Record result</Button>
            </>
          ) : (
            <p className="py-4 text-gray-400">Empty. Needs {size * 2} players in the queue.</p>
          )}
        </Card>
      ))}

      {canStart && <Button onClick={onStart}>Start game</Button>}

      <Card>
        <Title>Next up</Title>
        {nextUp.length === 0 ? (
          <p className="text-gray-400">Nobody in the queue.</p>
        ) : (
          <ol className="space-y-3">
            {nextUp.map((id, i) => (
              <li key={id} className="flex items-center gap-4 text-xl text-gray-900">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-50 text-sm font-semibold text-pink-500">
                  {i + 1}
                </span>
                {names[id]}
              </li>
            ))}
          </ol>
        )}
        {waiting.length > 0 && (
          <p className="mt-5 border-t border-pink-50 pt-4 text-gray-400">
            Waiting: {waiting.map((id) => names[id]).join(', ')}
          </p>
        )}
      </Card>

      <Card>
        <Title>Game settings</Title>
        <div className="space-y-5">
          <Segmented
            value={settings.courts}
            onChange={(courts) => onSettings({ courts })}
            options={[1, 2, 3, 4].map((n) => ({ value: n, label: `${n} court${n > 1 ? 's' : ''}` }))}
          />
          <Segmented
            value={settings.format}
            onChange={(format) => onSettings({ format })}
            options={[{ value: 'doubles', label: 'Doubles' }, { value: 'singles', label: 'Singles' }]}
          />
          <Segmented
            value={settings.mode}
            onChange={(mode) => onSettings({ mode })}
            options={[{ value: 'four_off_four_on', label: '4 off, 4 on' }, { value: 'winners_stay', label: 'Winners stay' }]}
          />
        </div>
      </Card>

      {active && (
        <div className="fixed inset-0 z-20 flex items-end bg-black/20" onClick={() => setActive(null)}>
          <div className="mx-auto w-full max-w-md space-y-3 rounded-t-3xl bg-white p-6 pb-10" onClick={(e) => e.stopPropagation()}>
            <p className="mb-2 text-center text-sm font-semibold uppercase tracking-widest text-pink-400">
              Court {active.number}: who won?
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