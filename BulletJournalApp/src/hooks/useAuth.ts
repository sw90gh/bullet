import { useState, useEffect, useCallback } from 'react';
import { User, OAuthCredential, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, getRedirectResult } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
    // localStorage에서 저장된 토큰 복원
    try {
      const stored = localStorage.getItem('bujo-gat');
      if (stored) {
        const { token, expiry } = JSON.parse(stored);
        if (Date.now() < expiry) return token;
      }
    } catch {}
    return null;
  });

  const saveToken = (token: string | null) => {
    setGoogleAccessToken(token);
    if (token) {
      // 50분 후 만료로 저장 (실제 1시간이지만 여유)
      localStorage.setItem('bujo-gat', JSON.stringify({ token, expiry: Date.now() + 50 * 60 * 1000 }));
    } else {
      localStorage.removeItem('bujo-gat');
    }
  };

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setUser(result.user);
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) saveToken(credential.accessToken);
        }
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
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      console.log('[Auth] credential:', credential);
      console.log('[Auth] accessToken:', credential?.accessToken);
      // credential.accessToken 또는 내부 tokenResponse에서 추출
      const token = credential?.accessToken
        || (result as any)._tokenResponse?.oauthAccessToken;
      if (token) {
        console.log('[Auth] Google access token obtained');
        saveToken(token);
      } else {
        console.warn('[Auth] No access token in result');
      }
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      console.error('Login error:', err.code, err.message);
      setError(`${err.code}: ${err.message}`);
    }
  }, []);

  const logout = useCallback(async () => {
    await auth.signOut();
    saveToken(null);
  }, []);

  return { user, loading, login, logout, error, googleAccessToken };
}
