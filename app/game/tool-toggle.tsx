type ToolMode = 'reclaim' | 'close';

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
