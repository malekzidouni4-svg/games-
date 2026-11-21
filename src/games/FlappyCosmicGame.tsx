import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, RotateCcw, Trophy, Sparkles } from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { sounds } from '../utils/audio';

interface Pipe {
  x: number;
  topHeight: number;
  bottomHeight: number;
  passed: boolean;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 440;
const BIRD_SIZE = 18;
const GRAVITY = 0.35;
const JUMP_FORCE = -6.2;
const PIPE_WIDTH = 46;
const PIPE_GAP = 125;
const PIPE_SPEED = 2.4;

export default function FlappyCosmicGame() {
  const { setActiveGameId, stats, recordScore, incrementPlays, celebrateWin } = useArcade();
  const highScore = stats.scores.flappy || 0;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GAME_OVER'>('IDLE');
  const [score, setScore] = useState<number>(0);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);

  // Physics refs to avoid React state collisions
  const birdYRef = useRef<number>(CANVAS_HEIGHT / 2);
  const birdVelocityRef = useRef<number>(0);
  const birdRotationRef = useRef<number>(0);
  const pipesRef = useRef<Pipe[]>([]);
  const scoreRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const jump = () => {
    if (gameState === 'IDLE') {
      startGame();
      return;
    }
    if (gameState === 'PLAYING') {
      birdVelocityRef.current = JUMP_FORCE;
      sounds.playEat();
    }
  };

