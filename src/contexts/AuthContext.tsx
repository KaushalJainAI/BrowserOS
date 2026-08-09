import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { AuthContext, type User } from './authState';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>({
    id: '1',
    name: 'BrowserOS User',
    email: 'user@browseros.local',
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      // No identity endpoint is wired up yet; the desktop runs against whatever
      // token `api/auth.ts` holds, and this only records who is signed in.
      setUser({ id: '1', name: email.split('@')[0] || 'BrowserOS User', email });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const value = useMemo(
    () => ({ user, login, logout, isLoading }),
    [user, login, logout, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
