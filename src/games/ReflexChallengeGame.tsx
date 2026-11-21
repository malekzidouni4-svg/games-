import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Zap, Target, Sparkles, Timer } from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { sounds } from '../utils/audio';

type ReflexSubMode = 'REACTION_TIME' | 'TARGET_RUSH';
type ReactionState = 'WAITING_TO_START' | 'WAITING_FOR_GREEN' | 'CLICK_NOW' | 'TOO_EARLY' | 'RESULT';

interface WhackTarget {
  id: number;
  row: number;
  col: number;
  isGolden: boolean;
  expiresAt: number;
}

export default function ReflexChallengeGame() {
  const { setActiveGameId, stats, recordScore, incrementPlays, celebrateWin } = useArcade();
  const highScore = stats.scores.reflex || 0;

  const [mode, setMode] = useState<ReflexSubMode>('REACTION_TIME');

  // Mode 1: Reaction Time state
  const [rxState, setRxState] = useState<ReactionState>('WAITING_TO_START');
  const [reactionMs, setReactionMs] = useState<number | null>(null);
  const [bestReactionMs, setBestReactionMs] = useState<number | null>(null);
  const greenTimeRef = useRef<number>(0);
  const timeoutRef = useRef<number | null>(null);

  // Mode 2: Target Rush state
  const [targets, setTargets] = useState<WhackTarget[]>([]);
  const [rushScore, setRushScore] = useState<number>(0);
  const [rushTimeLeft, setRushTimeLeft] = useState<number>(30);
  const [isRushActive, setIsRushActive] = useState<boolean>(false);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // MODE 1: Reaction Time logic
  const startReactionTest = () => {
    sounds.playClick();
    incrementPlays('reflex');
    setRxState('WAITING_FOR_GREEN');
    setReactionMs(null);

    const randomDelay = Math.floor(Math.random() * 2500) + 1500; // 1.5s to 4s
    timeoutRef.current = window.setTimeout(() => {
      greenTimeRef.current = performance.now();
      setRxState('CLICK_NOW');
      sounds.playPowerup();
    }, randomDelay);
  };

  const handleReactionAreaClick = () => {
    if (rxState === 'WAITING_TO_START' || rxState === 'RESULT') {
      startReactionTest();
    } else if (rxState === 'WAITING_FOR_GREEN') {
      // Clicked too early!
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      sounds.playHit();
      setRxState('TOO_EARLY');
    } else if (rxState === 'CLICK_NOW') {
      const elapsed = Math.round(performance.now() - greenTimeRef.current);
      sounds.playCardMatch();
      setReactionMs(elapsed);
      setRxState('RESULT');

      setBestReactionMs((prev) => (prev === null ? elapsed : Math.min(prev, elapsed)));

      // Invert ms to score points (e.g. 200ms -> 800pts, 300ms -> 700pts)
      const points = Math.max(50, 1000 - elapsed);
      recordScore('reflex', points);

      if (elapsed < 230) {
        celebrateWin();
      }
    }
  };

  // MODE 2: Target Rush logic
  const startRushGame = useCallback(() => {
    sounds.playClick();
    incrementPlays('reflex');
    setRushScore(0);
    setRushTimeLeft(30);
    setIsRushActive(true);
    setTargets([]);
    setIsNewHigh(false);
  }, [incrementPlays]);

  // Target Rush Timer
  useEffect(() => {
    if (!isRushActive) return;

    const timer = setInterval(() => {
      setRushTimeLeft((t) => {
        if (t <= 1) {
          setIsRushActive(false);
          sounds.playGameOver();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRushActive]);

  // Target Rush Spawner
  useEffect(() => {
    if (!isRushActive) return;

    const spawner = setInterval(() => {
      setTargets((prev) => {
        const now = Date.now();
        const active = prev.filter((t) => t.expiresAt > now);

        if (active.length < 3) {
          const row = Math.floor(Math.random() * 3);
          const col = Math.floor(Math.random() * 3);
          const isGolden = Math.random() < 0.25;
          const lifetime = isGolden ? 1200 : 1800;

          // Check if slot already occupied
          const occupied = active.some((t) => t.row === row && t.col === col);
          if (!occupied) {
            return [
              ...active,
              {
                id: Math.random(),
                row,
                col,
                isGolden,
                expiresAt: now + lifetime,
              },
            ];
          }
        }
        return active;
      });
    }, 450);

    return () => clearInterval(spawner);
  }, [isRushActive]);

  // End of rush game check
  useEffect(() => {
    if (rushTimeLeft === 0 && !isRushActive && rushScore > 0) {
      const record = recordScore('reflex', rushScore);
      if (record) {
        setIsNewHigh(true);
        celebrateWin();
      }
    }
  }, [rushTimeLeft, isRushActive, rushScore, recordScore, celebrateWin]);

  const handleWhack = (target: WhackTarget) => {
    if (!isRushActive) return;
    if (target.isGolden) {
      sounds.playPowerup();
      setRushScore((s) => s + 50);
    } else {
      sounds.playCardMatch();
      setRushScore((s) => s + 20);
    }
    setTargets((prev) => prev.filter((t) => t.id !== target.id));
  };

  const getReactionFeedback = (ms: number) => {
    if (ms < 200) return { title: 'Lightning Fast! ⚡', desc: 'Exceptional reflex speed — top tier reaction', color: 'text-emerald-400' };
    if (ms < 260) return { title: 'Excellent! 🎯', desc: 'Sharp focus and impressive response time', color: 'text-sky-400' };
    if (ms < 340) return { title: 'Great! 👍', desc: 'Solid and consistent human reaction speed', color: 'text-amber-400' };
    return { title: 'Keep Focusing ⏳', desc: 'Try again and keep your eyes locked on the center', color: 'text-rose-400' };
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.08]">
        <button
          onClick={() => setActiveGameId(null)}
          className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </button>

        <div className="text-center">
          <h2 className="text-xl font-bold text-white tracking-tight">Reflex & Reaction Speed</h2>
          <span className="text-xs text-slate-400">Measure your neural reaction time in milliseconds</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold tabular-nums">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Trophy className="w-3.5 h-3.5 text-slate-300" />
            <span>Best:</span>
            <span className="text-base font-bold text-white">{highScore}</span>
          </div>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex justify-center gap-2 mb-6">
        <button
          onClick={() => {
            sounds.playClick();
            setMode('REACTION_TIME');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            mode === 'REACTION_TIME'
              ? 'bg-white text-slate-950 shadow-sm'
              : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.08]'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Reaction Light Test</span>
        </button>
        <button
          onClick={() => {
            sounds.playClick();
            setMode('TARGET_RUSH');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            mode === 'TARGET_RUSH'
              ? 'bg-white text-slate-950 shadow-sm'
              : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.08]'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Target Rush (30s)</span>
        </button>
      </div>

      {/* MODE 1: REACTION TIME TEST */}
      {mode === 'REACTION_TIME' && (
        <div className="max-w-xl mx-auto">
          <div
            onClick={handleReactionAreaClick}
            className={`w-full min-h-[340px] rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 select-none border shadow-2xl ${
              rxState === 'WAITING_TO_START'
                ? 'bg-slate-900 border-slate-800 hover:border-cyan-500/50'
                : rxState === 'WAITING_FOR_GREEN'
                ? 'bg-rose-950 border-rose-600 animate-pulse'
                : rxState === 'CLICK_NOW'
                ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_50px_rgba(16,185,129,0.7)]'
                : rxState === 'TOO_EARLY'
                ? 'bg-amber-950 border-amber-600'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            {rxState === 'WAITING_TO_START' && (
              <>
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Click to Start</h3>
                <p className="text-xs text-slate-400 max-w-xs">
                  When the panel turns green, click as fast as you can!
                </p>
              </>
            )}

            {rxState === 'WAITING_FOR_GREEN' && (
              <>
                <div className="w-16 h-16 rounded-full border-4 border-rose-500 border-t-transparent animate-spin mb-4" />
                <h3 className="text-2xl font-black text-rose-300 mb-2">Wait for Green...</h3>
                <p className="text-xs text-rose-200">Don't click yet or it counts as a false start!</p>
              </>
            )}

            {rxState === 'CLICK_NOW' && (
              <>
                <h3 className="text-4xl font-black text-slate-950 tracking-wider">
                  Click Now!
                </h3>
              </>
            )}

            {rxState === 'TOO_EARLY' && (
              <>
                <h3 className="text-2xl font-bold text-amber-400 mb-2">Too Early!</h3>
                <p className="text-xs text-slate-300 mb-6">
                  You clicked before the box turned green. Stay calm and focused.
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startReactionTest();
                  }}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
                >
                  Try Again
                </button>
              </>
            )}

            {rxState === 'RESULT' && reactionMs !== null && (
              <>
                <span className="text-xs text-slate-400 uppercase tracking-widest mb-1">
                  Reaction Time
                </span>
                <div className="text-5xl font-black text-white tabular-nums mb-2">
                  {reactionMs}{' '}
                  <span className="text-base font-semibold text-slate-400">ms</span>
                </div>

                <div className="my-3">
                  <div className={`text-base font-bold ${getReactionFeedback(reactionMs).color}`}>
                    {getReactionFeedback(reactionMs).title}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {getReactionFeedback(reactionMs).desc}
                  </div>
                </div>

                {bestReactionMs && (
                  <div className="text-xs text-amber-400 mt-2 font-semibold">
                    Best Today: {bestReactionMs} ms
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startReactionTest();
                    }}
                    className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    New Attempt
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: TARGET RUSH */}
      {mode === 'TARGET_RUSH' && (
        <div className="max-w-xl mx-auto flex flex-col items-center">
          {/* Top Bar for rush */}
          <div className="w-full flex items-center justify-between mb-4 bg-slate-900 border border-slate-800 px-5 py-3 rounded-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Timer className="w-4 h-4 text-cyan-400" />
              <span>Time Left:</span>
              <span className="text-base font-bold text-white tabular-nums">{rushTimeLeft}s</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span>Score:</span>
              <span className="text-lg font-black text-cyan-400 tabular-nums">{rushScore}</span>
            </div>
          </div>

          {/* 3x3 Arena */}
          <div className="relative w-full max-w-sm aspect-square bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl">
            <div className="grid grid-cols-3 grid-rows-3 gap-3 w-full h-full">
              {Array.from({ length: 9 }).map((_, idx) => {
                const r = Math.floor(idx / 3);
                const c = idx % 3;
                const target = targets.find((t) => t.row === r && t.col === c);

                return (
                  <div
                    key={idx}
                    className="relative bg-slate-950/70 border border-slate-800/80 rounded-2xl flex items-center justify-center overflow-hidden"
                  >
                    {target && (
                      <button
                        onClick={() => handleWhack(target)}
                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-black text-xl transition-transform active:scale-90 animate-bounce cursor-pointer ${
                          target.isGolden
                            ? 'bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.9)]'
                            : 'bg-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.8)]'
                        }`}
                      >
                        {target.isGolden ? '★' : '⚡'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Inactive overlay */}
            {!isRushActive && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 text-center">
                {rushTimeLeft === 0 ? (
                  <>
                    <h3 className="text-2xl font-black text-white mb-1">Time's Up!</h3>
                    {isNewHigh && (
                      <div className="text-xs text-amber-300 font-bold mb-3 flex items-center gap-1">
                        <Sparkles className="w-4 h-4" />
                        New High Score!
                      </div>
                    )}
                    <div className="text-sm text-slate-300 mb-6">
                      Total Score:{' '}
                      <span className="text-2xl font-black text-cyan-400 tabular-nums">
                        {rushScore}
                      </span>
                    </div>
                    <button
                      onClick={startRushGame}
                      className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-colors cursor-pointer text-xs"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Try Again</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
                      <Target className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Target Rush</h3>
                    <p className="text-xs text-slate-400 mb-6 max-w-xs">
                      You have 30 seconds to hit as many targets as possible. Golden stars award bonus points!
                    </p>
                    <button
                      onClick={startRushGame}
                      className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-colors cursor-pointer text-xs"
                    >
                      Start Challenge (30s)
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
