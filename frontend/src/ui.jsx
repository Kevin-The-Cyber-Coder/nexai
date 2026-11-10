import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { copy } from './api.js';

/* ------------------------------- icons ------------------------------- */
const P = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  chat: <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.6 8.6 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 1 1 16.1-3.8Z" />,
  sparkles: <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /><circle cx="12" cy="12" r="3.2" /></>,
  bot: <><rect x="4" y="8" width="16" height="12" rx="4" /><path d="M12 4v4M9 14h.01M15 14h.01M9.5 17.5h5" /><path d="M2 13v3M22 13v3" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
  film: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" /></>,
  mic: <><rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" /></>,
  file: <><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" /><path d="M14 2v5h5M9 13h6M9 17h4" /></>,
  code: <><path d="m8 6-6 6 6 6M16 6l6 6-6 6" /></>,
  chart: <><path d="M3 3v18h18" /><path d="M7 15v3M12 10v8M17 6v12" /></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
  briefcase: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2 12h20" /></>,
  megaphone: <><path d="m3 11 18-6v14L3 13Z" /><path d="M11.6 16.8A3 3 0 1 1 6 15.3" /></>,
  headset: <><path d="M3 14v-2a9 9 0 0 1 18 0v2" /><rect x="2" y="14" width="4" height="6" rx="2" /><rect x="18" y="14" width="4" height="6" rx="2" /><path d="M21 19a4 4 0 0 1-4 4h-3" /></>,
  wallet: <><path d="M20 12V8a2 2 0 0 0-2-2H5a2 2 0 0 1 0-4h13v4" /><path d="M3 6v12a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2v-4" /><path d="M16 12h6v4h-6a2 2 0 0 1 0-4Z" /></>,
  pen: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  layout: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></>,
  folder: <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2Z" />,
  store: <><path d="M3 9 5 3h14l2 6" /><path d="M3 9h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" /><path d="M9 21v-6h6v6" /><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" /></>,
  plug: <><path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0Z" /><path d="M12 17v5" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
  card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h2" /></>,
  gauge: <><path d="M3 12a9 9 0 1 1 18 0" /><path d="m12 12 4-4M12 21h.01" /><path d="M3 12h2M19 12h2M12 3v2" /></>,
  key: <><circle cx="7.5" cy="15.5" r="4.5" /><path d="m10.7 12.3 9.3-9.3M15 5l3 3M18 2l4 4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
  star: <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3L7 14.2 2 9.3l6.9-1Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
  stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
  copy: <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>,
  check: <path d="m20 6-11 11-5-5" />,
  trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></>,
  pin: <path d="M12 17v5M9 3h6l-1 7 3 3H7l3-3Z" />,
  archive: <><rect x="2" y="3" width="20" height="5" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  right: <path d="m9 18 6-6-6-6" />,
  left: <path d="m15 18-6-6 6-6" />,
  down: <path d="m6 9 6 6 6-6" />,
  play: <path d="m6 3 14 9-14 9Z" />,
  pause: <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" /></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5M12 3v12" /></>,
  link: <><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></>,
  external: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6M10 14 21 3" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 6 10-6" /></>,
  calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  zap: <path d="M13 2 3 14h8l-1 8 10-12h-8Z" />,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" /></>,
  brain: <><path d="M9.5 2A3.5 3.5 0 0 0 6 5.5v.3A3.5 3.5 0 0 0 4 9a3.5 3.5 0 0 0 1 2.5A3.5 3.5 0 0 0 4 14a3.5 3.5 0 0 0 2 3.2 3.5 3.5 0 0 0 3.5 4.8A3.5 3.5 0 0 0 12 20a3.5 3.5 0 0 0 2.5 2 3.5 3.5 0 0 0 3.5-4.8A3.5 3.5 0 0 0 20 14a3.5 3.5 0 0 0-1-2.5A3.5 3.5 0 0 0 20 9a3.5 3.5 0 0 0-2-3.2v-.3A3.5 3.5 0 0 0 14.5 2 3.5 3.5 0 0 0 12 3.5 3.5 3.5 0 0 0 9.5 2Z" /><path d="M12 3.5v17" /></>,
  filter: <path d="M22 3H2l8 9.5V19l4 2v-8.5Z" />,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
  gift: <><rect x="3" y="8" width="18" height="4" /><path d="M12 8v13M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 1 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 1 1 0 5" /></>,
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  cpu: <><rect x="5" y="5" width="14" height="14" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></>,
  terminal: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m6 9 3 3-3 3M12 15h5" /></>,
  wand: <><path d="m15 4 5 5M13 6l5 5M3 21l9-9M6 3v4M4 5h4M18 17v4M16 19h4" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  alert: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></>,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  arrowUp: <path d="M12 19V5M5 12l7-7 7 7" />,
  arrowUpRight: <path d="M7 17 17 7M7 7h10v10" />,
  maximize: <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />,
  grid: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
  layers: <><path d="m12 2 9 5-9 5-9-5Z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" /></>,
  command: <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3Z" />,
  table: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></>,
  wandSparkle: <><path d="m14 7 3 3M5 6v4M3 8h4M19 14v4M17 16h4M10 2v2M9 3h2M3 21l9-9 3 3-9 9Z" /></>,
  keyboard: <><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6" /></>,
  credit: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h2M10 15h2" /></>,
  headphones: <><path d="M3 14v-2a9 9 0 0 1 18 0v2" /><rect x="2" y="14" width="4" height="6" rx="2" /><rect x="18" y="14" width="4" height="6" rx="2" /></>
};
const aliases = { freeze: 'pause', fire: 'zap', doc: 'file', write: 'pen', research: 'globe', support: 'headset', finance: 'wallet', store: 'store', settings: 'settings' };

