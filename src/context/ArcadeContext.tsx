import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameId, GameInfo, ArcadeStats, GooglePlayProfile } from '../types/game';
import { sounds } from '../utils/audio';
import {
  signInWithGooglePlay,
  signOutGooglePlay,
  initAuthListener,
} from '../utils/googleAuth';

import snakeThumb from '../assets/images/game_snake_thumb_1792148208809.jpg';
import breakerThumb from '../assets/images/game_breaker_thumb_1792148209974.jpg';
import thumb2048 from '../assets/images/game_2048_thumb_1792148210729.jpg';
import spaceThumb from '../assets/images/game_space_thumb_1792148210865.jpg';
import memoryThumb from '../assets/images/game_memory_thumb_1792148212079.jpg';
import reflexThumb from '../assets/images/game_reflex_thumb_1792148211685.jpg';
import tictactoeThumb from '../assets/images/game_tictactoe_thumb_1792149493690.jpg';
import flappyThumb from '../assets/images/game_flappy_thumb_1792149493352.jpg';

export const GAMES_CATALOG: GameInfo[] = [
  {
    id: 'snake',
    title: 'Neon Snake',
    category: 'classic',
    categoryLabel: 'Classic',
    description: 'Steer the snake, collect golden energy orbs, and grow without hitting walls or your tail.',
    thumbnail: snakeThumb,
    difficulty: 'Medium',
    controls: 'Arrow keys or D-Pad',
    accentColor: '#94a3b8',
  },
  {
    id: 'breaker',
    title: 'Brick Breaker',
    category: 'action',
    categoryLabel: 'Action',
    description: 'Bounce the ball to shatter rows of glass bricks, chain combos, and clear the board.',
    thumbnail: breakerThumb,
    difficulty: 'Medium',
    controls: 'Mouse, touch drag, or arrows',
    accentColor: '#94a3b8',
  },
  {
    id: 'tictactoe',
    title: 'Tic-Tac-Toe AI',
    category: 'puzzle',
    categoryLabel: 'Strategy',
    description: 'Challenge a smart AI opponent or duel a friend locally on the same screen.',
    thumbnail: tictactoeThumb,
    difficulty: 'Easy',
    controls: 'Click or tap squares',
    accentColor: '#94a3b8',
  },
  {
    id: 'flappy',
    title: 'Flappy Cosmic',
    category: 'action',
    categoryLabel: 'Action',
    description: 'Pilot the space probe through narrow energy gates without touching the barriers.',
    thumbnail: flappyThumb,
    difficulty: 'Challenging',
    controls: 'Click, tap, or Space to thrust',
    accentColor: '#94a3b8',
  },
  {
    id: '2048',
    title: '2048 Tiles',
    category: 'puzzle',
    categoryLabel: 'Puzzle',
    description: 'Slide and merge matching tiles until you reach 2048 with smart step undo.',
    thumbnail: thumb2048,
    difficulty: 'Challenging',
    controls: 'Swipe or arrow keys',
    accentColor: '#94a3b8',
  },
  {
    id: 'space',
    title: 'Space Dodge',
    category: 'action',
    categoryLabel: 'Action',
    description: 'Navigate through a falling asteroid belt while collecting shields and energy crystals.',
    thumbnail: spaceThumb,
    difficulty: 'Challenging',
    controls: 'Pointer drag or arrow keys',
    accentColor: '#94a3b8',
  },
  {
    id: 'memory',
    title: 'Memory Match',
    category: 'puzzle',
    categoryLabel: 'Puzzle',
    description: 'Flip cards and match every pair in the fewest moves and fastest time.',
    thumbnail: memoryThumb,
    difficulty: 'Easy',
    controls: 'Click or tap cards',
    accentColor: '#94a3b8',
  },
  {
    id: 'reflex',
    title: 'Reflex Master',
    category: 'reflex',
    categoryLabel: 'Reflex',
    description: 'Test your millisecond reaction time on green or catch rapid targets in 30 seconds.',
    thumbnail: reflexThumb,
    difficulty: 'Medium',
    controls: 'Fast click or tap',
    accentColor: '#94a3b8',
  },
  {
    id: 'pong',
    title: 'Classic Pong',
    category: 'classic',
    categoryLabel: 'Classic',
    description: 'Face off against the computer in classic table tennis—first to 5 points wins.',
    difficulty: 'Easy',
    controls: 'Mouse drag or ↑ ↓ arrows',
    accentColor: '#94a3b8',
  },
  {
    id: 'invaders',
    title: 'Space Invaders',
    category: 'action',
    categoryLabel: 'Action',
    description: 'Defend orbit and blast waves of alien invaders with laser fire before they descend.',
    difficulty: 'Medium',
    controls: 'Pointer or arrows + Space to fire',
    accentColor: '#94a3b8',
  },
  {
    id: 'blockblast',
    title: 'Block Blast',
    category: 'puzzle',
    categoryLabel: 'Puzzle',
    description: 'Drag geometric pieces onto the 8×8 grid to clear full rows and columns for high scores.',
    difficulty: 'Medium',
    controls: 'Drag and drop pieces',
    accentColor: '#94a3b8',
  },
  {
    id: 'chess',
    title: 'Classic Chess',
    category: 'puzzle',
    categoryLabel: 'Strategy',
    description: 'Play full-rules chess against an AI opponent with check detection and pawn promotion.',
    difficulty: 'Challenging',
    controls: 'Click piece then destination',
    accentColor: '#94a3b8',
  },
  {
    id: 'checkers',
    title: 'Classic Checkers',
    category: 'puzzle',
    categoryLabel: 'Strategy',
    description: 'Strategic checkers featuring mandatory captures, multi-jump chains, and king crowning.',
    difficulty: 'Medium',
    controls: 'Click piece then target square',
    accentColor: '#94a3b8',
  },
  {
    id: 'billiards',
    title: 'Classic Billiards',
    category: 'classic',
    categoryLabel: 'Classic',
    description: 'Aim the cue ball precisely and pocket all seven object balls in as few strokes as possible.',
    difficulty: 'Medium',
    controls: 'Aim and click to shoot',
    accentColor: '#94a3b8',
  },
];

