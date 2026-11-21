export type GameId =
  | 'snake'
  | 'breaker'
  | '2048'
  | 'space'
  | 'memory'
  | 'reflex'
  | 'tictactoe'
  | 'flappy'
  | 'pong'
  | 'invaders'
  | 'blockblast'
  | 'chess'
  | 'checkers'
  | 'billiards';

export type GameCategory = 'all' | 'classic' | 'action' | 'puzzle' | 'reflex';

export interface GameInfo {
  id: GameId;
  title: string;
  category: GameCategory;
  categoryLabel: string;
  description: string;
  thumbnail?: string;
  difficulty: 'Easy' | 'Medium' | 'Challenging';
  controls: string;
  accentColor: string;
}

export interface ArcadeStats {
  scores: Record<GameId, number>;
  gamesPlayed: Record<GameId, number>;
  totalTimePlayedSeconds: number;
}

export interface GooglePlayProfile {
  isConnected: boolean;
  isRealAuth?: boolean;
  playerName: string;
  playerTag: string;
  email?: string | null;
  photoURL?: string | null;
  playerId?: string;
  level: number;
  xp: number;
  lastSyncedAt: string | null;
}
