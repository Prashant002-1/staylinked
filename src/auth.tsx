import { useEffect, useState } from 'react';
import { Context } from './session';
import type { Session } from './session';
import type { ReactNode } from 'react';
import { api, json } from './api';
import type { User } from './types';
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({
    user: null,
    demoMode: false,
    aiConfigured: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = async () => {
    try {
      setSession(await api<Session>('/session'));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
  }, []);
  const setUser = (user: User) => setSession((s) => ({ ...s, user }));
  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    setSession((s) => ({ ...s, user: null }));
  };
  const demo = async (kind: User['kind']) => {
    const { user } = await api<{ user: User }>('/auth/demo', {
      method: 'POST',
      body: json({ kind }),
    });
    setUser(user);
    return user;
  };
  return (
    <Context.Provider value={{ ...session, loading, error, refresh, setUser, logout, demo }}>
      {children}
    </Context.Provider>
  );
}
