import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Sparkles, Undo2 } from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { sounds } from '../utils/audio';

type Board = number[][];

const TILE_COLORS: Record<number, { bg: string; text: string; glow?: string }> = {
  2: { bg: 'bg-slate-800', text: 'text-slate-100' },
  4: { bg: 'bg-slate-700', text: 'text-amber-200' },
  8: { bg: 'bg-amber-600', text: 'text-white', glow: 'shadow-[0_0_12px_rgba(217,119,6,0.5)]' },
  16: { bg: 'bg-orange-600', text: 'text-white', glow: 'shadow-[0_0_14px_rgba(234,88,12,0.6)]' },
  32: { bg: 'bg-rose-600', text: 'text-white', glow: 'shadow-[0_0_16px_rgba(225,29,72,0.6)]' },
  64: { bg: 'bg-red-600', text: 'text-white', glow: 'shadow-[0_0_18px_rgba(220,38,38,0.7)]' },
  128: { bg: 'bg-amber-500', text: 'text-slate-950 font-black', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.8)]' },
  256: { bg: 'bg-yellow-400', text: 'text-slate-950 font-black', glow: 'shadow-[0_0_22px_rgba(250,204,21,0.85)]' },
  512: { bg: 'bg-emerald-500', text: 'text-slate-950 font-black', glow: 'shadow-[0_0_24px_rgba(16,185,129,0.9)]' },
  1024: { bg: 'bg-teal-400', text: 'text-slate-950 font-black', glow: 'shadow-[0_0_26px_rgba(45,212,191,0.95)]' },
  2048: { bg: 'bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500', text: 'text-white font-black', glow: 'shadow-[0_0_30px_rgba(245,158,11,1)]' },
  4096: { bg: 'bg-purple-600', text: 'text-white font-black', glow: 'shadow-[0_0_32px_rgba(147,51,234,1)]' },
};

