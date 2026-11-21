import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Sparkles, Play } from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { sounds } from '../utils/audio';

const W = 540;
const H = 330;
const MARGIN = 28;
const TABLE_X = MARGIN;
const TABLE_Y = MARGIN;
const TABLE_W = W - 2 * MARGIN;
const TABLE_H = H - 2 * MARGIN;
const BALL_R = 9;
const POCKET_R = 16;

const POCKETS = [
  { x: TABLE_X, y: TABLE_Y },
  { x: TABLE_X + TABLE_W / 2, y: TABLE_Y },
  { x: TABLE_X + TABLE_W, y: TABLE_Y },
  { x: TABLE_X, y: TABLE_Y + TABLE_H },
  { x: TABLE_X + TABLE_W / 2, y: TABLE_Y + TABLE_H },
  { x: TABLE_X + TABLE_W, y: TABLE_Y + TABLE_H },
];

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  isCue?: boolean;
  potted: boolean;
}

function createRack(): Ball[] {
  const balls: Ball[] = [
    {
      x: TABLE_X + TABLE_W * 0.25,
      y: TABLE_Y + TABLE_H / 2,
      vx: 0,
      vy: 0,
      color: '#ffffff',
      isCue: true,
      potted: false,
    },
  ];
  const colors = ['#f43f5e', '#fbbf24', '#38bdf8', '#a78bfa', '#fb923c', '#34d399', '#e2e8f0'];
  const dx = BALL_R * Math.sqrt(3) + 1.2;
  const dy = BALL_R * 2 + 1.2;
  const apexX = TABLE_X + TABLE_W * 0.65;
  const apexY = TABLE_Y + TABLE_H / 2;
  const positions: [number, number][] = [
    [apexX, apexY],
    [apexX + dx, apexY - dy / 2],
    [apexX + dx, apexY + dy / 2],
    [apexX + 2 * dx, apexY - (3 * dy) / 2],
    [apexX + 2 * dx, apexY - dy / 2],
    [apexX + 2 * dx, apexY + dy / 2],
    [apexX + 2 * dx, apexY + (3 * dy) / 2],
  ];
  positions.forEach(([x, y], i) => {
    balls.push({ x, y, vx: 0, vy: 0, color: colors[i], potted: false });
  });
  return balls;
}

