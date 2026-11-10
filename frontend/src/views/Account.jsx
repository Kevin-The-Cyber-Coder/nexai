import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, copy, download } from '../api.js';
import { useApp, go } from '../context.js';
import { Icon, Btn, IconBtn, Card, Badge, Avatar, Empty, Modal, Progress, Ring, Toggle, Field, Input, Textarea, Select, useFetch, fmt, money, timeAgo, dateFmt, cls, toast, Spinner, AreaChart, BarChart, Donut, Sparkline } from '../ui.jsx';
import { MODULES, PLAN_LABELS } from '../nav.js';

const META = {
  billing: { icon: 'card', badge: 'Account', title: 'Subscription & Billing', lead: 'Your plan, payment method, invoices and everything that renews.' },
  usage: { icon: 'gauge', badge: 'Account', title: 'Usage & Credits', lead: 'Every credit, request and module — measured, not guessed.' },
  keys: { icon: 'key', badge: 'Developer', title: 'API Keys', lead: 'Build on the NexAI API with scoped keys and generous limits.' },
  models: { icon: 'cpu', badge: 'Platform', title: 'AI Models', lead: 'Eight models, one interface. Route each task to the right brain.' },
  settings: { icon: 'settings', badge: 'Account', title: 'Settings', lead: 'Profile, preferences, security and the prompts that shape every answer.' },
  help: { icon: 'help', badge: 'Support', title: 'Help & Support', lead: 'Short answers to real questions, plus a route to a human.' }
};

export default function Account({ view = 'billing', models = [] }) {
  const meta = META[view] || META.billing;
  return (
    <div className="account-page">
      <header className="page-head surface-head">
        <div><Badge tone="violet" dot>{meta.badge}</Badge><h2>{meta.title}</h2><p>{meta.lead}</p></div>
        <div className="page-head-art"><span className="stat-ic violet"><Icon name={meta.icon} size={22} /></span></div>
      </header>
      {view === 'billing' && <Billing />}
      {view === 'usage' && <Usage />}
      {view === 'keys' && <Keys />}
      {view === 'models' && <Models models={models} />}
      {view === 'settings' && <Settings />}
      {view === 'help' && <Help />}
    </div>
  );
}

