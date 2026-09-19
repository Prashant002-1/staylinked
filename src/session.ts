import { createContext, useContext } from 'react';
import type { User } from './types';
export type Session = { user: User | null; demoMode: boolean; aiConfigured: boolean };
export type Auth = Session & {
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  demo: (kind: User['kind']) => Promise<User>;
};
export const Context = createContext<Auth | null>(null);
export function useAuth() {
  const auth = useContext(Context);
  if (!auth) throw new Error('Session provider is unavailable');
  return auth;
}
