import { GameId } from '../types/game';

interface GameThumbnailArtworkProps {
  gameId: GameId;
  title: string;
}

export default function GameThumbnailArtwork({ gameId, title }: GameThumbnailArtworkProps) {
  return (
    <div
      className="w-full h-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#0b101b] to-slate-950"
      aria-label={title}
    >
      {/* Subtle radial glass glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.06),transparent_65%)]" />

      {gameId === 'pong' && (
        <svg viewBox="0 0 240 180" className="w-full h-full p-5 opacity-90 group-hover:scale-105 transition-transform duration-500">
          <rect x="16" y="16" width="208" height="148" rx="14" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
          <line x1="120" y1="24" x2="120" y2="156" stroke="rgba(255,255,255,0.16)" strokeWidth="2" strokeDasharray="6 7" />
          <rect x="30" y="55" width="8" height="44" rx="4" fill="#e2e8f0" />
          <rect x="202" y="82" width="8" height="44" rx="4" fill="#94a3b8" />
          <circle cx="136" cy="76" r="6" fill="#ffffff" />
          <path d="M 42 80 L 130 76" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="3 4" />
        </svg>
      )}

      {gameId === 'invaders' && (
        <svg viewBox="0 0 240 180" className="w-full h-full p-5 opacity-90 group-hover:scale-105 transition-transform duration-500">
          <rect x="16" y="16" width="208" height="148" rx="14" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
          {/* Invader grid */}
          {[0, 1, 2, 3].map((c) =>
            [0, 1].map((r) => (
              <g key={`${r}-${c}`} transform={`translate(${54 + c * 36}, ${34 + r * 26})`}>
                <rect width="22" height="16" rx="4" fill={r === 0 ? '#cbd5e1' : '#94a3b8'} opacity="0.85" />
                <circle cx="7" cy="7" r="2" fill="#090d16" />
                <circle cx="15" cy="7" r="2" fill="#090d16" />
              </g>
            ))
          )}
          {/* Laser */}
          <rect x="119" y="96" width="3" height="14" rx="1.5" fill="#ffffff" />
          {/* Player ship */}
          <polygon points="120,124 136,144 128,144 120,136 112,144 104,144" fill="#ffffff" />
        </svg>
      )}

      {gameId === 'blockblast' && (
        <svg viewBox="0 0 240 180" className="w-full h-full p-5 opacity-90 group-hover:scale-105 transition-transform duration-500">
          <rect x="16" y="16" width="208" height="148" rx="14" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
          <g transform="translate(68, 28)">
            {[0, 1, 2, 3].map((r) =>
              [0, 1, 2, 3].map((c) => {
                const filled = (r === 1 && c < 3) || (r === 2 && c > 0) || (r === 0 && c === 1) || (r === 3 && c < 2);
                return (
                  <rect
                    key={`${r}-${c}`}
                    x={c * 26}
                    y={r * 26}
                    width="22"
                    height="22"
                    rx="5"
                    fill={filled ? (r === 1 ? '#e2e8f0' : '#94a3b8') : 'rgba(255,255,255,0.05)'}
                    stroke="rgba(255,255,255,0.08)"
                  />
                );
              })
            )}
          </g>
          {/* Floating piece */}
          <g transform="translate(152, 114)">
            <rect x="0" y="0" width="16" height="16" rx="4" fill="#ffffff" />
            <rect x="18" y="0" width="16" height="16" rx="4" fill="#ffffff" />
            <rect x="18" y="18" width="16" height="16" rx="4" fill="#ffffff" />
          </g>
        </svg>
      )}

      {gameId === 'chess' && (
        <svg viewBox="0 0 240 180" className="w-full h-full p-5 opacity-90 group-hover:scale-105 transition-transform duration-500">
          <rect x="16" y="16" width="208" height="148" rx="14" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
          <g transform="translate(56, 26)">
            {[0, 1, 2, 3].map((r) =>
              [0, 1, 2, 3].map((c) => (
                <rect
                  key={`${r}-${c}`}
                  x={c * 32}
                  y={r * 32}
                  width="32"
                  height="32"
                  fill={(r + c) % 2 === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.03)'}
                />
              ))
            )}
            <text x="48" y="54" textAnchor="middle" fontSize="24" fill="#ffffff">♔</text>
            <text x="112" y="118" textAnchor="middle" fontSize="24" fill="#cbd5e1">♞</text>
          </g>
        </svg>
      )}

      {gameId === 'checkers' && (
        <svg viewBox="0 0 240 180" className="w-full h-full p-5 opacity-90 group-hover:scale-105 transition-transform duration-500">
          <rect x="16" y="16" width="208" height="148" rx="14" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
          <g transform="translate(56, 26)">
            {[0, 1, 2, 3].map((r) =>
              [0, 1, 2, 3].map((c) => (
                <rect
                  key={`${r}-${c}`}
                  x={c * 32}
                  y={r * 32}
                  width="32"
                  height="32"
                  fill={(r + c) % 2 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.03)'}
                />
              ))
            )}
            <circle cx="48" cy="48" r="11" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
            <circle cx="112" cy="48" r="11" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
            <circle cx="80" cy="80" r="11" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
            <circle cx="48" cy="112" r="11" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          </g>
        </svg>
      )}

      {gameId === 'billiards' && (
        <svg viewBox="0 0 240 180" className="w-full h-full p-5 opacity-90 group-hover:scale-105 transition-transform duration-500">
          <rect x="20" y="28" width="200" height="124" rx="14" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
          {/* Pockets */}
          <circle cx="28" cy="36" r="7" fill="#020617" />
          <circle cx="120" cy="34" r="7" fill="#020617" />
          <circle cx="212" cy="36" r="7" fill="#020617" />
          <circle cx="28" cy="144" r="7" fill="#020617" />
          <circle cx="120" cy="146" r="7" fill="#020617" />
          <circle cx="212" cy="144" r="7" fill="#020617" />
          {/* Aim line */}
          <line x1="68" y1="90" x2="148" y2="90" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="4 4" />
          {/* Cue ball */}
          <circle cx="68" cy="90" r="9" fill="#ffffff" />
          {/* Rack */}
          <circle cx="154" cy="90" r="8" fill="#cbd5e1" />
          <circle cx="170" cy="80" r="8" fill="#94a3b8" />
          <circle cx="170" cy="100" r="8" fill="#64748b" />
          <circle cx="186" cy="70" r="8" fill="#e2e8f0" />
          <circle cx="186" cy="90" r="8" fill="#475569" />
          <circle cx="186" cy="110" r="8" fill="#cbd5e1" />
        </svg>
      )}
    </div>
  );
}
