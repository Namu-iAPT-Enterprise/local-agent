import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  bgImage: string | null;
  setBgImage: (url: string | null) => void;
  selectedWallpaperId: string | null;
  setSelectedWallpaperId: (id: string | null) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
  bgImage: null,
  setBgImage: () => {},
  selectedWallpaperId: null,
  setSelectedWallpaperId: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [selectedWallpaperId, setSelectedWallpaperId] = useState<string | null>(null);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    document.documentElement.classList.toggle('dark', t === 'dark');
  };

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, bgImage, setBgImage, selectedWallpaperId, setSelectedWallpaperId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
