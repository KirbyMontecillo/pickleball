import { useEffect, useState } from 'react';
import type { Session as AuthSession } from '@supabase/supabase-js';
import Confirm from './components/Confirm';
import Header from './components/Header';
import { Button, Card, Title } from './components/ui';
import { fillCourts, type Team } from './lib/queue';
import {
  addToSession, beginSession, defaultSettings, endSession, hasPlaying, modeLabel, newSession, playerLocked,
  rebuildTree, canRebuild, recordStandard, recordTree, startNextTree, statsList, overallStats, toggleAway, updateSettings,
} from './lib/session';
import { useCloudStore } from './lib/cloud';
import { supabase, supabaseConfigured } from './lib/supabase';
import type { Session, Settings } from './lib/types';
import Auth from './screens/Auth';
import Dashboard from './screens/Dashboard';
import History from './screens/History';
import Leaderboard from './screens/Leaderboard';
import Players from './screens/Players';
import Setup from './screens/Setup';
import WinLoseDashboard from './screens/WinLoseDashboard';

type Tab = 'home' | 'players' | 'rankings' | 'history';
type View = 'home' | 'setup' | 'session';

const tabs: { id: Tab; icon: string; label: string }[] = [
  { id: 'home', icon: '🏓', label: 'Home' },
  { id: 'players', icon: '👥', label: 'Players' },
  { id: 'rankings', icon: '🏆', label: 'Rankings' },
  { id: 'history', icon: '🕘', label: 'History' },
];