interface ArcadeContextType {
  activeGameId: GameId | null;
  setActiveGameId: (id: GameId | null) => void;
  stats: ArcadeStats;
  soundEnabled: boolean;
  toggleSound: () => void;
  recordScore: (gameId: GameId, score: number) => boolean;
  incrementPlays: (gameId: GameId) => void;
  celebrateWin: () => void;
  resetAllStats: () => void;
  googlePlay: GooglePlayProfile;
  isAuthenticating: boolean;
  authError: 'POPUP_BLOCKED' | 'AUTH_FAILED' | null;
  clearAuthError: () => void;
  connectGooglePlayReal: () => Promise<void>;
  connectCustomGooglePlay: (name: string, customTag?: string) => void;
  disconnectGooglePlay: () => Promise<void>;
  syncGooglePlayNow: () => void;
}

const DEFAULT_STATS: ArcadeStats = {
  scores: {
    snake: 0,
    breaker: 0,
    '2048': 0,
    space: 0,
    memory: 0,
    reflex: 0,
    tictactoe: 0,
    flappy: 0,
    pong: 0,
    invaders: 0,
    blockblast: 0,
    chess: 0,
    checkers: 0,
    billiards: 0,
  },
  gamesPlayed: {
    snake: 0,
    breaker: 0,
    '2048': 0,
    space: 0,
    memory: 0,
    reflex: 0,
    tictactoe: 0,
    flappy: 0,
    pong: 0,
    invaders: 0,
    blockblast: 0,
    chess: 0,
    checkers: 0,
    billiards: 0,
  },
  totalTimePlayedSeconds: 0,
};

const DEFAULT_GOOGLE_PLAY: GooglePlayProfile = {
  isConnected: false,
  isRealAuth: false,
  playerName: 'ArcadePlayer',
  playerTag: '#GP8942',
  email: null,
  photoURL: null,
  level: 1,
  xp: 0,
  lastSyncedAt: null,
};

const ArcadeContext = createContext<ArcadeContextType | undefined>(undefined);

