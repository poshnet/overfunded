type ToolMode = 'reclaim' | 'close';

/**
 * Plain anchors, not next/link: vinext 1.0.0-beta.3's client router throws
 * inside startTransition when it intercepts these clicks, which left the
 * panel switch dead. A native navigation cannot fail that way.
 */
export function ToolToggle({ mode }: { mode: ToolMode }) {
  return (
    <div className={`tool-toggle tool-toggle-${mode}`} aria-label="Choose an Overfunded tool">
      <a href="/" aria-current={mode === 'reclaim' ? 'page' : undefined}>
        <i aria-hidden="true" />
        <span><b>KEEP OPEN</b><small>Never deletes tokens</small></span>
      </a>
      <a href="/close-token-accounts" aria-current={mode === 'close' ? 'page' : undefined}>
        <i aria-hidden="true" />
        <span><b>CLOSE EMPTY</b><small>Destructive · address deleted</small></span>
      </a>
    </div>
  );
}
