import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Sparkles, Timer, Footprints, Star } from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { sounds } from '../utils/audio';

interface CardItem {
  id: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const THEMES = {
  arcade: {
    label: 'Arcade',
    symbols: ['🚀', '🎮', '💎', '👑', '⭐', '⚡', '🎯', '🔥', '🏆', '👾'],
  },
  animals: {
    label: 'Animals',
    symbols: ['🦁', '🐬', '🦊', '🐼', '🦅', '🦉', '🐯', '🦄', '🐸', '🦋'],
  },
  food: {
    label: 'Food',
    symbols: ['🍓', '🍉', '🍒', '🥑', '🍍', '🍇', '🍦', '🍩', '🍫', '🍕'],
  },
};

type ThemeKey = keyof typeof THEMES;
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

const DIFFICULTY_CONFIG = {
  EASY: { pairs: 6, cols: 'grid-cols-4', label: 'Easy (12 cards)' },
  MEDIUM: { pairs: 8, cols: 'grid-cols-4', label: 'Medium (16 cards)' },
  HARD: { pairs: 10, cols: 'grid-cols-5', label: 'Pro (20 cards)' },
};

export default function MemoryCardsGame() {
  const { setActiveGameId, stats, recordScore, incrementPlays, celebrateWin } = useArcade();
  const highScore = stats.scores.memory || 0;

  const [theme, setTheme] = useState<ThemeKey>('arcade');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);
  const [isWon, setIsWon] = useState<boolean>(false);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);
  const [finalScore, setFinalScore] = useState<number>(0);

  const timerRef = useRef<number | null>(null);

  // Initialize and shuffle deck
  const setupGame = useCallback(() => {
    sounds.playClick();
    incrementPlays('memory');
    if (timerRef.current) clearInterval(timerRef.current);

    const config = DIFFICULTY_CONFIG[difficulty];
    const selectedSymbols = THEMES[theme].symbols.slice(0, config.pairs);
    const deckSymbols = [...selectedSymbols, ...selectedSymbols];

    // Fisher-Yates shuffle
    for (let i = deckSymbols.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deckSymbols[i], deckSymbols[j]] = [deckSymbols[j], deckSymbols[i]];
    }

    const initialCards: CardItem[] = deckSymbols.map((symbol, idx) => ({
      id: idx,
      symbol,
      isFlipped: false,
      isMatched: false,
    }));

    setCards(initialCards);
    setFlippedIndices([]);
    setMoves(0);
    setSeconds(0);
    setIsWon(false);
    setIsNewHigh(false);
    setFinalScore(0);

    timerRef.current = window.setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
  }, [difficulty, theme, incrementPlays]);

  useEffect(() => {
    setupGame();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [setupGame]);

  // Card click handler
  const handleCardClick = (index: number) => {
    if (isWon) return;
    const card = cards[index];
    if (card.isFlipped || card.isMatched) return;
    if (flippedIndices.length >= 2) return;

    sounds.playCardFlip();
    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [firstIdx, secondIdx] = newFlipped;
      const firstCard = newCards[firstIdx];
      const secondCard = newCards[secondIdx];

      if (firstCard.symbol === secondCard.symbol) {
        // Matched!
        setTimeout(() => {
          sounds.playCardMatch();
          newCards[firstIdx].isMatched = true;
          newCards[secondIdx].isMatched = true;
          setCards([...newCards]);
          setFlippedIndices([]);

          // Check if all matched
          const allMatched = newCards.every((c) => c.isMatched);
          if (allMatched) {
            if (timerRef.current) clearInterval(timerRef.current);
            setIsWon(true);
            celebrateWin();

            const pairCount = DIFFICULTY_CONFIG[difficulty].pairs;
            const calculatedScore = Math.max(
              100,
              pairCount * 120 - (moves + 1) * 8 - seconds * 3 + 200
            );
            setFinalScore(calculatedScore);
            const record = recordScore('memory', calculatedScore);
            if (record) setIsNewHigh(true);
          }
        }, 350);
      } else {
        // Not matched, flip back
        setTimeout(() => {
          sounds.playHit();
          newCards[firstIdx].isFlipped = false;
          newCards[secondIdx].isFlipped = false;
          setCards([...newCards]);
          setFlippedIndices([]);
        }, 900);
      }
    }
  };

  const getStarRating = () => {
    const pairCount = DIFFICULTY_CONFIG[difficulty].pairs;
    if (moves <= pairCount + 3) return 3;
    if (moves <= pairCount + 8) return 2;
    return 1;
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
          <h2 className="text-xl font-bold text-white tracking-tight">Memory Match</h2>
          <span className="text-xs text-slate-400">Find every matching pair in record time</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold tabular-nums">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Footprints className="w-3.5 h-3.5 text-slate-400" />
            <span>Moves:</span>
            <span className="text-base text-white font-bold">{moves}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Timer className="w-3.5 h-3.5 text-slate-400" />
            <span>Time:</span>
            <span className="text-base text-white font-bold">{seconds}s</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Trophy className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-base font-bold text-white">{Math.max(highScore, finalScore)}</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Theme & Difficulty Selection */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white/[0.025] backdrop-blur-xl border border-white/[0.08] p-3 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Theme:</span>
          {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                theme === key
                  ? 'bg-white text-slate-950 font-bold shadow-sm'
                  : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
              }`}
            >
              {THEMES[key].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Difficulty:</span>
          {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((diff) => (
            <button
              key={diff}
              onClick={() => setDifficulty(diff)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                difficulty === diff
                  ? 'bg-white text-slate-950 font-bold shadow-sm'
                  : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
              }`}
            >
              {diff === 'EASY' ? 'Easy' : diff === 'MEDIUM' ? 'Medium' : 'Pro'}
            </button>
          ))}
        </div>

        <button
          onClick={setupGame}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-white/[0.06]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reshuffle</span>
        </button>
      </div>

      {/* Cards Board */}
      <div className="relative">
        <div
          className={`grid ${DIFFICULTY_CONFIG[difficulty].cols} gap-3 sm:gap-4 max-w-2xl mx-auto p-4 bg-slate-900/60 border border-slate-800 rounded-3xl`}
        >
          {cards.map((card, idx) => {
            const showFront = card.isFlipped || card.isMatched;
            return (
              <button
                key={card.id}
                onClick={() => handleCardClick(idx)}
                disabled={card.isMatched || flippedIndices.length >= 2}
                className={`aspect-square w-full rounded-2xl flex items-center justify-center transition-all duration-300 cursor-pointer transform ${
                  showFront
                    ? card.isMatched
                      ? 'bg-purple-950/80 border-2 border-purple-500/80 shadow-[0_0_15px_rgba(168,85,247,0.3)] scale-[0.98]'
                      : 'bg-slate-800 border-2 border-purple-400 scale-[1.02] shadow-lg'
                    : 'bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border border-slate-700 active:scale-95'
                }`}
              >
                {showFront ? (
                  <span className="text-3xl sm:text-4xl animate-scale-in">{card.symbol}</span>
                ) : (
                  <span className="text-slate-600 font-bold text-xl select-none">✦</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Victory Overlay Modal */}
        {isWon && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
              <Trophy className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-purple-400 mb-1">Exceptional Memory!</h3>

            {/* Stars */}
            <div className="flex gap-2 my-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-6 h-6 ${
                    i < getStarRating()
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-700 fill-slate-800'
                  }`}
                />
              ))}
            </div>

            {isNewHigh && (
              <div className="text-xs text-amber-300 font-bold mb-3 flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                New High Score!
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-xs text-slate-300 my-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div>
                Moves:{' '}
                <span className="font-bold text-white tabular-nums">{moves}</span>
              </div>
              <div>
                Time:{' '}
                <span className="font-bold text-white tabular-nums">{seconds}s</span>
              </div>
              <div className="col-span-2 text-sm pt-2 border-t border-slate-800">
                Total Score:{' '}
                <span className="text-lg font-black text-purple-400 tabular-nums">
                  {finalScore}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={setupGame}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
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
    </div>
  );
}
