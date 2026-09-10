'use client';

import { createContext, useContext } from 'react';

export type ToolMode = 'reclaim' | 'close';

/**
 * Supplied by ToolSurface. When a switcher is present the tool toggle swaps
 * panels in place instead of navigating, so the two tools read as one app
 * rather than two sites. Null on routes that render a tool directly, where the
 * toggle falls back to ordinary links.
 */
export const ToolModeContext = createContext<((mode: ToolMode) => void) | null>(null);

export function useToolSwitch() {
  return useContext(ToolModeContext);
}


