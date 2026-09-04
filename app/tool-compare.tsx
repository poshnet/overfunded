import { BrandMark } from './brand-mark';

type Tool = 'reclaim' | 'close';

const CARDS = {
  close: {
    href: '/close-token-accounts',
    className: 'battle-card enemy',
    owner: 'ACCOUNT CLOSER',
    move: 'DESTRUCTIVE MOVE',
    title: 'CLOSE ACCOUNT',
    points: ['Account is deleted', 'Address stops working', 'Empty balance required'],
    idle: 'USE ON DEAD ACCOUNTS',
  },
  reclaim: {
    href: '/',
    className: 'battle-card hero',
    owner: 'OVERFUNDED',
    move: 'SAFE MOVE',
    title: 'WITHDRAW EXCESS',
    points: ['Account stays open', 'Address stays usable', 'Tokens stay untouched'],
    idle: 'USE ON LIVE ACCOUNTS',
  },
} as const;

function Card({ tool, current }: { tool: Tool; current: Tool }) {
  const card = CARDS[tool];
  const here = tool === current;
  const body = (
    <>
      <div className="battle-name"><span>{card.owner}</span><b>{card.move}</b></div>
      <i className="battle-icon">{tool === 'reclaim' ? <BrandMark /> : '×'}</i>
      <strong>{card.title}</strong>
      <ul>{card.points.map(point => <li key={point}>{point}</li>)}</ul>
      <em>{here ? 'YOU ARE HERE' : `${card.idle} →`}</em>
    </>
  );
  return here
    ? <article className={`${card.className} is-here`} aria-current="page">{body}</article>
    : <a className={card.className} href={card.href}>{body}</a>;
}

/**
 * The same head-to-head on both tools. Whichever page you are on marks itself
 * "you are here"; the other card is the way across.
 */
export function ToolCompare({ current }: { current: Tool }) {
  return (
    <div className="battle-arena">
      <Card tool="close" current={current} />
      <div className="battle-vs">VS</div>
      <Card tool="reclaim" current={current} />
    </div>
  );
}
