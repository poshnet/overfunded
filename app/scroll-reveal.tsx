'use client';

import { useEffect } from 'react';

/**
 * Fades each below-the-fold section in as it scrolls into view.
 *
 * One IntersectionObserver for the whole page and every element unobserved the
 * moment it fires, so there is no scroll handler and no per-frame work. The
 * hidden state lives behind html.reveal-ready, which this effect adds, so a
 * visitor with JS blocked sees every section rendered normally instead of a
 * blank page. Heroes are deliberately excluded: they are already on screen at
 * load and would only flash.
 */
const REVEAL_SELECTOR = [
  '.plain-english',
  '.game-reduction',
  '.game-missions',
  '.game-battle',
  '.game-ledger',
  '.game-finale',
  '.rent-lifecycle',
  '.closer-choice',
  '.closer-finale',
].join(',');

export function ScrollReveal() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
    if (!nodes.length) return;

    const root = document.documentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion || !('IntersectionObserver' in window)) return;

    nodes.forEach(node => node.setAttribute('data-reveal', ''));
    root.classList.add('reveal-ready');

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.04 });

    nodes.forEach(node => observer.observe(node));

    return () => {
      observer.disconnect();
      root.classList.remove('reveal-ready');
      nodes.forEach(node => {
        node.removeAttribute('data-reveal');
        node.classList.remove('revealed');
      });
    };
  }, []);

  return null;
}
