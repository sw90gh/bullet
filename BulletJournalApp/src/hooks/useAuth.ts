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
    // iOS Safari/PWA에서는 popup이 안 되므로 항상 redirect 사용
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isIOS || isStandalone) {
      await signInWithRedirect(auth, googleProvider);
    } else {
      try {
        await signInWithPopup(auth, googleProvider);
      } catch {
        await signInWithRedirect(auth, googleProvider);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    await auth.signOut();
  }, []);

  return { user, loading, login, logout };
}