/* -------------------------------- billing -------------------------------- */
function Billing() {
  const { refreshUser } = useApp();
  const { data, loading, reload } = useFetch(() => api('/billing'));
  const [busy, setBusy] = useState('');
  const [coupon, setCoupon] = useState('');
  const [confirm, setConfirm] = useState(null);

  const change = async (plan) => {
    setBusy(plan);
    try {
      const d = await api('/billing/plan', 'POST', { plan });
      refreshUser?.(); reload();
      toast(`You’re on ${d.plan.name}. ${fmt(d.plan.credits)} credits added.`, 'success');
      setConfirm(null);
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(''); }
  };

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setBusy('coupon');
    try { const d = await api('/billing/coupon', 'POST', { code: coupon }); toast(d.message || 'Coupon applied', 'success'); setCoupon(''); }
    catch (e) { toast(e.message, 'error'); }
    finally { setBusy(''); }
  };

  if (loading && !data) return <div className="row" style={{ padding: 40 }}><Spinner size={22} /></div>;
  if (!data) return <Empty icon="alert" title="Billing unavailable" text="Could not load your billing details." action={<Btn onClick={reload}>Retry</Btn>} />;

  const { plan, plans, invoices, upcoming, payment, seats, usage } = data;

  return (
    <>
      <div className="billing-top">
        <Card className="current-plan">
          <div className="card-head"><div><Badge tone="violet" dot>Current plan</Badge><h2>{plan.name}</h2><p>{plan.blurb}</p></div><span className="plan-price">{money(plan.price)}<small>/mo</small></span></div>
          <div className="plan-credits"><div className="row between"><span>AI credits</span><b>{fmt(plan.creditsRemaining)} of {fmt(plan.credits)}</b></div><Progress value={100 - plan.percent} /><p className="muted small">{plan.percent}% of this month’s credits used · resets on renewal</p></div>
          <div className="plan-facts"><div><span>Seats</span><b>{seats.used} of {seats.total}</b></div><div><span>Next invoice</span><b>{money(upcoming.amount)}</b></div><div><span>Renews</span><b>{dateFmt(upcoming.date)}</b></div><div><span>Requests (30d)</span><b>{fmt(usage.requests)}</b></div></div>
          <div className="row"><Btn variant="primary" icon="arrowUpRight" onClick={() => setConfirm(plans.find(p => p.id !== plan.id && p.price > plan.price) || plans.find(p => p.id !== plan.id))}>Change plan</Btn><Btn variant="outline" icon="download" onClick={() => download('nexai-invoices.csv', ['id,date,plan,amount,status', ...invoices.map(i => `${i.id},${i.date.slice(0, 10)},${i.plan},${i.amount},${i.status}`)].join('\n'))}>Export invoices</Btn></div>
        </Card>
        <div className="billing-side">
          <Card>
            <div className="card-head"><div><h3>Payment method</h3><p>Used for automatic renewal</p></div><Badge tone="green">Verified</Badge></div>
            <div className="payment-card"><span className="payment-brand">VISA</span><div><b>•••• •••• •••• {payment.last4}</b><span>{payment.brand} · expires {payment.expiry}</span></div></div>
            <Btn variant="outline" icon="card" className="w-full" onClick={() => toast('Card management is simulated in demo mode.', 'info')}>Update card</Btn>
          </Card>
          <Card>
            <div className="card-head"><div><h3>Have a coupon?</h3><p>Try NEXAI20 in demo mode</p></div></div>
            <div className="coupon-row"><Input value={coupon} onChange={e => setCoupon(e.target.value)} placeholder="Coupon code" onKeyDown={e => e.key === 'Enter' && applyCoupon()} /><Btn variant="primary" loading={busy === 'coupon'} onClick={applyCoupon}>Apply</Btn></div>
          </Card>
        </div>
      </div>

      <section>
        <div className="section-head"><div><h3>Plans</h3><p>Switch instantly. Credit balances reset to the new plan allowance.</p></div><Badge tone="default">No contract</Badge></div>
        <div className="plan-grid">
          {plans.map(p => (
            <Card key={p.id} className={cls('plan-card', p.current && 'on')}>
              {p.current && <Badge tone="violet" className="plan-current-badge">Current</Badge>}
              <div className="plan-head"><h3>{p.name}</h3><div className="plan-price">{money(p.price)}<small>/mo</small></div><p>{p.blurb}</p></div>
              <div className="plan-credits-line"><Icon name="zap" size={14} /><b>{fmt(p.credits)}</b> credits / month</div>
              <ul className="plan-features">{p.features.map(f => <li key={f}><Icon name="check" size={14} /> {f}</li>)}</ul>
              <Btn variant={p.current ? 'outline' : p.price > plan.price ? 'primary' : 'default'} className="w-full" disabled={p.current} loading={busy === p.id} onClick={() => setConfirm(p)}>{p.current ? 'Current plan' : p.price > plan.price ? 'Upgrade' : 'Downgrade'}</Btn>
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <div className="card-head"><div><h3>Invoice history</h3><p>{invoices.length} invoices · all paid</p></div><Badge tone="green" dot>Up to date</Badge></div>
        {invoices.length === 0 ? <p className="muted">No invoices yet. Your first invoice appears after the trial converts.</p> : (
          <div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Date</th><th>Plan</th><th>Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>{invoices.map(i => <tr key={i.id}><td className="mono">{i.id}</td><td>{dateFmt(i.date)}</td><td className="capitalize">{i.plan}</td><td>{money(i.amount)}</td><td><Badge tone="green">{i.status}</Badge></td><td><IconBtn name="download" size={15} label="Download" onClick={() => download(i.id + '.txt', `NexAI invoice ${i.id}\nDate: ${i.date}\nPlan: ${i.plan}\nAmount: ${money(i.amount)}\nStatus: ${i.status}`)} /></td></tr>)}</tbody>
          </table></div>
        )}
      </Card>

      {confirm && (
        <Modal title={`Switch to ${confirm.name}?`} subtitle={`${money(confirm.price)}/month · ${fmt(confirm.credits)} credits`} onClose={() => setConfirm(null)}
          footer={<><Btn variant="ghost" onClick={() => setConfirm(null)}>Cancel</Btn><Btn variant="primary" loading={busy === confirm.id} onClick={() => change(confirm.id)}>Confirm plan</Btn></>}>
          <p className="muted">Your credit balance will reset to the {confirm.name} allowance immediately. This is a demo checkout — no card is charged.</p>
          <div className="detail-note"><Icon name="info" size={14} /><span>In production this would open a Stripe checkout session. Here the plan changes instantly so you can test every tier.</span></div>
        </Modal>
      )}
    </>
  );
}

/* --------------------------------- usage --------------------------------- */
function Usage() {
  const { user } = useApp();
  const [days, setDays] = useState(30);
  const { data, loading } = useFetch(() => api('/usage?days=' + days), [days]);

  if (loading && !data) return <div className="row" style={{ padding: 40 }}><Spinner size={22} /></div>;
  if (!data) return <Empty icon="gauge" title="Usage unavailable" text="Could not load your usage data." />;

  const totals = data.totals || {};
  const series = data.series || [];
  const modules = data.byModule || [];
  const topTools = data.topTools || [];
  const maxModule = Math.max(1, ...modules.map(m => m.credits));

  return (
    <>
      <div className="usage-top">
        <Card className="usage-hero">
          <div><Badge tone="violet" dot>Last {days} days</Badge><h3>{fmt(totals.credits)} credits used</h3><p>{fmt(totals.requests)} requests · {fmt(totals.tokens || totals.requests * 720)} tokens processed</p></div>
          <div className="usage-ring"><Ring value={data.percent} size={110} stroke={9}><b>{data.percent}%</b><span>of plan</span></Ring></div>
          <div className="usage-facts"><div><span>Remaining</span><b>{fmt(data.credits)}</b></div><div><span>Plan</span><b>{data.plan.name}</b></div><div><span>Allowance</span><b>{fmt(data.plan.credits)}</b></div></div>
        </Card>
        <Card className="usage-side">
          <div className="card-head"><div><h3>Window</h3><p>Compare recent usage</p></div></div>
          <div className="seg col">{[[7, 'Last 7 days'], [30, 'Last 30 days'], [90, 'Last 90 days']].map(([d, l]) => <button key={d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>{l}</button>)}</div>
          <div className="detail-note"><Icon name="info" size={14} /><span>Usage is recorded per request. Failed requests and demo fallbacks are still counted.</span></div>
        </Card>
      </div>

      <Card>
        <div className="card-head"><div><h3>Credits over time</h3><p>Daily credit consumption</p></div><Badge tone="violet">{fmt(totals.credits)} total</Badge></div>
        <AreaChart data={series} xKey="day" yKey="credits" height={230} />
      </Card>

      <div className="usage-grid">
        <Card>
          <div className="card-head"><div><h3>By module</h3><p>Where the credits went</p></div></div>
          {modules.length === 0 ? <p className="muted">No usage recorded in this window.</p> : (
            <div className="module-usage-list">
              {modules.map(m => (
                <div key={m.moduleId} className="module-usage-row">
                  <span className="module-usage-name"><span className="avatar-ic"><Icon name={MODULES.find(x => x.id === m.moduleId)?.icon || 'layers'} size={13} /></span>{MODULES.find(x => x.id === m.moduleId)?.name || m.moduleId}</span>
                  <div className="module-usage-bar"><i style={{ width: Math.round((m.credits / maxModule) * 100) + '%' }} /></div>
                  <b>{fmt(m.credits)}</b><span>{m.requests} req</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <div className="card-head"><div><h3>Module mix</h3><p>Share of total credits</p></div></div>
          <div className="donut-wrap">
            <Donut segments={modules.slice(0, 6).map((m, i) => ({ value: m.credits, color: ['#818cf8', '#22d3ee', '#f472b6', '#34d399', '#f59e0b', '#a78bfa'][i] }))} center={fmt(totals.credits)} label="credits" />
            <div className="donut-legend">{modules.slice(0, 6).map((m, i) => <div key={m.moduleId}><span className="col-dot" style={{ background: ['#818cf8', '#22d3ee', '#f472b6', '#34d399', '#f59e0b', '#a78bfa'][i] }} /><span>{MODULES.find(x => x.id === m.moduleId)?.name || m.moduleId}</span><b>{Math.round((m.credits / Math.max(1, totals.credits)) * 100)}%</b></div>)}</div>
          </div>
        </Card>
      </div>

      <div className="usage-grid">
        <Card>
          <div className="card-head"><div><h3>Top tools</h3><p>The features you lean on</p></div></div>
          {topTools.length === 0 ? <p className="muted">No tool usage yet - try a module workspace.</p> : <div className="top-tool-list">{topTools.map((t, i) => { const toolId = t.toolId || t[0] || ''; const count = t.count ?? t[1] ?? 0; return <div key={toolId || i} className="top-tool"><span className="tool-rank">{String(i + 1).padStart(2, '0')}</span><span><b>{t.name || toolId.replace(/-/g, ' ').replace(/^(\w+) /, '')}</b><small>{toolId.split('-')[0]} module</small></span><Badge tone="default">{count} runs</Badge></div>; })}</div>}
        </Card>
        <Card className="usage-note-card">
          <Icon name="sparkles" size={20} />
          <div><h3>Get more from every credit</h3><p>Shorter prompts, tighter context and the right model cut spend without hurting quality. NexAI Fast costs a fraction of Reason for routine work.</p></div>
          <div className="row"><Btn size="sm" variant="outline" icon="cpu" onClick={() => go('models')}>Compare models</Btn><Btn size="sm" variant="ghost" icon="card" onClick={() => go('billing')}>Manage plan</Btn></div>
        </Card>
      </div>
    </>
  );
}

/* ---------------------------------- keys ---------------------------------- */
function Keys() {
  const { data, loading, reload } = useFetch(() => api('/keys'));
  const [keys, setKeys] = useState([]);
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState(null);

  useEffect(() => { if (data) setKeys(data); }, [data]);

  const create = async (form) => {
    try {
      const k = await api('/keys', 'POST', form);
      setCreated(k); setOpen(false); reload();
    } catch (e) { toast(e.message, 'error'); }
  };

  const remove = async (k) => {
    if (!window.confirm(`Revoke “${k.name}”? Apps using it will stop working.`)) return;
    try { await api('/keys/' + k.id, 'DELETE'); setKeys(x => x.filter(i => i.id !== k.id)); toast('Key revoked', 'success'); }
    catch (e) { toast(e.message, 'error'); }
  };

  const env = `NEXAI_API_KEY=${created?.key || 'nx_live_your_key'}`;

  return (
    <>
      <div className="keys-top">
        <Card className="keys-intro">
          <div><Badge tone="green" dot>Public API v1</Badge><h3>One endpoint. Every model.</h3><p>Use your workspace credits from any app, script or backend. Keys are hashed at rest and shown only once.</p></div>
          <div className="keys-endpoint"><Badge tone="green">POST</Badge><code>/api/v1/chat</code><IconBtn name="copy" size={14} label="Copy endpoint" onClick={async () => { await copy('/api/v1/chat'); toast('Endpoint copied', 'success'); }} /></div>
        </Card>
        <Card className="keys-facts-card"><div className="keys-facts"><div><span>Models</span><b>8</b></div><div><span>Rate limit</span><b>400/min</b></div><div><span>Auth</span><b>Bearer</b></div><div><span>Format</span><b>JSON</b></div></div></Card>
      </div>

      <div className="ws-toolbar">
        <div><h3 className="section-title">{keys.length} active key{keys.length === 1 ? '' : 's'}</h3><p className="muted small">Anyone with a key can spend your credits. Rotate regularly.</p></div>
        <div className="row"><Btn variant="outline" icon="book" onClick={() => go('developer')}>API playground</Btn><Btn variant="primary" icon="plus" onClick={() => setOpen(true)}>Create key</Btn></div>
      </div>

      {loading && !keys.length ? <div className="row" style={{ padding: 40 }}><Spinner size={22} /></div> : keys.length === 0 ? (
        <Empty icon="key" title="No API keys yet" text="Create a scoped key to call the NexAI API from your own app." action={<Btn variant="primary" icon="plus" onClick={() => setOpen(true)}>Create your first key</Btn>} />
      ) : (
        <Card className="table-card"><div className="table-wrap"><table>
          <thead><tr><th>Name</th><th>Key</th><th>Scopes</th><th>Last used</th><th>Created</th><th></th></tr></thead>
          <tbody>{keys.map(k => <tr key={k.id}><td><b>{k.name}</b></td><td className="mono">{k.prefix}••••{k.lastFour}</td><td>{(k.scopes || ['chat']).map(s => <Badge key={s} tone="default">{s}</Badge>)}</td><td className="muted">{k.lastUsed ? timeAgo(k.lastUsed) : 'Never'}</td><td className="muted">{timeAgo(k.createdAt)}</td><td><IconBtn name="trash" size={15} label="Revoke" onClick={() => remove(k)} /></td></tr>)}</tbody>
        </table></div></Card>
      )}

      <Card>
        <div className="card-head"><div><h3>Quick start</h3><p>Two minutes from key to first response</p></div><Btn size="sm" variant="ghost" icon="copy" onClick={async () => { await copy(env); toast('Copied to clipboard', 'success'); }}>Copy env</Btn></div>
        <div className="codeblock static"><div className="codebar"><span>shell</span></div><pre>{`# 1. Store your key\n${env}\n\n# 2. Make a request\ncurl http://localhost:5000/api/v1/chat \\\n  -H "Authorization: Bearer $NEXAI_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model":"nexai-core","message":"Summarise our Q4 strategy"}'`}</pre></div>
        <div className="detail-note"><Icon name="shield" size={14} /><span>In production the base URL is <b>https://api.nexai.app</b>. Locally, the backend runs on <b>http://localhost:5000</b>.</span></div>
      </Card>

      {open && <KeyModal onClose={() => setOpen(false)} onSubmit={create} />}
      {created && (
        <Modal title="Your new API key" subtitle="Copy it now — for security it will never be shown again." onClose={() => setCreated(null)}
          footer={<><Btn variant="ghost" onClick={() => setCreated(null)}>Done</Btn><Btn variant="primary" icon="copy" onClick={async () => { await copy(created.key); toast('Key copied', 'success'); }}>Copy key</Btn></>}>
          <div className="key-reveal"><code>{created.key}</code><IconBtn name="copy" label="Copy" onClick={async () => { await copy(created.key); toast('Key copied', 'success'); }} /></div>
          <div className="detail-note"><Icon name="alert" size={14} /><span>Store this in a secret manager or environment variable. Never commit it to a repository.</span></div>
        </Modal>
      )}
    </>
  );
}

function KeyModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '', scopes: ['chat'] });
  const toggleScope = (s) => setForm(f => ({ ...f, scopes: f.scopes.includes(s) ? f.scopes.filter(x => x !== s) : [...f.scopes, s] }));
  return (
    <Modal title="Create an API key" subtitle="Scope the key to only what your app needs." onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon="key" disabled={!form.name.trim() || !form.scopes.length} onClick={() => onSubmit(form)}>Create key</Btn></>}>
      <Field label="Key name"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Production server" autoFocus /></Field>
      <Field label="Scopes"><div className="scope-grid">{['chat', 'models', 'agents', 'analytics', 'documents'].map(s => <button key={s} className={cls('scope-chip', form.scopes.includes(s) && 'on')} onClick={() => toggleScope(s)}><Icon name={form.scopes.includes(s) ? 'checkCircle' : 'circle'} size={14} /> {s}</button>)}</div></Field>
      <div className="detail-note"><Icon name="info" size={14} /><span>Keys use the <code>nx_live_</code> prefix. You can revoke a key at any time with no downtime to other keys.</span></div>
    </Modal>
  );
}

/* --------------------------------- models --------------------------------- */
function Models({ models = [] }) {
  const { user } = useApp();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const abilities = useMemo(() => ['all', ...Array.from(new Set(models.flatMap(m => m.abilities || []))).slice(0, 8)], [models]);
  const visible = models.filter(m => (filter === 'all' || (m.abilities || []).includes(filter)) && (!query || (m.name + ' ' + m.provider + ' ' + m.description).toLowerCase().includes(query.toLowerCase())));

  return (
    <>
      <div className="models-hero">
        <div><Badge tone="violet" dot>Model router</Badge><h3>Right model. Right cost. Every time.</h3><p>NexAI routes each request automatically, or pin a model per task. Add provider keys to unlock live inference; otherwise the demo engine answers in-character.</p></div>
        <div className="models-hero-stats"><div><b>{models.length}</b><span>models</span></div><div><b>{new Set(models.map(m => m.provider)).size}</b><span>providers</span></div><div><b>3</b><span>tiers</span></div></div>
      </div>

      <div className="ws-toolbar">
        <div className="agents-controls">
          <div className="chat-search"><Icon name="search" size={15} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search models" /></div>
          <div className="seg scroll">{abilities.map(a => <button key={a} className={filter === a ? 'on' : ''} onClick={() => setFilter(a)}>{a === 'all' ? 'All' : a}</button>)}</div>
        </div>
        <Badge tone="amber"><Icon name="zap" size={12} /> {fmt(user?.credits || 0)} credits</Badge>
      </div>

      <div className="model-card-grid">
        {visible.map(m => (
          <Card key={m.id} className="model-card">
            <div className="model-card-top"><span className="model-logo" style={{ background: m.color }}>{m.name[0]}</span><div><h3>{m.name}</h3><p>{m.provider} · {m.tagline}</p></div><Badge tone="default">{m.badge}</Badge></div>
            <p className="model-desc">{m.description}</p>
            <div className="model-specs"><div><span>Context</span><b>{m.context}</b></div><div><span>Speed</span><b>{m.speed}</b></div><div><span>Cost</span><b>{m.cost}</b></div></div>
            <div className="model-abilities">{(m.abilities || []).map(a => <span key={a}>{a}</span>)}</div>
            <div className="row between"><span className="model-id mono">{m.id}</span><Btn size="sm" variant="outline" icon="chat" onClick={() => go('chat', { model: m.id })}>Try model</Btn></div>
          </Card>
        ))}
      </div>

      <div className="models-bottom">
        <Card>
          <div className="card-head"><div><h3>Routing policy</h3><p>How NexAI picks a model when you don’t</p></div><Badge tone="green">Automatic</Badge></div>
          <div className="routing-list">
            <div><span className="route-ic"><Icon name="chat" size={14} /></span><div><b>Everyday chat</b><p>NexAI Core → NexAI Fast under load.</p></div><Badge tone="default">Fast</Badge></div>
            <div><span className="route-ic"><Icon name="code" size={14} /></span><div><b>Code &amp; strategy</b><p>NexAI Reason with a larger thinking budget.</p></div><Badge tone="violet">Deep</Badge></div>
            <div><span className="route-ic"><Icon name="globe" size={14} /></span><div><b>Research</b><p>NexAI Research with live sources and citations.</p></div><Badge tone="sky">Grounded</Badge></div>
            <div><span className="route-ic"><Icon name="file" size={14} /></span><div><b>Long documents</b><p>Gemini 2.5 Pro when context exceeds 200K.</p></div><Badge tone="amber">1M context</Badge></div>
          </div>
        </Card>
        <Card className="models-note"><Icon name="info" size={18} /><div><b>Demo mode is honest</b><p>Without provider keys, responses come from a local demo engine tuned per module. The UI, streaming, credits and routing are real — only the model call is simulated.</p></div><Btn variant="outline" icon="key" onClick={() => go('keys')}>Add your key</Btn></Card>
      </div>
    </>
  );
}

/* -------------------------------- settings -------------------------------- */
function Settings() {
  const { user, refreshUser, setTheme } = useApp();
  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({ name: '', company: '', jobTitle: '', timezone: 'Europe/London', language: 'English', systemPrompt: '' });
  const [prefs, setPrefs] = useState({ theme: 'dark', density: 'comfortable', defaultModel: 'nexai-core', defaultTone: 'balanced', citations: true, demoBanner: true });
  const [pass, setPass] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState('');
  const [twoFactor, setTwoFactor] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    if (!user) return;
    setForm({ name: user.name || '', company: user.company || '', jobTitle: user.jobTitle || '', timezone: user.timezone || 'Europe/London', language: user.language || 'English', systemPrompt: user.systemPrompt || '' });
    setPrefs(p => ({ ...p, ...(user.prefs || {}) }));
    setTwoFactor(!!user.twoFactor);
  }, [user]);

  const saveProfile = async () => {
    setBusy('profile');
    try { const u = await api('/me', 'PATCH', form); refreshUser?.(u); toast('Profile saved', 'success'); }
    catch (e) { toast(e.message, 'error'); }
    finally { setBusy(''); }
  };

  const savePrefs = async (next) => {
    setPrefs(next);
    try { const u = await api('/me', 'PATCH', { prefs: next }); refreshUser?.(u); if (next.theme) setTheme?.(next.theme); toast('Preferences saved', 'success'); }
    catch (e) { toast(e.message, 'error'); }
  };

  const savePassword = async () => {
    if (pass.next !== pass.confirm) return toast('New passwords do not match.', 'error');
    setBusy('password');
    try { await api('/me/password', 'POST', { current: pass.current, next: pass.next }); setPass({ current: '', next: '', confirm: '' }); toast('Password updated', 'success'); }
    catch (e) { toast(e.message, 'error'); }
    finally { setBusy(''); }
  };

  const toggle2fa = async (on) => {
    try { const d = await api('/me/2fa', 'POST', { enabled: on }); setTwoFactor(d.twoFactor); toast(d.twoFactor ? 'Two-factor enabled' : 'Two-factor disabled', 'success'); }
    catch (e) { toast(e.message, 'error'); }
  };

  const uploadAvatar = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try { const d = await api('/me/avatar', 'POST', { avatar: reader.result }); refreshUser?.({ ...user, avatar: d.avatar }); toast('Photo updated', 'success'); }
      catch (e) { toast(e.message, 'error'); }
    };
    reader.readAsDataURL(file);
  };

  if (!user) return null;

  return (
    <>
      <div className="tabs account-tabs">
        {[['profile', 'Profile'], ['preferences', 'Preferences'], ['security', 'Security'], ['workspace', 'AI defaults']].map(([id, label]) => <button key={id} className={cls(tab === id && 'on')} onClick={() => setTab(id)}>{label}</button>)}
      </div>

      {tab === 'profile' && (
        <div className="settings-layout">
          <Card className="settings-card">
            <div className="card-head"><div><h3>Profile</h3><p>How you appear across the workspace</p></div></div>
            <div className="avatar-upload"><Avatar user={user} size={72} /><div><b>{user.name}</b><span>{user.email}</span><div className="row" style={{ marginTop: 8 }}><Btn size="sm" variant="outline" icon="upload" onClick={() => fileRef.current?.click()}>Change photo</Btn>{user.avatar && <Btn size="sm" variant="ghost" onClick={async () => { await api('/me/avatar', 'POST', { avatar: '' }).catch(() => {}); refreshUser?.({ ...user, avatar: '' }); }}>Remove</Btn>}</div></div><input ref={fileRef} type="file" accept="image/*" hidden onChange={e => uploadAvatar(e.target.files?.[0])} /></div>
            <div className="grid-2"><Field label="Full name"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field><Field label="Job title"><Input value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} placeholder="Head of Operations" /></Field></div>
            <Field label="Company"><Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Lumen Labs" /></Field>
            <div className="grid-2"><Field label="Timezone"><Select value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })}>{['Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Kolkata', 'Australia/Sydney'].map(t => <option key={t}>{t}</option>)}</Select></Field><Field label="Language"><Select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>{['English', 'Deutsch', 'Español', 'Français', 'Português', '日本語', 'हिन्दी'].map(l => <option key={l}>{l}</option>)}</Select></Field></div>
            <div className="row between"><span className="muted small">Changes apply across chat, exports and agent reports.</span><Btn variant="primary" icon="check" loading={busy === 'profile'} onClick={saveProfile}>Save profile</Btn></div>
          </Card>
          <div className="settings-side">
            <Card><div className="card-head"><div><h3>Plan</h3><p>{PLAN_LABELS[user.plan] || user.plan}</p></div></div><div className="profile-plan"><b>{fmt(user.credits)}</b><span>credits remaining</span><Progress value={Math.min(100, (user.credits / Math.max(1, (user.plan === 'free' ? 50 : user.plan === 'pro' ? 2500 : user.plan === 'business' ? 20000 : 100000))) * 100)} /></div><Btn size="sm" variant="outline" icon="card" className="w-full" onClick={() => go('billing')}>Manage subscription</Btn></Card>
            <Card><div className="card-head"><div><h3>Account</h3><p>Member since</p></div></div><div className="kv-list"><div><span>Joined</span><b>{dateFmt(user.createdAt)}</b></div><div><span>Role</span><b className="capitalize">{user.role}</b></div><div><span>Email</span><b>{user.email}</b></div></div></Card>
          </div>
        </div>
      )}

      {tab === 'preferences' && (
        <Card className="settings-card narrow">
          <div className="card-head"><div><h3>Appearance &amp; behaviour</h3><p>Saved to your account immediately</p></div></div>
          <div className="pref-row"><div><b>Theme</b><p>Dark is the default. Light is easier on bright rooms.</p></div><div className="seg">{[['dark', 'Dark'], ['light', 'Light']].map(([v, l]) => <button key={v} className={prefs.theme === v ? 'on' : ''} onClick={() => savePrefs({ ...prefs, theme: v })}>{l}</button>)}</div></div>
          <div className="pref-row"><div><b>Density</b><p>How much space each row gets.</p></div><div className="seg">{[['comfortable', 'Comfortable'], ['compact', 'Compact']].map(([v, l]) => <button key={v} className={prefs.density === v ? 'on' : ''} onClick={() => savePrefs({ ...prefs, density: v })}>{l}</button>)}</div></div>
          <div className="pref-row"><div><b>Default model</b><p>Used when a tool doesn’t pin one.</p></div><Select className="mini-select" value={prefs.defaultModel} onChange={e => savePrefs({ ...prefs, defaultModel: e.target.value })}>{['nexai-core', 'nexai-reason', 'nexai-fast', 'nexai-research'].map(m => <option key={m}>{m}</option>)}</Select></div>
          <div className="pref-row"><div><b>Default tone</b><p>Balanced works for most writing.</p></div><Select className="mini-select" value={prefs.defaultTone} onChange={e => savePrefs({ ...prefs, defaultTone: e.target.value })}>{['balanced', 'precise', 'friendly', 'creative'].map(t => <option key={t}>{t}</option>)}</Select></div>
          <div className="pref-row"><div><b>Inline citations</b><p>Show source numbers in research and documents.</p></div><Toggle checked={!!prefs.citations} onChange={v => savePrefs({ ...prefs, citations: v })} /></div>
          <div className="pref-row"><div><b>Demo-mode banner</b><p>Remind me when answers are simulated.</p></div><Toggle checked={!!prefs.demoBanner} onChange={v => savePrefs({ ...prefs, demoBanner: v })} /></div>
        </Card>
      )}

      {tab === 'security' && (
        <div className="settings-layout">
          <Card className="settings-card">
            <div className="card-head"><div><h3>Change password</h3><p>At least 8 characters. Use a manager.</p></div></div>
            <Field label="Current password"><Input type="password" value={pass.current} onChange={e => setPass({ ...pass, current: e.target.value })} placeholder="••••••••" /></Field>
            <div className="grid-2"><Field label="New password"><Input type="password" value={pass.next} onChange={e => setPass({ ...pass, next: e.target.value })} /></Field><Field label="Confirm new password"><Input type="password" value={pass.confirm} onChange={e => setPass({ ...pass, confirm: e.target.value })} /></Field></div>
            <div className="row between"><span className="muted small">You’ll stay signed in on this device.</span><Btn variant="primary" icon="lock" loading={busy === 'password'} disabled={!pass.current || !pass.next} onClick={savePassword}>Update password</Btn></div>
          </Card>
          <div className="settings-side">
            <Card><div className="card-head"><div><h3>Two-factor authentication</h3><p>Require a code at sign-in</p></div><Badge tone={twoFactor ? 'green' : 'default'} dot={twoFactor}>{twoFactor ? 'On' : 'Off'}</Badge></div><div className="pref-row"><div><b>{twoFactor ? 'Protected' : 'Not enabled'}</b><p>Demo mode toggles the flag without an authenticator app.</p></div><Toggle checked={twoFactor} onChange={toggle2fa} /></div></Card>
            <Card className="security-note"><Icon name="shield" size={18} /><div><b>Your data</b><p>Demo data lives in a local JSON file. Delete it at any time from the admin console, or reset the workspace to seed a fresh state.</p></div></Card>
          </div>
        </div>
      )}

      {tab === 'workspace' && (
        <Card className="settings-card narrow">
          <div className="card-head"><div><h3>AI defaults &amp; system prompt</h3><p>Prepended to every chat unless a tool overrides it</p></div></div>
          <Field label="Custom instructions" hint="Tell NexAI who you are, how you write and what to avoid."><Textarea rows={8} value={form.systemPrompt} onChange={e => setForm({ ...form, systemPrompt: e.target.value })} placeholder="I run operations at a 40-person SaaS. Prefer direct answers, metric-led arguments and British spelling. Never invent numbers." /></Field>
          <div className="row between"><span className="muted small">{form.systemPrompt.length} characters · applies to new conversations</span><Btn variant="primary" icon="check" loading={busy === 'profile'} onClick={saveProfile}>Save instructions</Btn></div>
        </Card>
      )}
    </>
  );
}

