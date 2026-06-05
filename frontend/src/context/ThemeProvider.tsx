import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export type Theme = 'dark' | 'light' | 'horde' | 'alliance' | 'custom';

export interface CustomColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  border: string;
  isDark: boolean;
}

const DEFAULT_CUSTOM_COLORS: CustomColors = {
  background: '#0f172a',
  foreground: '#f8fafc',
  card: '#1e293b',
  cardForeground: '#f8fafc',
  primary: '#06b6d4',
  primaryForeground: '#0f172a',
  border: '#334155',
  isDark: true,
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
  customColors: CustomColors;
  setCustomColors: (colors: CustomColors) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme;
      return savedTheme || 'dark';
    }
    return 'dark';
  });

  const [customColors, setCustomColorsState] = useState<CustomColors>(() => {
    if (typeof window !== 'undefined') {
      const savedColors = localStorage.getItem('theme_custom_colors');
      if (savedColors) {
        try {
          return JSON.parse(savedColors) as CustomColors;
        } catch {
          return DEFAULT_CUSTOM_COLORS;
        }
      }
    }
    return DEFAULT_CUSTOM_COLORS;
  });

  // Appliquer le thème sur l'élément racine
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    
    if (theme === 'custom') {
      const root = document.documentElement;
      root.style.setProperty('--background', customColors.background);
      root.style.setProperty('--foreground', customColors.foreground);
      root.style.setProperty('--card', customColors.card);
      root.style.setProperty('--card-foreground', customColors.cardForeground);
      root.style.setProperty('--popover', customColors.card);
      root.style.setProperty('--popover-foreground', customColors.cardForeground);
      root.style.setProperty('--primary', customColors.primary);
      root.style.setProperty('--primary-foreground', customColors.primaryForeground);
      root.style.setProperty('--accent', customColors.card);
      root.style.setProperty('--accent-foreground', customColors.foreground);
      root.style.setProperty('--border', customColors.border);
      root.style.setProperty('--input', customColors.border);
      root.style.setProperty('--ring', customColors.primary);

      if (customColors.isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } else {
      const root = document.documentElement;
      root.style.removeProperty('--background');
      root.style.removeProperty('--foreground');
      root.style.removeProperty('--card');
      root.style.removeProperty('--card-foreground');
      root.style.removeProperty('--popover');
      root.style.removeProperty('--popover-foreground');
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-foreground');
      root.style.removeProperty('--border');
      root.style.removeProperty('--input');
      root.style.removeProperty('--ring');

      if (theme !== 'light') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme, customColors]);

  // Synchroniser le thème avec la base de données dès que l'utilisateur se connecte
  useEffect(() => {
    if (isAuthenticated && user?.theme) {
      const userTheme = user.theme as Theme;
      // Ne pas écraser si l'utilisateur local a configuré le thème personnalisé
      if (userTheme !== theme && theme !== 'custom') {
        setThemeState(userTheme);
        localStorage.setItem('theme', userTheme);
      }
    }
  }, [isAuthenticated, user]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);

    if (newTheme === 'custom') {
      if (customColors.isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else if (newTheme !== 'light') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Ne pas persister le choix 'custom' dans l'API NestJS
    if (newTheme !== 'custom' && isAuthenticated) {
      try {
        await api.patch('/users/me/preferences', { theme: newTheme });
        if (user) {
          user.theme = newTheme;
        }
      } catch (err) {
        console.error('Erreur lors de la sauvegarde du theme en base de donnees:', err);
      }
    }
  };

  // Référence pour debouncer la sauvegarde localStorage
  const saveTimeoutRef = React.useRef<number | null>(null);

  const setCustomColors = (newColors: CustomColors) => {
    // 1. Mettre à jour l'état local pour un retour immédiat
    setCustomColorsState(newColors);

    // 2. Appliquer les variables CSS immédiatement sans attendre useEffect ou localStorage
    if (theme === 'custom') {
      const root = document.documentElement;
      root.style.setProperty('--background', newColors.background);
      root.style.setProperty('--foreground', newColors.foreground);
      root.style.setProperty('--card', newColors.card);
      root.style.setProperty('--card-foreground', newColors.cardForeground);
      root.style.setProperty('--popover', newColors.card);
      root.style.setProperty('--popover-foreground', newColors.cardForeground);
      root.style.setProperty('--primary', newColors.primary);
      root.style.setProperty('--primary-foreground', newColors.primaryForeground);
      root.style.setProperty('--accent', newColors.card);
      root.style.setProperty('--accent-foreground', newColors.foreground);
      root.style.setProperty('--border', newColors.border);
      root.style.setProperty('--input', newColors.border);
      root.style.setProperty('--ring', newColors.primary);

      if (newColors.isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    // 3. Debouncer la sauvegarde localStorage (très coûteuse en I/O et bloquante pour l'UI)
    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      localStorage.setItem('theme_custom_colors', JSON.stringify(newColors));
      saveTimeoutRef.current = null;
    }, 300);
  };

  // Nettoyer le timeout au démontage
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, customColors, setCustomColors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme doit être utilisé au sein d’un ThemeProvider');
  }
  return context;
};
