import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, setToken, getToken, copy } from './api.js';
import { Icon, Btn, IconBtn, Avatar, Modal, Progress, Badge, Toaster, toast, fmt, timeAgo, cls, useDebounced, useFetch, Markdown } from './ui.jsx';
import { AppCtx, useRoute, go, openFeature } from './context.js';
import { NAV, PAGE_META, FEATURES, MODULES, PLAN_LABELS } from './nav.js';
import Dashboard from './views/Dashboard.jsx';
import Chat from './views/Chat.jsx';
import Agents from './views/Agents.jsx';
import Research from './views/Research.jsx';
import { ImageStudio, VideoStudio, VoiceStudio } from './views/Studios.jsx';
import Documents from './views/Documents.jsx';
import Developer from './views/Developer.jsx';
import Analytics from './views/Analytics.jsx';
import ModuleWorkspace from './views/ModuleWorkspace.jsx';
import Support from './views/Support.jsx';
import Workspace from './views/Workspace.jsx';
import Account from './views/Account.jsx';
import Admin from './views/Admin.jsx';
import Features from './views/Features.jsx';

/* --------------------------------- auth --------------------------------- */
function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = k => e => setForm({ ...form, [k]: e.target.value });

  const submit = async e => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const d = await api('/auth/' + mode, 'POST', form);
      setToken(d.token); onAuth(d.user);
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const demo = async () => {
    setBusy(true); setErr('');
    try { const d = await api('/auth/demo', 'POST', {}); setToken(d.token); onAuth(d.user); }
    catch (x) { setErr(x.message); setBusy(false); }
  };

  return (
    <main className="auth">
      <section className="auth-art">
        <div className="auth-brand"><span className="logo-mark"><Icon name="sparkles" size={20} /></span> NexAI <Badge tone="violet">370 features</Badge></div>
        <div className="auth-copy">
          <h1>Think smarter.<br />Work faster.<br /><em>Create more.</em></h1>
          <p>One intelligent workspace for chat, agents, research, documents, images, video, code, analytics and the operations behind them.</p>
          <div className="auth-points">
            <div><Icon name="bot" size={16} /><span>No-code agents that actually do the work</span></div>
            <div><Icon name="globe" size={16} /><span>Research with sources, not guesses</span></div>
            <div><Icon name="layers" size={16} /><span>19 modules, one shared memory</span></div>
          </div>
          <div className="auth-stats">
            <div><b>370</b><span>AI features</span></div>
            <div><b>19</b><span>modules</span></div>
            <div><b>8</b><span>model providers</span></div>
          </div>
        </div>
        <div className="auth-quote">
          <p>“We replaced four tools and a weekly reporting ritual. The agent brief is the first thing the team reads now.”</p>
          <span><Avatar name="Maya Chen" size={28} /><b>Maya Chen</b> · Lumen Labs</span>
        </div>
        <div className="auth-orbit a1" /><div className="auth-orbit a2" /><div className="auth-glow" />
      </section>

      <section className="auth-panel">
        <form onSubmit={submit} className="auth-form">
          <div className="auth-tabs">
            <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setErr(''); }}>Sign in</button>
            <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setErr(''); }}>Create account</button>
          </div>
          <div>
            <h2>{mode === 'login' ? 'Welcome back' : 'Start building with NexAI'}</h2>
            <p className="muted">{mode === 'login' ? 'Sign in to your intelligent workspace.' : 'Free plan · 50 AI credits · no card required.'}</p>
          </div>
          <button type="button" className="oauth" onClick={demo} disabled={busy}>
            <span className="demo-spark"><Icon name="play" size={13} /></span>
            <span><b>Explore the demo workspace</b><small>Full Business workspace · pre-loaded data</small></span>
            <Icon name="right" size={16} />
          </button>
          <div className="or"><span>or use your email</span></div>
          {mode === 'register' && <label className="auth-field"><span>Full name</span><input value={form.name} onChange={set('name')} placeholder="Alex Morgan" autoComplete="name" /></label>}
          <label className="auth-field"><span>Email address</span><input type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" autoComplete="email" /></label>
          <label className="auth-field"><span>Password</span><input type="password" value={form.password} onChange={set('password')} placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
          {err && <div className="auth-err"><Icon name="alert" size={15} />{err}</div>}
          <button className="auth-submit" disabled={busy}>{busy ? 'Signing in…' : mode === 'login' ? 'Sign in' : 'Create my account'}</button>
          <button type="button" className="oauth oauth-google" onClick={() => toast('Google sign-in needs GOOGLE_CLIENT_ID in the backend environment. Use the demo workspace for now.', 'info')}>
            <span className="gdot">G</span> Continue with Google
          </button>
          <p className="auth-fine">Demo login: <b>demo@nexai.app</b> · <b>demo1234</b></p>
          <p className="auth-legal">By continuing you agree to the Terms and Privacy Policy.</p>
        </form>
      </section>
    </main>
  );
}

