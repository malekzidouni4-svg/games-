import { X, Trophy, RotateCcw } from 'lucide-react';
import { useArcade, GAMES_CATALOG } from '../context/ArcadeContext';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StatsModal({ isOpen, onClose }: StatsModalProps) {
  const { stats, resetAllStats } = useArcade();

  if (!isOpen) return null;

  const totalPlays = Object.values(stats.gamesPlayed).reduce((a, b) => a + b, 0);
  const totalScorePoints = Object.values(stats.scores).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900/70 backdrop-blur-2xl border border-white/[0.1] rounded-3xl p-6 shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Your Stats & High Scores</h3>
              <p className="text-xs text-slate-400">Saved locally and synced across your games</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Summary */}
        <div className="grid grid-cols-2 gap-3 my-5">
          <div className="bg-white/[0.025] border border-white/[0.06] p-4 rounded-2xl">
            <span className="text-xs text-slate-400 block mb-1">Total Rounds</span>
            <span className="text-2xl font-bold text-white tabular-nums">{totalPlays}</span>
          </div>
          <div className="bg-white/[0.025] border border-white/[0.06] p-4 rounded-2xl">
            <span className="text-xs text-slate-400 block mb-1">Total Score</span>
            <span className="text-2xl font-bold text-white tabular-nums">{totalScorePoints}</span>
          </div>
        </div>

        {/* Per-Game Records */}
        <div className="space-y-2 mb-6 max-h-64 overflow-y-auto pr-1">
          {GAMES_CATALOG.map((game) => {
            const score = stats.scores[game.id] || 0;
            const plays = stats.gamesPlayed[game.id] || 0;

            return (
              <div
                key={game.id}
                className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                  <div>
                    <h4 className="text-xs font-semibold text-white">{game.title}</h4>
                    <span className="text-[11px] text-slate-500">
                      {plays} {plays === 1 ? 'round' : 'rounds'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 font-bold tabular-nums text-white text-sm">
                  <Trophy className="w-3.5 h-3.5 text-slate-400" />
                  <span>{score}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to reset all saved statistics?')) {
                resetAllStats();
              }
            }}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Stats</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-white text-slate-950 hover:bg-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
