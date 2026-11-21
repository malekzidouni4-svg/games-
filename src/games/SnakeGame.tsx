import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Trophy, Sparkles } from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { sounds } from '../utils/audio';

const GRID_SIZE = 20;
const INITIAL_SPEED = 140;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export default function SnakeGame() {
  const { setActiveGameId, stats, recordScore, incrementPlays } = useArcade();
  const highScore = stats.scores.snake || 0;

  const [snake, setSnake] = useState<Point[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
  ]);
  const [direction, setDirection] = useState<Direction>('UP');
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [goldenFood, setGoldenFood] = useState<Point | null>(null);
  const [goldenTimer, setGoldenTimer] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'>('IDLE');

  // Mutable refs to eliminate setState-in-setState concurrency
  const snakeRef = useRef<Point[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
  ]);
  const directionRef = useRef<Direction>('UP');
  const nextDirectionRef = useRef<Direction>('UP');
  const scoreRef = useRef<number>(0);
  const foodRef = useRef<Point>({ x: 5, y: 5 });
  const goldenFoodRef = useRef<Point | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const goldenTimerRef = useRef<number | null>(null);

  // Spawn standard food
  const generateFood = useCallback((currentSnake: Point[]): Point => {
    while (true) {
      const x = Math.floor(Math.random() * GRID_SIZE);
      const y = Math.floor(Math.random() * GRID_SIZE);
      const onSnake = currentSnake.some((p) => p.x === x && p.y === y);
      if (!onSnake) {
        return { x, y };
      }
    }
  }, []);

  // Start or restart game
  const startGame = () => {
    sounds.playClick();
    incrementPlays('snake');

    const initialSnake: Point[] = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ];
    const initialFood = generateFood(initialSnake);

    snakeRef.current = initialSnake;
    directionRef.current = 'UP';
    nextDirectionRef.current = 'UP';
    scoreRef.current = 0;
    foodRef.current = initialFood;
    goldenFoodRef.current = null;

    setSnake(initialSnake);
    setDirection('UP');
    setScore(0);
    setIsNewHigh(false);
    setGoldenFood(null);
    setGoldenTimer(0);
    setFood(initialFood);
    setGameState('PLAYING');
  };

  const togglePause = () => {
    sounds.playClick();
    setGameState((prev) => (prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev));
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'Space') {
        if (gameState === 'IDLE' || gameState === 'GAME_OVER') {
          startGame();
        } else {
          togglePause();
        }
        return;
      }

      if (gameState !== 'PLAYING') return;

      const currentDir = directionRef.current;
      if ((e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') && currentDir !== 'DOWN') {
        nextDirectionRef.current = 'UP';
      } else if ((e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') && currentDir !== 'UP') {
        nextDirectionRef.current = 'DOWN';
      } else if ((e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && currentDir !== 'RIGHT') {
        nextDirectionRef.current = 'LEFT';
      } else if ((e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') && currentDir !== 'LEFT') {
        nextDirectionRef.current = 'RIGHT';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Golden food countdown
  useEffect(() => {
    if (goldenFood && gameState === 'PLAYING') {
      goldenTimerRef.current = window.setInterval(() => {
        setGoldenTimer((t) => {
          if (t <= 1) {
            goldenFoodRef.current = null;
            setGoldenFood(null);
            return 0;
          }
          return t - 1;
        });
      }, 1000);

      return () => {
        if (goldenTimerRef.current) clearInterval(goldenTimerRef.current);
      };
    }
  }, [goldenFood, gameState]);

  // Main game tick loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    // Speed increases as score grows
    const speed = Math.max(70, INITIAL_SPEED - Math.floor(score / 50) * 10);

    const interval = setInterval(() => {
      const prevSnake = snakeRef.current;
      const head = { ...prevSnake[0] };
      const currentDir = nextDirectionRef.current;
      directionRef.current = currentDir;
      setDirection(currentDir);

      switch (currentDir) {
        case 'UP':
          head.y -= 1;
          break;
        case 'DOWN':
          head.y += 1;
          break;
        case 'LEFT':
          head.x -= 1;
          break;
        case 'RIGHT':
          head.x += 1;
          break;
      }

      // Wall collision
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        sounds.playGameOver();
        setGameState('GAME_OVER');
        const hitRecord = recordScore('snake', scoreRef.current);
        if (hitRecord) setIsNewHigh(true);
        return;
      }

      // Self collision
      const selfHit = prevSnake.slice(0, -1).some((part) => part.x === head.x && part.y === head.y);
      if (selfHit) {
        sounds.playGameOver();
        setGameState('GAME_OVER');
        const hitRecord = recordScore('snake', scoreRef.current);
        if (hitRecord) setIsNewHigh(true);
        return;
      }

      const newSnake = [head, ...prevSnake];

      // Golden food collision
      const currentGolden = goldenFoodRef.current;
      if (currentGolden && head.x === currentGolden.x && head.y === currentGolden.y) {
        sounds.playPowerup();
        scoreRef.current += 35;
        setScore(scoreRef.current);
        goldenFoodRef.current = null;
        setGoldenFood(null);
        snakeRef.current = newSnake;
        setSnake(newSnake);
        return;
      }

      // Standard food collision
      const currentFood = foodRef.current;
      if (head.x === currentFood.x && head.y === currentFood.y) {
        sounds.playEat();
        scoreRef.current += 10;
        setScore(scoreRef.current);

        const newFood = generateFood(newSnake);
        foodRef.current = newFood;
        setFood(newFood);

        if (Math.random() < 0.35 && !goldenFoodRef.current) {
          const newGolden = generateFood(newSnake);
          goldenFoodRef.current = newGolden;
          setGoldenFood(newGolden);
          setGoldenTimer(6);
        }

        snakeRef.current = newSnake;
        setSnake(newSnake);
        return;
      }

      // Normal movement without eating
      newSnake.pop();
      snakeRef.current = newSnake;
      setSnake(newSnake);
    }, speed);

    return () => clearInterval(interval);
  }, [gameState, score, generateFood, recordScore]);

  // Render to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / GRID_SIZE;

    // Clear background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grid pattern
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }

    // Draw standard food
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(
      food.x * cellSize + cellSize / 2,
      food.y * cellSize + cellSize / 2,
      cellSize / 2.5,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Draw golden food if active
    if (goldenFood) {
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(
        goldenFood.x * cellSize + cellSize / 2,
        goldenFood.y * cellSize + cellSize / 2,
        cellSize / 2.2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw snake body
    snake.forEach((part, index) => {
      const isHead = index === 0;
      const x = part.x * cellSize;
      const y = part.y * cellSize;

      if (isHead) {
        ctx.fillStyle = '#34d399';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, cellSize - 2, cellSize - 2, 6);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Eyes
        ctx.fillStyle = '#042f2e';
        const eyeRadius = cellSize * 0.12;
        if (direction === 'UP' || direction === 'DOWN') {
          ctx.beginPath();
          ctx.arc(x + cellSize * 0.3, y + cellSize * 0.4, eyeRadius, 0, Math.PI * 2);
          ctx.arc(x + cellSize * 0.7, y + cellSize * 0.4, eyeRadius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(x + cellSize * 0.4, y + cellSize * 0.3, eyeRadius, 0, Math.PI * 2);
          ctx.arc(x + cellSize * 0.4, y + cellSize * 0.7, eyeRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const alpha = Math.max(0.4, 1 - index / (snake.length * 1.5));
        ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 4);
        ctx.fill();
      }
    });
  }, [snake, food, goldenFood, direction]);

  const handleMobileDpad = (dir: Direction) => {
    if (gameState !== 'PLAYING') return;
    const currentDir = directionRef.current;
    if (dir === 'UP' && currentDir !== 'DOWN') nextDirectionRef.current = 'UP';
    if (dir === 'DOWN' && currentDir !== 'UP') nextDirectionRef.current = 'DOWN';
    if (dir === 'LEFT' && currentDir !== 'RIGHT') nextDirectionRef.current = 'LEFT';
    if (dir === 'RIGHT' && currentDir !== 'LEFT') nextDirectionRef.current = 'RIGHT';
    sounds.playClick();
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      {/* Game Header Bar */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <button
          onClick={() => setActiveGameId(null)}
          className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </button>

        <div className="text-center">
          <h2 className="text-xl font-bold text-white tracking-tight">Neon Snake</h2>
          <span className="text-xs text-slate-400">Speed increases gradually as your score grows</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold tabular-nums">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span>Score:</span>
            <span className="text-base text-white font-bold">{score}</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400">
            <Trophy className="w-3.5 h-3.5" />
            <span>Best:</span>
            <span className="text-base font-bold">{Math.max(highScore, score)}</span>
          </div>
        </div>
      </div>

      {/* Main Arena */}
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-center">
        {/* Canvas Game Frame */}
        <div className="relative rounded-3xl overflow-hidden border border-white/[0.08] bg-slate-900/40 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] p-2">
          {goldenFood && (
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-white/10 border border-white/20 text-white px-2.5 py-1 rounded-lg text-xs font-bold animate-pulse backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Golden Bonus: {goldenTimer}s (+35)</span>
            </div>
          )}

          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] rounded-2xl block touch-none bg-[#090d16]"
          />

          {/* Overlay States */}
          {gameState === 'IDLE' && (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-4">
                <Play className="w-7 h-7 ml-0.5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Ready to Play?</h3>
              <p className="text-xs text-slate-400 mb-6 max-w-xs">
                Use the arrow keys, WASD, or the on-screen D-Pad to steer the snake and collect orbs.
              </p>
              <button
                onClick={startGame}
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
              <h3 className="text-2xl font-bold text-white mb-1">Game Over!</h3>
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
                  onClick={startGame}
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

        {/* Controls & Helpers Panel */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {gameState === 'PLAYING' && (
              <button
                onClick={togglePause}
                className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
            )}
            {gameState === 'PAUSED' && (
              <button
                onClick={togglePause}
                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-950 hover:bg-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </button>
            )}
            {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
              <button
                onClick={startGame}
                className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restart</span>
              </button>
            )}
          </div>

          {/* On-screen D-Pad for Mobile & Touch */}
          <div className="bg-white/[0.025] backdrop-blur-xl border border-white/[0.08] p-3.5 rounded-3xl shadow-lg">
            <span className="block text-center text-[11px] text-slate-500 mb-2">
              Controls
            </span>
            <div className="grid grid-cols-3 gap-2 w-36 h-36">
              <div />
              <button
                onClick={() => handleMobileDpad('UP')}
                className="bg-white/[0.04] hover:bg-white/10 active:scale-95 text-slate-200 hover:text-white rounded-xl flex items-center justify-center font-bold text-lg transition-transform cursor-pointer border border-white/[0.06]"
                aria-label="Up"
              >
                ↑
              </button>
              <div />

              <button
                onClick={() => handleMobileDpad('LEFT')}
                className="bg-white/[0.04] hover:bg-white/10 active:scale-95 text-slate-200 hover:text-white rounded-xl flex items-center justify-center font-bold text-lg transition-transform cursor-pointer border border-white/[0.06]"
                aria-label="Left"
              >
                ←
              </button>
              <div className="flex items-center justify-center text-xs font-mono text-slate-500">
                ●
              </div>
              <button
                onClick={() => handleMobileDpad('RIGHT')}
                className="bg-white/[0.04] hover:bg-white/10 active:scale-95 text-slate-200 hover:text-white rounded-xl flex items-center justify-center font-bold text-lg transition-transform cursor-pointer border border-white/[0.06]"
                aria-label="Right"
              >
                →
              </button>

              <div />
              <button
                onClick={() => handleMobileDpad('DOWN')}
                className="bg-white/[0.04] hover:bg-white/10 active:scale-95 text-slate-200 hover:text-white rounded-xl flex items-center justify-center font-bold text-lg transition-transform cursor-pointer border border-white/[0.06]"
                aria-label="Down"
              >
                ↓
              </button>
              <div />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
