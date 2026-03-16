import { useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged, signInWithRedirect, signInWithPopup, getRedirectResult } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check redirect result (for iOS PWA)
    getRedirectResult(auth).catch(() => {});

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = useCallback(async () => {
    try {
      // Try popup first (works on desktop and in-browser mobile)
      await signInWithPopup(auth, googleProvider);
    } catch (e: unknown) {
      const error = e as { code?: string };
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        // Fallback to redirect (for iOS PWA standalone mode)
        await signInWithRedirect(auth, googleProvider);
      } else {
        throw e;
      }
    }
  }, []);

  const logout = useCallback(async () => {
    await auth.signOut();
  }, []);

  return { user, loading, login, logout };
}