export function ArcadeProvider({ children }: { children: React.ReactNode }) {
  const [activeGameId, setActiveGameIdState] = useState<GameId | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<'POPUP_BLOCKED' | 'AUTH_FAILED' | null>(null);

  const [stats, setStats] = useState<ArcadeStats>(() => {
    try {
      const saved = localStorage.getItem('arcade_stats_v2');
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<ArcadeStats>;
        return {
          ...DEFAULT_STATS,
          ...parsed,
          scores: { ...DEFAULT_STATS.scores, ...(parsed.scores || {}) },
          gamesPlayed: { ...DEFAULT_STATS.gamesPlayed, ...(parsed.gamesPlayed || {}) },
        };
      }
    } catch {
      // fallback
    }
    return DEFAULT_STATS;
  });

  const [googlePlay, setGooglePlay] = useState<GooglePlayProfile>(() => {
    try {
      const saved = localStorage.getItem('arcade_google_play_v2');
      if (saved) {
        const parsed = JSON.parse(saved) as GooglePlayProfile;
        if (parsed.playerName && /[\u0600-\u06FF]/.test(parsed.playerName)) {
          parsed.playerName = 'ArcadePlayer';
        }
        return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_GOOGLE_PLAY;
  });

  // Sound preference load
  useEffect(() => {
    try {
      const savedSound = localStorage.getItem('arcade_sound_pref');
      if (savedSound !== null) {
        const isEnabled = savedSound === 'true';
        setSoundEnabled(isEnabled);
        sounds.enabled = isEnabled;
      }
    } catch {
      // ignore
    }
  }, []);

  // Real Auth state listener
  useEffect(() => {
    const unsubscribe = initAuthListener(
      (user) => {
        setGooglePlay((prev) => {
          if (!prev.isConnected) {
            const updated: GooglePlayProfile = {
              ...prev,
              isConnected: true,
              isRealAuth: true,
              playerName: user.displayName || prev.playerName,
              email: user.email,
              photoURL: user.photoURL,
              playerTag: `#GP${user.uid.slice(-4).toUpperCase()}`,
              lastSyncedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            };
            try {
              localStorage.setItem('arcade_google_play_v2', JSON.stringify(updated));
            } catch {
              // ignore
            }
            return updated;
          }
          return prev;
        });
      },
      () => {
        // user signed out
      }
    );
    return () => unsubscribe();
  }, []);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      sounds.enabled = next;
      try {
        localStorage.setItem('arcade_sound_pref', String(next));
      } catch {
        // ignore
      }
      if (next) {
        sounds.playClick();
      }
      return next;
    });
  };

  const setActiveGameId = (id: GameId | null) => {
    sounds.playClick();
    setActiveGameIdState(id);
    if (id) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const celebrateWin = () => {
    sounds.playVictory();
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#e2e8f0', '#38bdf8', '#818cf8', '#cbd5e1'],
    });
  };

  const recordScore = (gameId: GameId, score: number): boolean => {
    const currentHigh = stats.scores[gameId] || 0;
    const isNewHigh = score > currentHigh;

    setStats((prev) => {
      const newScores = {
        ...prev.scores,
        [gameId]: Math.max(prev.scores[gameId] || 0, score),
      };
      const updated = {
        ...prev,
        scores: newScores,
      };
      try {
        localStorage.setItem('arcade_stats_v2', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    // Award Google Play XP
    if (googlePlay.isConnected && score > 0) {
      setGooglePlay((prev) => {
        const addedXp = Math.floor(score / 5) + (isNewHigh ? 100 : 20);
        const newTotalXp = prev.xp + addedXp;
        const newLevel = Math.floor(newTotalXp / 500) + 1;
        const updated = {
          ...prev,
          xp: newTotalXp,
          level: newLevel,
          lastSyncedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        };
        try {
          localStorage.setItem('arcade_google_play_v2', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    }

    if (isNewHigh && score > 0) {
      celebrateWin();
    }

    return isNewHigh;
  };

  const incrementPlays = (gameId: GameId) => {
    setStats((prev) => {
      const updated = {
        ...prev,
        gamesPlayed: {
          ...prev.gamesPlayed,
          [gameId]: (prev.gamesPlayed[gameId] || 0) + 1,
        },
      };
      try {
        localStorage.setItem('arcade_stats_v2', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const resetAllStats = () => {
    sounds.playHit();
    setStats(DEFAULT_STATS);
    try {
      localStorage.setItem('arcade_stats_v2', JSON.stringify(DEFAULT_STATS));
    } catch {
      // ignore
    }
  };

  // Real Google Play sign-in using Firebase Auth + Google Play Games API
  const connectGooglePlayReal = async () => {
    try {
      setIsAuthenticating(true);
      setAuthError(null);
      const authResult = await signInWithGooglePlay();
      if (!authResult) return;

      const { user, playProfile } = authResult;
      const totalScorePoints = Object.values(stats.scores).reduce((a, b) => a + b, 0);
      const initialXp = Math.max(200, Math.floor(totalScorePoints / 2));

      const profile: GooglePlayProfile = {
        isConnected: true,
        isRealAuth: true,
        playerName: playProfile?.displayName || user.displayName || 'GooglePlayer',
        playerTag: playProfile?.playerId ? `#GP${playProfile.playerId.slice(-4)}` : `#GP${user.uid.slice(-4).toUpperCase()}`,
        email: user.email,
        photoURL: playProfile?.avatarImageUrl || user.photoURL,
        playerId: playProfile?.playerId,
        level: Math.floor(initialXp / 500) + 1,
        xp: initialXp,
        lastSyncedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };

      setGooglePlay(profile);
      try {
        localStorage.setItem('arcade_google_play_v2', JSON.stringify(profile));
      } catch {
        // ignore
      }
      celebrateWin();
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      if (errorObj?.code === 'auth/popup-blocked' || errorObj?.message === 'POPUP_BLOCKED') {
        setAuthError('POPUP_BLOCKED');
      } else {
        setAuthError('AUTH_FAILED');
      }
      sounds.playHit();
    } finally {
      setIsAuthenticating(false);
    }
  };

  const connectCustomGooglePlay = (name: string, customTag?: string) => {
    sounds.playPowerup();
    setAuthError(null);
    const totalScorePoints = Object.values(stats.scores).reduce((a, b) => a + b, 0);
    const initialXp = Math.max(200, Math.floor(totalScorePoints / 2));

    const profile: GooglePlayProfile = {
      isConnected: true,
      isRealAuth: false,
      playerName: name.trim() || 'ArcadePlayer',
      playerTag: customTag || `#GP${Math.floor(1000 + Math.random() * 9000)}`,
      level: Math.floor(initialXp / 500) + 1,
      xp: initialXp,
      lastSyncedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };

    setGooglePlay(profile);
    try {
      localStorage.setItem('arcade_google_play_v2', JSON.stringify(profile));
    } catch {
      // ignore
    }
    celebrateWin();
  };

  const disconnectGooglePlay = async () => {
    sounds.playClick();
    setAuthError(null);
    try {
      await signOutGooglePlay();
    } catch {
      // ignore
    }
    const updated = { ...DEFAULT_GOOGLE_PLAY, isConnected: false };
    setGooglePlay(updated);
    try {
      localStorage.setItem('arcade_google_play_v2', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const syncGooglePlayNow = () => {
    sounds.playCardMatch();
    setGooglePlay((prev) => {
      const updated = {
        ...prev,
        lastSyncedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };
      try {
        localStorage.setItem('arcade_google_play_v2', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <ArcadeContext.Provider
      value={{
        activeGameId,
        setActiveGameId,
        stats,
        soundEnabled,
        toggleSound,
        recordScore,
        incrementPlays,
        celebrateWin,
        resetAllStats,
        googlePlay,
        isAuthenticating,
        authError,
        clearAuthError,
        connectGooglePlayReal,
        connectCustomGooglePlay,
        disconnectGooglePlay,
        syncGooglePlayNow,
      }}
    >
      {children}
    </ArcadeContext.Provider>
  );
}

export function useArcade() {
  const context = useContext(ArcadeContext);
  if (!context) {
    throw new Error('useArcade must be used within an ArcadeProvider');
  }
  return context;
}
