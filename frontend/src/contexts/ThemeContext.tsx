import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { lightTheme, darkTheme, type Theme } from '../styles/theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('theme-mode');
    return (stored as ThemeMode) || 'system';
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Persist mode to localStorage
  useEffect(() => {
    localStorage.setItem('theme-mode', mode);
  }, [mode]);

  // Determine if dark mode is active
  const isDark = mode === 'dark' || (mode === 'system' && systemPrefersDark);
  const theme = isDark ? darkTheme : lightTheme;

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    // Set CSS custom properties for theme
    root.style.setProperty('--bg-primary', theme.bg.primary);
    root.style.setProperty('--bg-secondary', theme.bg.secondary);
    root.style.setProperty('--bg-tertiary', theme.bg.tertiary);
    root.style.setProperty('--bg-elevated', theme.bg.elevated);
    root.style.setProperty('--bg-hover', theme.bg.hover);
    root.style.setProperty('--bg-active', theme.bg.active);
    root.style.setProperty('--bg-overlay', theme.bg.overlay);
    root.style.setProperty('--bg-glass', theme.bg.glass);

    root.style.setProperty('--text-primary', theme.text.primary);
    root.style.setProperty('--text-secondary', theme.text.secondary);
    root.style.setProperty('--text-tertiary', theme.text.tertiary);
    root.style.setProperty('--text-inverse', theme.text.inverse);
    root.style.setProperty('--text-link', theme.text.link);

    root.style.setProperty('--border-primary', theme.border.primary);
    root.style.setProperty('--border-secondary', theme.border.secondary);
    root.style.setProperty('--border-focus', theme.border.focus);
    root.style.setProperty('--border-hover', theme.border.hover);

    root.style.setProperty('--shadow-xs', theme.shadow.xs);
    root.style.setProperty('--shadow-sm', theme.shadow.sm);
    root.style.setProperty('--shadow-md', theme.shadow.md);
    root.style.setProperty('--shadow-lg', theme.shadow.lg);
    root.style.setProperty('--shadow-xl', theme.shadow.xl);
    root.style.setProperty('--shadow-glass', theme.shadow.glass);
    root.style.setProperty('--shadow-glow', theme.shadow.glow);

    root.style.setProperty('--gradient-primary', theme.gradient.primary);
    root.style.setProperty('--gradient-subtle', theme.gradient.subtle);
    root.style.setProperty('--gradient-hero', theme.gradient.hero);
    root.style.setProperty('--gradient-card', theme.gradient.card);
    root.style.setProperty('--gradient-sidebar', theme.gradient.sidebar);

    // Add/remove dark class for CSS-based styling
    root.classList.toggle('dark', isDark);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme.bg.primary);
    }
  }, [theme, isDark]);

  const toggleTheme = () => {
    setMode(current => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'light';
      return isDark ? 'light' : 'dark';
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