export function Icon({ name = 'sparkles', size = 18, className = '', stroke = 1.8, fill = 'none' }) {
  return (
    <svg className={'ic ' + className} width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[aliases[name] || name] || P.sparkles}
    </svg>
  );
}

/* ------------------------------ primitives --------------------------- */
export const cls = (...x) => x.filter(Boolean).join(' ');

export function Btn({ children, variant = 'default', size = 'md', icon, iconRight, className = '', loading, ...props }) {
  return (
    <button className={cls('btn', 'btn-' + variant, 'btn-' + size, className)} disabled={props.disabled || loading} {...props}>
      {loading ? <Spinner size={size === 'sm' ? 13 : 15} /> : icon ? <Icon name={icon} size={size === 'sm' ? 14 : 16} /> : null}
      {children && <span>{children}</span>}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 14 : 16} />}
    </button>
  );
}
export function IconBtn({ name, label, size = 17, className = '', ...props }) {
  return <button className={cls('icon-btn', className)} title={label} aria-label={label} {...props}><Icon name={name} size={size} /></button>;
}
export const Card = ({ children, className = '', ...p }) => <section className={cls('card', className)} {...p}>{children}</section>;
export const Badge = ({ children, tone = 'default', dot, className = '' }) => <span className={cls('badge', 'badge-' + tone, className)}>{dot && <i className="dot" />}{children}</span>;
export const Spinner = ({ size = 16 }) => <span className="spinner" style={{ width: size, height: size }} />;

export function Avatar({ user, name, src, size = 34, color }) {
  const n = name || user?.name || user?.email || 'NexAI';
  const img = src || user?.avatar;
  const initials = n.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
  const hue = (n.charCodeAt(0) * 37 + (n.charCodeAt(1) || 7) * 11) % 360;
  return img
    ? <img className="avatar" src={img} alt={n} style={{ width: size, height: size }} />
    : <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36, background: color || `linear-gradient(135deg,hsl(${hue} 70% 52%),hsl(${(hue + 55) % 360} 72% 46%))` }}>{initials}</span>;
}

export function Progress({ value = 0, tone = 'brand', thin }) {
  return <div className={cls('progress', thin && 'thin')}><i className={'fill ' + tone} style={{ width: Math.max(0, Math.min(100, value)) + '%' }} /></div>;
}
export function Ring({ value = 0, size = 92, stroke = 8, color = 'var(--brand)', track = 'var(--line)', children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (Math.min(100, Math.max(0, value)) / 100) * c} transform={`rotate(-90 ${size / 2} ${size / 2})`} /></svg>
      <div className="ring-in">{children}</div>
    </div>
  );
}

