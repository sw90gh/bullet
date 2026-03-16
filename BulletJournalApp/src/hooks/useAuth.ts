import { useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged, signInWithPopup, getRedirectResult } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) setUser(result.user);
      })
      .catch((e) => {
        console.error('Redirect result error:', e);
        setError(e.message || String(e));
      });

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = useCallback(async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      console.error('Login error:', err.code, err.message);
      setError(`${err.code}: ${err.message}`);
    }
  }, []);

  const logout = useCallback(async () => {
    await auth.signOut();
  }, []);

  return { user, loading, login, logout, error };
}
