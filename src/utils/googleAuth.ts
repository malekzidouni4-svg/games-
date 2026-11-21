import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const SCOPES = ['https://www.googleapis.com/auth/games'];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({ prompt: 'select_account' });

// In-memory token cache (never stored in localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface RealGooglePlayUser {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  gamerTag?: string;
  playerId?: string;
  avatarImageUrl?: string;
}

export const initAuthListener = (
  onSuccess: (user: User, token: string) => void,
  onSignedOut: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      onSuccess(user, cachedAccessToken);
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      onSignedOut();
    }
  });
};

export const signInWithGooglePlay = async (): Promise<{
  user: User;
  accessToken: string;
  playProfile?: { playerId?: string; displayName?: string; avatarImageUrl?: string };
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;

    if (!accessToken) {
      throw new Error('Failed to receive OAuth access token from Google');
    }

    cachedAccessToken = accessToken;

    // Fetch Google Play Games profile from real REST API
    let playProfile: { playerId?: string; displayName?: string; avatarImageUrl?: string } | undefined;
    try {
      const res = await fetch('https://games.googleapis.com/games/v1/players/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        playProfile = {
          playerId: data.playerId,
          displayName: data.displayName,
          avatarImageUrl: data.avatarImageUrl,
        };
      }
    } catch {
      // Graceful fallback to Google user details
    }

    return {
      user: result.user,
      accessToken,
      playProfile,
    };
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    if (firebaseError?.code === 'auth/popup-blocked') {
      const blockedErr = new Error('POPUP_BLOCKED');
      (blockedErr as unknown as { code: string }).code = 'auth/popup-blocked';
      throw blockedErr;
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const signOutGooglePlay = async (): Promise<void> => {
  cachedAccessToken = null;
  await signOut(auth);
};

export const getCachedAccessToken = () => cachedAccessToken;