export function Modal({ title, subtitle, children, onClose, width = 560, footer }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true">
        <header className="modal-head">
          <div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
          <IconBtn name="close" label="Close" onClick={onClose} />
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function Drawer({ title, subtitle, children, onClose, width = 480 }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="overlay drawer-overlay" onMouseDown={e => e.target === e.currentTarget && onClose?.()}>
      <aside className="drawer" style={{ width }} role="dialog" aria-modal="true">
        <header className="modal-head"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div><IconBtn name="close" label="Close" onClick={onClose} /></header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}

export function Field({ label, hint, children, className = '' }) {
  return <label className={cls('field', className)}>{label && <span className="field-label">{label}</span>}{children}{hint && <span className="field-hint">{hint}</span>}</label>;
}
export const Input = ({ className = '', ...p }) => <input className={cls('input', className)} {...p} />;
export const Textarea = ({ className = '', ...p }) => <textarea className={cls('input textarea', className)} {...p} />;
export const Select = ({ className = '', children, ...p }) => <select className={cls('input select', className)} {...p}>{children}</select>;
export function Toggle({ checked, onChange, label }) {
  return <button type="button" className={cls('toggle', checked && 'on')} role="switch" aria-checked={!!checked} onClick={() => onChange(!checked)}>{label && <span>{label}</span>}<i /></button>;
}
export function Tabs({ tabs, value, onChange, className = '' }) {
  return <div className={cls('tabs', className)}>{tabs.map(t => {
    const id = typeof t === 'string' ? t : t.id, label = typeof t === 'string' ? t : t.label, count = typeof t === 'object' ? t.count : null;
    return <button key={id} className={cls(value === id && 'on')} onClick={() => onChange(id)}>{label}{count != null && <span className="tab-count">{count}</span>}</button>;
  })}</div>;
}
export const Empty = ({ icon = 'sparkles', title, text, action }) => (
  <div className="empty"><span className="empty-ic"><Icon name={icon} size={26} /></span><h3>{title}</h3>{text && <p>{text}</p>}{action}</div>
);
export const SectionHead = ({ title, text, action, className = '' }) => (
  <div className={cls('section-head', className)}><div><h2>{title}</h2>{text && <p>{text}</p>}</div>{action}</div>
);
export const Stat = ({ label, value, delta, icon, tone = 'brand', sub }) => (
  <Card className="stat">
    <div className="stat-top"><span className={'stat-ic ' + tone}><Icon name={icon} size={17} /></span>{delta != null && <Badge tone={delta >= 0 ? 'green' : 'red'}>{delta >= 0 ? '+' : ''}{delta}%</Badge>}</div>
    <div className="stat-value">{value}</div><div className="stat-label">{label}</div>{sub && <div className="stat-sub">{sub}</div>}
  </Card>
);

/* -------------------------------- toast ------------------------------ */
let toastFn = () => {};
export const toast = (message, tone = 'default') => toastFn(message, tone);
export function Toaster() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    toastFn = (message, tone = 'default') => {
      const id = Math.random();
      setItems(x => [...x, { id, message, tone }]);
      setTimeout(() => setItems(x => x.filter(i => i.id !== id)), 4200);
    };
  }, []);
  return <div className="toasts">{items.map(i => (
    <div key={i.id} className={'toast ' + i.tone}><Icon name={i.tone === 'error' ? 'alert' : i.tone === 'success' ? 'checkCircle' : 'info'} size={17} /><span>{i.message}</span></div>
  ))}</div>;
}

