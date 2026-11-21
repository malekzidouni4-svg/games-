import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Trophy, Shield, Sparkles } from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { sounds } from '../utils/audio';

interface Asteroid {
  x: number;
  y: number;
  radius: number;
  speed: number;
  angle: number;
  rotationSpeed: number;
  color: string;
}

interface Item {
  x: number;
  y: number;
  radius: number;
  type: 'SHIELD' | 'CRYSTAL';
  speed: number;
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

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
}

const CANVAS_WIDTH = 440;
const CANVAS_HEIGHT = 480;
const SHIP_WIDTH = 34;
const SHIP_HEIGHT = 38;

export default function SpaceDodgeGame() {
  const { setActiveGameId, stats, recordScore, incrementPlays } = useArcade();
  const highScore = stats.scores.space || 0;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'>('IDLE');
  const [score, setScore] = useState<number>(0);
  const [shields, setShields] = useState<number>(3);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);

  // Mutable refs
  const shipXRef = useRef<number>((CANVAS_WIDTH - SHIP_WIDTH) / 2);
  const asteroidsRef = useRef<Asteroid[]>([]);
  const itemsRef = useRef<Item[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Initialize stars background
  useEffect(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 60; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * 2 + 0.8,
        speed: Math.random() * 2 + 0.5,
      });
    }
    starsRef.current = stars;
  }, []);

  const spawnExplosion = (x: number, y: number, color: string, count = 14) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 7,
        vy: (Math.random() - 0.5) * 7,
        color,
        alpha: 1,
        size: Math.random() * 3 + 2,
      });
    }
  };

  const startNewGame = () => {
    sounds.playClick();
    incrementPlays('space');
    shipXRef.current = (CANVAS_WIDTH - SHIP_WIDTH) / 2;
    asteroidsRef.current = [];
    itemsRef.current = [];
    particlesRef.current = [];
    setScore(0);
    setShields(3);
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
        if (gameState === 'IDLE' || gameState === 'GAME_OVER') {
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
          shipXRef.current = Math.max(8, shipXRef.current - 7);
        }
        if (rightPressed) {
          shipXRef.current = Math.min(CANVAS_WIDTH - SHIP_WIDTH - 8, shipXRef.current + 7);
        }
      }
    }, 16);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(controlLoop);
    };
  }, [gameState]);

  // Touch / pointer drag
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const clientX = e.clientX - rect.left;
    const canvasX = clientX * scaleX;
    shipXRef.current = Math.max(8, Math.min(CANVAS_WIDTH - SHIP_WIDTH - 8, canvasX - SHIP_WIDTH / 2));
  };

  // Game loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    let currentScore = score;
    let currentShields = shields;
    let frameCount = 0;

    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      frameCount++;

      // Increase score by 1 every 5 frames (~12 pts per second)
      if (frameCount % 5 === 0) {
        currentScore += 1;
        setScore(currentScore);
      }

      // Spawn asteroids based on score difficulty
      const spawnRate = Math.max(18, 55 - Math.floor(currentScore / 100) * 4);
      if (frameCount % spawnRate === 0) {
        const radius = Math.random() * 12 + 10;
        const speed = Math.random() * 2.5 + 2.5 + Math.min(4, currentScore / 400);
        asteroidsRef.current.push({
          x: Math.random() * (CANVAS_WIDTH - radius * 2) + radius,
          y: -radius * 2,
          radius,
          speed,
          angle: 0,
          rotationSpeed: (Math.random() - 0.5) * 0.08,
          color: Math.random() > 0.5 ? '#f97316' : '#ef4444',
        });
      }

      // Spawn powerups
      if (frameCount % 180 === 0) {
        const type = Math.random() > 0.4 ? 'CRYSTAL' : 'SHIELD';
        itemsRef.current.push({
          x: Math.random() * (CANVAS_WIDTH - 40) + 20,
          y: -20,
          radius: 10,
          type,
          speed: 2.2,
        });
      }

      // Move stars
      starsRef.current.forEach((star) => {
        star.y += star.speed;
        if (star.y > CANVAS_HEIGHT) {
          star.y = 0;
          star.x = Math.random() * CANVAS_WIDTH;
        }
      });

      // Move asteroids & check collision
      const shipY = CANVAS_HEIGHT - SHIP_HEIGHT - 24;
      const shipX = shipXRef.current;
      const shipCenter = { x: shipX + SHIP_WIDTH / 2, y: shipY + SHIP_HEIGHT / 2 };

      asteroidsRef.current.forEach((ast) => {
        ast.y += ast.speed;
        ast.angle += ast.rotationSpeed;

        // Ship-Asteroid collision check
        const dist = Math.hypot(ast.x - shipCenter.x, ast.y - shipCenter.y);
        if (dist < ast.radius + SHIP_WIDTH / 2.6) {
          // Hit!
          ast.y = CANVAS_HEIGHT + 100; // remove
          spawnExplosion(ast.x, ast.y, '#f97316', 18);
          sounds.playHit();

          currentShields -= 1;
          setShields(currentShields);

          if (currentShields <= 0) {
            sounds.playGameOver();
            setGameState('GAME_OVER');
            const record = recordScore('space', currentScore);
            if (record) setIsNewHigh(true);
            return;
          }
        }
      });
      asteroidsRef.current = asteroidsRef.current.filter((ast) => ast.y < CANVAS_HEIGHT + 50);

      // Move items & check pickup
      itemsRef.current.forEach((item) => {
        item.y += item.speed;

        const dist = Math.hypot(item.x - shipCenter.x, item.y - shipCenter.y);
        if (dist < item.radius + SHIP_WIDTH / 2.2) {
          item.y = CANVAS_HEIGHT + 100; // remove

          if (item.type === 'SHIELD') {
            sounds.playPowerup();
            currentShields = Math.min(3, currentShields + 1);
            setShields(currentShields);
            spawnExplosion(item.x, item.y, '#38bdf8', 12);
          } else {
            sounds.playEat();
            currentScore += 35;
            setScore(currentScore);
            spawnExplosion(item.x, item.y, '#facc15', 12);
          }
        }
      });
      itemsRef.current = itemsRef.current.filter((it) => it.y < CANVAS_HEIGHT + 30);

      // Engine thruster particles
      if (frameCount % 2 === 0) {
        particlesRef.current.push({
          x: shipX + SHIP_WIDTH / 2 + (Math.random() - 0.5) * 6,
          y: shipY + SHIP_HEIGHT,
          vx: (Math.random() - 0.5) * 1.5,
          vy: Math.random() * 3 + 2,
          color: Math.random() > 0.5 ? '#38bdf8' : '#ec4899',
          alpha: 0.9,
          size: Math.random() * 3 + 2,
        });
      }

      // Update particles
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.035;
      });
      particlesRef.current = particlesRef.current.filter((p) => p.alpha > 0);

      // RENDER CANVAS
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Render stars
      ctx.fillStyle = '#ffffff';
      starsRef.current.forEach((s) => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
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

      // Render Items (Shields & Crystals)
      itemsRef.current.forEach((it) => {
        ctx.save();
        if (it.type === 'SHIELD') {
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(it.x, it.y, it.radius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#facc15';
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(it.x, it.y - it.radius);
          ctx.lineTo(it.x + it.radius, it.y);
          ctx.lineTo(it.x, it.y + it.radius);
          ctx.lineTo(it.x - it.radius, it.y);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      });

      // Render Asteroids
      asteroidsRef.current.forEach((ast) => {
        ctx.save();
        ctx.translate(ast.x, ast.y);
        ctx.rotate(ast.angle);
        ctx.fillStyle = ast.color;
        ctx.shadowColor = ast.color;
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.arc(0, 0, ast.radius, 0, Math.PI * 2);
        ctx.fill();

        // Crater detail
        ctx.fillStyle = '#00000044';
        ctx.beginPath();
        ctx.arc(ast.radius * 0.3, ast.radius * 0.2, ast.radius * 0.28, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Render Spaceship
      ctx.save();
      ctx.translate(shipX, shipY);

      // Energy Shield Bubble if shields > 0
      if (currentShields > 0) {
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + currentShields * 0.2})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(SHIP_WIDTH / 2, SHIP_HEIGHT / 2, SHIP_WIDTH / 1.4, SHIP_HEIGHT / 1.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Spaceship body
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(SHIP_WIDTH / 2, 0); // Nose
      ctx.lineTo(SHIP_WIDTH, SHIP_HEIGHT - 6); // Right wing
      ctx.lineTo(SHIP_WIDTH / 2, SHIP_HEIGHT - 12); // Engine center
      ctx.lineTo(0, SHIP_HEIGHT - 6); // Left wing
      ctx.closePath();
      ctx.fill();

      // Cockpit
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(SHIP_WIDTH / 2, SHIP_HEIGHT * 0.45, 4, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, shields, recordScore]);

  const moveShipStep = (dir: 'LEFT' | 'RIGHT') => {
    sounds.playClick();
    if (dir === 'LEFT') {
      shipXRef.current = Math.max(8, shipXRef.current - 26);
    } else {
      shipXRef.current = Math.min(CANVAS_WIDTH - SHIP_WIDTH - 8, shipXRef.current + 26);
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
          <h2 className="text-xl font-bold text-white tracking-tight">Space Dodge</h2>
          <span className="text-xs text-slate-400">Survive asteroid storms and collect shields</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold tabular-nums">
          <div className="flex items-center gap-1 text-sky-400">
            {Array.from({ length: 3 }).map((_, i) => (
              <Shield
                key={i}
                className={`w-4 h-4 ${i < shields ? 'fill-sky-400 text-sky-400' : 'text-slate-700'}`}
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

      {/* Main Arena */}
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-center">
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl p-2">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onPointerMove={handlePointerMove}
            className="w-[320px] h-[349px] sm:w-[400px] sm:h-[436px] rounded-xl block touch-none cursor-ew-resize bg-[#060913]"
          />

          {/* Overlay States */}
          {gameState === 'IDLE' && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center mb-4">
                <Play className="w-7 h-7 ml-0.5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Cosmic Survival</h3>
              <p className="text-xs text-slate-400 mb-6 max-w-xs">
                Dodge falling asteroids while picking up golden crystals (+35) and blue energy shields.
              </p>
              <button
                onClick={startNewGame}
                className="px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                Launch Ship
              </button>
            </div>
          )}

          {gameState === 'PAUSED' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <h3 className="text-xl font-bold text-white mb-4">Game Paused</h3>
              <button
                onClick={togglePause}
                className="px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                Resume
              </button>
            </div>
          )}

          {gameState === 'GAME_OVER' && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <h3 className="text-2xl font-black text-rose-500 mb-1">Ship Destroyed!</h3>
              {isNewHigh && (
                <div className="text-xs text-amber-300 font-bold mb-3 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  New High Score!
                </div>
              )}
              <div className="text-sm text-slate-300 mb-6">
                Final Score:{' '}
                <span className="text-xl font-black text-white tabular-nums">{score}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={startNewGame}
                  className="flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Fly Again</span>
                </button>
                <button
                  onClick={() => setActiveGameId(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-colors cursor-pointer"
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
                className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
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
              onClick={() => moveShipStep('LEFT')}
              className="px-6 py-3 bg-slate-800 active:bg-pink-600 text-white font-bold rounded-xl text-xl shadow"
            >
              ←
            </button>
            <button
              onClick={() => moveShipStep('RIGHT')}
              className="px-6 py-3 bg-slate-800 active:bg-pink-600 text-white font-bold rounded-xl text-xl shadow"
            >
              →
            </button>
          </div>

          <div className="text-[11px] text-slate-500 text-center max-w-[200px]">
            You can also drag your finger or mouse across the screen to steer directly
          </div>
        </div>
      </div>
    </div>
  );
}
