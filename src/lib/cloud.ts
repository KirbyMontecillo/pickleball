// Cloud-synced players and sessions. Same shape App already used:
// setPlayers / setSessions accept a value or an updater function.
import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import type { SavedPlayer, Session } from './types';

type Status = 'saved' | 'saving' | 'error';
type Update<T> = T[] | ((prev: T[]) => T[]);

const playerRow = (p: SavedPlayer) => ({ id: p.id, name: p.name, created_at: p.createdAt });

// The full session lives in `state`; the other columns mirror it for reporting later.
const sessionRow = (s: Session) => ({
  id: s.id,
  name: s.name,
  status: s.status,
  queue_kind: s.settings.kind,
  queue_mode: s.settings.mode,
  game_format: s.settings.format,
  points_to_win: s.settings.pointsToWin,
  win_by_two: s.settings.winByTwo,
  court_count: s.settings.courts,
  created_at: s.createdAt,
  started_at: s.startedAt ?? null,
  ended_at: s.endedAt ?? null,
  state: s,
});

export function useCloudStore(userId: string) {
  const [players, setPlayersState] = useState<SavedPlayer[]>([]);
  const [sessions, setSessionsState] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>('saved');
  const playersRef = useRef<SavedPlayer[]>([]);
  const sessionsRef = useRef<Session[]>([]);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const cacheKey = `pb.cache.${userId}`;

  const saveCache = () => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ players: playersRef.current, sessions: sessionsRef.current }));
    } catch { /* storage unavailable */ }
  };

  // Writes run one at a time, in order.
  const persist = (job: () => Promise<void>) => {
    pending.current++;
    setStatus('saving');
    chain.current = chain.current.then(job).then(
      () => { if (--pending.current === 0) setStatus('saved'); },
      () => { pending.current--; setStatus('error'); }
    );
  };

  function makeSetter<T extends { id: string }>(
    ref: { current: T[] },
    setState: (v: T[]) => void,
    table: string,
    toRow: (x: T) => object
  ) {
    return (update: Update<T>) => {
      const prev = ref.current;
      const next = typeof update === 'function' ? update(prev) : update;
      ref.current = next;
      setState(next);
      saveCache();
      const before = new Map(prev.map((x) => [x.id, JSON.stringify(x)]));
      const changed = next.filter((x) => before.get(x.id) !== JSON.stringify(x));
      const removed = prev.filter((x) => !next.some((n) => n.id === x.id)).map((x) => x.id);
      if (!changed.length && !removed.length) return;
      persist(async () => {
        if (changed.length) {
          const { error } = await supabase.from(table).upsert(changed.map(toRow));
          if (error) throw error;
        }
        if (removed.length) {
          const { error } = await supabase.from(table).delete().in('id', removed);
          if (error) throw error;
        }
      });
    };
  }

  const setPlayers = makeSetter(playersRef, setPlayersState, 'players', playerRow);
  const setSessions = makeSetter(sessionsRef, setSessionsState, 'sessions', sessionRow);

  useEffect(() => {
    let cancelled = false;
    const apply = (p: SavedPlayer[], s: Session[]) => {
      playersRef.current = p;
      sessionsRef.current = s;
      setPlayersState(p);
      setSessionsState(s);
    };
    (async () => {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const d = JSON.parse(cached);
          apply(d.players ?? [], d.sessions ?? []);
          setLoading(false); // show last known data while the cloud loads
        }
      } catch { /* ignore bad cache */ }
      const [p, s] = await Promise.all([
        supabase.from('players').select('id,name,created_at').order('created_at'),
        supabase.from('sessions').select('state').order('created_at'),
      ]);
      if (cancelled) return;
      if (p.error || s.error) {
        setStatus('error');
      } else {
        apply(
          p.data.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at })),
          s.data.map((r) => r.state as Session).filter((x) => x && x.id)
        );
        saveCache();
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return { players, sessions, setPlayers, setSessions, status, loading };
}