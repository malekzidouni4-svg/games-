import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Trophy, Heart, Sparkles, Crosshair } from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { sounds } from '../utils/audio';

const W = 480;
const H = 500;
const COLS = 6;
const ROWS = 4;
const AW = 38;
const AH = 26;
const AGX = 14;
const AGY = 14;
const TOP = 56;
const LEFT = (W - (COLS * AW + (COLS - 1) * AGX)) / 2;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

interface Alien {
  x: number;
  y: number;
  alive: boolean;
  color: string;
}

interface Bullet {
  x: number;
  y: number;
  vy: number;
  dead?: boolean;
}

export default function SpaceInvadersGame() {
  const { setActiveGameId, stats, recordScore, incrementPlays } = useArcade();
  const highScore = stats.scores.invaders || 0;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'VICTORY'>('IDLE');
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [wave, setWave] = useState<number>(1);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);

  const aliensRef = useRef<Alien[]>([]);
  const dirRef = useRef<number>(1);
  const playerXRef = useRef<number>(W / 2);
  const pBulletsRef = useRef<Bullet[]>([]);
  const eBulletsRef = useRef<Bullet[]>([]);
  const cooldownRef = useRef<number>(0);
  const shootTimerRef = useRef<number>(1.2);
  const scoreRef = useRef<number>(0);
  const livesRef = useRef<number>(3);
  const waveRef = useRef<number>(1);
  const keysRef = useRef<{ left: boolean; right: boolean; fire: boolean }>({
    left: false,
    right: false,
    fire: false,
  });
  const rafRef = useRef<number | null>(null);

  const spawnWave = useCallback((waveNum: number) => {
    const rowColors = ['#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b'];
    const list: Alien[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        list.push({
          x: LEFT + c * (AW + AGX),
          y: TOP + r * (AH + AGY) + Math.min(40, (waveNum - 1) * 10),
          alive: true,
          color: rowColors[r % rowColors.length],
        });
      }
    }
    aliensRef.current = list;
    dirRef.current = 1;
    pBulletsRef.current = [];
    eBulletsRef.current = [];
    cooldownRef.current = 0;
    shootTimerRef.current = Math.max(0.55, 1.35 - (waveNum - 1) * 0.15);
  }, []);

  const startNewGame = useCallback(() => {
    sounds.playClick();
    incrementPlays('invaders');
    scoreRef.current = 0;
    livesRef.current = 3;
    waveRef.current = 1;
    playerXRef.current = W / 2;
    spawnWave(1);
    setScore(0);
    setLives(3);
    setWave(1);
    setIsNewHigh(false);
    setGameState('PLAYING');
  }, [incrementPlays, spawnWave]);

  const togglePause = useCallback(() => {
    sounds.playClick();
    setGameState((prev) => (prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev));
  }, []);

  const fireBullet = useCallback(() => {
    if (gameState !== 'PLAYING' || cooldownRef.current > 0) return;
    pBulletsRef.current.push({ x: playerXRef.current, y: H - 62, vy: -580 });
    cooldownRef.current = 0.24;
    sounds.playClick();
  }, [gameState]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = true;
      if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = true;
      if (e.code === 'Space') {
        if (gameState === 'IDLE' || gameState === 'GAME_OVER' || gameState === 'VICTORY') {
          startNewGame();
        } else {
          keysRef.current.fire = true;
        }
      }
      if (e.key === 'p' || e.key === 'P') {
        if (gameState === 'PLAYING' || gameState === 'PAUSED') togglePause();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = false;
      if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = false;
      if (e.code === 'Space') keysRef.current.fire = false;
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
    const scaleX = W / rect.width;
    const cx = (e.clientX - rect.left) * scaleX;
    playerXRef.current = clamp(cx, 24, W - 24);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const playerY = H - 52;
    const playerW = 42;
    const playerH = 16;

    const drawScene = (timeMs: number) => {
      ctx.fillStyle = '#070a12';
      ctx.fillRect(0, 0, W, H);

      // Subtle starfield
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      for (let i = 0; i < 45; i++) {
        ctx.fillRect((i * 97) % W, (i * 173 + timeMs * 0.018) % H, 1.5, 1.5);
      }

      // Aliens
      for (const al of aliensRef.current) {
        if (!al.alive) continue;
        ctx.fillStyle = al.color;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.25)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(al.x, al.y, AW, AH, 7);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Eyes
        ctx.fillStyle = '#070a12';
        ctx.beginPath();
        ctx.arc(al.x + AW * 0.33, al.y + AH * 0.44, 3.5, 0, Math.PI * 2);
        ctx.arc(al.x + AW * 0.67, al.y + AH * 0.44, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Player ship
      const px = playerXRef.current;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(px, playerY - 12);
      ctx.lineTo(px + playerW / 2, playerY + playerH);
      ctx.lineTo(px + playerW / 2 - 8, playerY + playerH);
      ctx.lineTo(px, playerY + 4);
      ctx.lineTo(px - playerW / 2 + 8, playerY + playerH);
      ctx.lineTo(px - playerW / 2, playerY + playerH);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Player bullets
      ctx.fillStyle = '#f8fafc';
      for (const b of pBulletsRef.current) {
        ctx.fillRect(b.x - 1.5, b.y, 3, 13);
      }

      // Enemy bullets
      ctx.fillStyle = '#fb7185';
      for (const b of eBulletsRef.current) {
        ctx.fillRect(b.x - 2, b.y, 4, 11);
      }
    };

    if (gameState !== 'PLAYING') {
      drawScene(performance.now());
      return;
    }

    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const pSpeed = 340;
      if (keysRef.current.left) playerXRef.current -= pSpeed * dt;
      if (keysRef.current.right) playerXRef.current += pSpeed * dt;
      playerXRef.current = clamp(playerXRef.current, 24, W - 24);

      cooldownRef.current -= dt;
      if (keysRef.current.fire && cooldownRef.current <= 0) {
        pBulletsRef.current.push({ x: playerXRef.current, y: playerY - 14, vy: -580 });
        cooldownRef.current = 0.24;
        sounds.playClick();
      }

      const alive = aliensRef.current.filter((a) => a.alive);
      if (alive.length === 0) {
        // Wave cleared -> next wave + bonus
        scoreRef.current += 120 * waveRef.current;
        waveRef.current += 1;
        setScore(scoreRef.current);
        setWave(waveRef.current);
        sounds.playPowerup();
        spawnWave(waveRef.current);
      } else {
        const speed = 38 + (aliensRef.current.length - alive.length) * 6 + (waveRef.current - 1) * 8;
        for (const al of alive) al.x += dirRef.current * speed * dt;
        const hitEdge = alive.some((al) => al.x < 10 || al.x + AW > W - 10);
        if (hitEdge) {
          dirRef.current *= -1;
          for (const al of aliensRef.current) {
            al.y += 18;
            al.x += dirRef.current * 4;
          }
        }

        if (alive.some((al) => al.y + AH > playerY - 6)) {
          sounds.playGameOver();
          const record = recordScore('invaders', scoreRef.current);
          if (record) setIsNewHigh(true);
          setGameState('GAME_OVER');
          drawScene(now);
          return;
        }
      }

      // Player bullets movement & hits
      for (const b of pBulletsRef.current) b.y += b.vy * dt;
      pBulletsRef.current = pBulletsRef.current.filter((b) => b.y > -20);

      for (const b of pBulletsRef.current) {
        for (const al of aliensRef.current) {
          if (!al.alive) continue;
          if (b.x > al.x && b.x < al.x + AW && b.y > al.y && b.y < al.y + AH) {
            al.alive = false;
            b.dead = true;
            scoreRef.current += 15;
            setScore(scoreRef.current);
            sounds.playBrickBreak();
            break;
          }
        }
      }
      pBulletsRef.current = pBulletsRef.current.filter((b) => !b.dead);

      // Enemy shooting
      shootTimerRef.current -= dt;
      if (shootTimerRef.current <= 0 && eBulletsRef.current.length < 4) {
        const shooters = aliensRef.current.filter((a) => a.alive);
        if (shooters.length > 0) {
          const src = shooters[Math.floor(Math.random() * shooters.length)];
          eBulletsRef.current.push({ x: src.x + AW / 2, y: src.y + AH, vy: 245 + waveRef.current * 15 });
        }
        shootTimerRef.current = Math.max(0.45, 0.75 + Math.random() * 0.85 - waveRef.current * 0.05);
      }

      for (const b of eBulletsRef.current) b.y += b.vy * dt;
      eBulletsRef.current = eBulletsRef.current.filter((b) => b.y < H + 20);

      let lost = false;
      for (const b of eBulletsRef.current) {
        if (
          Math.abs(b.x - playerXRef.current) < playerW / 2 - 4 &&
          b.y > playerY - 10 &&
          b.y < playerY + playerH
        ) {
          b.dead = true;
          livesRef.current -= 1;
          setLives(livesRef.current);
          sounds.playHit();
          if (livesRef.current <= 0) {
            lost = true;
            break;
          }
        }
      }
      eBulletsRef.current = eBulletsRef.current.filter((b) => !b.dead);

      if (lost) {
        sounds.playGameOver();
        const record = recordScore('invaders', scoreRef.current);
        if (record) setIsNewHigh(true);
        setGameState('GAME_OVER');
        drawScene(now);
        return;
      }

      drawScene(now);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gameState, recordScore, spawnWave]);

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
          <h2 className="text-xl font-bold text-white tracking-tight">Space Invaders</h2>
          <span className="text-xs text-slate-400">Wave {wave}</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold tabular-nums">
          <div className="flex items-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 ${i < lives ? 'fill-rose-500 text-rose-500' : 'text-slate-700'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span>Score:</span>
            <span className="text-base text-white font-bold">{score}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Trophy className="w-3.5 h-3.5" />
            <span className="text-base font-bold text-white">{Math.max(highScore, score)}</span>
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
            onPointerDown={fireBullet}
            className="w-[320px] h-[333px] sm:w-[440px] sm:h-[458px] rounded-2xl block touch-none cursor-crosshair bg-[#070a12]"
          />

          {gameState === 'IDLE' && (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-4">
                <Play className="w-7 h-7 ml-0.5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Orbit Defense</h3>
              <p className="text-xs text-slate-400 mb-6 max-w-xs">
                Move your ship with your mouse or ← → keys, and click or press Space to fire lasers and clear alien waves.
              </p>
              <button
                onClick={startNewGame}
                className="px-6 py-2.5 bg-white hover:bg-slate-200 text-slate-950 font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                Start Battle
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

          {gameState === 'GAME_OVER' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <h3 className="text-2xl font-bold text-white mb-1">Ship Destroyed!</h3>
              {isNewHigh && (
                <div className="text-xs text-slate-300 font-semibold mb-3 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  New High Score!
                </div>
              )}
              <div className="text-sm text-slate-300 mb-6">
                Total Score: <span className="text-xl font-bold text-white tabular-nums">{score}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={startNewGame}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-200 text-slate-950 font-bold rounded-xl transition-colors cursor-pointer text-xs"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Try Again</span>
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

          <div className="flex items-center gap-3 sm:hidden">
            <button
              onClick={() => { playerXRef.current = clamp(playerXRef.current - 30, 24, W - 24); }}
              className="px-5 py-3 bg-white/[0.06] active:bg-white/20 border border-white/[0.08] text-white font-bold rounded-xl"
            >
              ←
            </button>
            <button
              onClick={fireBullet}
              className="px-5 py-3 bg-white text-slate-950 font-bold rounded-xl flex items-center gap-1.5 text-xs"
            >
              <Crosshair className="w-4 h-4" />
              <span>Fire</span>
            </button>
            <button
              onClick={() => { playerXRef.current = clamp(playerXRef.current + 30, 24, W - 24); }}
              className="px-5 py-3 bg-white/[0.06] active:bg-white/20 border border-white/[0.08] text-white font-bold rounded-xl"
            >
              →
            </button>
          </div>

          <p className="text-[11px] text-slate-500 text-center max-w-[200px]">
            Move your pointer or swipe to steer the ship and click to fire lasers.
          </p>
        </div>
      </div>
    </div>
  );
}
