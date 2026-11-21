import React, { useState } from 'react';
import { X, Cloud, RefreshCw, CheckCircle2, Gamepad2, Award, Loader2, LogOut, AlertCircle, ArrowRight } from 'lucide-react';
import { useArcade, GAMES_CATALOG } from '../context/ArcadeContext';

interface GooglePlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GooglePlayModal({ isOpen, onClose }: GooglePlayModalProps) {
  const {
    googlePlay,
    connectGooglePlayReal,
    connectCustomGooglePlay,
    disconnectGooglePlay,
    syncGooglePlayNow,
    isAuthenticating,
    authError,
    clearAuthError,
    stats,
  } = useArcade();

  const [customNameInput, setCustomNameInput] = useState(
    googlePlay.playerName && !/[\u0600-\u06FF]/.test(googlePlay.playerName) ? googlePlay.playerName : 'ArcadePlayer'
  );
  const [showManualForm, setShowManualForm] = useState(false);

  if (!isOpen) return null;

  const totalScore = Object.values(stats.scores).reduce((a, b) => a + b, 0);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    connectCustomGooglePlay(customNameInput);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900/85 backdrop-blur-2xl border border-white/[0.1] rounded-3xl p-6 shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Google Play Games</h3>
              <p className="text-xs text-slate-400">Cloud saves & high score synchronization</p>
            </div>
          </div>
          <button
            onClick={() => {
              clearAuthError();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card if Connected */}
        {googlePlay.isConnected ? (
          <div className="my-5 space-y-4">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                {googlePlay.photoURL ? (
                  <img
                    src={googlePlay.photoURL}
                    alt={googlePlay.playerName}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full border border-white/20 object-cover shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-lg">
                    {googlePlay.playerName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-white">{googlePlay.playerName}</h4>
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                  <span className="text-xs text-slate-400 font-mono block">{googlePlay.playerTag}</span>
                  {googlePlay.email && (
                    <span className="text-[11px] text-slate-500 block truncate max-w-[170px]">{googlePlay.email}</span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Level</span>
                <span className="text-lg font-black text-white tabular-nums">Lv.{googlePlay.level}</span>
              </div>
            </div>

            {/* XP and Cloud Status */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-slate-300" />
                  Experience (XP):
                </span>
                <span className="font-bold text-white tabular-nums">{googlePlay.xp} XP</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-white h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (googlePlay.xp % 500) / 5)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-slate-300" />
                  Sync Status:
                </span>
                <span className="text-slate-300 font-medium">
                  {googlePlay.lastSyncedAt ? `Synced (${googlePlay.lastSyncedAt})` : 'Connected'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={syncGooglePlayNow}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white text-slate-950 hover:bg-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync High Scores</span>
              </button>

              <button
                onClick={() => disconnectGooglePlay()}
                className="px-4 py-2.5 bg-white/[0.04] hover:bg-rose-500/10 hover:text-rose-400 border border-white/[0.08] text-slate-400 text-xs font-medium rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        ) : (
          /* Connect Options */
          <div className="my-5 space-y-4">
            {authError === 'POPUP_BLOCKED' && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Browser blocked the sign-in pop-up</span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  To sign in with Google, click the pop-up blocked icon in your browser&apos;s address bar, select &ldquo;Always allow&rdquo;, and click the Google button again.
                </p>
                <p className="text-[11px] text-slate-300 pt-1 border-t border-amber-500/20">
                  Or connect instantly with your Gamer Tag below without a pop-up:
                </p>
              </div>
            )}

            {authError === 'AUTH_FAILED' && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Connection failed. Please try again or use a direct Gamer Tag.</span>
              </div>
            )}

            <p className="text-xs text-slate-300 leading-relaxed">
              Connect your Google Play Games account to sync your achievements and scores across all {GAMES_CATALOG.length} arcade games.
            </p>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs text-slate-400 flex items-center justify-between">
              <span>Total High Score:</span>
              <span className="font-bold text-white tabular-nums">{totalScore} pts</span>
            </div>

            {!showManualForm && (
              <button
                onClick={() => connectGooglePlayReal()}
                disabled={isAuthenticating}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 rounded-2xl transition-all cursor-pointer font-bold text-xs shadow-xl disabled:opacity-60 disabled:cursor-not-allowed border border-white/20"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign in &amp; Link with Google</span>
                  </>
                )}
              </button>
            )}

            {(authError === 'POPUP_BLOCKED' || showManualForm) ? (
              <form onSubmit={handleManualSubmit} className="space-y-3 pt-2 border-t border-white/[0.08]">
                <label className="block text-xs text-slate-300 font-medium">
                  Gamer Tag:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customNameInput}
                    onChange={(e) => setCustomNameInput(e.target.value)}
                    placeholder="Enter your gamer tag..."
                    className="flex-1 bg-white/[0.04] border border-white/[0.1] focus:border-white/30 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 transition-colors"
                    maxLength={24}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-white text-slate-950 font-bold rounded-xl text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Connect
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center pt-1">
                <button
                  onClick={() => setShowManualForm(true)}
                  className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Or connect directly with a Gamer Tag</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="pt-3 border-t border-white/[0.08] text-center">
          <span className="text-[11px] text-slate-500">
            Authenticated securely via Google Identity Services &amp; Google Play Games
          </span>
        </div>
      </div>
    </div>
  );
}
