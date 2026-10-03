import { Card } from '../components/ui';
import { rank, winPct, type PlayerStats } from '../lib/stats';

const medals = ['🥇', '🥈', '🥉'];
type Scope = 'session' | 'overall';

interface Props {
  stats: PlayerStats[];
  embedded?: boolean;        // used inside History: no header or toggle
  scope?: Scope;
  onScope?: (s: Scope) => void;
  sessionCount?: number;
  emptyText?: string;
}

export default function Leaderboard({ stats, embedded = false, scope = 'session', onScope, sessionCount = 0, emptyText = 'No players yet.' }: Props) {
  const rows = rank(stats);
  const overall = scope === 'overall';
  const chip = (s: Scope, label: string) => (
    <button
      onClick={() => onScope?.(s)}
      className={`min-h-11 rounded-full px-5 text-sm font-semibold ${scope === s ? 'bg-pink-400 text-white' : 'bg-pink-50 text-pink-400'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {!embedded && (
        <>
          <header>
            <h1 className="text-3xl font-bold text-gray-900">Rankings</h1>
            <p className="mt-1 text-gray-400">
              {overall
                ? `All sessions combined (${sessionCount}). Game performance, not an official pickleball rating.`
                : 'Based on games played here, not an official pickleball rating.'}
            </p>
          </header>
          <div className="flex gap-2">{chip('session', 'This session')}{chip('overall', 'Overall')}</div>
        </>
      )}

      <Card className="px-3">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-gray-400">{emptyText}</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-pink-300">
                <th className="px-2 pb-3 font-semibold">#</th>
                <th className="pb-3 font-semibold">Player</th>
                <th className="pb-3 text-right font-semibold">W</th>
                <th className="pb-3 text-right font-semibold">L</th>
                <th className="pb-3 text-right font-semibold">Win %</th>
                <th className="px-2 pb-3 text-right font-semibold">{overall ? 'Best 🔥' : '🔥'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => (
                <tr key={s.playerId} className="border-t border-pink-50 text-lg text-gray-900">
                  <td className="px-2 py-4">{s.gamesPlayed > 0 && i < 3 ? medals[i] : i + 1}</td>
                  <td className="py-4 font-semibold">{s.name}</td>
                  <td className="py-4 text-right">{s.wins}</td>
                  <td className="py-4 text-right">{s.losses}</td>
                  <td className="py-4 text-right">{Math.round(winPct(s))}%</td>
                  <td className="px-2 py-4 text-right text-pink-500">{overall ? s.longestStreak : s.currentStreak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}