export default function BilliardsGame() {
  const { setActiveGameId, stats, recordScore, incrementPlays } = useArcade();
  const highScore = stats.scores.billiards || 0;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'VICTORY'>('IDLE');
  const [pottedCount, setPottedCount] = useState<number>(0);
  const [strokes, setStrokes] = useState<number>(0);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);

  const ballsRef = useRef<Ball[]>(createRack());
  const aimRef = useRef<{ x: number; y: number }>({ x: TABLE_X + TABLE_W * 0.6, y: TABLE_Y + TABLE_H / 2 });
  const pottedRef = useRef<number>(0);
  const strokesRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const startNewGame = useCallback(() => {
    sounds.playClick();
    incrementPlays('billiards');
    ballsRef.current = createRack();
    pottedRef.current = 0;
    strokesRef.current = 0;
    setPottedCount(0);
    setStrokes(0);
    setIsNewHigh(false);
    setGameState('PLAYING');
  }, [incrementPlays]);

  const isAnyMoving = () =>
    ballsRef.current.some((b) => !b.potted && (Math.abs(b.vx) > 0.5 || Math.abs(b.vy) > 0.5));

  const toCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height),
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    aimRef.current = toCanvasCoords(e);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING' || isAnyMoving()) return;
    const p = toCanvasCoords(e);
    aimRef.current = p;
    const cue = ballsRef.current[0];
    const dx = p.x - cue.x;
    const dy = p.y - cue.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 6) {
      const speed = Math.min(980, dist * 4.2);
      cue.vx = (dx / dist) * speed;
      cue.vy = (dy / dist) * speed;
      strokesRef.current += 1;
      setStrokes(strokesRef.current);
      sounds.playHit();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawScene = () => {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, W, H);

      // Outer wooden/slate rail
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(TABLE_X - 10, TABLE_Y - 10, TABLE_W + 20, TABLE_H + 20, 14);
      ctx.fill();
      ctx.stroke();

      // Felt surface (calm emerald slate)
      ctx.fillStyle = '#0f3d2e';
      ctx.beginPath();
      ctx.roundRect(TABLE_X, TABLE_Y, TABLE_W, TABLE_H, 6);
      ctx.fill();

      // Pockets
      for (const p of POCKETS) {
        ctx.fillStyle = '#030712';
        ctx.beginPath();
        ctx.arc(p.x, p.y, POCKET_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      const cue = ballsRef.current[0];
      if (gameState === 'PLAYING' && !isAnyMoving()) {
        const dx = aimRef.current.x - cue.x;
        const dy = aimRef.current.y - cue.y;
        const len = Math.hypot(dx, dy);
        if (len > 6) {
          const nx = dx / len;
          const ny = dy / len;
          const power = Math.min(len, 240) / 240;

          // Aiming line
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + power * 0.5})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(cue.x, cue.y);
          ctx.lineTo(cue.x + nx * 160, cue.y + ny * 160);
          ctx.stroke();
          ctx.setLineDash([]);

          // Cue stick visual behind cue ball
          ctx.strokeStyle = 'rgba(226, 232, 240, 0.75)';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          const pullBack = 16 + power * 24;
          ctx.beginPath();
          ctx.moveTo(cue.x - nx * pullBack, cue.y - ny * pullBack);
          ctx.lineTo(cue.x - nx * (pullBack + 85), cue.y - ny * (pullBack + 85));
          ctx.stroke();
          ctx.lineCap = 'butt';
        }
      }

      // Balls
      for (const b of ballsRef.current) {
        if (b.potted) continue;
        const grad = ctx.createRadialGradient(
          b.x - BALL_R / 3,
          b.y - BALL_R / 3,
          BALL_R / 4,
          b.x,
          b.y,
          BALL_R
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.55, b.color);
        grad.addColorStop(1, b.color);
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 6;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    if (gameState !== 'PLAYING') {
      drawScene();
      return;
    }

    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.04);
      lastTime = now;

      const balls = ballsRef.current;
      if (isAnyMoving()) {
        const FRICTION = 0.986;
        const STOP_THRESHOLD = 5;
        const SUBSTEPS = 4;
        const sdt = dt / SUBSTEPS;

        for (let sub = 0; sub < SUBSTEPS; sub++) {
          for (const b of balls) {
            if (b.potted) continue;
            b.x += b.vx * sdt;
            b.y += b.vy * sdt;
            b.vx *= FRICTION;
            b.vy *= FRICTION;
            if (Math.abs(b.vx) < STOP_THRESHOLD) b.vx = 0;
            if (Math.abs(b.vy) < STOP_THRESHOLD) b.vy = 0;
          }

          for (const b of balls) {
            if (b.potted) continue;
            if (b.x - BALL_R < TABLE_X) {
              b.x = TABLE_X + BALL_R;
              b.vx = Math.abs(b.vx) * 0.85;
            }
            if (b.x + BALL_R > TABLE_X + TABLE_W) {
              b.x = TABLE_X + TABLE_W - BALL_R;
              b.vx = -Math.abs(b.vx) * 0.85;
            }
            if (b.y - BALL_R < TABLE_Y) {
              b.y = TABLE_Y + BALL_R;
              b.vy = Math.abs(b.vy) * 0.85;
            }
            if (b.y + BALL_R > TABLE_Y + TABLE_H) {
              b.y = TABLE_Y + TABLE_H - BALL_R;
              b.vy = -Math.abs(b.vy) * 0.85;
            }
          }

          for (let i = 0; i < balls.length; i++) {
            if (balls[i].potted) continue;
            for (let j = i + 1; j < balls.length; j++) {
              if (balls[j].potted) continue;
              const a = balls[i];
              const b = balls[j];
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const dist = Math.hypot(dx, dy);
              if (dist < BALL_R * 2 && dist > 0.001) {
                const nx = dx / dist;
                const ny = dy / dist;
                const dvx = b.vx - a.vx;
                const dvy = b.vy - a.vy;
                const dvn = dvx * nx + dvy * ny;
                if (dvn < 0) {
                  a.vx += dvn * nx;
                  a.vy += dvn * ny;
                  b.vx -= dvn * nx;
                  b.vy -= dvn * ny;
                  const overlap = BALL_R * 2 - dist;
                  a.x -= (nx * overlap) / 2;
                  a.y -= (ny * overlap) / 2;
                  b.x += (nx * overlap) / 2;
                  b.y += (ny * overlap) / 2;
                }
              }
            }
          }

          for (const b of balls) {
            if (b.potted) continue;
            for (const p of POCKETS) {
              if (Math.hypot(b.x - p.x, b.y - p.y) < POCKET_R) {
                if (b.isCue) {
                  b.x = TABLE_X + TABLE_W * 0.25;
                  b.y = TABLE_Y + TABLE_H / 2;
                  b.vx = 0;
                  b.vy = 0;
                  sounds.playHit();
                } else {
                  b.potted = true;
                  b.vx = 0;
                  b.vy = 0;
                  pottedRef.current += 1;
                  setPottedCount(pottedRef.current);
                  sounds.playPowerup();
                }
                break;
              }
            }
          }
        }
      } else {
        for (const b of balls) {
          b.vx = 0;
          b.vy = 0;
        }
        if (pottedRef.current >= 7) {
          const finalScore = Math.max(150, 1100 - strokesRef.current * 45);
          const rec = recordScore('billiards', finalScore);
          if (rec) setIsNewHigh(true);
          setGameState('VICTORY');
          drawScene();
          return;
        }
      }

      drawScene();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gameState, recordScore]);

  const currentScorePreview = pottedCount * 100;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.08]">
        <button
          onClick={() => setActiveGameId(null)}
          className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </button>

        <div className="text-center">
          <h2 className="text-xl font-bold text-white tracking-tight">Classic Billiards</h2>
          <span className="text-xs text-slate-400">
            Potted: {pottedCount}/7 · Strokes: {strokes}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold tabular-nums">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Trophy className="w-3.5 h-3.5" />
            <span className="text-base font-bold text-white">{Math.max(highScore, currentScorePreview)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-5">
        <div className="relative rounded-3xl overflow-hidden border border-white/[0.08] bg-slate-900/40 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] p-2">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerDown}
            className="w-[320px] h-[196px] sm:w-[540px] sm:h-[330px] rounded-2xl block touch-none cursor-crosshair bg-[#090d16]"
          />

          {gameState === 'IDLE' && (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-4">
                <Play className="w-7 h-7 ml-0.5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Pool Table</h3>
              <p className="text-xs text-slate-400 mb-6 max-w-xs">
                Move your pointer to aim from the cue ball and click to shoot. Pot all 7 balls in as few strokes as possible.
              </p>
              <button
                onClick={startNewGame}
                className="px-6 py-2.5 bg-white hover:bg-slate-200 text-slate-950 font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                Start Game
              </button>
            </div>
          )}

          {gameState === 'VICTORY' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-3">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">Table Cleared!</h3>
              {isNewHigh && (
                <div className="text-xs text-slate-300 font-semibold mb-3 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  New High Score!
                </div>
              )}
              <div className="text-sm text-slate-300 mb-6 tabular-nums">
                Strokes: <span className="text-white font-bold">{strokes}</span> · Score:{' '}
                <span className="text-white font-bold">{Math.max(150, 1100 - strokes * 45)}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={startNewGame}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-200 text-slate-950 font-bold rounded-xl transition-colors cursor-pointer text-xs"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>New Rack</span>
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

        <button
          onClick={startNewGame}
          className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Rack</span>
        </button>
      </div>
    </div>
  );
}