/* ---------------------------------- help ---------------------------------- */
const FAQ = [
  { q: 'Do I need API keys to use NexAI?', a: 'No. Without provider keys, NexAI runs in demo mode: the interface, credits, streaming, storage and analytics are real, but model answers are generated by a local demo engine. Add an Anthropic, OpenAI, Google, OpenRouter, Groq or Ollama key to the backend .env to switch to live inference.' },
  { q: 'Where is my data stored?', a: 'In this build, everything lives in backend/data/db.json — users, conversations, documents, agents, tickets and usage. No external database or Docker is required. Delete the file or use Admin → Reset demo data to start over.' },
  { q: 'How do credits work?', a: 'Each action costs a fixed number of credits: a chat message is 1, deep research is 3, a document analysis is 2, an image is 2 and a storyboard is 5. Your plan sets the monthly allowance, and the Usage page records every request by module.' },
  { q: 'Can I use my own model keys?', a: 'Yes. Add the relevant key to backend/.env (for example ANTHROPIC_API_KEY or OPENAI_API_KEY), restart the server and the gateway will prefer live providers. Requests fall back to demo mode if a provider errors.' },
  { q: 'How do I connect Slack, GitHub or Notion?', a: 'Open Integrations and toggle a provider. In demo mode connections are simulated so you can see the connected state and UI. Production sync requires OAuth credentials for each provider.' },
  { q: 'What happens when a document is too large?', a: 'The browser extracts up to 60,000 characters of a PDF, Word, Excel or text file. Larger files are truncated with a clear warning so the model never silently loses the important section.' }
];

