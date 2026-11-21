import { Volume2, VolumeX, Trophy, Gamepad2, Cloud } from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';

interface NavbarProps {
  onOpenStats: () => void;
  onOpenGooglePlay: () => void;
  onSelectCategory?: (cat: string) => void;
  activeCategory?: string;
}

export default function Navbar({
  onOpenStats,
  onOpenGooglePlay,
  onSelectCategory,
  activeCategory,
}: NavbarProps) {
  const { activeGameId, setActiveGameId, soundEnabled, toggleSound, googlePlay } = useArcade();

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/60 backdrop-blur-2xl border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => setActiveGameId(null)}
          className="flex items-center gap-2.5 text-base sm:text-lg font-bold tracking-tight text-white hover:text-slate-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white flex items-center justify-center shadow-sm">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <span>Arcade Hub</span>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-medium text-slate-400">
          <button
            onClick={() => {
              setActiveGameId(null);
              onSelectCategory?.('all');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              !activeGameId && activeCategory === 'all' ? 'text-white font-semibold' : ''
            }`}
          >
            All Games
          </button>
          <button
            onClick={() => {
              setActiveGameId(null);
              onSelectCategory?.('classic');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              !activeGameId && activeCategory === 'classic' ? 'text-white font-semibold' : ''
            }`}
          >
            Classic
          </button>
          <button
            onClick={() => {
              setActiveGameId(null);
              onSelectCategory?.('puzzle');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              !activeGameId && activeCategory === 'puzzle' ? 'text-white font-semibold' : ''
            }`}
          >
            Puzzle & Strategy
          </button>
          <button
            onClick={() => {
              setActiveGameId(null);
              onSelectCategory?.('action');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              !activeGameId && activeCategory === 'action' ? 'text-white font-semibold' : ''
            }`}
          >
            Action
          </button>
        </nav>

        {/* Zone 3: Primary Action & Utility Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={toggleSound}
            className="w-8 h-8 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.08] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
            title={soundEnabled ? 'Sound effects on' : 'Sound effects muted'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-slate-200" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          <button
            onClick={onOpenGooglePlay}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              googlePlay.isConnected
                ? 'bg-white/10 text-white border border-white/20'
                : 'bg-white/[0.03] text-slate-300 hover:text-white border border-white/[0.08] hover:bg-white/[0.06]'
            }`}
          >
            {googlePlay.isConnected && googlePlay.photoURL ? (
              <img
                src={googlePlay.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="w-4 h-4 rounded-full object-cover"
              />
            ) : (
              <Cloud className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {googlePlay.isConnected ? googlePlay.playerName : 'Google Play'}
            </span>
          </button>

          <button
            onClick={onOpenStats}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-white hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Stats</span>
          </button>
        </div>
      </div>
    </header>
  );
}
