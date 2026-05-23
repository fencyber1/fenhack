import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('fenhack_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    // In production, this would call a real backend API
    // For now, we validate against localStorage
    const users = JSON.parse(localStorage.getItem('fenhack_users') || '[]');
    const found = users.find((u: any) => u.username === username && u.password === password);
    if (found) {
      const sessionUser: User = {
        id: found.id,
        username: found.username,
        email: found.email,
        role: found.role || 'free',
        createdAt: found.createdAt,
      };
      setUser(sessionUser);
      localStorage.setItem('fenhack_user', JSON.stringify(sessionUser));
      return true;
    }
    return false;
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    const users = JSON.parse(localStorage.getItem('fenhack_users') || '[]');
    if (users.find((u: any) => u.username === username || u.email === email)) {
      return false;
    }
    const newUser = {
      id: `user-${Date.now()}`,
      username,
      email,
      password,
      role: 'free' as const,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    localStorage.setItem('fenhack_users', JSON.stringify(users));

    const sessionUser: User = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt,
    };
    setUser(sessionUser);
    localStorage.setItem('fenhack_user', JSON.stringify(sessionUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('fenhack_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
