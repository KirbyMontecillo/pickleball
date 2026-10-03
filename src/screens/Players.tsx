import { useState } from 'react';
import { Button, Card } from '../components/ui';
import { playerLocked } from '../lib/session';
import type { SavedPlayer, Session } from '../lib/types';

interface Props {
  players: SavedPlayer[];
  session?: Session; // active session, if any
  onAdd: (name: string) => { error?: string; id?: string };
  onRename: (id: string, name: string) => string | null;
  onDelete: (id: string) => void;
  onToggleAway: (id: string) => void;
  onAddToSession: (id: string) => void;
}

const small = 'min-h-11 rounded-xl bg-pink-50 px-4 text-sm font-semibold text-pink-600';

export default function Players({ players, session, onAdd, onRename, onDelete, onToggleAway, onAddToSession }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const submit = () => {
    const r = onAdd(name);
    setError(r.error ?? null);
    if (!r.error) setName('');
  };
  const saveEdit = (id: string) => {
    const err = onRename(id, editName);
    if (err) setError(err);
    else { setEditing(null); setError(null); }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Players</h1>
        <p className="mt-1 text-gray-400">{players.length} saved. Pick them when you create a session.</p>
      </header>

      <Card>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Player name"
          className="min-h-14 w-full rounded-2xl border border-pink-100 px-5 text-lg outline-none focus:border-pink-300"
        />
        {error && <p className="mt-2 text-sm text-pink-500">{error}</p>}
        <Button className="mt-4" onClick={submit} disabled={!name.trim()}>Save player</Button>
      </Card>

      <ul className="space-y-3">
        {[...players].sort((a, b) => a.name.localeCompare(b.name)).map((p) => {
          const inSession = session?.playerIds.includes(p.id);
          const away = session?.away.includes(p.id);
          return (
            <li key={p.id} className="rounded-3xl border border-pink-100 bg-white p-4">
              {editing === p.id ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(p.id)}
                    className="min-h-11 min-w-0 flex-1 rounded-xl border border-pink-200 px-4 text-lg outline-none"
                  />
                  <button className={small} onClick={() => saveEdit(p.id)}>Save</button>
                </div>
              ) : (
                <>
                  <p className="truncate text-xl text-gray-900">{p.name}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {session && inSession && !playerLocked(session, p.id) && (
                      <button className={small} onClick={() => onToggleAway(p.id)}>{away ? 'Back in' : 'Step out'}</button>
                    )}
                    {session && !inSession && <button className={small} onClick={() => onAddToSession(p.id)}>Add to session</button>}
                    <button className={small} onClick={() => { setEditing(p.id); setEditName(p.name); setError(null); }}>Edit</button>
                    <button className="min-h-11 rounded-xl px-4 text-sm font-semibold text-gray-300" onClick={() => onDelete(p.id)}>Delete</button>
                  </div>
                </>
              )}
            </li>
          );
        })}
        {players.length === 0 && <p className="py-8 text-center text-gray-400">Save your players once, then reuse them.</p>}
      </ul>
    </div>
  );
}