  const startGame = () => {
    sounds.playClick();
    incrementPlays('flappy');

    birdYRef.current = CANVAS_HEIGHT / 2;
    birdVelocityRef.current = 0;
    birdRotationRef.current = 0;
    pipesRef.current = [];
    scoreRef.current = 0;
    frameCountRef.current = 0;

    setScore(0);
    setIsNewHigh(false);
    setGameState('PLAYING');
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp'].includes(e.code)) {
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Main game physics loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      frameCountRef.current++;

      // Update Bird physics
      birdVelocityRef.current += GRAVITY;
      birdYRef.current += birdVelocityRef.current;
      birdRotationRef.current = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, birdVelocityRef.current * 0.08));

      // Ceiling / Floor Collision
      if (birdYRef.current - BIRD_SIZE <= 0 || birdYRef.current + BIRD_SIZE >= CANVAS_HEIGHT) {
        sounds.playGameOver();
        setGameState('GAME_OVER');
        const record = recordScore('flappy', scoreRef.current);
        if (record) {
          setIsNewHigh(true);
          celebrateWin();
        }
        return;
      }

      // Spawn Pipes
      if (frameCountRef.current % 110 === 0) {
        const minHeight = 60;
        const maxHeight = CANVAS_HEIGHT - PIPE_GAP - minHeight;
        const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
        const bottomHeight = CANVAS_HEIGHT - topHeight - PIPE_GAP;

        pipesRef.current.push({
          x: CANVAS_WIDTH,
          topHeight,
          bottomHeight,
          passed: false,
        });
      }

      // Move Pipes & Check Collision
      const birdX = 80;
      const birdY = birdYRef.current;

      for (let i = 0; i < pipesRef.current.length; i++) {
        const pipe = pipesRef.current[i];
        pipe.x -= PIPE_SPEED;

        // Collision Check
        if (birdX + BIRD_SIZE > pipe.x && birdX - BIRD_SIZE < pipe.x + PIPE_WIDTH) {
          if (birdY - BIRD_SIZE < pipe.topHeight || birdY + BIRD_SIZE > CANVAS_HEIGHT - pipe.bottomHeight) {
            sounds.playGameOver();
            setGameState('GAME_OVER');
            const record = recordScore('flappy', scoreRef.current);
            if (record) {
              setIsNewHigh(true);
              celebrateWin();
            }
            return;
          }
        }

        // Score Check
        if (!pipe.passed && pipe.x + PIPE_WIDTH < birdX) {
          pipe.passed = true;
          scoreRef.current += 1;
          setScore(scoreRef.current);
          sounds.playCardMatch();
        }
      }

      // Filter offscreen pipes
      pipesRef.current = pipesRef.current.filter((p) => p.x + PIPE_WIDTH > -20);

      // RENDER
      ctx.fillStyle = '#06080d';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Starfield background
      ctx.fillStyle = '#ffffff33';
      for (let i = 0; i < 25; i++) {
        const sx = ((i * 37 + frameCountRef.current * 0.4) % CANVAS_WIDTH);
        const sy = (i * 29) % CANVAS_HEIGHT;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Render Pipes (Glassmorphic gateways)
      pipesRef.current.forEach((pipe) => {
        // Top pipe
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.roundRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight, [0, 0, 8, 8]);
        ctx.fill();
        ctx.stroke();

        // Bottom pipe
        const bottomY = CANVAS_HEIGHT - pipe.bottomHeight;
        ctx.beginPath();
        ctx.roundRect(pipe.x, bottomY, PIPE_WIDTH, pipe.bottomHeight, [8, 8, 0, 0]);
        ctx.fill();
        ctx.stroke();

        // Glowing gateway edges
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(pipe.x, pipe.topHeight - 3, PIPE_WIDTH, 3);
        ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, 3);
        ctx.shadowBlur = 0;
      });

      // Render Bird (Spaceship probe)
      ctx.save();
      ctx.translate(birdX, birdY);
      ctx.rotate(birdRotationRef.current);

      // Thruster flame
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.moveTo(-BIRD_SIZE - 4, -3);
      ctx.lineTo(-BIRD_SIZE - 10, 0);
      ctx.lineTo(-BIRD_SIZE - 4, 3);
      ctx.fill();

      // Ship body
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(BIRD_SIZE, 0);
      ctx.lineTo(-BIRD_SIZE + 4, -BIRD_SIZE / 2);
      ctx.lineTo(-BIRD_SIZE / 2, 0);
      ctx.lineTo(-BIRD_SIZE + 4, BIRD_SIZE / 2);
      ctx.closePath();
      ctx.fill();

      // Glass Cockpit
      ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, recordScore, celebrateWin]);

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
          <h2 className="text-xl font-bold text-white tracking-tight">Flappy Cosmic</h2>
          <span className="text-xs text-slate-400">Tap to boost and pass through energy gates</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold tabular-nums text-slate-300">
          <div className="flex items-center gap-1.5">
            <span>Gates:</span>
            <span className="text-base text-white font-bold">{score}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Trophy className="w-3.5 h-3.5 text-slate-200" />
            <span className="text-base font-bold text-white">{Math.max(highScore, score)}</span>
          </div>
        </div>
      </div>

      {/* Main Arena */}
      <div className="flex flex-col items-center justify-center">
        <div
          onClick={jump}
          className="relative rounded-3xl overflow-hidden bg-slate-900/40 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] p-2 cursor-pointer select-none"
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-[320px] h-[352px] sm:w-[380px] sm:h-[418px] rounded-2xl block bg-[#06080d]"
          />

          {/* Overlays */}
          {gameState === 'IDLE' && (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-4">
                <Play className="w-7 h-7 ml-0.5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Click or Press Space to Fly</h3>
              <p className="text-xs text-slate-400 mb-6 max-w-xs">
                Keep the probe balanced between energy gates and avoid hitting the barriers.
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startGame();
                }}
                className="px-6 py-2.5 bg-white text-slate-950 hover:bg-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Launch Probe
              </button>
            </div>
          )}

          {gameState === 'GAME_OVER' && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <h3 className="text-2xl font-bold text-white mb-1">Flight Ended!</h3>
              {isNewHigh && (
                <div className="text-xs text-slate-300 font-semibold mb-3 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  New High Score!
                </div>
              )}
              <div className="text-sm text-slate-300 mb-6">
                Gates Cleared:{' '}
                <span className="text-xl font-bold text-white tabular-nums">{score}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startGame();
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-950 hover:bg-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveGameId(null);
                  }}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-slate-200 font-medium rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Library
                </button>
              </div>
            </div>
          )}
        </div>

        <span className="text-[11px] text-slate-500 mt-4">
          Tip: Click, tap, or press Space to climb smoothly
        </span>
      </div>
    </div>
  );
}