export default function Game2048() {
  const { setActiveGameId, stats, recordScore, incrementPlays, celebrateWin } = useArcade();
  const highScore = stats.scores['2048'] || 0;

  const [board, setBoard] = useState<Board>([
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const [prevBoard, setPrevBoard] = useState<Board | null>(null);
  const [prevScore, setPrevScore] = useState<number | null>(null);
  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [won, setWon] = useState<boolean>(false);
  const [hasWonBefore, setHasWonBefore] = useState<boolean>(false);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Add random tile (90% chance 2, 10% chance 4)
  const addRandomTile = useCallback((currentBoard: Board): Board => {
    const emptyCells: { r: number; c: number }[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (currentBoard[r][c] === 0) {
          emptyCells.push({ r, c });
        }
      }
    }

    if (emptyCells.length === 0) return currentBoard;

    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const val = Math.random() < 0.9 ? 2 : 4;

    const newBoard = currentBoard.map((row) => [...row]);
    newBoard[randomCell.r][randomCell.c] = val;
    return newBoard;
  }, []);

  // Initialize new game
  const startNewGame = useCallback(() => {
    sounds.playClick();
    incrementPlays('2048');
    let newBoard: Board = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    newBoard = addRandomTile(newBoard);
    newBoard = addRandomTile(newBoard);
    setBoard(newBoard);
    setPrevBoard(null);
    setPrevScore(null);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setHasWonBefore(false);
    setIsNewHigh(false);
  }, [addRandomTile, incrementPlays]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // Check if any moves remain
  const checkGameOver = (currentBoard: Board): boolean => {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (currentBoard[r][c] === 0) return false;
        if (c < 3 && currentBoard[r][c] === currentBoard[r][c + 1]) return false;
        if (r < 3 && currentBoard[r][c] === currentBoard[r + 1][c]) return false;
      }
    }
    return true;
  };

  // Move tiles in direction
  const move = useCallback(
    (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      if (gameOver) return;

      let moved = false;
      let pointsAdded = 0;
      let targetWon = false;

      // Copy board
      const newBoard: Board = board.map((row) => [...row]);

      const slideAndMergeRow = (row: number[]): number[] => {
        const nonZero = row.filter((val) => val !== 0);
        const result: number[] = [];
        for (let i = 0; i < nonZero.length; i++) {
          if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
            const merged = nonZero[i] * 2;
            result.push(merged);
            pointsAdded += merged;
            if (merged === 2048 && !hasWonBefore) {
              targetWon = true;
            }
            i++; // skip next since merged
          } else {
            result.push(nonZero[i]);
          }
        }
        while (result.length < 4) {
          result.push(0);
        }
        return result;
      };

      if (direction === 'LEFT') {
        for (let r = 0; r < 4; r++) {
          const original = [...newBoard[r]];
          const slided = slideAndMergeRow(original);
          newBoard[r] = slided;
          if (original.some((val, idx) => val !== slided[idx])) moved = true;
        }
      } else if (direction === 'RIGHT') {
        for (let r = 0; r < 4; r++) {
          const original = [...newBoard[r]];
          const reversed = [...original].reverse();
          const slided = slideAndMergeRow(reversed).reverse();
          newBoard[r] = slided;
          if (original.some((val, idx) => val !== slided[idx])) moved = true;
        }
      } else if (direction === 'UP') {
        for (let c = 0; c < 4; c++) {
          const col = [newBoard[0][c], newBoard[1][c], newBoard[2][c], newBoard[3][c]];
          const slided = slideAndMergeRow(col);
          for (let r = 0; r < 4; r++) {
            if (newBoard[r][c] !== slided[r]) moved = true;
            newBoard[r][c] = slided[r];
          }
        }
      } else if (direction === 'DOWN') {
        for (let c = 0; c < 4; c++) {
          const col = [newBoard[3][c], newBoard[2][c], newBoard[1][c], newBoard[0][c]];
          const slided = slideAndMergeRow(col).reverse();
          for (let r = 0; r < 4; r++) {
            if (newBoard[r][c] !== slided[r]) moved = true;
            newBoard[r][c] = slided[r];
          }
        }
      }

      if (moved) {
        setPrevBoard(board.map((row) => [...row]));
        setPrevScore(score);

        if (pointsAdded > 0) {
          sounds.playCardMatch();
        } else {
          sounds.playClick();
        }

        const newTotalScore = score + pointsAdded;
        setScore(newTotalScore);
        const boardWithTile = addRandomTile(newBoard);
        setBoard(boardWithTile);

        if (targetWon) {
          setWon(true);
          setHasWonBefore(true);
          celebrateWin();
        }

        if (checkGameOver(boardWithTile)) {
          setGameOver(true);
          sounds.playGameOver();
          const record = recordScore('2048', newTotalScore);
          if (record) setIsNewHigh(true);
        } else {
          recordScore('2048', newTotalScore);
        }
      }
    },
    [board, score, gameOver, hasWonBefore, addRandomTile, recordScore, celebrateWin]
  );

  // Undo move
  const handleUndo = () => {
    if (prevBoard && prevScore !== null) {
      sounds.playClick();
      setBoard(prevBoard);
      setScore(prevScore);
      setPrevBoard(null);
      setPrevScore(null);
      setGameOver(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') move('UP');
      if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') move('DOWN');
      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') move('LEFT');
      if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') move('RIGHT');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  // Touch Swipe Handling
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 25) {
      if (absX > absY) {
        if (dx > 0) move('RIGHT');
        else move('LEFT');
      } else {
        if (dy > 0) move('DOWN');
        else move('UP');
      }
    }
    touchStartRef.current = null;
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
          <h2 className="text-xl font-bold text-white tracking-tight">2048 Tiles</h2>
          <span className="text-xs text-slate-400">Merge matching tiles to reach 2048</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold tabular-nums">
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

      {/* Main 2048 Board */}
      <div className="flex flex-col items-center justify-center">
        {/* Action toolbar */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={startNewGame}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Game</span>
          </button>
          <button
            onClick={handleUndo}
            disabled={!prevBoard}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo Move</span>
          </button>
        </div>

        {/* 4x4 Grid Container */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative p-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl select-none touch-none"
        >
          <div className="grid grid-cols-4 gap-2.5 w-[310px] h-[310px] sm:w-[380px] sm:h-[380px]">
            {board.map((row, r) =>
              row.map((cell, c) => {
                const styling = TILE_COLORS[cell] || { bg: 'bg-indigo-600', text: 'text-white font-black' };
                return (
                  <div
                    key={`${r}-${c}`}
                    className={`flex items-center justify-center rounded-xl font-bold transition-all duration-150 ${
                      cell === 0 ? 'bg-slate-950/60' : `${styling.bg} ${styling.text} ${styling.glow || ''}`
                    }`}
                  >
                    {cell > 0 && (
                      <span
                        className={`tabular-nums ${
                          cell >= 1024
                            ? 'text-lg sm:text-2xl'
                            : cell >= 128
                            ? 'text-xl sm:text-3xl'
                            : 'text-2xl sm:text-4xl'
                        }`}
                      >
                        {cell}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Win Modal Overlay */}
          {won && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-amber-400 mb-1">You Reached 2048!</h3>
              <p className="text-xs text-slate-300 mb-5">Legendary puzzle mastery!</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setWon(false)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Keep Playing
                </button>
                <button
                  onClick={startNewGame}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  New Game
                </button>
              </div>
            </div>
          )}

          {/* Game Over Modal Overlay */}
          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center">
              <h3 className="text-2xl font-black text-rose-500 mb-1">No Moves Left!</h3>
              {isNewHigh && (
                <div className="text-xs text-amber-300 font-bold mb-3 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  New High Score!
                </div>
              )}
              <div className="text-sm text-slate-300 mb-5">
                Final Score:{' '}
                <span className="text-xl font-black text-white tabular-nums">{score}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={startNewGame}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
                <button
                  onClick={() => setActiveGameId(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Library
                </button>
              </div>
            </div>
          )}
        </div>

        {/* On-screen Direction Arrows for Mobile */}
        <div className="mt-6 flex flex-col items-center gap-2 sm:hidden">
          <button
            onClick={() => move('UP')}
            className="w-14 h-12 bg-slate-800 active:bg-amber-500 text-white active:text-slate-950 font-bold rounded-xl flex items-center justify-center text-lg shadow"
          >
            ↑
          </button>
          <div className="flex gap-6">
            <button
              onClick={() => move('LEFT')}
              className="w-14 h-12 bg-slate-800 active:bg-amber-500 text-white active:text-slate-950 font-bold rounded-xl flex items-center justify-center text-lg shadow"
            >
              ←
            </button>
            <button
              onClick={() => move('DOWN')}
              className="w-14 h-12 bg-slate-800 active:bg-amber-500 text-white active:text-slate-950 font-bold rounded-xl flex items-center justify-center text-lg shadow"
            >
              ↓
            </button>
            <button
              onClick={() => move('RIGHT')}
              className="w-14 h-12 bg-slate-800 active:bg-amber-500 text-white active:text-slate-950 font-bold rounded-xl flex items-center justify-center text-lg shadow"
            >
              →
            </button>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">You can also swipe in any direction</span>
        </div>
      </div>
    </div>
  );
}
