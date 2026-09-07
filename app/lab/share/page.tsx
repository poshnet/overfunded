'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SITE_URL } from '../../site-config';

/**
 * Share card workbench. The card is drawn straight onto a canvas rather than
 * screenshotted from the DOM: no dependency, no CSP surprises, and the export is
 * crisp at 2x for retina and for X's image pipeline.
 */
const WIDTH = 1200;
const HEIGHT = 630;
const HOST = SITE_URL.replace(/^https?:\/\//, '');

type Treatment = 'slab' | 'jagged' | 'chrome';

const TREATMENTS: { id: Treatment; name: string; note: string }[] = [
  { id: 'slab', name: 'Slab', note: 'Hard lime shadow, poster-like' },
  { id: 'jagged', name: 'Jagged', note: 'Per-character tilt and rough edge' },
  { id: 'chrome', name: 'Chrome', note: 'Gradient fill with a highlight band' },
];

function drawAmount(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  treatment: Treatment,
) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 148px "Arial Black", Impact, Arial, sans-serif';

  if (treatment === 'slab') {
    ctx.fillStyle = '#1f3d15';
    ctx.fillText(text, x + 9, y + 9);
    ctx.fillStyle = '#aaff3e';
    ctx.fillText(text, x, y);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#071008';
    ctx.strokeText(text, x, y);
  }

  if (treatment === 'jagged') {
    // Each glyph is placed by hand so it can be tilted and nudged off the line.
    const characters = [...text];
    const widths = characters.map(character => ctx.measureText(character).width);
    const total = widths.reduce((sum, width) => sum + width, 0);
    let cursor = x - total / 2;
    characters.forEach((character, index) => {
      const width = widths[index];
      const tilt = ((index % 3) - 1) * 0.045;
      const lift = ((index % 4) - 1.5) * 5;
      ctx.save();
      ctx.translate(cursor + width / 2, y + lift);
      ctx.rotate(tilt);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#16300c';
      ctx.fillText(character, 6, 7);
      ctx.fillStyle = '#c6ff5e';
      ctx.fillText(character, 0, 0);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#071008';
      ctx.strokeText(character, 0, 0);
      ctx.restore();
      cursor += width;
    });
  }

  if (treatment === 'chrome') {
    const gradient = ctx.createLinearGradient(0, y - 80, 0, y + 80);
    gradient.addColorStop(0, '#f4ffe0');
    gradient.addColorStop(0.45, '#aaff3e');
    gradient.addColorStop(0.5, '#6fbf22');
    gradient.addColorStop(1, '#2f5c12');
    ctx.fillStyle = gradient;
    ctx.fillText(text, x, y);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0b1a08';
    ctx.strokeText(text, x, y);
  }

  ctx.restore();
}

function drawCard(canvas: HTMLCanvasElement, amount: string, treatment: Treatment) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const scale = 2;
  canvas.width = WIDTH * scale;
  canvas.height = HEIGHT * scale;
  ctx.scale(scale, scale);

  const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, '#050806');
  background.addColorStop(1, '#0c1a0d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = 'rgba(38,53,40,.9)';
  ctx.lineWidth = 1;
  for (let x = 0; x < WIDTH; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
  }
  for (let y = 0; y < HEIGHT; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
  }

  const glow = ctx.createRadialGradient(WIDTH / 2, 320, 20, WIDTH / 2, 320, 420);
  glow.addColorStop(0, 'rgba(170,255,62,.20)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = '#aaff3e';
  ctx.lineWidth = 6;
  ctx.strokeRect(28, 28, WIDTH - 56, HEIGHT - 56);

  ctx.fillStyle = '#7d9080';
  ctx.font = '700 20px "Geist Mono", ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('RECLAIMED FROM SOLANA RENT', 72, 118);

  ctx.fillStyle = '#f4f7df';
  ctx.font = '900 30px "Arial Black", Arial, sans-serif';
  ctx.fillText('OVERFUNDED', 72, 162);

  drawAmount(ctx, amount, WIDTH / 2, 330, treatment);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#829087';
  ctx.font = '700 22px "Geist Mono", ui-monospace, monospace';
  ctx.fillText('WITHDRAWN WITHOUT CLOSING A SINGLE ACCOUNT', WIDTH / 2, 430);

  ctx.fillStyle = '#aaff3e';
  ctx.font = '900 34px "Geist Mono", ui-monospace, monospace';
  ctx.fillText(HOST, WIDTH / 2, 528);

  ctx.strokeStyle = 'rgba(170,255,62,.45)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(WIDTH / 2 - 210, 552); ctx.lineTo(WIDTH / 2 + 210, 552); ctx.stroke();
}

export default function ShareLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [amount, setAmount] = useState('0.4182');
  const [treatment, setTreatment] = useState<Treatment>('slab');

  useEffect(() => {
    if (canvasRef.current) drawCard(canvasRef.current, `${amount} SOL`, treatment);
  }, [amount, treatment]);

  const download = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `overfunded-${amount}-sol.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [amount]);

  const shareText = `I just reclaimed ${amount} SOL of rent from my Solana accounts — without closing a single one.`;
  const shareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(SITE_URL)}`;

  return (
    <main className="lab">
      <header className="lab-head">
        <div>
          <small>INTERNAL · NOT LINKED</small>
          <h1>Share Card</h1>
          <p>Shown after any claim over 0.1 SOL. Drawn on a canvas, exported at 2x.</p>
        </div>
        <div className="lab-controls">
          <label className="lab-field">
            AMOUNT
            <input value={amount} onChange={event => setAmount(event.target.value)} />
          </label>
          <button type="button" onClick={download}>DOWNLOAD PNG</button>
          <a className="lab-link" href={shareHref} target="_blank" rel="noreferrer">SHARE ON X ↗</a>
        </div>
      </header>

      <div className="share-treatments">
        {TREATMENTS.map(option => (
          <button
            key={option.id}
            type="button"
            className={treatment === option.id ? 'on' : ''}
            onClick={() => setTreatment(option.id)}
          ><b>{option.name}</b><span>{option.note}</span></button>
        ))}
      </div>

      <div className="share-stage">
        <canvas ref={canvasRef} style={{ width: '100%', maxWidth: `${WIDTH}px`, aspectRatio: `${WIDTH} / ${HEIGHT}` }} />
      </div>
    </main>
  );
}