/* ------------------------------ command palette ------------------------ */
function CommandPalette({ onClose }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 220);
  const [remote, setRemote] = useState(null);
  const inputRef = useRef();
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    if (!dq.trim()) { setRemote(null); return; }
    api('/search?q=' + encodeURIComponent(dq)).then(setRemote).catch(() => {});
  }, [dq]);
  const pages = useMemo(() => NAV.flatMap(g => g.items).filter(p => !q || p.label.toLowerCase().includes(q.toLowerCase())), [q]);
  const feats = useMemo(() => !q ? FEATURES.filter(f => [1, 46, 141, 161, 201, 261, 301, 361].includes(f.number)) : FEATURES.filter(f => f.name.toLowerCase().includes(q.toLowerCase()) || f.moduleName.toLowerCase().includes(q.toLowerCase())).slice(0, 7), [q]);

  const run = (fn) => { onClose(); setTimeout(fn, 20); };
  return (
    <div className="overlay palette-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="palette">
        <div className="palette-input">
          <Icon name="search" size={18} />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search pages, 370 features, chats, agents…" />
          <kbd>esc</kbd>
        </div>
        <div className="palette-body">
          {pages.length > 0 && <div className="palette-sec"><span>Jump to</span>{pages.slice(0, q ? 4 : 7).map(p => (
            <button key={p.path} onClick={() => run(() => go(p.path))}><Icon name={p.icon} size={16} /><span>{p.label}</span><Icon name="right" size={14} /></button>
          ))}</div>}
          {feats.length > 0 && <div className="palette-sec"><span>Features</span>{feats.map(f => (
            <button key={f.id} onClick={() => run(() => openFeature(f))}><span className="pal-num">{f.number}</span><span><b>{f.name}</b><small>{f.moduleName}</small></span><Icon name="arrowUpRight" size={14} /></button>
          ))}</div>}
          {remote?.conversations?.length > 0 && <div className="palette-sec"><span>Conversations</span>{remote.conversations.map(c => (
            <button key={c.id} onClick={() => run(() => go('chat', { c: c.id }))}><Icon name="chat" size={16} /><span>{c.title}<small>{timeAgo(c.updatedAt)}</small></span><Icon name="right" size={14} /></button>
          ))}</div>}
          {remote?.agents?.length > 0 && <div className="palette-sec"><span>Agents</span>{remote.agents.map(a => (
            <button key={a.id} onClick={() => run(() => go('agents', { agent: a.id }))}><span className="pal-emoji">{a.emoji}</span><span>{a.name}<small>{a.description}</small></span><Icon name="right" size={14} /></button>
          ))}</div>}
          {!pages.length && !feats.length && !remote?.conversations?.length && !remote?.agents?.length && <div className="palette-empty">No results for “{q}”. Try “research”, “image” or “invoice”.</div>}
        </div>
        <footer className="palette-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span><span className="palette-brand">NexAI command</span></footer>
      </div>
    </div>
  );
}

