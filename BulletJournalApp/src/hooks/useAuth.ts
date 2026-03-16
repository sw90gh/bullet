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
    // 항상 redirect 사용 (iOS Safari/PWA 호환)
    await signInWithRedirect(auth, googleProvider);
  }, []);

  const logout = useCallback(async () => {
    await auth.signOut();
  }, []);

  return { user, loading, login, logout };
}
