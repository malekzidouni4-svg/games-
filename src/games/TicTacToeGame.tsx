import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, RotateCcw, Trophy, User, Bot, Sparkles } from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { sounds } from '../utils/audio';

type Player = 'X' | 'O';
type Board = (Player | null)[];
type OpponentMode = 'AI_EASY' | 'AI_HARD' | 'LOCAL_PVP';

const WINNING_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export default function TicTacToeGame() {
  const { setActiveGameId, stats, recordScore, incrementPlays, celebrateWin } = useArcade();
  const highScore = stats.scores.tictactoe || 0;

  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [turn, setTurn] = useState<Player>('X');
  const [mode, setMode] = useState<OpponentMode>('AI_HARD');
  const [winner, setWinner] = useState<Player | 'DRAW' | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [winsCount, setWinsCount] = useState<number>(0);
  const [lossesCount, setLossesCount] = useState<number>(0);
  const [drawsCount, setDrawsCount] = useState<number>(0);

  const checkWinner = useCallback((currentBoard: Board): { winner: Player | 'DRAW' | null; line: number[] | null } => {
    for (const combo of WINNING_COMBINATIONS) {
      const [a, b, c] = combo;
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        return { winner: currentBoard[a], line: combo };
      }
    }
    if (currentBoard.every((cell) => cell !== null)) {
      return { winner: 'DRAW', line: null };
    }
    return { winner: null, line: null };
  }, []);

  const resetGame = useCallback(() => {
    sounds.playClick();
    incrementPlays('tictactoe');
    setBoard(Array(9).fill(null));
    setTurn('X');
    setWinner(null);
    setWinningLine(null);
  }, [incrementPlays]);

  // Minimax Algorithm for AI
  const findBestMove = useCallback(
    (currentBoard: Board, isHard: boolean): number => {
      const emptyIndices = currentBoard
        .map((cell, idx) => (cell === null ? idx : null))
        .filter((val): val is number => val !== null);

      if (!isHard) {
        // Random move for easy
        return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      }

      // Check immediate win for O
      for (const idx of emptyIndices) {
        const testBoard = [...currentBoard];
        testBoard[idx] = 'O';
        if (checkWinner(testBoard).winner === 'O') return idx;
      }

      // Check block immediate win for X
      for (const idx of emptyIndices) {
        const testBoard = [...currentBoard];
        testBoard[idx] = 'X';
        if (checkWinner(testBoard).winner === 'X') return idx;
      }

      // Center preference
      if (currentBoard[4] === null) return 4;

      // Corners
      const corners = [0, 2, 6, 8].filter((c) => currentBoard[c] === null);
      if (corners.length > 0) {
        return corners[Math.floor(Math.random() * corners.length)];
      }

      return emptyIndices[0];
    },
    [checkWinner]
  );

  // AI Turn effect
  useEffect(() => {
    if (winner !== null) return;
    if (turn === 'O' && (mode === 'AI_EASY' || mode === 'AI_HARD')) {
      const timer = setTimeout(() => {
        const bestIdx = findBestMove(board, mode === 'AI_HARD');
        if (bestIdx !== undefined) {
          const newBoard = [...board];
          newBoard[bestIdx] = 'O';
          sounds.playCardFlip();
          setBoard(newBoard);

          const result = checkWinner(newBoard);
          if (result.winner) {
            setWinner(result.winner);
            setWinningLine(result.line);
            if (result.winner === 'O') {
              sounds.playGameOver();
              setLossesCount((l) => l + 1);
            } else if (result.winner === 'DRAW') {
              sounds.playHit();
              setDrawsCount((d) => d + 1);
            }
          } else {
            setTurn('X');
          }
        }
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [turn, mode, board, winner, findBestMove, checkWinner]);

  const handleCellClick = (idx: number) => {
    if (board[idx] || winner !== null) return;
    if (turn === 'O' && mode !== 'LOCAL_PVP') return; // AI turn

    sounds.playClick();
    const newBoard = [...board];
    newBoard[idx] = turn;
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    if (result.winner) {
      setWinner(result.winner);
      setWinningLine(result.line);
      if (result.winner === 'X') {
        celebrateWin();
        setWinsCount((w) => {
          const nextWins = w + 1;
          const scoreGained = nextWins * 50;
          recordScore('tictactoe', scoreGained);
          return nextWins;
        });
      } else if (result.winner === 'DRAW') {
        sounds.playHit();
        setDrawsCount((d) => d + 1);
      } else if (result.winner === 'O') {
        sounds.playGameOver();
        setLossesCount((l) => l + 1);
      }
    } else {
      setTurn(turn === 'X' ? 'O' : 'X');
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
          <h2 className="text-xl font-bold text-white tracking-tight">Tic-Tac-Toe AI</h2>
          <span className="text-xs text-slate-400">Strategic tactics against AI or local friend</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold tabular-nums text-slate-300">
          <div className="flex items-center gap-1.5">
            <span>Wins:</span>
            <span className="text-base text-white font-bold">{winsCount}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Trophy className="w-3.5 h-3.5 text-slate-200" />
            <span className="text-base font-bold text-white">{Math.max(highScore, winsCount * 50)}</span>
          </div>
        </div>
      </div>

      {/* Mode Selectors */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
        <button
          onClick={() => {
            setMode('AI_HARD');
            resetGame();
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            mode === 'AI_HARD'
              ? 'bg-white/10 text-white border border-white/20 shadow-[0_4px_16px_rgba(255,255,255,0.05)]'
              : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.05]'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>AI (Smart)</span>
        </button>
        <button
          onClick={() => {
            setMode('AI_EASY');
            resetGame();
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            mode === 'AI_EASY'
              ? 'bg-white/10 text-white border border-white/20 shadow-[0_4px_16px_rgba(255,255,255,0.05)]'
              : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.05]'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>AI (Casual)</span>
        </button>
        <button
          onClick={() => {
            setMode('LOCAL_PVP');
            resetGame();
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            mode === 'LOCAL_PVP'
              ? 'bg-white/10 text-white border border-white/20 shadow-[0_4px_16px_rgba(255,255,255,0.05)]'
              : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.05]'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>2 Players (Local)</span>
        </button>
      </div>

      {/* Main Glass Board Area */}
      <div className="flex flex-col items-center justify-center">
        {/* Turn Status Pill */}
        <div className="mb-4 text-xs font-medium text-slate-300 flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
          {winner === null ? (
            <span>
              Current Turn:{' '}
              <strong className="text-white text-sm font-bold">
                {turn === 'X' ? 'Player X' : mode === 'LOCAL_PVP' ? 'Player O' : 'Computer O'}
              </strong>
            </span>
          ) : winner === 'DRAW' ? (
            <span className="text-slate-300 font-bold">Even Draw!</span>
          ) : (
            <span className="text-white font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-slate-300" />
              {winner} Wins!
            </span>
          )}
        </div>

        {/* 3x3 Frosted Glass Grid */}
        <div className="relative p-4 rounded-3xl bg-slate-900/40 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
          <div className="grid grid-cols-3 gap-3 w-[290px] h-[290px] sm:w-[340px] sm:h-[340px]">
            {board.map((cell, idx) => {
              const isWinCell = winningLine?.includes(idx);
              return (
                <button
                  key={idx}
                  onClick={() => handleCellClick(idx)}
                  disabled={cell !== null || winner !== null}
                  className={`relative rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                    cell === null ? 'hover:bg-white/[0.06]' : ''
                  } ${
                    isWinCell
                      ? 'bg-white/20 border border-white/40 shadow-[0_0_24px_rgba(255,255,255,0.2)]'
                      : 'bg-white/[0.03] border border-white/[0.06]'
                  }`}
                >
                  {cell === 'X' && (
                    <span className="text-4xl sm:text-5xl font-black text-white select-none animate-scale-in">
                      ✕
                    </span>
                  )}
                  {cell === 'O' && (
                    <span className="text-4xl sm:text-5xl font-black text-slate-300 select-none animate-scale-in">
                      ◯
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Winner Overlay */}
          {winner !== null && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-2">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">
                {winner === 'DRAW' ? 'It’s a Draw!' : `${winner} Wins!`}
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                {winner === 'X'
                  ? 'Sharp strategy and bonus points earned!'
                  : winner === 'DRAW'
                  ? 'A well-balanced match between both sides.'
                  : 'The AI claimed this round.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={resetGame}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-950 hover:bg-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>New Round</span>
                </button>
                <button
                  onClick={() => setActiveGameId(null)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-slate-200 font-medium rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Library
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={resetGame}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Board</span>
          </button>
        </div>
      </div>
    </div>
  );
}
