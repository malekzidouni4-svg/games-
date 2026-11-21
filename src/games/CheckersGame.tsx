import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Sparkles } from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { sounds } from '../utils/audio';

type Color = 'w' | 'b';

interface CheckerPiece {
  color: Color;
  king: boolean;
}

type Board = (CheckerPiece | null)[][];

interface Coord {
  x: number;
  y: number;
}

interface CheckerMove {
  from: Coord;
  to: Coord;
  capture: boolean;
  captured?: Coord;
}

const inBoard = (x: number, y: number) => x >= 0 && x < 8 && y >= 0 && y < 8;

function createBoard(): Board {
  const b: Board = Array.from({ length: 8 }, () => Array<CheckerPiece | null>(8).fill(null));
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 8; x++) {
      if ((x + y) % 2 === 1) b[y][x] = { color: 'b', king: false };
    }
  }
  for (let y = 5; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if ((x + y) % 2 === 1) b[y][x] = { color: 'w', king: false };
    }
  }
  return b;
}

function cloneBoard(b: Board): Board {
  return b.map((row) => row.map((p) => (p ? { ...p } : null)));
}

function getPieceMoves(b: Board, x: number, y: number): CheckerMove[] {
  const p = b[y][x];
  if (!p) return [];
  const moves: CheckerMove[] = [];
  const dirs = p.king ? [-1, 1] : p.color === 'w' ? [-1] : [1];

  for (const dy of dirs) {
    for (const dx of [-1, 1]) {
      const nx = x + dx;
      const ny = y + dy;
      if (inBoard(nx, ny) && !b[ny][nx]) {
        moves.push({ from: { x, y }, to: { x: nx, y: ny }, capture: false });
      }
      const jx = x + 2 * dx;
      const jy = y + 2 * dy;
      if (inBoard(jx, jy) && !b[jy][jx]) {
        const mid = b[y + dy][x + dx];
        if (mid && mid.color !== p.color) {
          moves.push({
            from: { x, y },
            to: { x: jx, y: jy },
            capture: true,
            captured: { x: x + dx, y: y + dy },
          });
        }
      }
    }
  }
  return moves;
}

function getAllMoves(b: Board, color: Color): CheckerMove[] {
  const captures: CheckerMove[] = [];
  const regulars: CheckerMove[] = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const p = b[y][x];
      if (!p || p.color !== color) continue;
      for (const mv of getPieceMoves(b, x, y)) {
        if (mv.capture) captures.push(mv);
        else regulars.push(mv);
      }
    }
  }
  return captures.length > 0 ? captures : regulars;
}

function applyMove(b: Board, move: CheckerMove): { nextBoard: Board; crowned: boolean } {
  const next = cloneBoard(b);
  const p = next[move.from.y][move.from.x]!;
  next[move.to.y][move.to.x] = p;
  next[move.from.y][move.from.x] = null;
  if (move.captured) {
    next[move.captured.y][move.captured.x] = null;
  }
  let crowned = false;
  if (!p.king && ((p.color === 'w' && move.to.y === 0) || (p.color === 'b' && move.to.y === 7))) {
    p.king = true;
    crowned = true;
  }
  return { nextBoard: next, crowned };
}

