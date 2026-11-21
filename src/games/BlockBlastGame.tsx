import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Sparkles, Play } from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { sounds } from '../utils/audio';

const COLS = 8;
const ROWS = 8;
const CELL = 40;
const W = 440;
const H = 560;
const GX = (W - COLS * CELL) / 2;
const GY = 28;
const TRAY_Y = GY + ROWS * CELL + 28;
const SLOT_W = 132;
const SLOT_START = (W - 3 * SLOT_W) / 2;
const PREVIEW_CELL = 26;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const SHAPES: number[][][] = [
  [[1]],
  [[1, 1]],
  [[1], [1]],
  [[1, 1, 1]],
  [[1], [1], [1]],
  [[1, 1], [1, 1]],
  [[1, 1, 1, 1]],
  [[1], [1], [1], [1]],
  [[1, 1, 1], [0, 1, 0]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 1, 1], [1, 0, 0]],
  [[1, 1, 1], [0, 0, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
  [[1, 1], [1, 0]],
  [[1, 1], [0, 1]],
  [[1, 0], [1, 1]],
  [[0, 1], [1, 1]],
  [[1, 1, 1], [1, 1, 1]],
];

const PIECE_COLORS = ['#e2e8f0', '#cbd5e1', '#94a3b8', '#7dd3fc', '#a5b4fc', '#f8fafc'];

interface Piece {
  shape: number[][];
  color: string;
}

const randomPiece = (): Piece => ({
  shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
  color: PIECE_COLORS[Math.floor(Math.random() * PIECE_COLORS.length)],
});

const createEmptyGrid = (): (string | null)[][] =>
  Array.from({ length: ROWS }, () => Array<string | null>(COLS).fill(null));

export default function BlockBlastGame() {
  const { setActiveGameId, stats, recordScore, incrementPlays } = useArcade();
  const highScore = stats.scores.blockblast || 0;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GAME_OVER'>('IDLE');
  const [score, setScore] = useState<number>(0);
  const [linesCleared, setLinesCleared] = useState<number>(0);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);

  const gridRef = useRef<(string | null)[][]>(createEmptyGrid());
  const trayRef = useRef<(Piece | null)[]>([randomPiece(), randomPiece(), randomPiece()]);
  const dragRef = useRef<{
    piece: Piece | null;
    slotIdx: number;
    offsetX: number;
    offsetY: number;
    pointerX: number;
    pointerY: number;
  }>({
    piece: null,
    slotIdx: -1,
    offsetX: 0,
    offsetY: 0,
    pointerX: 0,
    pointerY: 0,
  });
  const scoreRef = useRef<number>(0);
  const linesRef = useRef<number>(0);

  const canPlace = (grid: (string | null)[][], shape: number[][], gx: number, gy: number) => {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        const bx = gx + x;
        const by = gy + y;
        if (bx < 0 || bx >= COLS || by < 0 || by >= ROWS) return false;
        if (grid[by][bx]) return false;
      }
    }
    return true;
  };

  const anyFit = (grid: (string | null)[][], tray: (Piece | null)[]) => {
    for (const p of tray) {
      if (!p) continue;
      const pw = p.shape[0].length;
      const ph = p.shape.length;
      for (let gy = 0; gy <= ROWS - ph; gy++) {
        for (let gx = 0; gx <= COLS - pw; gx++) {
          if (canPlace(grid, p.shape, gx, gy)) return true;
        }
      }
    }
    return false;
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, W, H);

    // Grid backdrop
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(GX - 6, GY - 6, COLS * CELL + 12, ROWS * CELL + 12, 14);
    ctx.fill();
    ctx.stroke();

    const grid = gridRef.current;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const bx = GX + x * CELL;
        const by = GY + y * CELL;
        const fill = grid[y][x];
        if (fill) {
          ctx.fillStyle = fill;
          ctx.shadowColor = 'rgba(255, 255, 255, 0.22)';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.roundRect(bx + 2, by + 2, CELL - 4, CELL - 4, 6);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
          ctx.beginPath();
          ctx.roundRect(bx + 2, by + 2, CELL - 4, CELL - 4, 6);
          ctx.fill();
        }
      }
    }

    const drag = dragRef.current;

    // Ghost preview when dragging
    if (drag.piece) {
      const px = drag.pointerX - drag.offsetX;
      const py = drag.pointerY - drag.offsetY;
      const cellX = Math.round((px - GX) / CELL);
      const cellY = Math.round((py - GY) / CELL);
      if (canPlace(grid, drag.piece.shape, cellX, cellY)) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = drag.piece.color;
        for (let y = 0; y < drag.piece.shape.length; y++) {
          for (let x = 0; x < drag.piece.shape[y].length; x++) {
            if (!drag.piece.shape[y][x]) continue;
            ctx.beginPath();
            ctx.roundRect(GX + (cellX + x) * CELL + 2, GY + (cellY + y) * CELL + 2, CELL - 4, CELL - 4, 6);
            ctx.fill();
          }
        }
        ctx.restore();
      }
    }

    // Tray slots
    trayRef.current.forEach((p, idx) => {
      const slotX = SLOT_START + idx * SLOT_W;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(slotX + 4, TRAY_Y, SLOT_W - 8, 128, 14);
      ctx.fill();
      ctx.stroke();

      if (!p || (drag.piece && drag.slotIdx === idx)) return;
      const pw = p.shape[0].length * PREVIEW_CELL;
      const ph = p.shape.length * PREVIEW_CELL;
      const cx = slotX + (SLOT_W - pw) / 2;
      const cy = TRAY_Y + (128 - ph) / 2;
      ctx.fillStyle = p.color;
      for (let y = 0; y < p.shape.length; y++) {
        for (let x = 0; x < p.shape[y].length; x++) {
          if (!p.shape[y][x]) continue;
          ctx.beginPath();
          ctx.roundRect(cx + x * PREVIEW_CELL + 1.5, cy + y * PREVIEW_CELL + 1.5, PREVIEW_CELL - 3, PREVIEW_CELL - 3, 5);
          ctx.fill();
        }
      }
    });

    // Active dragged piece
    if (drag.piece) {
      const px = drag.pointerX - drag.offsetX;
      const py = drag.pointerY - drag.offsetY;
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = drag.piece.color;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.35)';
      ctx.shadowBlur = 14;
      for (let y = 0; y < drag.piece.shape.length; y++) {
        for (let x = 0; x < drag.piece.shape[y].length; x++) {
          if (!drag.piece.shape[y][x]) continue;
          ctx.beginPath();
          ctx.roundRect(px + x * CELL + 2, py + y * CELL + 2, CELL - 4, CELL - 4, 6);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }, []);

  const startNewGame = useCallback(() => {
    sounds.playClick();
    incrementPlays('blockblast');
    gridRef.current = createEmptyGrid();
    trayRef.current = [randomPiece(), randomPiece(), randomPiece()];
    dragRef.current = { piece: null, slotIdx: -1, offsetX: 0, offsetY: 0, pointerX: 0, pointerY: 0 };
    scoreRef.current = 0;
    linesRef.current = 0;
    setScore(0);
    setLinesCleared(0);
    setIsNewHigh(false);
    setGameState('PLAYING');
  }, [incrementPlays]);

  useEffect(() => {
    draw();
  }, [gameState, draw]);

  const toCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x: px, y: py } = toCanvasCoords(e);

    for (let i = 0; i < trayRef.current.length; i++) {
      const p = trayRef.current[i];
      if (!p) continue;
      const slotX = SLOT_START + i * SLOT_W;
      if (px >= slotX && px <= slotX + SLOT_W && py >= TRAY_Y - 8 && py <= TRAY_Y + 136) {
        const pw = p.shape[0].length * PREVIEW_CELL;
        const ph = p.shape.length * PREVIEW_CELL;
        const cx = slotX + (SLOT_W - pw) / 2;
        const cy = TRAY_Y + (128 - ph) / 2;
        sounds.playClick();
        dragRef.current = {
          piece: p,
          slotIdx: i,
          offsetX: clamp((px - cx) * (CELL / PREVIEW_CELL), 0, p.shape[0].length * CELL),
          offsetY: clamp((py - cy) * (CELL / PREVIEW_CELL), 0, p.shape.length * CELL),
          pointerX: px,
          pointerY: py,
        };
        draw();
        break;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.piece) return;
    const { x: px, y: py } = toCanvasCoords(e);
    dragRef.current.pointerX = px;
    dragRef.current.pointerY = py;
    draw();
  };

  const handlePointerUp = () => {
    const drag = dragRef.current;
    if (!drag.piece) return;

    const px = drag.pointerX - drag.offsetX;
    const py = drag.pointerY - drag.offsetY;
    const cellX = Math.round((px - GX) / CELL);
    const cellY = Math.round((py - GY) / CELL);
    const grid = gridRef.current;

    if (canPlace(grid, drag.piece.shape, cellX, cellY)) {
      let blocksPlaced = 0;
      for (let y = 0; y < drag.piece.shape.length; y++) {
        for (let x = 0; x < drag.piece.shape[y].length; x++) {
          if (drag.piece.shape[y][x]) {
            grid[cellY + y][cellX + x] = drag.piece.color;
            blocksPlaced++;
          }
        }
      }
      scoreRef.current += blocksPlaced * 5;

      // Check full rows and columns
      const clearedRows: number[] = [];
      const clearedCols: number[] = [];
      for (let y = 0; y < ROWS; y++) {
        if (grid[y].every((cell) => cell !== null)) clearedRows.push(y);
      }
      for (let x = 0; x < COLS; x++) {
        let full = true;
        for (let y = 0; y < ROWS; y++) {
          if (!grid[y][x]) {
            full = false;
            break;
          }
        }
        if (full) clearedCols.push(x);
      }

      const clearedCount = clearedRows.length + clearedCols.length;
      if (clearedCount > 0) {
        for (const r of clearedRows) {
          for (let x = 0; x < COLS; x++) grid[r][x] = null;
        }
        for (const c of clearedCols) {
          for (let y = 0; y < ROWS; y++) grid[y][c] = null;
        }
        const totalCells =
          clearedRows.length * COLS + clearedCols.length * ROWS - clearedRows.length * clearedCols.length;
        scoreRef.current += totalCells * 10 + (clearedCount > 1 ? clearedCount * 30 : 0);
        linesRef.current += clearedCount;
        setLinesCleared(linesRef.current);
        sounds.playBrickBreak();
      } else {
        sounds.playCardFlip();
      }

      setScore(scoreRef.current);
      trayRef.current[drag.slotIdx] = null;
      if (trayRef.current.every((p) => p === null)) {
        trayRef.current = [randomPiece(), randomPiece(), randomPiece()];
      }

      if (!anyFit(grid, trayRef.current)) {
        sounds.playGameOver();
        const record = recordScore('blockblast', scoreRef.current);
        if (record) setIsNewHigh(true);
        setGameState('GAME_OVER');
      }
    }

    dragRef.current = { piece: null, slotIdx: -1, offsetX: 0, offsetY: 0, pointerX: 0, pointerY: 0 };
    draw();
  };

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
          <h2 className="text-xl font-bold text-white tracking-tight">Block Blast</h2>
          <span className="text-xs text-slate-400">Lines cleared: {linesCleared}</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold tabular-nums">
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

      <div className="flex flex-col items-center gap-5">
        <div className="relative rounded-3xl overflow-hidden border border-white/[0.08] bg-slate-900/40 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] p-2">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="w-[320px] h-[407px] sm:w-[400px] sm:h-[509px] rounded-2xl block touch-none cursor-grab active:cursor-grabbing bg-[#090d16]"
          />

          {gameState === 'IDLE' && (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-4">
                <Play className="w-7 h-7 ml-0.5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Block Blast Puzzle</h3>
              <p className="text-xs text-slate-400 mb-6 max-w-xs">
                Drag blocks from the bottom tray onto the 8×8 grid to complete and clear full rows or columns.
              </p>
              <button
                onClick={startNewGame}
                className="px-6 py-2.5 bg-white hover:bg-slate-200 text-slate-950 font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                Start Game
              </button>
            </div>
          )}

          {gameState === 'GAME_OVER' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <h3 className="text-2xl font-bold text-white mb-1">No Space Left!</h3>
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
                  <span>Play Again</span>
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
          <span>New Round</span>
        </button>
      </div>
    </div>
  );
}
