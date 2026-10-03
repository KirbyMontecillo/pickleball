import { useState, type ReactNode } from 'react';
import { Button, Card, Segmented, Title } from '../components/ui';
import type { QueueKind, SavedPlayer, Session, Settings } from '../lib/types';

interface Props {
  draft: Session;
  players: SavedPlayer[];
  previous: Session[];
  onName: (name: string) => void;
  onSettings: (p: Partial<Settings>) => void;
  onSelect: (ids: string[]) => void;
  onAdd: (name: string) => { error?: string; id?: string };
  onStart: () => void;
  onCancel: () => void;
}

const modes: { kind: QueueKind; icon: string; title: string; desc: string }[] = [
  { kind: 'standard', icon: '🏓', title: 'Standard Queue', desc: 'Normal open-play rotation' },
  { kind: 'winlose', icon: '🏆', title: 'Win/Lose Rotation', desc: 'Winners and losers advance through a game tree' },
];

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-300">{label}</p>
    {children}
  </div>
);

export default function Setup({ draft, players, previous, onName, onSettings, onSelect, onAdd, onStart, onCancel }: Props) {
  const [query, setQuery] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const s = draft.settings;
  const selected = draft.playerIds;
  const shown = players
    .filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  const allShownSelected = shown.length > 0 && shown.every((p) => selected.includes(p.id));

  const toggle = (id: string) => onSelect(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const toggleAll = () =>
    onSelect(allShownSelected
      ? selected.filter((id) => !shown.some((p) => p.id === id))
      : [...new Set([...selected, ...shown.map((p) => p.id)])]);
  const usePrevious = (sess: Session) =>
    onSelect(sess.playerIds.filter((id) => players.some((p) => p.id === id)));
  const add = () => {
    const r = onAdd(newName);
    setError(r.error ?? null);
    if (r.id) { onSelect([...selected, r.id]); setNewName(''); }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Create session</h1>
        <p className="mt-1 text-gray-400">Pick players and how games are generated.</p>
      </header>

      <Card>
        <Title>Name</Title>
        <input
          value={draft.name}
          onChange={(e) => onName(e.target.value)}
          className="min-h-14 w-full rounded-2xl border border-pink-100 px-5 text-lg outline-none focus:border-pink-300"
        />
      </Card>

      <Card>
        <Title>Players</Title>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search players..."
          className="min-h-14 w-full rounded-2xl border border-pink-100 px-5 text-lg outline-none focus:border-pink-300"
        />
        {previous.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {previous.slice(0, 3).map((p) => (
              <button key={p.id} onClick={() => usePrevious(p)} className="min-h-11 rounded-full bg-pink-50 px-4 text-sm font-semibold text-pink-600">
                From {p.name}
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between">
          <p className="font-semibold text-gray-900">Selected: {selected.length} {selected.length === 1 ? 'player' : 'players'}</p>
          {shown.length > 0 && (
            <button onClick={toggleAll} className="min-h-11 text-sm font-semibold text-pink-400">
              {allShownSelected ? 'Clear' : 'Select all'}
            </button>
          )}
        </div>
        <ul className="mt-1 divide-y divide-pink-50">
          {shown.map((p) => {
            const on = selected.includes(p.id);
            return (
              <li key={p.id}>
                <button onClick={() => toggle(p.id)} className="flex min-h-14 w-full items-center gap-4 text-left text-xl text-gray-900">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-sm ${on ? 'border-pink-400 bg-pink-400 text-white' : 'border-pink-200 text-transparent'}`}>✓</span>
                  {p.name}
                </button>
              </li>
            );
          })}
        </ul>
        {players.length === 0 && <p className="py-4 text-gray-400">No saved players yet. Add your first one below.</p>}
        <div className="mt-4 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="New player name"
            className="min-h-14 min-w-0 flex-1 rounded-2xl border border-pink-100 px-5 text-lg outline-none focus:border-pink-300"
          />
          <button onClick={add} disabled={!newName.trim()} className="min-h-14 rounded-2xl bg-pink-50 px-5 font-semibold text-pink-600 disabled:opacity-40">
            + Add
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-pink-500">{error}</p>}
      </Card>

      <Card>
        <Title>Game settings</Title>
        <div className="space-y-5">
          <Field label="Courts">
            <Segmented value={s.courts} onChange={(courts) => onSettings({ courts })}
              options={[1, 2, 3, 4].map((n) => ({ value: n, label: `${n}` }))} />
          </Field>
          <Field label="Format">
            {s.kind === 'standard' ? (
              <Segmented value={s.format} onChange={(format) => onSettings({ format })}
                options={[{ value: 'doubles', label: 'Doubles' }, { value: 'singles', label: 'Singles' }]} />
            ) : (
              <p className="text-gray-900">Doubles</p>
            )}
          </Field>
          <Field label="Points to win">
            <Segmented value={s.pointsToWin} onChange={(pointsToWin) => onSettings({ pointsToWin })}
              options={[11, 15, 21].map((n) => ({ value: n, label: `${n}` }))} />
          </Field>
          <Field label="Win by two">
            <Segmented value={s.winByTwo ? 'yes' : 'no'} onChange={(v) => onSettings({ winByTwo: v === 'yes' })}
              options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
          </Field>
        </div>
      </Card>

      <div>
        <Title>Queue mode</Title>
        <div className="space-y-3">
          {modes.map((m) => (
            <button
              key={m.kind}
              onClick={() => onSettings(m.kind === 'winlose' ? { kind: m.kind, format: 'doubles' } : { kind: m.kind })}
              className={`w-full rounded-3xl border p-5 text-left transition ${s.kind === m.kind ? 'border-pink-400 bg-pink-50' : 'border-pink-100 bg-white'}`}
            >
              <p className="text-xl font-semibold text-gray-900">{m.icon} {m.title}</p>
              <p className="mt-1 text-gray-400">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {s.kind === 'standard' && (
        <Segmented value={s.mode} onChange={(mode) => onSettings({ mode })}
          options={[{ value: 'four_off_four_on', label: '4 off, 4 on' }, { value: 'winners_stay', label: 'Winners stay' }]} />
      )}

      <Button onClick={onStart}>Start session</Button>
      <button onClick={onCancel} className="min-h-11 w-full text-gray-400">Cancel</button>
    </div>
  );
}