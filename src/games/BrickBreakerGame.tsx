import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Trophy, Heart, Sparkles } from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { sounds } from '../utils/audio';

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  points: number;
  health: number;
  alive: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
}

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 440;
const PADDLE_WIDTH = 84;
const PADDLE_HEIGHT = 12;
const BALL_RADIUS = 6;

export default function BrickBreakerGame() {
  const { setActiveGameId, stats, recordScore, incrementPlays, celebrateWin } = useArcade();
  const highScore = stats.scores.breaker || 0;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'VICTORY'>('IDLE');
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [combo, setCombo] = useState<number>(1);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);

  // Mutable game physics refs
  const paddleXRef = useRef<number>((CANVAS_WIDTH - PADDLE_WIDTH) / 2);
  const ballRef = useRef<{ x: number; y: number; vx: number; vy: number; speed: number }>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 40,
    vx: 3,
    vy: -4,
    speed: 5,
  });
  const bricksRef = useRef<Brick[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  const initBricks = () => {
    const rows = 5;
    const cols = 8;
    const brickWidth = 48;
    const brickHeight = 16;
    const padding = 8;
    const offsetX = (CANVAS_WIDTH - (cols * brickWidth + (cols - 1) * padding)) / 2;
    const offsetY = 40;

    const colors = [
      { color: '#f43f5e', points: 50, health: 2 },
      { color: '#fb923c', points: 30, health: 1 },
      { color: '#facc15', points: 25, health: 1 },
      { color: '#4ade80', points: 20, health: 1 },
      { color: '#38bdf8', points: 15, health: 1 },
    ];

    const newBricks: Brick[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        newBricks.push({
          x: offsetX + c * (brickWidth + padding),
          y: offsetY + r * (brickHeight + padding),
          width: brickWidth,
          height: brickHeight,
          color: colors[r].color,
          points: colors[r].points,
          health: colors[r].health,
          alive: true,
        });
      }
    }
    bricksRef.current = newBricks;
  };

  const spawnParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 10; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        color,
        alpha: 1,
        size: Math.random() * 3 + 2,
      });
    }
  };

  const resetBallAndPaddle = () => {
    paddleXRef.current = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
    const angle = (Math.PI / 4) + Math.random() * (Math.PI / 2); // 45 to 135 deg upwards
    const speed = 4.8;
    ballRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 35,
      vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
      vy: -Math.abs(Math.sin(angle) * speed),
      speed,
    };
  };

  const startNewGame = () => {
    sounds.playClick();
    incrementPlays('breaker');
    initBricks();
    resetBallAndPaddle();
    particlesRef.current = [];
    setScore(0);
    setLives(3);
    setCombo(1);
    setIsNewHigh(false);
    setGameState('PLAYING');
  };

  const togglePause = () => {
    sounds.playClick();
    setGameState((prev) => (prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev));
  };

  // Keyboard controls
  useEffect(() => {
    let leftPressed = false;
    let rightPressed = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') leftPressed = true;
      if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') rightPressed = true;
      if (e.code === 'Space') {
        if (gameState === 'IDLE' || gameState === 'GAME_OVER' || gameState === 'VICTORY') {
          startNewGame();
        } else {
          togglePause();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') leftPressed = false;
      if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') rightPressed = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const controlLoop = setInterval(() => {
      if (gameState === 'PLAYING') {
        if (leftPressed) {
          paddleXRef.current = Math.max(0, paddleXRef.current - 7);
        }
        if (rightPressed) {
          paddleXRef.current = Math.min(CANVAS_WIDTH - PADDLE_WIDTH, paddleXRef.current + 7);
        }
      }
    }, 16);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(controlLoop);
    };
  }, [gameState]);

  // Mouse / Touch paddle tracking
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const clientX = e.clientX - rect.left;
    const canvasX = clientX * scaleX;
    paddleXRef.current = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, canvasX - PADDLE_WIDTH / 2));
  };

  // Main animation / physics loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    let currentScore = score;
    let currentLives = lives;
    let currentCombo = combo;

    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const ball = ballRef.current;
      const paddleX = paddleXRef.current;

      // Update ball position
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Left & Right Wall bounce
      if (ball.x - BALL_RADIUS <= 0) {
        ball.x = BALL_RADIUS;
        ball.vx = Math.abs(ball.vx);
        sounds.playHit();
      } else if (ball.x + BALL_RADIUS >= CANVAS_WIDTH) {
        ball.x = CANVAS_WIDTH - BALL_RADIUS;
        ball.vx = -Math.abs(ball.vx);
        sounds.playHit();
      }

      // Ceiling bounce
      if (ball.y - BALL_RADIUS <= 0) {
        ball.y = BALL_RADIUS;
        ball.vy = Math.abs(ball.vy);
        sounds.playHit();
      }

      // Paddle collision
      const paddleY = CANVAS_HEIGHT - 24;
      if (
        ball.y + BALL_RADIUS >= paddleY &&
        ball.y - BALL_RADIUS <= paddleY + PADDLE_HEIGHT &&
        ball.x >= paddleX &&
        ball.x <= paddleX + PADDLE_WIDTH
      ) {
        // Calculate deflection angle based on where it hit the paddle
        const hitOffset = (ball.x - (paddleX + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2); // -1 to +1
        const maxAngle = Math.PI / 3; // 60 degrees max
        const bounceAngle = hitOffset * maxAngle;

        const currentSpeed = Math.min(8, ball.speed + 0.05);
        ball.speed = currentSpeed;
        ball.vx = currentSpeed * Math.sin(bounceAngle);
        ball.vy = -currentSpeed * Math.cos(bounceAngle);
        ball.y = paddleY - BALL_RADIUS;

        // Reset combo on paddle touch
        currentCombo = 1;
        setCombo(1);
        sounds.playHit();
      }

      // Bottom death
      if (ball.y - BALL_RADIUS > CANVAS_HEIGHT) {
        sounds.playHit();
        currentLives -= 1;
        setLives(currentLives);

        if (currentLives <= 0) {
          sounds.playGameOver();
          setGameState('GAME_OVER');
          const hitRecord = recordScore('breaker', currentScore);
          if (hitRecord) setIsNewHigh(true);
          return;
        } else {
          resetBallAndPaddle();
        }
      }

      // Brick collisions
      let hitAnyBrick = false;
      let remainingBricks = 0;

      bricksRef.current.forEach((brick) => {
        if (!brick.alive) return;
        remainingBricks++;

        if (
          ball.x + BALL_RADIUS >= brick.x &&
          ball.x - BALL_RADIUS <= brick.x + brick.width &&
          ball.y + BALL_RADIUS >= brick.y &&
          ball.y - BALL_RADIUS <= brick.y + brick.height
        ) {
          hitAnyBrick = true;
          brick.health -= 1;

          if (brick.health <= 0) {
            brick.alive = false;
            remainingBricks--;
            spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color);
            sounds.playBrickBreak();

            const pts = brick.points * currentCombo;
            currentScore += pts;
            setScore(currentScore);
            currentCombo = Math.min(8, currentCombo + 1);
            setCombo(currentCombo);
          } else {
            sounds.playHit();
          }

          // Simple bounce
          const prevBallX = ball.x - ball.vx;
          if (prevBallX < brick.x || prevBallX > brick.x + brick.width) {
            ball.vx = -ball.vx;
          } else {
            ball.vy = -ball.vy;
          }
        }
      });

      // Win condition: all bricks destroyed!
      if (remainingBricks === 0) {
        celebrateWin();
        currentScore += 500; // Stage clear bonus
        setScore(currentScore);
        recordScore('breaker', currentScore);
        setGameState('VICTORY');
        return;
      }

      // Update particles
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.025;
      });
      particlesRef.current = particlesRef.current.filter((p) => p.alpha > 0);

      // RENDER
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Render Bricks
      bricksRef.current.forEach((brick) => {
        if (!brick.alive) return;
        ctx.fillStyle = brick.color;
        ctx.shadowColor = brick.color;
        ctx.shadowBlur = brick.health > 1 ? 10 : 4;
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 4);
        ctx.fill();

        // Cracks on 2-hit brick
        if (brick.health === 1 && brick.points === 50) {
          ctx.strokeStyle = '#ffffff88';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(brick.x + 8, brick.y + 4);
          ctx.lineTo(brick.x + brick.width - 8, brick.y + brick.height - 4);
          ctx.stroke();
        }
      });

      // Render Particles
      particlesRef.current.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render Paddle
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(paddleX, paddleY, PADDLE_WIDTH, PADDLE_HEIGHT, 6);
      ctx.fill();

      // Render Ball
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, score, lives, combo, recordScore, celebrateWin]);

  const movePaddleStep = (direction: 'LEFT' | 'RIGHT') => {
    sounds.playClick();
    if (direction === 'LEFT') {
      paddleXRef.current = Math.max(0, paddleXRef.current - 28);
    } else {
      paddleXRef.current = Math.min(CANVAS_WIDTH - PADDLE_WIDTH, paddleXRef.current + 28);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      {/* Game Header */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.08]">
        <button
          onClick={() => setActiveGameId(null)}
          className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </button>

        <div className="text-center">
          <h2 className="text-xl font-bold text-white tracking-tight">Brick Breaker</h2>
          <span className="text-xs text-slate-400">Break every brick to clear the stage</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold tabular-nums">
          <div className="flex items-center gap-1 text-rose-400">
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
          <div className="flex items-center gap-1.5 text-amber-400">
            <Trophy className="w-3.5 h-3.5" />
            <span className="text-base font-bold">{Math.max(highScore, score)}</span>
          </div>
        </div>
      </div>

      {/* Main Game Screen */}
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-center">
        <div className="relative rounded-3xl overflow-hidden border border-white/[0.08] bg-slate-900/40 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] p-2">
          {combo > 1 && (
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-white/10 border border-white/20 text-white px-2.5 py-1 rounded-lg text-xs font-bold animate-pulse backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Combo: x{combo}</span>
            </div>
          )}

          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onPointerMove={handlePointerMove}
            className="w-[320px] h-[293px] sm:w-[440px] sm:h-[403px] rounded-2xl block touch-none cursor-ew-resize bg-[#090d16]"
          />

          {/* Overlay States */}
          {gameState === 'IDLE' && (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-4">
                <Play className="w-7 h-7 ml-0.5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Brick Breaker Challenge</h3>
              <p className="text-xs text-slate-400 mb-6 max-w-xs">
                Move the paddle with your mouse, touch, or arrow keys to bounce the ball and shatter all bricks.
              </p>
              <button
                onClick={startNewGame}
                className="px-6 py-2.5 bg-white hover:bg-slate-200 text-slate-950 font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                Start Game
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
              <h3 className="text-2xl font-bold text-white mb-1">Out of Lives!</h3>
              {isNewHigh && (
                <div className="text-xs text-slate-300 font-semibold mb-3 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  New High Score!
                </div>
              )}
              <div className="text-sm text-slate-300 mb-6">
                Final Score:{' '}
                <span className="text-xl font-bold text-white tabular-nums">{score}</span>
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

          {gameState === 'VICTORY' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-3">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">Stage Cleared!</h3>
              <p className="text-xs text-slate-300 font-semibold mb-3">+500 Stage Clear Bonus</p>
              <div className="text-sm text-slate-300 mb-6">
                Final Score:{' '}
                <span className="text-xl font-bold text-white tabular-nums">{score}</span>
              </div>
              <button
                onClick={startNewGame}
                className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-slate-200 text-slate-950 font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>
            </div>
          )}
        </div>

        {/* Side Controls */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {gameState === 'PLAYING' && (
              <button
                onClick={togglePause}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
            )}
            {gameState === 'PAUSED' && (
              <button
                onClick={togglePause}
                className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </button>
            )}
            {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
              <button
                onClick={startNewGame}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restart</span>
              </button>
            )}
          </div>

          {/* Quick Direction Buttons for touch */}
          <div className="flex gap-4 sm:hidden">
            <button
              onClick={() => movePaddleStep('LEFT')}
              className="px-6 py-3 bg-slate-800 active:bg-sky-600 text-white font-bold rounded-xl text-xl shadow"
            >
              ←
            </button>
            <button
              onClick={() => movePaddleStep('RIGHT')}
              className="px-6 py-3 bg-slate-800 active:bg-sky-600 text-white font-bold rounded-xl text-xl shadow"
            >
              →
            </button>
          </div>

          <div className="text-[11px] text-slate-500 text-center max-w-[200px]">
            Tip: Drag your finger or mouse directly across the board to glide smoothly.
          </div>
        </div>
      </div>
    </div>
  );
}