export default function CheckersGame() {
  const { setActiveGameId, stats, recordScore, incrementPlays } = useArcade();
  const highScore = stats.scores.checkers || 0;

  const [board, setBoard] = useState<Board>(() => createBoard());
  const [selected, setSelected] = useState<Coord | null>(null);
  const [legalMoves, setLegalMoves] = useState<CheckerMove[]>([]);
  const [turn, setTurn] = useState<Color>('w');
  const [mustContinueFrom, setMustContinueFrom] = useState<Coord | null>(null);
  const [capturedCount, setCapturedCount] = useState<number>(0);
  const [result, setResult] = useState<'WIN' | 'LOSS' | null>(null);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);
  const playsStartedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!playsStartedRef.current) {
      playsStartedRef.current = true;
      incrementPlays('checkers');
    }
  }, [incrementPlays]);

  const resetGame = useCallback(() => {
    sounds.playClick();
    incrementPlays('checkers');
    setBoard(createBoard());
    setSelected(null);
    setLegalMoves([]);
    setTurn('w');
    setMustContinueFrom(null);
    setCapturedCount(0);
    setResult(null);
    setIsNewHigh(false);
  }, [incrementPlays]);

  const checkWinOrLoss = useCallback(
    (nextBoard: Board, nextTurn: Color, captures: number) => {
      const moves = getAllMoves(nextBoard, nextTurn);
      if (moves.length === 0) {
        const playerWon = nextTurn === 'b';
        const finalScore = captures * 40 + (playerWon ? 400 : 0);
        const rec = recordScore('checkers', finalScore);
        if (rec) setIsNewHigh(true);
        if (!playerWon) sounds.playGameOver();
        setResult(playerWon ? 'WIN' : 'LOSS');
        return true;
      }
      return false;
    },
    [recordScore]
  );

  // AI Turn
  useEffect(() => {
    if (turn !== 'b' || result !== null) return;
    const timer = setTimeout(() => {
      if (mustContinueFrom) {
        const chainMoves = getPieceMoves(board, mustContinueFrom.x, mustContinueFrom.y).filter((m) => m.capture);
        if (chainMoves.length > 0) {
          const mv = chainMoves[Math.floor(Math.random() * chainMoves.length)];
          const { nextBoard, crowned } = applyMove(board, mv);
          sounds.playBrickBreak();
          setBoard(nextBoard);
          if (!crowned) {
            const further = getPieceMoves(nextBoard, mv.to.x, mv.to.y).filter((m) => m.capture);
            if (further.length > 0) {
              setMustContinueFrom({ ...mv.to });
              return;
            }
          }
          setMustContinueFrom(null);
          if (!checkWinOrLoss(nextBoard, 'w', capturedCount)) {
            setTurn('w');
          }
          return;
        }
        setMustContinueFrom(null);
      }

      const moves = getAllMoves(board, 'b');
      if (moves.length === 0) {
        checkWinOrLoss(board, 'b', capturedCount);
        return;
      }
      const captures = moves.filter((m) => m.capture);
      const forward = moves.filter((m) => m.to.y > m.from.y);
      const pool = captures.length > 0 ? captures : forward.length > 0 ? forward : moves;
      const chosen = pool[Math.floor(Math.random() * pool.length)];

      const { nextBoard, crowned } = applyMove(board, chosen);
      if (chosen.capture) sounds.playBrickBreak();
      else sounds.playCardFlip();

      setBoard(nextBoard);
      if (chosen.capture && !crowned) {
        const further = getPieceMoves(nextBoard, chosen.to.x, chosen.to.y).filter((m) => m.capture);
        if (further.length > 0) {
          setMustContinueFrom({ ...chosen.to });
          return;
        }
      }
      if (!checkWinOrLoss(nextBoard, 'w', capturedCount)) {
        setTurn('w');
      }
    }, 380);
    return () => clearTimeout(timer);
  }, [turn, result, board, mustContinueFrom, capturedCount, checkWinOrLoss]);

  const handleSquareClick = (gx: number, gy: number) => {
    if (turn !== 'w' || result !== null) return;

    if (mustContinueFrom) {
      const dest = legalMoves.find((m) => m.to.x === gx && m.to.y === gy);
      if (dest) {
        const { nextBoard, crowned } = applyMove(board, dest);
        const nextCaps = capturedCount + (dest.capture ? 1 : 0);
        setCapturedCount(nextCaps);
        sounds.playBrickBreak();
        setBoard(nextBoard);

        const further = getPieceMoves(nextBoard, dest.to.x, dest.to.y).filter((m) => m.capture);
        if (dest.capture && !crowned && further.length > 0) {
          setMustContinueFrom({ ...dest.to });
          setSelected({ ...dest.to });
          setLegalMoves(further);
        } else {
          setMustContinueFrom(null);
          setSelected(null);
          setLegalMoves([]);
          if (!checkWinOrLoss(nextBoard, 'b', nextCaps)) {
            setTurn('b');
          }
        }
      }
      return;
    }

    if (selected) {
      const dest = legalMoves.find((m) => m.to.x === gx && m.to.y === gy);
      if (dest) {
        const { nextBoard, crowned } = applyMove(board, dest);
        const nextCaps = capturedCount + (dest.capture ? 1 : 0);
        if (dest.capture) {
          setCapturedCount(nextCaps);
          sounds.playBrickBreak();
        } else {
          sounds.playClick();
        }
        setBoard(nextBoard);

        const further = getPieceMoves(nextBoard, dest.to.x, dest.to.y).filter((m) => m.capture);
        if (dest.capture && !crowned && further.length > 0) {
          setMustContinueFrom({ ...dest.to });
          setSelected({ ...dest.to });
          setLegalMoves(further);
          return;
        }

        setSelected(null);
        setLegalMoves([]);
        if (!checkWinOrLoss(nextBoard, 'b', nextCaps)) {
          setTurn('b');
        }
        return;
      }
    }

    const piece = board[gy][gx];
    if (piece && piece.color === 'w') {
      const all = getAllMoves(board, 'w');
      const pieceMoves = all.filter((m) => m.from.x === gx && m.from.y === gy);
      sounds.playClick();
      setSelected({ x: gx, y: gy });
      setLegalMoves(pieceMoves);
    } else {
      setSelected(null);
      setLegalMoves([]);
    }
  };

  const livePoints = capturedCount * 40;
  const hasMandatoryCapture = turn === 'w' && getAllMoves(board, 'w').some((m) => m.capture);

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
          <h2 className="text-xl font-bold text-white tracking-tight">Classic Checkers</h2>
          <span className="text-xs text-slate-400">
            {turn === 'w'
              ? hasMandatoryCapture
                ? 'Your Turn — Mandatory Capture!'
                : 'Your Turn (White)'
              : "Computer's Turn..."}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold tabular-nums">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span>Score:</span>
            <span className="text-base text-white font-bold">{livePoints}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Trophy className="w-3.5 h-3.5" />
            <span className="text-base font-bold text-white">{Math.max(highScore, livePoints)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-5">
        <div className="relative p-3 sm:p-4 rounded-3xl bg-slate-900/40 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
          <div className="grid grid-cols-8 w-[304px] h-[304px] sm:w-[416px] sm:h-[416px] rounded-2xl overflow-hidden border border-white/10" dir="ltr">
            {board.map((row, y) =>
              row.map((piece, x) => {
                const isLight = (x + y) % 2 === 0;
                const isSelected = selected?.x === x && selected?.y === y;
                const moveTarget = legalMoves.find((m) => m.to.x === x && m.to.y === y);

                return (
                  <button
                    key={`${x}-${y}`}
                    onClick={() => handleSquareClick(x, y)}
                    className={`relative flex items-center justify-center transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-sky-400/35'
                        : isLight
                        ? 'bg-slate-200/20'
                        : 'bg-slate-950/65 hover:bg-slate-900/80'
                    }`}
                  >
                    {moveTarget && (
                      <span
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full ${
                          moveTarget.capture ? 'bg-amber-300/75 ring-4 ring-amber-400/25' : 'bg-white/45'
                        }`}
                      />
                    )}
                    {piece && (
                      <div
                        className={`w-[74%] h-[74%] rounded-full flex items-center justify-center shadow-md border-2 transition-transform ${
                          isSelected ? 'scale-105' : ''
                        } ${
                          piece.color === 'w'
                            ? 'bg-slate-100 border-slate-300 text-amber-600'
                            : 'bg-slate-800 border-slate-500 text-amber-400'
                        }`}
                      >
                        {piece.king && <span className="text-xs sm:text-base font-bold leading-none">♛</span>}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {result !== null && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-3">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">
                {result === 'WIN' ? 'You Won the Match!' : 'Computer Wins This Time'}
              </h3>
              {isNewHigh && (
                <div className="text-xs text-slate-300 font-semibold mb-3 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  New High Score!
                </div>
              )}
              <p className="text-xs text-slate-400 mb-5">
                Pieces Captured: {capturedCount} · Score: {livePoints + (result === 'WIN' ? 400 : 0)}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={resetGame}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-950 hover:bg-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>New Match</span>
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

        <button
          onClick={resetGame}
          className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Game</span>
        </button>
      </div>
    </div>
  );
}
