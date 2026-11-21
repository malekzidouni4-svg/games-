import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Bot, Sparkles } from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { sounds } from '../utils/audio';

type PieceColor = 'w' | 'b';
type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';

interface ChessPiece {
  type: PieceType;
  color: PieceColor;
}

type Board = (ChessPiece | null)[][];

interface Coord {
  x: number;
  y: number;
}

interface ChessMove {
  from: Coord;
  to: Coord;
}

const CHARS: Record<string, string> = {
  wK: '♔',
  wQ: '♕',
  wR: '♖',
  wB: '♗',
  wN: '♘',
  wP: '♙',
  bK: '♚',
  bQ: '♛',
  bR: '♜',
  bB: '♝',
  bN: '♞',
  bP: '♟',
};

const VALUES: Record<PieceType, number> = {
  K: 100000,
  Q: 900,
  R: 500,
  B: 330,
  N: 320,
  P: 100,
};

const inBoard = (x: number, y: number) => x >= 0 && x < 8 && y >= 0 && y < 8;

function createInitialBoard(): Board {
  const b: Board = Array.from({ length: 8 }, () => Array<ChessPiece | null>(8).fill(null));
  const back: PieceType[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let x = 0; x < 8; x++) {
    b[0][x] = { type: back[x], color: 'b' };
    b[1][x] = { type: 'P', color: 'b' };
    b[6][x] = { type: 'P', color: 'w' };
    b[7][x] = { type: back[x], color: 'w' };
  }
  return b;
}

function cloneBoard(b: Board): Board {
  return b.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function getRawMoves(b: Board, x: number, y: number): Coord[] {
  const p = b[y][x];
  if (!p) return [];
  const moves: Coord[] = [];
  const dir = p.color === 'w' ? -1 : 1;
  const enemyAt = (tx: number, ty: number) => inBoard(tx, ty) && b[ty][tx] !== null && b[ty][tx]!.color !== p.color;
  const emptyAt = (tx: number, ty: number) => inBoard(tx, ty) && b[ty][tx] === null;

  if (p.type === 'P') {
    if (emptyAt(x, y + dir)) {
      moves.push({ x, y: y + dir });
      const startY = p.color === 'w' ? 6 : 1;
      if (y === startY && emptyAt(x, y + 2 * dir)) moves.push({ x, y: y + 2 * dir });
    }
    for (const dx of [-1, 1]) {
      if (enemyAt(x + dx, y + dir)) moves.push({ x: x + dx, y: y + dir });
    }
  } else if (p.type === 'N') {
    for (const [dx, dy] of [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (inBoard(nx, ny) && (!b[ny][nx] || b[ny][nx]!.color !== p.color)) {
        moves.push({ x: nx, y: ny });
      }
    }
  } else {
    if (p.type === 'B' || p.type === 'Q') {
      for (const [dx, dy] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
        let nx = x + dx;
        let ny = y + dy;
        while (inBoard(nx, ny)) {
          if (!b[ny][nx]) {
            moves.push({ x: nx, y: ny });
          } else {
            if (b[ny][nx]!.color !== p.color) moves.push({ x: nx, y: ny });
            break;
          }
          nx += dx;
          ny += dy;
        }
      }
    }
    if (p.type === 'R' || p.type === 'Q') {
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        let nx = x + dx;
        let ny = y + dy;
        while (inBoard(nx, ny)) {
          if (!b[ny][nx]) {
            moves.push({ x: nx, y: ny });
          } else {
            if (b[ny][nx]!.color !== p.color) moves.push({ x: nx, y: ny });
            break;
          }
          nx += dx;
          ny += dy;
        }
      }
    }
    if (p.type === 'K') {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (inBoard(nx, ny) && (!b[ny][nx] || b[ny][nx]!.color !== p.color)) {
            moves.push({ x: nx, y: ny });
          }
        }
      }
    }
  }
  return moves;
}

function findKing(b: Board, color: PieceColor): Coord | null {
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const p = b[y][x];
      if (p && p.type === 'K' && p.color === color) return { x, y };
    }
  }
  return null;
}

