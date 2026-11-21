import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Trophy, Sparkles, ChevronUp, ChevronDown } from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { sounds } from '../utils/audio';

const W = 480;
const H = 360;
const PADDLE_W = 12;
const PADDLE_H = 74;
const MARGIN = 18;
const BALL_R = 8;
const WIN_SCORE = 5;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export default function PongGame() {
  const { setActiveGameId, stats, recordScore, incrementPlays } = useArcade();
  const highScore = stats.scores.pong || 0;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'GAME_OVER'>('IDLE');
  const [playerScore, setPlayerScore] = useState<number>(0);
  const [aiScore, setAiScore] = useState<number>(0);
  const [rallyCount, setRallyCount] = useState<number>(0);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);

  const playerYRef = useRef<number>(H / 2 - PADDLE_H / 2);
  const aiYRef = useRef<number>(H / 2 - PADDLE_H / 2);
  const ballRef = useRef<{ x: number; y: number; vx: number; vy: number }>({
    x: W / 2,
    y: H / 2,
    vx: 0,
    vy: 0,
  });
  const scoresRef = useRef<{ p: number; a: number; rally: number }>({ p: 0, a: 0, rally: 0 });
  const serveTimerRef = useRef<number>(0.65);
  const keysRef = useRef<{ up: boolean; down: boolean }>({ up: false, down: false });
  const rafRef = useRef<number | null>(null);

  const initRound = useCallback(() => {
    playerYRef.current = H / 2 - PADDLE_H / 2;
    aiYRef.current = H / 2 - PADDLE_H / 2;
    ballRef.current = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
    scoresRef.current = { p: 0, a: 0, rally: 0 };
    serveTimerRef.current = 0.65;
    setPlayerScore(0);
    setAiScore(0);
    setRallyCount(0);
    setIsNewHigh(false);
  }, []);

  const startNewGame = useCallback(() => {
    sounds.playClick();
    incrementPlays('pong');
    initRound();
    setGameState('PLAYING');
  }, [incrementPlays, initRound]);

  const togglePause = useCallback(() => {
    sounds.playClick();
    setGameState((prev) => (prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev));
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysRef.current.up = true;
      if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') keysRef.current.down = true;
      if (e.code === 'Space') {
        if (gameState === 'IDLE' || gameState === 'GAME_OVER' || gameState === 'VICTORY') {
          startNewGame();
        } else {
          togglePause();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysRef.current.up = false;
      if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') keysRef.current.down = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [gameState, startNewGame, togglePause]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleY = H / rect.height;
    const cy = (e.clientY - rect.top) * scaleY;
    playerYRef.current = clamp(cy - PADDLE_H / 2, 0, H - PADDLE_H);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawScene = () => {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, W, H);

      // Center dashed court divider
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.moveTo(W / 2, 16);
      ctx.lineTo(W / 2, H - 16);
      ctx.stroke();
      ctx.setLineDash([]);

      // Subtle court scores watermark
      ctx.font = '700 56px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillText(String(scoresRef.current.p), W / 2 - 58, 54);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.fillText(String(scoresRef.current.a), W / 2 + 58, 54);

      // Player Paddle (Crisp White Glass)
      ctx.shadowColor = 'rgba(255, 255, 255, 0.45)';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(MARGIN, playerYRef.current, PADDLE_W, PADDLE_H, 6);
      ctx.fill();

      // AI Paddle (Cool Slate Glass)
      ctx.shadowColor = 'rgba(148, 163, 184, 0.35)';
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(W - MARGIN - PADDLE_W, aiYRef.current, PADDLE_W, PADDLE_H, 6);
      ctx.fill();

      // Ball
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ballRef.current.x, ballRef.current.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    if (gameState !== 'PLAYING') {
      drawScene();
      return;
    }

    let lastTime = performance.now();

    const finishMatch = (won: boolean) => {
      const finalScore = scoresRef.current.p * 100 + scoresRef.current.rally * 15 + (won ? 200 : 0);
      if (won) {
        const record = recordScore('pong', finalScore);
        if (record) setIsNewHigh(true);
        setGameState('VICTORY');
      } else {
        sounds.playGameOver();
        const record = recordScore('pong', finalScore);
        if (record) setIsNewHigh(true);
        setGameState('GAME_OVER');
      }
    };

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Player keyboard movement
      const pSpeed = 430;
      if (keysRef.current.up) playerYRef.current -= pSpeed * dt;
      if (keysRef.current.down) playerYRef.current += pSpeed * dt;
      playerYRef.current = clamp(playerYRef.current, 0, H - PADDLE_H);

      const ball = ballRef.current;

      if (serveTimerRef.current > 0) {
        serveTimerRef.current -= dt;
        ball.x = W / 2;
        ball.y = H / 2;
        ball.vx = 0;
        ball.vy = 0;
        if (serveTimerRef.current <= 0) {
          const dir = Math.random() < 0.5 ? 1 : -1;
          const ang = (Math.random() - 0.5) * 0.85;
          const sp = 310;
          ball.vx = Math.cos(ang) * sp * dir;
          ball.vy = Math.sin(ang) * sp;
        }
        drawScene();
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // AI tracking
      const aiSpeed = 295;
      const target = ball.y - PADDLE_H / 2;
      aiYRef.current += clamp(target - aiYRef.current, -aiSpeed * dt, aiSpeed * dt);
      aiYRef.current = clamp(aiYRef.current, 0, H - PADDLE_H);

      const steps = 6;
      const sdt = dt / steps;
      let matchEnded = false;

      for (let s = 0; s < steps; s++) {
        ball.x += ball.vx * sdt;
        ball.y += ball.vy * sdt;

        if (ball.y - BALL_R < 0) {
          ball.y = BALL_R;
          ball.vy = Math.abs(ball.vy);
          sounds.playHit();
        }
        if (ball.y + BALL_R > H) {
          ball.y = H - BALL_R;
          ball.vy = -Math.abs(ball.vy);
          sounds.playHit();
        }

        // Player bounce
        if (
          ball.vx < 0 &&
          ball.x - BALL_R < MARGIN + PADDLE_W &&
          ball.x + BALL_R > MARGIN &&
          ball.y > playerYRef.current - 4 &&
          ball.y < playerYRef.current + PADDLE_H + 4
        ) {
          const rel = clamp((ball.y - (playerYRef.current + PADDLE_H / 2)) / (PADDLE_H / 2), -1, 1);
          const ang = rel * 0.95;
          const sp = Math.min(620, Math.hypot(ball.vx, ball.vy) + 16);
          ball.vx = Math.cos(ang) * sp;
          ball.vy = Math.sin(ang) * sp;
          ball.x = MARGIN + PADDLE_W + BALL_R;
          scoresRef.current.rally += 1;
          setRallyCount(scoresRef.current.rally);
          sounds.playHit();
        }

        // AI bounce
        const aiX = W - MARGIN - PADDLE_W;
        if (
          ball.vx > 0 &&
          ball.x + BALL_R > aiX &&
          ball.x - BALL_R < aiX + PADDLE_W &&
          ball.y > aiYRef.current - 4 &&
          ball.y < aiYRef.current + PADDLE_H + 4
        ) {
          const rel = clamp((ball.y - (aiYRef.current + PADDLE_H / 2)) / (PADDLE_H / 2), -1, 1);
          const ang = rel * 0.95;
          const sp = Math.min(620, Math.hypot(ball.vx, ball.vy) + 14);
          ball.vx = -Math.cos(ang) * sp;
          ball.vy = Math.sin(ang) * sp;
          ball.x = aiX - BALL_R;
          sounds.playHit();
        }

        // Scoring
        if (ball.x < -30) {
          scoresRef.current.a += 1;
          setAiScore(scoresRef.current.a);
          sounds.playBrickBreak();
          serveTimerRef.current = 0.7;
          ball.vx = 0;
          ball.vy = 0;
          if (scoresRef.current.a >= WIN_SCORE) {
            matchEnded = true;
            finishMatch(false);
          }
          break;
        }
        if (ball.x > W + 30) {
          scoresRef.current.p += 1;
          setPlayerScore(scoresRef.current.p);
          sounds.playPowerup();
          serveTimerRef.current = 0.7;
          ball.vx = 0;
          ball.vy = 0;
          if (scoresRef.current.p >= WIN_SCORE) {
            matchEnded = true;
            finishMatch(true);
          }
          break;
        }
      }

      drawScene();
      if (!matchEnded) {
        rafRef.current = requestAnimationFrame(loop);
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gameState, recordScore]);

  const moveStep = (delta: number) => {
    playerYRef.current = clamp(playerYRef.current + delta, 0, H - PADDLE_H);
  };

  const livePoints = playerScore * 100 + rallyCount * 15;

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
          <h2 className="text-xl font-bold text-white tracking-tight">Classic Pong</h2>
          <span className="text-xs text-slate-400">First to {WIN_SCORE} points wins</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold tabular-nums">
          <div className="flex items-center gap-2 text-slate-300">
            <span>You</span>
            <span className="text-base text-white font-bold">{playerScore}</span>
            <span className="text-slate-600">—</span>
            <span className="text-base text-slate-300 font-bold">{aiScore}</span>
            <span>CPU</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Trophy className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-base font-bold text-white">{Math.max(highScore, livePoints)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-center justify-center">
        <div className="relative rounded-3xl overflow-hidden border border-white/[0.08] bg-slate-900/40 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] p-2">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onPointerMove={handlePointerMove}
            className="w-[320px] h-[240px] sm:w-[480px] sm:h-[360px] rounded-2xl block touch-none cursor-ns-resize bg-[#090d16]"
          />

          {gameState === 'IDLE' && (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-4">
                <Play className="w-7 h-7 ml-0.5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Classic Pong Challenge</h3>
              <p className="text-xs text-slate-400 mb-6 max-w-xs">
                Move your paddle with your mouse or ↑ ↓ arrow keys to outscore the CPU to 5 points.
              </p>
              <button
                onClick={startNewGame}
                className="px-6 py-2.5 bg-white hover:bg-slate-200 text-slate-950 font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                Start Match
              </button>
            </div>
          )}

          {gameState === 'PAUSED' && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <h3 className="text-xl font-bold text-white mb-4">Game Paused</h3>
              <button
                onClick={togglePause}
                className="px-6 py-2.5 bg-white hover:bg-slate-200 text-slate-950 font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                Resume
              </button>
            </div>
          )}

          {(gameState === 'GAME_OVER' || gameState === 'VICTORY') && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <h3 className="text-2xl font-bold text-white mb-1">
                {gameState === 'VICTORY' ? 'You Won!' : 'CPU Wins'}
              </h3>
              {isNewHigh && (
                <div className="text-xs text-slate-300 font-semibold mb-3 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  New High Score!
                </div>
              )}
              <div className="text-sm text-slate-300 mb-6 tabular-nums">
                Final Score: <span className="text-white font-bold">{playerScore} — {aiScore}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={startNewGame}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-200 text-slate-950 font-bold rounded-xl transition-colors cursor-pointer text-xs"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>New Match</span>
                </button>
                <button
                  onClick={() => setActiveGameId(null)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-slate-200 font-medium rounded-xl transition-colors cursor-pointer text-xs"
                >
                  Library
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Side Controls */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
              <>
                <button
                  onClick={togglePause}
                  className="flex items-center gap-2 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {gameState === 'PLAYING' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{gameState === 'PLAYING' ? 'Pause' : 'Resume'}</span>
                </button>
                <button
                  onClick={startNewGame}
                  className="flex items-center gap-2 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart</span>
                </button>
              </>
            )}
          </div>

          {/* Touch Up/Down Controls */}
          <div className="flex flex-col gap-2 sm:hidden">
            <button
              onClick={() => moveStep(-32)}
              aria-label="Move Up"
              className="p-3 bg-white/[0.06] active:bg-white/20 border border-white/[0.08] text-white rounded-xl flex items-center justify-center"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <button
              onClick={() => moveStep(32)}
              aria-label="Move Down"
              className="p-3 bg-white/[0.06] active:bg-white/20 border border-white/[0.08] text-white rounded-xl flex items-center justify-center"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          <p className="text-[11px] text-slate-500 text-center max-w-[200px]">
            Drag vertically on screen or use ↑ ↓ keys to control your paddle.
          </p>
        </div>
      </div>
    </div>
  );
}
