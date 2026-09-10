'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SITE_URL } from './site-config';

const WIDTH = 1200;
const HEIGHT = 630;
const HOST = SITE_URL.replace(/^https?:\/\//, '');

export type ClaimTone = 'reclaim' | 'close';

type Props = {
  amountSol: string;
  accounts: number;
  signatures: string[];
  tone: ClaimTone;
  onClose: () => void;
};

const THEME = {
  reclaim: { accent: '#aaff3e', deep: '#1f3d15', ink: '#071008', lead: 'RENT RECLAIMED' },
  close: { accent: '#e28d69', deep: '#5a2a1b', ink: '#1d0e08', lead: 'ACCOUNTS CLOSED' },
} as const;

/**
 * Drawn on a canvas rather than screenshotted from the DOM so the export is
 * crisp at 2x and needs no dependency. Shown after every successful claim: the
 * transaction confirming in a wallet popup is easy to miss, and people were left
 * unsure whether anything had actually happened.
 */
function draw(canvas: HTMLCanvasElement, amount: string, accounts: number, tone: ClaimTone) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const theme = THEME[tone];
  const scale = 2;
  canvas.width = WIDTH * scale;
  canvas.height = HEIGHT * scale;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, '#050806');
  background.addColorStop(1, tone === 'close' ? '#1a0c07' : '#0c1a0d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = 'rgba(255,255,255,.045)';
  ctx.lineWidth = 1;
  for (let x = 0; x < WIDTH; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke(); }
  for (let y = 0; y < HEIGHT; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke(); }

  const glow = ctx.createRadialGradient(WIDTH / 2, 300, 10, WIDTH / 2, 300, 400);
  glow.addColorStop(0, tone === 'close' ? 'rgba(226,141,105,.20)' : 'rgba(170,255,62,.20)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 5;
  ctx.strokeRect(26, 26, WIDTH - 52, HEIGHT - 52);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#8b9c8e';
  ctx.font = '700 20px ui-monospace, Menlo, monospace';
  ctx.fillText(theme.lead, WIDTH / 2, 150);

  ctx.font = '900 128px "Arial Black", Impact, Arial, sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = theme.deep;
  ctx.fillText(`${amount} SOL`, WIDTH / 2 + 7, 307);
  ctx.fillStyle = theme.accent;
  ctx.fillText(`${amount} SOL`, WIDTH / 2, 300);

  ctx.fillStyle = '#f4f7df';
  ctx.font = '700 22px ui-monospace, Menlo, monospace';
  ctx.fillText(
    tone === 'close'
      ? `${accounts} empty token account${accounts === 1 ? '' : 's'} closed`
      : `withdrawn from ${accounts} account${accounts === 1 ? '' : 's'} — none closed`,
    WIDTH / 2, 372,
  );

  ctx.fillStyle = '#8b9c8e';
  ctx.font = '400 19px ui-monospace, Menlo, monospace';
  ctx.fillText('refundable deposits, not an airdrop', WIDTH / 2, 414);

  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(200, 476); ctx.lineTo(WIDTH - 200, 476); ctx.stroke();

  ctx.fillStyle = '#f4f7df';
  ctx.font = '900 38px "Arial Black", Arial, sans-serif';
  ctx.fillText(HOST, WIDTH / 2, 543);
}

export function ClaimCard({ amountSol, accounts, signatures, tone, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (canvasRef.current) draw(canvasRef.current, amountSol, accounts, tone);
  }, [amountSol, accounts, tone]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const download = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `overfunded-${amountSol}-sol.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setSaved(true);
  }, [amountSol]);

  const shareText = tone === 'close'
    ? `Just closed ${accounts} empty Solana token account${accounts === 1 ? '' : 's'} and got ${amountSol} SOL of rent back.`
    : `Just reclaimed ${amountSol} SOL of rent from my Solana accounts — without closing a single one.`;
  const shareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(SITE_URL)}`;

  return (
    <div className="claim-overlay" role="dialog" aria-modal="true" aria-label="Claim confirmed" onClick={onClose}>
      <div className={`claim-card claim-${tone}`} onClick={event => event.stopPropagation()}>
        <button className="claim-close" type="button" onClick={onClose} aria-label="Close">×</button>
        <canvas ref={canvasRef} style={{ width: '100%', aspectRatio: `${WIDTH} / ${HEIGHT}` }} />
        <div className="claim-actions">
          <button type="button" onClick={download}>{saved ? 'SAVED ✓' : 'SAVE IMAGE'}</button>
          <a href={shareHref} target="_blank" rel="noreferrer">SHARE ON X ↗</a>
        </div>
        {signatures.length > 0 && (
          <div className="claim-signatures">
            {signatures.map((signature, index) => (
              <a key={signature} href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer">
                Verify transaction {index + 1} ↗
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