function isInCheck(b: Board, color: PieceColor): boolean {
  const k = findKing(b, color);
  if (!k) return false;
  const opp: PieceColor = color === 'w' ? 'b' : 'w';

  for (const [dx, dy] of [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ]) {
    const nx = k.x + dx;
    const ny = k.y + dy;
    if (inBoard(nx, ny)) {
      const p = b[ny][nx];
      if (p && p.color === opp && p.type === 'N') return true;
    }
  }

  const epDir = color === 'w' ? -1 : 1;
  for (const dx of [-1, 1]) {
    const nx = k.x + dx;
    const ny = k.y + epDir;
    if (inBoard(nx, ny)) {
      const p = b[ny][nx];
      if (p && p.color === opp && p.type === 'P') return true;
    }
  }

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const nx = k.x + dx;
      const ny = k.y + dy;
      if (inBoard(nx, ny)) {
        const p = b[ny][nx];
        if (p && p.color === opp && p.type === 'K') return true;
      }
    }
  }

  const slideChecks: { dirs: [number, number][]; types: PieceType[] }[] = [
    { dirs: [[-1, -1], [-1, 1], [1, -1], [1, 1]], types: ['B', 'Q'] },
    { dirs: [[-1, 0], [1, 0], [0, -1], [0, 1]], types: ['R', 'Q'] },
  ];
  for (const sc of slideChecks) {
    for (const [dx, dy] of sc.dirs) {
      let nx = k.x + dx;
      let ny = k.y + dy;
      while (inBoard(nx, ny)) {
        const p = b[ny][nx];
        if (p) {
          if (p.color === opp && sc.types.includes(p.type)) return true;
          break;
        }
        nx += dx;
        ny += dy;
      }
    }
  }
  return false;
}

function getLegalMoves(b: Board, x: number, y: number): Coord[] {
  const p = b[y][x];
  if (!p) return [];
  const legal: Coord[] = [];
  for (const m of getRawMoves(b, x, y)) {
    const captured = b[m.y][m.x];
    b[m.y][m.x] = p;
    b[y][x] = null;
    let promoted = false;
    if (p.type === 'P' && (m.y === 0 || m.y === 7)) {
      p.type = 'Q';
      promoted = true;
    }
    if (!isInCheck(b, p.color)) legal.push(m);
    if (promoted) p.type = 'P';
    b[y][x] = p;
    b[m.y][m.x] = captured;
  }
  return legal;
}

function getAllLegalMoves(b: Board, color: PieceColor): ChessMove[] {
  const result: ChessMove[] = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const p = b[y][x];
      if (!p || p.color !== color) continue;
      for (const m of getLegalMoves(b, x, y)) {
        result.push({ from: { x, y }, to: m });
      }
    }
  }
  return result;
}

function doMoveMut(b: Board, move: ChessMove) {
  const p = b[move.from.y][move.from.x]!;
  const captured = b[move.to.y][move.to.x];
  b[move.to.y][move.to.x] = p;
  b[move.from.y][move.from.x] = null;
  let promotedTo: PieceType | null = null;
  if (p.type === 'P' && (move.to.y === 0 || move.to.y === 7)) {
    promotedTo = p.type;
    p.type = 'Q';
  }
  return { from: move.from, to: move.to, captured, promotedTo };
}

function undoMoveMut(
  b: Board,
  u: { from: Coord; to: Coord; captured: ChessPiece | null; promotedTo: PieceType | null }
) {
  const p = b[u.to.y][u.to.x]!;
  if (u.promotedTo) p.type = u.promotedTo;
  b[u.from.y][u.from.x] = p;
  b[u.to.y][u.to.x] = u.captured;
}

function evaluateBoard(b: Board): number {
  let s = 0;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const p = b[y][x];
      if (p) {
        const centerBonus = (x >= 2 && x <= 5 && y >= 2 && y <= 5) ? 8 : 0;
        s += (p.color === 'w' ? 1 : -1) * (VALUES[p.type] + centerBonus);
      }
    }
  }
  return s;
}

function minimax(b: Board, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  if (depth === 0) return evaluateBoard(b);
  const color: PieceColor = maximizing ? 'w' : 'b';
  const moves = getAllLegalMoves(b, color);
  if (moves.length === 0) {
    if (isInCheck(b, color)) return maximizing ? -1000000 - depth : 1000000 + depth;
    return 0;
  }
  moves.sort((a, c) => (b[c.to.y][c.to.x] ? 1 : 0) - (b[a.to.y][a.to.x] ? 1 : 0));

  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      const u = doMoveMut(b, m);
      const v = minimax(b, depth - 1, alpha, beta, false);
      undoMoveMut(b, u);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const u = doMoveMut(b, m);
      const v = minimax(b, depth - 1, alpha, beta, true);
      undoMoveMut(b, u);
      if (v < best) best = v;
      if (v < beta) beta = v;
      if (beta <= alpha) break;
    }
    return best;
  }
}

