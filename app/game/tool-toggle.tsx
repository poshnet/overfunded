'use client';

import type { MouseEvent } from 'react';
import { useToolSwitch, type ToolMode } from '../tool-mode';

/**
 * Plain anchors, never next/link: vinext 1.0.0-beta.3's client router throws
 * inside startTransition when it intercepts these clicks, which left the panel
 * switch dead. Where ToolSurface is hosting both tools the click is handled in
 * place instead; everywhere else the anchor navigates normally, so the toggle
 * cannot break and both tools stay linkable and crawlable.
 */
export function ToolToggle({ mode }: { mode: ToolMode }) {
  const switchTo = useToolSwitch();

  function handleSwitch(event: MouseEvent<HTMLAnchorElement>, target: ToolMode) {
    if (!switchTo) return;
    // Leave modified and non-primary clicks to the browser so "open in new
    // tab" keeps working.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    switchTo(target);
  }

  return (
    <div className={`tool-toggle tool-toggle-${mode}`} aria-label="Choose an Overfunded tool">
      <a
        href="/"
        aria-current={mode === 'reclaim' ? 'page' : undefined}
        onClick={event => handleSwitch(event, 'reclaim')}
      >
        <i aria-hidden="true" />
        <span><b>KEEP OPEN</b><small>Never deletes tokens</small></span>
      </a>
      <a
        href="/close"
        aria-current={mode === 'close' ? 'page' : undefined}
        onClick={event => handleSwitch(event, 'close')}
      >
        <i aria-hidden="true" />
        <span><b>CLOSE EMPTY</b><small>Destructive · address deleted</small></span>
      </a>
    </div>
  );
}
