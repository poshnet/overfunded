'use client';

import { useCallback, useEffect, useState } from 'react';
import GamePrototype from './game/page';
import { CloserTool } from './close/closer-tool';
import { ToolModeContext, type ToolMode } from './tool-mode';

const PATH_FOR: Record<ToolMode, string> = { reclaim: '/', close: '/close' };

// Kept in step with the metadata each route renders on the server, so a
// client-side swap leaves the tab title matching the address bar.
const TITLE_FOR: Record<ToolMode, string> = {
  reclaim: 'Reclaim Solana Rent — Recover Excess SOL Without Closing Token Accounts',
  close: 'Close Empty Solana Token Accounts & Reclaim Rent | Overfunded',
};

/**
 * Hosts both tools behind one client boundary. Each still has its own route,
 * metadata and canonical for search engines; switching between them uses
 * history.pushState rather than the framework router, which throws inside
 * startTransition on vinext 1.0.0-beta.3.
 */
export function ToolSurface({ initial }: { initial: ToolMode }) {
  const [mode, setMode] = useState<ToolMode>(initial);

  const switchTo = useCallback((next: ToolMode) => {
    if (next === mode) return;
    window.history.pushState({ toolMode: next }, '', PATH_FOR[next]);
    document.title = TITLE_FOR[next];
    window.scrollTo(0, 0);
    setMode(next);
  }, [mode]);

  // Back and forward have to move between the tools the way the toggle does.
  useEffect(() => {
    const onPopState = () => {
      const next: ToolMode = window.location.pathname.startsWith('/close') ? 'close' : 'reclaim';
      document.title = TITLE_FOR[next];
      setMode(next);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return (
    <ToolModeContext.Provider value={switchTo}>
      {mode === 'close' ? <CloserTool /> : <GamePrototype />}
    </ToolModeContext.Provider>
  );
}