/* ------------------------------- notifications ------------------------- */
function Notifications({ onClose }) {
  const { data, reload, loading } = useFetch(() => api('/notifications'), []);
  const list = data || [];
  const markAll = async () => { await api('/notifications/read-all', 'POST', {}); reload(); };
  const open = async (n) => { if (!n.read) await api('/notifications/' + n.id, 'PATCH', {}).catch(() => {}); if (n.href) go(n.href.replace(/^\//, '')); onClose(); };
  const iconFor = t => t === 'agent' ? 'bot' : t === 'billing' ? 'card' : t === 'usage' ? 'gauge' : t === 'support' ? 'headset' : t === 'team' ? 'users' : 'sparkles';
  return (
    <div className="overlay drawer-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <aside className="drawer notif-drawer" role="dialog" aria-modal="true">
        <header className="modal-head"><div><h3>Notifications</h3><p>{list.filter(n => !n.read).length} unread</p></div><div className="row"><Btn size="sm" variant="ghost" onClick={markAll}>Mark all read</Btn><IconBtn name="close" label="Close" onClick={onClose} /></div></header>
        <div className="drawer-body">
          {loading && <p className="muted">Loading…</p>}
          {!list.length && <p className="muted">You’re all caught up.</p>}
          {list.map(n => (
            <button key={n.id} className={cls('notif', !n.read && 'unread')} onClick={() => open(n)}>
              <span className={'notif-ic ' + n.type}><Icon name={iconFor(n.type)} size={16} /></span>
              <span className="notif-body"><b>{n.title}</b><span>{n.body}</span><small>{timeAgo(n.at)}</small></span>
              {!n.read && <i className="unread-dot" />}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

/* ---------------------------------- shared ----------------------------- */
function SharedConversation({ id }) {
  const { data, error, loading } = useFetch(() => api('/share/' + id), [id]);
  return (
    <main className="shared-page">
      <header className="shared-top"><button className="auth-brand" onClick={() => go('dashboard')}><span className="logo-mark"><Icon name="sparkles" size={18} /></span> NexAI</button><Btn variant="outline" size="sm" onClick={() => go('dashboard')}>Open workspace</Btn></header>
      {loading && <p className="muted" style={{ padding: 40 }}>Loading shared conversation…</p>}
      {error && <div className="empty" style={{ margin: '80px auto' }}><Icon name="alert" size={28} /><h3>This link is unavailable</h3><p>{error}</p></div>}
      {data && <article className="shared-doc">
        <Badge tone="violet">Shared conversation</Badge>
        <h1>{data.title}</h1>
        <p className="muted">Shared by {data.author} · {dateFmt(data.updatedAt)}</p>
        {data.messages.map((m, i) => <div key={i} className={'shared-msg ' + m.role}><span>{m.role === 'user' ? 'You' : 'NexAI'}</span><Markdown>{m.content}</Markdown></div>)}
        <div className="shared-cta"><p>Want your own AI workspace with 370 features?</p><Btn variant="primary" icon="sparkles" onClick={() => go('dashboard')}>Try NexAI free</Btn></div>
      </article>}
    </main>
  );
}
const dateFmt = d => d ? new Date(d).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '';

/* ----------------------------------- app ------------------------------- */
export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('nexai.theme') || 'dark');
  const [palette, setPalette] = useState(false);
  const [notifs, setNotifs] = useState(false);
  const [menu, setMenu] = useState(false);
  const [models, setModels] = useState([]);
  const route = useRoute();

  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    api('/me').then(u => setUser(u)).catch(() => setToken('')).finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!user) return;
    api('/models').then(d => setModels(d.models)).catch(() => {});
  }, [user?.id]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('nexai.theme', theme);
  }, [theme]);
  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(v => !v); }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'n') { e.preventDefault(); go('chat', { new: Date.now() }); }
      if (e.key === 'Escape') { setPalette(false); setNotifs(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const refreshUser = () => api('/me').then(setUser).catch(() => {});
  const signOut = () => { setToken(''); setUser(null); go('dashboard'); };

  if (!ready) return <div className="boot"><span className="logo-mark big"><Icon name="sparkles" size={28} /></span><div className="boot-name">NexAI</div><div className="boot-bar"><i /></div></div>;

  if (!user) {
    if (route.path === 'share') return <><SharedConversation id={route.segments[1]} /><Toaster /></>;
    return <><Auth onAuth={setUser} /><Toaster /></>;
  }

  const meta = PAGE_META[route.path] || { title: 'NexAI', sub: '' };
  const ctx = { user, setUser, refreshUser, theme, setTheme, models, catalog: MODULES, features: FEATURES, toast };

  const view = () => {
    const p = route.params;
    switch (route.path) {
      case 'dashboard': return <Dashboard user={user} refreshUser={refreshUser} />;
      case 'chat': return <Chat key={p.tool || p.c || p.new || 'chat'} params={p} user={user} refreshUser={refreshUser} models={models} />;
      case 'agents': return <Agents params={p} mode="agents" />;
      case 'automation': return <Agents params={p} mode="automation" />;
      case 'research': return <Research params={p} />;
      case 'image': return <ImageStudio params={p} />;
      case 'video': return <VideoStudio params={p} />;
      case 'voice': return <VoiceStudio params={p} />;
      case 'documents': return <Documents params={p} />;
      case 'developer': return <Developer params={p} />;
      case 'analytics': return <Analytics params={p} />;
      case 'writing':
      case 'education':
      case 'business':
      case 'marketing':
      case 'finance': return <ModuleWorkspace moduleId={route.path} params={p} />;
      case 'support': return <Support />;
      case 'projects':
      case 'files':
      case 'prompts':
      case 'marketplace':
      case 'integrations':
      case 'team': return <Workspace view={route.path} />;
      case 'billing':
      case 'usage':
      case 'keys':
      case 'models':
      case 'settings':
      case 'help': return <Account view={route.path} models={models} />;
      case 'admin': return user.role === 'admin' ? <Admin /> : <NoAccess />;
      case 'features': return <Features />;
      default: return <NoAccess />;
    }
  };

  return (
    <AppCtx.Provider value={ctx}>
      <div className={cls('shell', menu && 'menu-open')}>
        <aside className="sidebar">
          <div className="side-top">
            <button className="brand" onClick={() => go('dashboard')}><span className="logo-mark"><Icon name="sparkles" size={18} /></span><span>NexAI</span><Badge tone="violet">v2</Badge></button>
            <IconBtn name="close" className="side-close" label="Close menu" onClick={() => setMenu(false)} />
            <button className="workspace" onClick={() => go('settings')}>
              <span className="ws-ic">NS</span>
              <span><b>{user.company || 'Personal workspace'}</b><small>{PLAN_LABELS[user.plan]} plan · {user.role === 'admin' ? 'Admin' : 'Member'}</small></span>
              <Icon name="down" size={14} />
            </button>
            <button className="new-chat" onClick={() => { go('chat', { new: Date.now() }); setMenu(false); }}><Icon name="plus" size={17} /> New chat <kbd>⌘⇧N</kbd></button>
          </div>
          <nav className="side-nav">
            {NAV.map(group => (
              <div className="nav-group" key={group.group}>
                <span className="nav-label">{group.group}</span>
                {group.items.map(item => (
                  <button key={item.path} className={cls('nav-item', route.path === item.path && 'on')} onClick={() => { go(item.path); setMenu(false); }}>
                    <Icon name={item.icon} size={17} /><span>{item.label}</span>
                    {item.path === 'agents' && <span className="nav-dot" />}
                    {item.path === 'features' && <em>370</em>}
                  </button>
                ))}
              </div>
            ))}
            {user.role === 'admin' && <div className="nav-group"><span className="nav-label">Admin</span><button className={cls('nav-item', route.path === 'admin' && 'on')} onClick={() => { go('admin'); setMenu(false); }}><Icon name="shield" size={17} /><span>Admin console</span><Badge tone="red">Root</Badge></button></div>}
          </nav>
          <div className="side-bottom">
            <div className="credit-card">
              <div className="credit-top"><span><Icon name="zap" size={14} /> AI credits</span><b>{fmt(user.credits)}</b></div>
              <Progress value={Math.min(100, (user.credits / ({ free: 50, pro: 2500, business: 20000, enterprise: 100000 }[user.plan] || 50)) * 100)} thin />
              <div className="credit-bottom"><span>{PLAN_LABELS[user.plan]} plan</span><button onClick={() => go('billing')}>Upgrade <Icon name="right" size={12} /></button></div>
            </div>
            <div className="side-user">
              <button className="user-btn" onClick={() => go('settings')}><Avatar user={user} size={32} /><span><b>{user.name}</b><small>{user.email}</small></span></button>
              <IconBtn name={theme === 'dark' ? 'sun' : 'moon'} label="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
              <IconBtn name="logout" label="Sign out" onClick={signOut} />
            </div>
          </div>
        </aside>
        {menu && <div className="side-scrim" onClick={() => setMenu(false)} />}
        <div className="main">
          <header className="topbar">
            <div className="top-left">
              <IconBtn name="menu" className="menu-btn" label="Menu" onClick={() => setMenu(true)} />
              <div className="crumb"><span>NexAI</span><Icon name="right" size={13} /><b>{meta.title}</b></div>
            </div>
            <div className="top-right">
              <button className="search-trigger" onClick={() => setPalette(true)}><Icon name="search" size={16} /><span>Search or jump to…</span><kbd>⌘K</kbd></button>
              <Btn size="sm" variant="primary" icon="plus" className="new-btn" onClick={() => go('chat', { new: Date.now() })}>New chat</Btn>
              <IconBtn name="bell" label="Notifications" onClick={() => setNotifs(true)} className="bell-btn" />
              <button className="top-avatar" onClick={() => go('settings')}><Avatar user={user} size={30} /></button>
            </div>
          </header>
          <div className="page" key={route.path + JSON.stringify(route.params)}>
            {view()}
          </div>
        </div>
        {palette && <CommandPalette onClose={() => setPalette(false)} />}
        {notifs && <Notifications onClose={() => setNotifs(false)} />}
        <Toaster />
      </div>
    </AppCtx.Provider>
  );
}

function NoAccess() {
  return <div className="empty" style={{ marginTop: 80 }}><span className="empty-ic"><Icon name="lock" size={26} /></span><h3>Admins only</h3><p>This area is restricted to workspace administrators.</p><Btn variant="outline" onClick={() => go('dashboard')}>Back to dashboard</Btn></div>;
}
