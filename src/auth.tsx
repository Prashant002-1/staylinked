import { useCallback, useEffect, useRef, useState } from 'react';
import { Context } from './session';
import type { Session } from './session';
import type { ReactNode } from 'react';
import { api, json, SESSION_CHANGED_EVENT, setApiUser } from './api';
import type { User } from './types';
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({
    user: null,
    demoMode: false,
    aiConfigured: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const resolved = useRef(false);
  const changingAccount = useRef(false);
  const refresh = useCallback(async () => {
    if (changingAccount.current) return;
    const version = ++generation.current;
    try {
      const next = await api<Session>('/session');
      if (version !== generation.current) return;
      setApiUser(next.user?.id ?? null);
      setSession(next);
      resolved.current = true;
      setError('');
    } catch (e) {
      // A temporary background network failure must not discard an open draft.
      if (version === generation.current && !resolved.current) setError((e as Error).message);
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const whenVisible = () => {
      if (document.visibilityState !== 'hidden') void refresh();
    };
    const whenStale = () => void refresh();
    void refresh();
    window.addEventListener('focus', whenVisible);
    document.addEventListener('visibilitychange', whenVisible);
    window.addEventListener(SESSION_CHANGED_EVENT, whenStale);
    return () => {
      generation.current++;
      window.removeEventListener('focus', whenVisible);
      document.removeEventListener('visibilitychange', whenVisible);
      window.removeEventListener(SESSION_CHANGED_EVENT, whenStale);
    };
  }, [refresh]);
  const setUser = useCallback((user: User) => {
    generation.current++;
    resolved.current = true;
    setApiUser(user.id);
    setSession((s) => ({ ...s, user }));
    setError('');
    setLoading(false);
  }, []);
  const logout = async () => {
    generation.current++;
    changingAccount.current = true;
    try {
      await api('/auth/logout', { method: 'POST' });
      generation.current++;
      setApiUser(null);
      setSession((s) => ({ ...s, user: null }));
      setError('');
    } finally {
      changingAccount.current = false;
    }
  };
  const demo = async (kind: User['kind']) => {
    generation.current++;
    changingAccount.current = true;
    try {
      const { user } = await api<{ user: User }>('/auth/demo', {
        method: 'POST',
        body: json({ kind }),
      });
      setUser(user);
      return user;
    } finally {
      changingAccount.current = false;
    }
  };
  return (
    <Context.Provider value={{ ...session, loading, error, refresh, setUser, logout, demo }}>
      {children}
    </Context.Provider>
  );
}
