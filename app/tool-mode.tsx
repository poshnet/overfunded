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

/**
 * True only on a genuine page load. ToolSurface flips it to false the first time
 * a visitor switches tools in place, so the intro claim does not replay every
 * time they flip between the two panels — which read as a glitch rather than a
 * flourish. Defaults to true for routes that render a tool directly.
 */
export const IntroContext = createContext(true);

export function useIntro() {
  return useContext(IntroContext);
}

/**
 * Survives full page loads, which the context cannot: ToolCompare links and the
 * back button are real navigations, so without this the intro replays every
 * time someone moves between the two tools by any route other than the toggle.
 */
export const INTRO_SESSION_KEY = 'overfunded.introPlayed';
