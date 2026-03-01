'use client';

import { createContext, useContext, useState } from 'react';

type View = 'HOME' | 'MONITOR' | 'PROFILE';

type AppViewContextType = {
  view: View;
  setView: (v: View) => void;
};

const AppViewContext = createContext<AppViewContextType | null>(null);

export function AppViewProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<View>('HOME');

  return (
    <AppViewContext.Provider value={{ view, setView }}>
      {children}
    </AppViewContext.Provider>
  );
}

export function useAppView() {
  const ctx = useContext(AppViewContext);
  if (!ctx) throw new Error('useAppView must be used inside AppViewProvider');
  return ctx;
}