function findBestAIMove(b: Board, depth: number): ChessMove | null {
  const work = cloneBoard(b);
  const moves = getAllLegalMoves(work, 'b');
  if (moves.length === 0) return null;
  moves.sort((a, c) => {
    const ca = work[a.to.y][a.to.x] ? VALUES[work[a.to.y][a.to.x]!.type] : 0;
    const cc = work[c.to.y][c.to.x] ? VALUES[work[c.to.y][c.to.x]!.type] : 0;
    return cc - ca;
  });

  let best: ChessMove | null = null;
  let bestScore = Infinity;
  for (const m of moves) {
    const u = doMoveMut(work, m);
    const v = minimax(work, depth - 1, -Infinity, Infinity, true);
    undoMoveMut(work, u);
    const jitter = (Math.random() - 0.5) * 20;
    if (v + jitter < bestScore) {
      bestScore = v + jitter;
      best = m;
    }
  }
  return best;
}

export default function ChessGame() {
  const { setActiveGameId, stats, recordScore, incrementPlays } = useArcade();
  const highScore = stats.scores.chess || 0;

  const [board, setBoard] = useState<Board>(() => createInitialBoard());
  const [selected, setSelected] = useState<Coord | null>(null);
  const [legalMoves, setLegalMoves] = useState<Coord[]>([]);
  const [turn, setTurn] = useState<PieceColor>('w');
  const [depth, setDepth] = useState<1 | 2>(2);
  const [capturedValue, setCapturedValue] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<string>('Your Turn (White)');
  const [result, setResult] = useState<'WIN' | 'LOSS' | 'DRAW' | null>(null);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);
  const playsStartedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!playsStartedRef.current) {
      playsStartedRef.current = true;
      incrementPlays('chess');
    }
  }, [incrementPlays]);

  const resetGame = useCallback(() => {
    sounds.playClick();
    incrementPlays('chess');
    setBoard(createInitialBoard());
    setSelected(null);
    setLegalMoves([]);
    setTurn('w');
    setCapturedValue(0);
    setStatusMsg('Your Turn (White)');
    setResult(null);
    setIsNewHigh(false);
  }, [incrementPlays]);

  const evaluateGameEnd = useCallback(
    (nextBoard: Board, nextTurn: PieceColor, pointsSoFar: number) => {
      const moves = getAllLegalMoves(nextBoard, nextTurn);
      const inCheck = isInCheck(nextBoard, nextTurn);

      if (moves.length === 0) {
        if (inCheck) {
          const playerWon = nextTurn === 'b';
          if (playerWon) {
            const finalScore = pointsSoFar + 500;
            const rec = recordScore('chess', finalScore);
            if (rec) setIsNewHigh(true);
            setStatusMsg('Checkmate! You Win');
            setResult('WIN');
          } else {
            sounds.playGameOver();
            const rec = recordScore('chess', pointsSoFar);
            if (rec) setIsNewHigh(true);
            setStatusMsg('Checkmate! Computer Wins');
            setResult('LOSS');
          }
        } else {
          sounds.playHit();
          const finalScore = pointsSoFar + 150;
          const rec = recordScore('chess', finalScore);
          if (rec) setIsNewHigh(true);
          setStatusMsg('Stalemate — No legal moves');
          setResult('DRAW');
        }
        return true;
      }

      if (inCheck) {
        setStatusMsg(nextTurn === 'w' ? 'Warning: Your King is in check!' : 'Check on AI King!');
      } else {
        setStatusMsg(nextTurn === 'w' ? 'Your Turn (White)' : 'AI is thinking...');
      }
      return false;
    },
    [recordScore]
  );

  // AI Turn
  useEffect(() => {
    if (turn !== 'b' || result !== null) return;
    const timer = setTimeout(() => {
      const move = findBestAIMove(board, depth);
      if (!move) {
        evaluateGameEnd(board, 'b', capturedValue);
        return;
      }
      const next = cloneBoard(board);
      const p = next[move.from.y][move.from.x]!;
      const cap = next[move.to.y][move.to.x];
      next[move.to.y][move.to.x] = p;
      next[move.from.y][move.from.x] = null;
      if (p.type === 'P' && (move.to.y === 0 || move.to.y === 7)) p.type = 'Q';

      if (cap) sounds.playBrickBreak();
      else sounds.playCardFlip();

      setBoard(next);
      setSelected(null);
      setLegalMoves([]);
      if (!evaluateGameEnd(next, 'w', capturedValue)) {
        setTurn('w');
      }
    }, 360);
    return () => clearTimeout(timer);
  }, [turn, result, board, depth, capturedValue, evaluateGameEnd]);

  const handleSquareClick = (gx: number, gy: number) => {
    if (turn !== 'w' || result !== null) return;

    if (selected) {
      const dest = legalMoves.find((m) => m.x === gx && m.y === gy);
      if (dest) {
        const next = cloneBoard(board);
        const p = next[selected.y][selected.x]!;
        const cap = next[dest.y][dest.x];
        next[dest.y][dest.x] = p;
        next[selected.y][selected.x] = null;
        if (p.type === 'P' && (dest.y === 0 || dest.y === 7)) p.type = 'Q';

        let nextScore = capturedValue;
        if (cap) {
          nextScore += Math.round(VALUES[cap.type] / 4);
          setCapturedValue(nextScore);
          sounds.playBrickBreak();
        } else {
          sounds.playClick();
        }

        setBoard(next);
        setSelected(null);
        setLegalMoves([]);
        if (!evaluateGameEnd(next, 'b', nextScore)) {
          setTurn('b');
        }
        return;
      }
    }

    const piece = board[gy][gx];
    if (piece && piece.color === 'w') {
      sounds.playClick();
      setSelected({ x: gx, y: gy });
      setLegalMoves(getLegalMoves(board, gx, gy));
    } else {
      setSelected(null);
      setLegalMoves([]);
    }
  };

  const kingPosInCheck = isInCheck(board, turn) ? findKing(board, turn) : null;

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
          <h2 className="text-xl font-bold text-white tracking-tight">Classic Chess</h2>
          <span className="text-xs text-slate-400">{statusMsg}</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold tabular-nums">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span>Score:</span>
            <span className="text-base text-white font-bold">{capturedValue}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Trophy className="w-3.5 h-3.5" />
            <span className="text-base font-bold text-white">{Math.max(highScore, capturedValue)}</span>
          </div>
        </div>
      </div>

      {/* Difficulty Selector */}
      <div className="flex items-center justify-center gap-2 mb-5">
        <button
          onClick={() => { setDepth(2); resetGame(); }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            depth === 2
              ? 'bg-white/10 text-white border border-white/20'
              : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.05]'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Advanced</span>
        </button>
        <button
          onClick={() => { setDepth(1); resetGame(); }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            depth === 1
              ? 'bg-white/10 text-white border border-white/20'
              : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.05]'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Normal</span>
        </button>
      </div>

      <div className="flex flex-col items-center gap-5">
        <div className="relative p-3 sm:p-4 rounded-3xl bg-slate-900/40 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
          <div className="grid grid-cols-8 w-[304px] h-[304px] sm:w-[416px] sm:h-[416px] rounded-2xl overflow-hidden border border-white/10" dir="ltr">
            {board.map((row, y) =>
              row.map((piece, x) => {
                const isLight = (x + y) % 2 === 0;
                const isSelected = selected?.x === x && selected?.y === y;
                const isLegal = legalMoves.some((m) => m.x === x && m.y === y);
                const isCheckKing = kingPosInCheck?.x === x && kingPosInCheck?.y === y;

                return (
                  <button
                    key={`${x}-${y}`}
                    onClick={() => handleSquareClick(x, y)}
                    className={`relative flex items-center justify-center select-none transition-colors cursor-pointer ${
                      isCheckKing
                        ? 'bg-rose-500/40'
                        : isSelected
                        ? 'bg-sky-400/35'
                        : isLight
                        ? 'bg-slate-200/20 hover:bg-slate-200/30'
                        : 'bg-slate-950/65 hover:bg-slate-900/80'
                    }`}
                  >
                    {isLegal && !piece && (
                      <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white/45" />
                    )}
                    {isLegal && piece && (
                      <span className="absolute inset-1 rounded-lg border-2 border-rose-400/80 pointer-events-none" />
                    )}
                    {piece && (
                      <span
                        className={`text-2xl sm:text-3xl leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${
                          piece.color === 'w' ? 'text-white' : 'text-slate-400'
                        }`}
                      >
                        {CHARS[piece.color + piece.type]}
                      </span>
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
                {result === 'WIN' ? 'Checkmate! You Win' : result === 'DRAW' ? 'Stalemate — Draw' : 'Computer Wins!'}
              </h3>
              {isNewHigh && (
                <div className="text-xs text-slate-300 font-semibold mb-3 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  New High Score!
                </div>
              )}
              <p className="text-xs text-slate-400 mb-5">Final Score: {capturedValue + (result === 'WIN' ? 500 : result === 'DRAW' ? 150 : 0)}</p>
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