/* ------------------------------- hooks ------------------------------- */
export function useFetch(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const reload = () => {
    setState(s => ({ ...s, loading: true }));
    Promise.resolve(fn()).then(data => setState({ data, loading: false, error: '' })).catch(e => setState({ data: null, loading: false, error: e.message }));
  };
  useEffect(() => { reload(); }, deps);
  return { ...state, reload };
}
export function useDebounced(value, ms = 260) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/* ------------------------------ formatting --------------------------- */
export const fmt = (n, opts = {}) => new Intl.NumberFormat('en-US', { notation: n >= 100000 ? 'compact' : 'standard', maximumFractionDigits: 1, ...opts }).format(Number(n) || 0);
export const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n) || 0);
export function timeAgo(date) {
  if (!date) return '—';
  const s = (Date.now() - new Date(date).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
export const dateFmt = (d, opts) => d ? new Date(d).toLocaleDateString(undefined, opts || { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
export const timeFmt = (d) => d ? new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—';
export const bytes = (n) => !n ? '—' : n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n > 1024 ? (n / 1024).toFixed(0) + ' KB' : n + ' B';

/* ------------------------------- charts ------------------------------ */
export function AreaChart({ data = [], xKey = 'day', yKey = 'credits', height = 160, color = '#818cf8', labels = 4 }) {
  const [hover, setHover] = useState(null);
  const w = 640, h = height, pad = 8;
  const values = data.map(d => Number(d[yKey]) || 0);
  const max = Math.max(1, ...values);
  const points = values.map((v, i) => [pad + (i / Math.max(1, values.length - 1)) * (w - pad * 2), h - pad - (v / max) * (h - pad * 2 - 14)]);
  const path = points.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = path + ` L ${points.at(-1)?.[0] || 0} ${h - pad} L ${pad} ${h - pad} Z`;
  if (!data.length) return <div className="chart-empty" style={{ height }}>No activity yet</div>;
  const ticks = Array.from({ length: labels }, (_, i) => data[Math.round((i / (labels - 1)) * (data.length - 1))]).filter(Boolean);
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" onMouseLeave={() => setHover(null)}>
        <defs><linearGradient id={'ag' + color.replace(/[^a-z0-9]/gi, '')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".34" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        {[0.25, 0.5, 0.75].map(f => <line key={f} x1={pad} x2={w - pad} y1={pad + f * (h - 2 * pad)} y2={pad + f * (h - 2 * pad)} className="grid-line" />)}
        <path d={area} fill={`url(#ag${color.replace(/[^a-z0-9]/gi, '')})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {hover != null && <><line x1={points[hover][0]} x2={points[hover][0]} y1={pad} y2={h - pad} className="hover-line" /><circle cx={points[hover][0]} cy={points[hover][1]} r="4" fill={color} stroke="var(--panel)" strokeWidth="2" /></>}
        {points.map((p, i) => <rect key={i} x={p[0] - (w / Math.max(1, values.length)) / 2} y="0" width={w / Math.max(1, values.length)} height={h} fill="transparent" onMouseEnter={() => setHover(i)} />)}
      </svg>
      {hover != null && <div className="chart-tip" style={{ left: ((points[hover][0] / w) * 100) + '%' }}><strong>{fmt(values[hover])}</strong><span>{new Date(data[hover][xKey]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></div>}
      <div className="chart-x">{ticks.map((t, i) => <span key={i}>{new Date(t[xKey]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>)}</div>
    </div>
  );
}

export function BarChart({ labels = [], values = [], height = 180, color = '#818cf8', horizontal = false }) {
  const max = Math.max(1, ...values.map(Number));
  if (!values.length) return <div className="chart-empty" style={{ height }}>No data</div>;
  if (horizontal) return (
    <div className="hbars">{labels.map((l, i) => (
      <div className="hbar" key={i}><span className="hbar-label" title={l}>{l}</span><div className="hbar-track"><i style={{ width: (Number(values[i]) / max) * 100 + '%', background: color }} /></div><b>{fmt(values[i])}</b></div>
    ))}</div>
  );
  return (
    <div className="vbars" style={{ height }}>
      {labels.map((l, i) => (
        <div className="vbar" key={i} title={`${l}: ${fmt(values[i])}`}>
          <div className="vbar-track"><i style={{ height: Math.max(2, (Number(values[i]) / max) * 100) + '%', background: color }} /></div>
          <span>{l}</span>
        </div>
      ))}
    </div>
  );
}

export function Donut({ segments = [], size = 120, stroke = 13, center, label }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <div className="donut" style={{ width: size, height: size }}>
        <svg width={size} height={size}><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
          {segments.map((s, i) => {
            const len = (s.value / total) * c;
            const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
            offset += len; return el;
          })}</svg>
        <div className="donut-center"><b>{center ?? fmt(total)}</b><span>{label}</span></div>
      </div>
      {segments.length > 0 && <div className="legend">{segments.map((s, i) => <div key={i}><i style={{ background: s.color }} /><span>{s.label}</span><b>{fmt(s.value)}</b></div>)}</div>}
    </div>
  );
}

export function Sparkline({ values = [], color = '#818cf8', width = 90, height = 26 }) {
  const max = Math.max(1, ...values), min = Math.min(...values, 0);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * width},${height - ((v - min) / Math.max(1, max - min)) * height}`).join(' ');
  return <svg width={width} height={height} className="sparkline"><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>;
}

/* ------------------------------ markdown ----------------------------- */
function CodeBlock({ children }) {
  const ref = useRef();
  const [done, setDone] = useState(false);
  const lang = children?.props?.className?.replace('language-', '') || 'code';
  const raw = typeof children?.props?.children === 'string' ? children.props.children : '';
  return (
    <div className="codeblock">
      <div className="codebar"><span>{lang}</span><button onClick={async () => { await copy(ref.current?.innerText || raw); setDone(true); setTimeout(() => setDone(false), 1500); }}>{done ? 'Copied' : 'Copy'}</button></div>
      <pre ref={ref}>{children}</pre>
    </div>
  );
}
export function Markdown({ children, className = '' }) {
  return (
    <div className={cls('md', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>,
        table: ({ children }) => <div className="table-wrap"><table>{children}</table></div>,
        input: (p) => <input {...p} readOnly />
      }}>{children || ''}</ReactMarkdown>
    </div>
  );
}
