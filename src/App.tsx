import { useState, useMemo } from 'react';
import { Search, Gamepad2, Cloud, CheckCircle2 } from 'lucide-react';
import { ArcadeProvider, useArcade, GAMES_CATALOG } from './context/ArcadeContext';
import Navbar from './components/Navbar';
import GameCard from './components/GameCard';
import StatsModal from './components/StatsModal';
import GooglePlayModal from './components/GooglePlayModal';

import SnakeGame from './games/SnakeGame';
import BrickBreakerGame from './games/BrickBreakerGame';
import Game2048 from './games/Game2048';
import SpaceDodgeGame from './games/SpaceDodgeGame';
import MemoryCardsGame from './games/MemoryCardsGame';
import ReflexChallengeGame from './games/ReflexChallengeGame';
import TicTacToeGame from './games/TicTacToeGame';
import FlappyCosmicGame from './games/FlappyCosmicGame';
import PongGame from './games/PongGame';
import SpaceInvadersGame from './games/SpaceInvadersGame';
import BlockBlastGame from './games/BlockBlastGame';
import ChessGame from './games/ChessGame';
import CheckersGame from './games/CheckersGame';
import BilliardsGame from './games/BilliardsGame';

function ArcadeMain() {
  const { activeGameId, setActiveGameId, stats, googlePlay } = useArcade();
  const [statsOpen, setStatsOpen] = useState(false);
  const [googlePlayOpen, setGooglePlayOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredGames = useMemo(() => {
    return GAMES_CATALOG.filter((game) => {
      const matchesCategory = selectedCategory === 'all' || game.category === selectedCategory;
      const matchesSearch =
        game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const totalPlays = Object.values(stats.gamesPlayed).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans relative overflow-x-hidden">
      {/* Subtle Ambient Glass Glow Behind Content */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-gradient-to-b from-white/[0.04] to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Top Bar Navigation */}
      <Navbar
        onOpenStats={() => setStatsOpen(true)}
        onOpenGooglePlay={() => setGooglePlayOpen(true)}
        onSelectCategory={(cat) => setSelectedCategory(cat)}
        activeCategory={selectedCategory}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeGameId === 'snake' && <SnakeGame />}
        {activeGameId === 'breaker' && <BrickBreakerGame />}
        {activeGameId === '2048' && <Game2048 />}
        {activeGameId === 'space' && <SpaceDodgeGame />}
        {activeGameId === 'memory' && <MemoryCardsGame />}
        {activeGameId === 'reflex' && <ReflexChallengeGame />}
        {activeGameId === 'tictactoe' && <TicTacToeGame />}
        {activeGameId === 'flappy' && <FlappyCosmicGame />}
        {activeGameId === 'pong' && <PongGame />}
        {activeGameId === 'invaders' && <SpaceInvadersGame />}
        {activeGameId === 'blockblast' && <BlockBlastGame />}
        {activeGameId === 'chess' && <ChessGame />}
        {activeGameId === 'checkers' && <CheckersGame />}
        {activeGameId === 'billiards' && <BilliardsGame />}

        {!activeGameId && (
          <div className="space-y-8">
            {/* Frosted Glass Hero Banner */}
            <div className="relative rounded-3xl overflow-hidden bg-white/[0.025] backdrop-blur-2xl border border-white/[0.08] p-6 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-3">
                  <Gamepad2 className="w-3.5 h-3.5 text-slate-300" />
                  <span>Interactive Game Library</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span>{GAMES_CATALOG.length} instant-play games</span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight mb-3 text-balance">
                  Frosted Glass Arcade Hub with Instant Play
                </h1>

                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                  Enjoy a curated collection of classic arcade, puzzle, action, and strategy games with high-score tracking, Google Play Games sync, and synthesized sound effects.
                </p>

                {/* Cloud & Stats Strip */}
                <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400 border-t border-white/[0.06] pt-4">
                  <div>
                    <span className="block text-white font-bold text-sm sm:text-base tabular-nums">{GAMES_CATALOG.length} Games</span>
                    <span className="text-[11px]">Ready to play</span>
                  </div>
                  <div className="h-5 w-[1px] bg-white/[0.08]" />
                  <div>
                    <span className="block text-white font-bold text-sm sm:text-base tabular-nums">{totalPlays}</span>
                    <span className="text-[11px]">Rounds played</span>
                  </div>
                  <div className="h-5 w-[1px] bg-white/[0.08]" />
                  <div
                    onClick={() => setGooglePlayOpen(true)}
                    className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
                  >
                    <Cloud className="w-4 h-4 text-slate-300" />
                    <div>
                      <span className="block text-white font-semibold text-xs flex items-center gap-1">
                        {googlePlay.isConnected ? (
                          <>
                            {googlePlay.playerName}
                            <CheckCircle2 className="w-3 h-3 text-slate-400" />
                          </>
                        ) : (
                          'Link Google Play'
                        )}
                      </span>
                      <span className="text-[11px]">
                        {googlePlay.isConnected ? `Level ${googlePlay.level}` : 'Click to sync'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-1 p-1 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl w-full sm:w-auto overflow-x-auto">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({GAMES_CATALOG.length})
                </button>
                <button
                  onClick={() => setSelectedCategory('classic')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === 'classic'
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Classic
                </button>
                <button
                  onClick={() => setSelectedCategory('puzzle')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === 'puzzle'
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Puzzle &amp; Strategy
                </button>
                <button
                  onClick={() => setSelectedCategory('action')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === 'action'
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Action
                </button>
                <button
                  onClick={() => setSelectedCategory('reflex')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === 'reflex'
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Reflex
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search games..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] focus:border-white/30 focus:outline-none text-xs text-white placeholder-slate-500 rounded-xl pl-8 pr-3 py-2 transition-colors"
                />
              </div>
            </div>

            {/* Games Grid */}
            {filteredGames.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {filteredGames.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-3xl">
                <p className="text-slate-400 text-xs mb-3">No matching games found</p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 bg-white text-slate-950 hover:bg-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Show All Games
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/[0.06] bg-slate-950/40 backdrop-blur-md mt-16 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Arcade Game Hub</span>
            <span aria-hidden="true">·</span>
            <span>Frosted Glass Collection</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setActiveGameId(null);
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={() => setGooglePlayOpen(true)}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Google Play Games
            </button>
            <button
              onClick={() => setStatsOpen(true)}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              High Scores
            </button>
          </div>
        </div>
      </footer>

      <StatsModal isOpen={statsOpen} onClose={() => setStatsOpen(false)} />
      <GooglePlayModal isOpen={googlePlayOpen} onClose={() => setGooglePlayOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ArcadeProvider>
      <ArcadeMain />
    </ArcadeProvider>
  );
}