function Help() {
  const [open, setOpen] = useState(0);
  const [q, setQ] = useState('');
  const visible = FAQ.filter(f => !q || (f.q + ' ' + f.a).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="help-hero">
        <div><Badge tone="cyan" dot>Support</Badge><h3>How can we help?</h3><p>Search the answers below, browse the docs, or open a ticket with the AI support desk.</p>
          <div className="help-search"><Icon name="search" size={17} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Ask a question, e.g. “credits” or “API key”" /></div>
        </div>
        <div className="help-cards">
          <button onClick={() => go('documents')}><span className="stat-ic sky"><Icon name="file" size={17} /></span><div><b>Documentation</b><span>Guides for every module</span></div><Icon name="right" size={14} /></button>
          <button onClick={() => go('support')}><span className="stat-ic green"><Icon name="headset" size={17} /></span><div><b>Support desk</b><span>AI reply in seconds</span></div><Icon name="right" size={14} /></button>
          <button onClick={() => go('developer')}><span className="stat-ic violet"><Icon name="terminal" size={17} /></span><div><b>API reference</b><span>Endpoints and examples</span></div><Icon name="right" size={14} /></button>
        </div>
      </div>

      <div className="help-layout">
        <div>
          <div className="section-head"><div><h3>Frequently asked</h3><p>{visible.length} answers</p></div></div>
          <div className="faq-list">
            {visible.map((f, i) => (
              <div key={f.q} className={cls('faq-item', open === i && 'on')}>
                <button onClick={() => setOpen(open === i ? -1 : i)}><span>{f.q}</span><Icon name={open === i ? 'minus' : 'plus'} size={16} /></button>
                {open === i && <p>{f.a}</p>}
              </div>
            ))}
            {!visible.length && <Empty icon="search" title="No matches" text="Try a different word, or open a support ticket." action={<Btn variant="primary" onClick={() => go('support')}>Open a ticket</Btn>} />}
          </div>
        </div>
        <aside className="help-side">
          <Card><div className="card-head"><div><h3>System status</h3><p>Local development</p></div><Badge tone="green" dot>Operational</Badge></div><div className="kv-list"><div><span>API</span><b>localhost:5000</b></div><div><span>Database</span><b>JSON store</b></div><div><span>AI gateway</span><b>Demo engine</b></div><div><span>Version</span><b>1.0.0</b></div></div></Card>
          <Card className="help-note"><Icon name="sparkles" size={18} /><div><b>370 features, 19 modules</b><p>Every capability in the blueprint is implemented or faithfully simulated. Browse the full catalogue to see what each one does.</p></div><Btn variant="outline" icon="layers" onClick={() => go('features')}>Open feature library</Btn></Card>
          <Card><div className="card-head"><div><h3>Keyboard</h3><p>Move faster</p></div></div><div className="shortcut-list"><div><span>Command palette</span><kbd>⌘</kbd><kbd>K</kbd></div><div><span>Search</span><kbd>/</kbd></div><div><span>New chat</span><kbd>N</kbd></div><div><span>Close modal</span><kbd>esc</kbd></div></div></Card>
        </aside>
      </div>
    </>
  );
}
