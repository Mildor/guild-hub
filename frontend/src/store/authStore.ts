import { create } from 'zustand';
import type { User } from '../types/auth';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('guildhub_token'),
  user: null,
  isAuthenticated: !!localStorage.getItem('guildhub_token'),

  setToken: (token) => {
    localStorage.setItem('guildhub_token', token);
    set({ token, isAuthenticated: true });
  },

  setUser: (user) => {
    set({ user });
  },

  logout: () => {
    localStorage.removeItem('guildhub_token');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
