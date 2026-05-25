import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  clearSession,
  loadSession,
  saveSession,
} from '../utils/authStorage';
import api, { AUTH_UNAUTHORIZED_EVENT } from '../api/client';

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

type AuthResponseUser = User & {
  userId?: string;
};

let restoreSessionPromise: Promise<User | null> | null = null;

function normalizeUser(user: AuthResponseUser | null | undefined): User | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id ?? user.userId ?? '',
    email: user.email,
    role: user.role,
    name: user.name,
  };
}

function setRestoredUser(user: User | null) {
  restoreSessionPromise = Promise.resolve(user);
}

function restoreSessionFromServer() {
  if (!restoreSessionPromise) {
    restoreSessionPromise = api
      .get('/auth/me')
      .then((response) => normalizeUser(response.data))
      .catch(() => null);
  }

  return restoreSessionPromise;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const handleUnauthorized = () => {
      setRestoredUser(null);
      clearSession();
      if (!isActive) {
        return;
      }

      setUser(null);
      setIsLoading(false);
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);

    const session = loadSession();
    setUser(session.user);

    const isLoginRoute = window.location.pathname === '/login';

    if (!session.user && isLoginRoute) {
      setRestoredUser(null);
      setIsLoading(false);

      return () => {
        isActive = false;
        window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
      };
    }

    restoreSessionFromServer()
      .then((restoredUser) => {
        if (!isActive) {
          return;
        }

        if (restoredUser) {
          saveSession(restoredUser);
          setUser(restoredUser);
          return;
        }

        clearSession();
        setUser(null);
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  const login = (newUser: User) => {
    const normalizedUser = normalizeUser(newUser);

    setRestoredUser(normalizedUser);
    saveSession(normalizedUser as User);
    setUser(normalizedUser);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Si el backend no responde, igual se limpia el estado local.
    }

    setRestoredUser(null);
    clearSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}