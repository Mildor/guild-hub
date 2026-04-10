import { create } from 'zustand';
import type { User } from '../types/auth';
import api from '@/lib/api';
import type { SharedProfile } from '@/types/auth';

const ACTIVE_SHARED_PROFILE_KEY = 'gh_active_shared_profile';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  activeSharedProfile: SharedProfile | null;
  setUser: (user: User | null) => void;
  setActiveSharedProfile: (profile: SharedProfile | null) => void;
  logout: () => Promise<void>;
}

const parseSharedProfile = (value: string | null): SharedProfile | null => {
  if (value === 'A' || value === 'B' || value === 'C') {
    return value;
  }

  return null;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  activeSharedProfile: parseSharedProfile(
    typeof window !== 'undefined'
      ? window.localStorage.getItem(ACTIVE_SHARED_PROFILE_KEY)
      : null,
  ),

  setUser: (user) => {
    if (!user) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(ACTIVE_SHARED_PROFILE_KEY);
      }

      set({ user: null, isAuthenticated: false, activeSharedProfile: null });
      return;
    }

    let nextProfile: SharedProfile | null = null;
    if (user.isSharedAccount) {
      const stored = parseSharedProfile(
        typeof window !== 'undefined'
          ? window.localStorage.getItem(ACTIVE_SHARED_PROFILE_KEY)
          : null,
      );
      nextProfile = stored ?? 'A';

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(ACTIVE_SHARED_PROFILE_KEY, nextProfile);
      }
    } else if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ACTIVE_SHARED_PROFILE_KEY);
    }

    set({ user, isAuthenticated: true, activeSharedProfile: nextProfile });
  },

  setActiveSharedProfile: (profile) => {
    if (typeof window !== 'undefined') {
      if (profile) {
        window.localStorage.setItem(ACTIVE_SHARED_PROFILE_KEY, profile);
      } else {
        window.localStorage.removeItem(ACTIVE_SHARED_PROFILE_KEY);
      }
    }

    set({ activeSharedProfile: profile });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(ACTIVE_SHARED_PROFILE_KEY);
      }

      set({ user: null, isAuthenticated: false, activeSharedProfile: null });
    }
  },
}));
