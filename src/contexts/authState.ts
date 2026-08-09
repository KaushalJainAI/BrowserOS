/**
 * Auth context object and its hook.
 *
 * Split from `AuthContext.tsx` for the same reason as `osState.ts`: a module
 * that exports both a provider component and other values defeats fast refresh,
 * so editing it during development reloads the page and drops the workspace.
 */

import { createContext, useContext } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthContextValue {
  user: User | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