function Main({ userId, email, onLogout }: { userId: string; email: string; onLogout: () => void }) {
  const { players, sessions, setPlayers, setSessions, status, loading } = useCloudStore(userId);
  const [tab, setTab] = useState<Tab>('home');
  const [view, setView] = useState<View>('home');
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [scope, setScope] = useState<'session' | 'overall'>('session');

  const active = sessions.find((s) => s.status === 'active');
  const draft = sessions.find((s) => s.status === 'setup');
  const completed = sessions
    .filter((s) => s.status === 'completed')
    .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''));
  const screen: View = view === 'session' && active ? 'session' : view === 'setup' && draft ? 'setup' : 'home';

  const patch = (id: string, fn: (s: Session) => Session) =>
    setSessions((ss) => ss.map((s) => (s.id === id ? fn(s) : s)));
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? '?';

  // ---- Saved players (global) ----
  const addPlayer = (raw: string): { error?: string; id?: string } => {
    const name = raw.trim();
    if (!name) return { error: 'Enter a name.' };
    if (players.some((p) => p.name.toLowerCase() === name.toLowerCase())) return { error: `${name} is already saved.` };
    const id = crypto.randomUUID();
    setPlayers((ps) => [...ps, { id, name, createdAt: new Date().toISOString() }]);
    return { id };
  };

  const renamePlayer = (id: string, raw: string): string | null => {
    const name = raw.trim();
    if (!name) return 'Enter a name.';
    if (players.some((p) => p.id !== id && p.name.toLowerCase() === name.toLowerCase())) return `${name} is already saved.`;
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, name } : p)));
    // Keep unfinished sessions in sync; completed sessions stay as a record.
    setSessions((ss) => ss.map((s) => (s.status !== 'completed' && s.names[id] ? { ...s, names: { ...s.names, [id]: name } } : s)));
    return null;
  };

  const deletePlayer = (id: string) => {
    if (sessions.some((s) => s.status !== 'completed' && s.playerIds.includes(id))) {
      return alert('This player is in your current session. Remove them from setup or end the session first.');
    }
    if (confirm(`Delete ${nameOf(id)}? Past sessions keep their results.`)) setPlayers((ps) => ps.filter((p) => p.id !== id));
  };

  // ---- Session lifecycle ----
  const startNew = (from?: Session) => {
    if (active) return alert('End your active session first.');
    if (draft && !from) { setTab('home'); return setView('setup'); }
    const ids = from ? from.playerIds.filter((id) => players.some((p) => p.id === id)) : [];
    const name = from
      ? `${from.name} - New Session`
      : `Pickleball ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    const s = newSession(name, from ? { ...from.settings } : defaultSettings, ids);
    setSessions((ss) => [...ss.filter((x) => x.status !== 'setup'), s]);
    setTab('home');
    setView('setup');
  };

  const begin = () => {
    if (!draft) return;
    const names = Object.fromEntries(draft.playerIds.map((id) => [id, nameOf(id)]));
    patch(draft.id, (s) => beginSession(s, names));
    setView('session');
  };

  const cancelDraft = () => {
    if (draft) setSessions((ss) => ss.filter((s) => s.id !== draft.id));
    setView('home');
  };

  const finish = () => {
    if (active) patch(active.id, endSession);
    setConfirmEnd(false);
    setView('home');
  };

  const run = (fn: (s: Session) => Session) => active && patch(active.id, fn);
  const setDraftSettings = (p: Partial<Settings>) => draft && patch(draft.id, (s) => updateSettings(s, p));

  if (loading) return <div className="grid min-h-screen place-items-center bg-white text-gray-300">Loading...</div>;

  const overall = overallStats(sessions).map((s) => ({ ...s, name: players.find((p) => p.id === s.playerId)?.name ?? s.name }));
  const overallSessions = sessions.filter((s) => s.status !== 'setup' && s.matches.length > 0).length;

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-md px-5 pb-32 pt-10">
        {status === 'error' && (
          <p className="mb-6 rounded-2xl bg-pink-50 px-4 py-3 text-sm text-pink-600">
            Can't reach the cloud right now. Changes may not be saved until you're back online.
          </p>
        )}
        {tab === 'home' && screen === 'home' && (
          <div className="space-y-6">
            <Header email={email} onLogout={onLogout} />
            <div className="rounded-3xl bg-pink-50 p-6">
              <p className="text-sm font-medium text-pink-500">Welcome back</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">Ready to play?</h1>
              <p className="mt-1 text-gray-500">Save players once, play, then review in History.</p>
            </div>
            {active ? (
              <Card>
                <Title>Active session</Title>
                <p className="text-2xl font-semibold text-gray-900">{active.name}</p>
                <p className="mt-1 text-gray-400">
                  {active.playerIds.length} players · {active.settings.courts} {active.settings.courts === 1 ? 'court' : 'courts'}
                </p>
                <p className="mt-1 text-gray-900">{modeLabel(active.settings.kind)}</p>
                <Button className="mt-5" onClick={() => setView('session')}>Continue session</Button>
              </Card>
            ) : (
              <Button onClick={() => startNew()}>{draft ? 'Continue setup' : 'Start new session'}</Button>
            )}
          </div>
        )}

        {tab === 'home' && screen === 'setup' && draft && (
          <Setup
            draft={draft}
            players={players}
            previous={completed}
            onName={(name) => patch(draft.id, (s) => ({ ...s, name }))}
            onSettings={setDraftSettings}
            onSelect={(ids) => patch(draft.id, (s) => ({ ...s, playerIds: ids }))}
            onAdd={addPlayer}
            onStart={begin}
            onCancel={cancelDraft}
          />
        )}

        {tab === 'home' && screen === 'session' && active && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-pink-50 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">{active.name}</p>
                <p className="text-sm text-pink-600">{modeLabel(active.settings.kind)}</p>
              </div>
              <button className="min-h-11 shrink-0 text-sm font-semibold text-pink-500" onClick={() => setConfirmEnd(true)}>
                End session
              </button>
            </div>
            {active.settings.kind === 'winlose' ? (
              <WinLoseDashboard
                names={active.names}
                games={active.tree}
                courts={active.settings.courts}
                bench={active.qs.queue}
                playerCount={active.playerIds.length - active.away.length}
                canRebuild={canRebuild(active)}
                onRebuild={() => run(rebuildTree)}
                onStartNext={() => run(startNextTree)}
                onResult={(n, w: Team) => run((s) => recordTree(s, n, w))}
              />
            ) : (
              <Dashboard
                names={active.names}
                qs={active.qs}
                settings={active.settings}
                playerCount={active.playerIds.length - active.away.length}
                onSettings={(p) => run((s) => updateSettings(s, p))}
                onStart={() => run((s) => ({ ...s, qs: fillCourts(s.qs, s.settings.format) }))}
                onResult={(c, w) => run((s) => recordStandard(s, c, w))}
              />
            )}
          </div>
        )}

        {tab === 'players' && (
          <Players
            players={players}
            session={active}
            onAdd={addPlayer}
            onRename={renamePlayer}
            onDelete={deletePlayer}
            onToggleAway={(id) => {
              if (active && playerLocked(active, id)) return alert('This player is part of the Win/Lose tree until the session ends.');
              run((s) => toggleAway(s, id));
            }}
            onAddToSession={(id) => run((s) => addToSession(s, id, nameOf(id)))}
          />
        )}
        {tab === 'rankings' && (
          <Leaderboard
            scope={scope}
            onScope={setScope}
            stats={scope === 'overall' ? overall : active ? statsList(active) : []}
            sessionCount={overallSessions}
            emptyText={scope === 'overall' ? 'Play some games and everyone\'s totals show up here.' : 'No active session. Start one from Home.'}
          />
        )}
        {tab === 'history' && <History sessions={completed} onPlayAgain={startNew} />}
      </main>

      {confirmEnd && active && (
        <Confirm
          title="End this session?"
          body={
            hasPlaying(active)
              ? 'There are games currently in progress. Are you sure you want to end this session? You can still view its results in History.'
              : 'You can still view its results in History.'
          }
          confirmLabel="End Session"
          onCancel={() => setConfirmEnd(false)}
          onConfirm={finish}
        />
      )}

      <nav className="fixed inset-x-0 bottom-0 border-t border-pink-100 bg-white pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-md">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold ${
                tab === t.id ? 'text-pink-500' : 'text-gray-300'
              }`}
            >
              <span className="text-2xl">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState<AuthSession | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuth(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setAuth(next));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen bg-white px-5 pt-24 text-center text-gray-900">
        <p className="text-xl font-semibold">Supabase keys are missing</p>
        <p className="mt-2 text-gray-400">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local (or your Vercel environment variables), then restart.</p>
      </div>
    );
  }
  if (auth === undefined) return <div className="min-h-screen bg-white" />;
  if (!auth) return <Auth />;

  const logout = async () => {
    localStorage.removeItem(`pb.cache.${auth.user.id}`);
    await supabase.auth.signOut();
  };
  return <Main key={auth.user.id} userId={auth.user.id} email={auth.user.email ?? ''} onLogout={logout} />;
}