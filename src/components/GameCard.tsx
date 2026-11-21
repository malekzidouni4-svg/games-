import { useState } from 'react';
import { Play, Trophy } from 'lucide-react';
import { GameInfo } from '../types/game';
import { useArcade } from '../context/ArcadeContext';
import GameThumbnailArtwork from './GameThumbnailArtwork';

interface GameCardProps {
  game: GameInfo;
}

export default function GameCard({ game }: GameCardProps) {
  const { setActiveGameId, stats } = useArcade();
  const [imgError, setImgError] = useState(false);

  const highScore = stats.scores[game.id] || 0;
  const plays = stats.gamesPlayed[game.id] || 0;

  return (
    <div
      onClick={() => setActiveGameId(game.id)}
      className="group relative bg-white/[0.02] hover:bg-white/[0.045] backdrop-blur-2xl border border-white/[0.07] hover:border-white/[0.15] rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-1 shadow-[0_8px_32px_0_rgba(0,0,0,0.35)] flex flex-col cursor-pointer"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950/60 border-b border-white/[0.05]">
        {game.thumbnail && !imgError ? (
          <img
            src={game.thumbnail}
            alt={game.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
          />
        ) : (
          <GameThumbnailArtwork gameId={game.id} title={game.title} />
        )}

        {/* Hover subtle frosted overlay */}
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-white text-slate-950 flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-5 h-5 ml-0.5 fill-current" />
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Clean Unboxed Metadata */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <span>{game.categoryLabel}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>{game.difficulty}</span>
            {plays > 0 && (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="tabular-nums">{plays} {plays === 1 ? 'play' : 'plays'}</span>
              </>
            )}
          </div>

          {/* Calm, Professional White Heading */}
          <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-slate-200 transition-colors mb-1.5 tracking-tight">
            {game.title}
          </h3>

          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
            {game.description}
          </p>
        </div>

        {/* Card Footer */}
        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Trophy className="w-3.5 h-3.5 text-slate-300" />
            <span>Best:</span>
            <span className="font-semibold text-white tabular-nums">{highScore}</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveGameId(game.id);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] hover:bg-white hover:text-slate-950 text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-white/[0.06]"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Play</span>
          </button>
        </div>
      </div>
    </div>
  );
}
