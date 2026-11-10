import React, { useEffect, useMemo, useState } from 'react';
import { api, copy, download } from '../api.js';
import { useApp } from '../context.js';
import { Icon, Btn, IconBtn, Card, Badge, Avatar, Empty, Modal, Progress, Field, Input, Select, useFetch, fmt, money, timeAgo, dateFmt, cls, toast, Spinner, AreaChart, BarChart, Donut, Sparkline } from '../ui.jsx';
import { MODULES } from '../nav.js';

export default function Admin() {
  const { data, loading, reload } = useFetch(() => api('/admin/overview'));
  const [tab, setTab] = useState('overview');
  const [fresh, setFresh] = useState(false);
  const refresh = () => { reload(); toast('Admin data refreshed', 'success'); };

  if (loading && !data) return <div className="boot-inline"><Spinner size={24} /><span>Loading the admin console…</span></div>;
  if (!data) return <Empty icon="shield" title="Admin console unavailable" text="Could not load the admin overview." action={<Btn onClick={reload}>Retry</Btn>} />;

  const s = data.stats || {};

  return (
    <div className="admin-page">
      <header className="admin-head">
        <div><div className="row"><Badge tone="red" dot>Root access</Badge><Badge tone="default">{data.system?.region || 'local'}</Badge>{data.system?.demoMode && <Badge tone="amber">Demo mode</Badge>}</div><h2>Admin console</h2><p>Users, revenue, security and system health for the entire workspace.</p></div>
        <div className="row"><Btn variant="outline" icon="refresh" onClick={refresh}>Refresh</Btn><Btn variant="danger" icon="alert" onClick={() => setFresh(true)}>Reset demo</Btn></div>
      </header>

      <div className="admin-stats">
        <Card className="admin-stat"><div className="admin-stat-top"><span className="stat-ic violet"><Icon name="users" size={17} /></span><Badge tone="green">+{s.conversion}% paid</Badge></div><b>{fmt(s.users)}</b><span>total users</span><div className="admin-stat-foot"><span>{fmt(s.activeUsers)} active · {s.suspended} suspended</span></div></Card>
        <Card className="admin-stat"><div className="admin-stat-top"><span className="stat-ic green"><Icon name="card" size={17} /></span><Badge tone="green">MRR</Badge></div><b>{money(s.mrr)}</b><span>monthly recurring</span><div className="admin-stat-foot"><span>{money(s.arr)} ARR · {s.conversion}% conversion</span></div></Card>
        <Card className="admin-stat"><div className="admin-stat-top"><span className="stat-ic cyan"><Icon name="chat" size={17} /></span><Badge tone="default">All time</Badge></div><b>{fmt(s.conversations)}</b><span>conversations</span><div className="admin-stat-foot"><span>{fmt(s.agents)} agents · {fmt(s.tickets)} open tickets</span></div></Card>
        <Card className="admin-stat"><div className="admin-stat-top"><span className="stat-ic amber"><Icon name="zap" size={17} /></span><Badge tone="violet">Usage</Badge></div><b>{fmt(s.creditsUsed)}</b><span>credits consumed</span><div className="admin-stat-foot"><span>p95 {data.system?.p95} · {data.system?.errorRate} errors</span></div></Card>
      </div>

      <div className="tabs admin-tabs">
        {[['overview', 'Overview'], ['users', 'Users'], ['revenue', 'Revenue'], ['audit', 'Audit log'], ['coupons', 'Coupons'], ['system', 'System']].map(([id, label]) => <button key={id} className={cls(tab === id && 'on')} onClick={() => setTab(id)}>{label}</button>)}
      </div>

      {tab === 'overview' && <Overview data={data} />}
      {tab === 'users' && <Users />}
      {tab === 'revenue' && <Revenue data={data} />}
      {tab === 'audit' && <Audit data={data} />}
      {tab === 'coupons' && <Coupons data={data} reload={reload} />}
      {tab === 'system' && <System data={data} />}

      {fresh && (
        <Modal title="Reset demo data?" subtitle="This restores the seeded workspace." onClose={() => setFresh(false)}
          footer={<><Btn variant="ghost" onClick={() => setFresh(false)}>Cancel</Btn><Btn variant="danger" icon="alert" onClick={async () => { await api('/admin/reset-demo', 'POST', {}); setFresh(false); toast('Demo data restored', 'success'); setTimeout(() => window.location.reload(), 600); }}>Reset everything</Btn></>}>
          <p className="muted">All conversations, documents, agents, tickets, keys and usage created in this workspace will be replaced with the original seed data. You will stay signed in.</p>
        </Modal>
      )}
    </div>
  );
}

function Overview({ data }) {
  const { usageSeries, signupSeries, planDist, moduleUsage, recentUsers, audit, tickets } = data;
  return (
    <>
      <div className="admin-charts">
        <Card className="chart-card wide">
          <div className="card-head"><div><h3>Platform usage</h3><p>Credits consumed over the last 30 days</p></div><Badge tone="violet">30 days</Badge></div>
          <AreaChart data={usageSeries} xKey="day" yKey="credits" height={240} />
        </Card>
        <Card className="chart-card">
          <div className="card-head"><div><h3>Plan mix</h3><p>Users per tier</p></div></div>
          <div className="donut-wrap"><Donut segments={planDist.map((p, i) => ({ value: p.count, color: ['#64748b', '#818cf8', '#22d3ee', '#f59e0b'][i] }))} center={fmt(planDist.reduce((a, p) => a + p.count, 0))} label="users" /><div className="donut-legend">{planDist.map((p, i) => <div key={p.plan}><span className="col-dot" style={{ background: ['#64748b', '#818cf8', '#22d3ee', '#f59e0b'][i] }} /><span className="capitalize">{p.plan}</span><b>{p.count}</b></div>)}</div></div>
        </Card>
      </div>

      <div className="admin-grid-2">
        <Card>
          <div className="card-head"><div><h3>Signups</h3><p>New accounts per day</p></div></div>
          <BarChart labels={signupSeries.slice(-14).map(x => x.day.slice(5))} values={signupSeries.slice(-14).map(x => x.count)} height={170} color="#34d399" />
        </Card>
        <Card>
          <div className="card-head"><div><h3>Module usage</h3><p>Where credits are spent across the platform</p></div></div>
          <div className="module-usage-list">{moduleUsage.map((m, i) => <div key={m.moduleId} className="module-usage-row"><span className="module-usage-name">{m.name}</span><div className="module-usage-bar"><i style={{ width: Math.round((m.credits / Math.max(1, moduleUsage[0].credits)) * 100) + '%', background: ['#818cf8', '#22d3ee', '#f472b6', '#34d399', '#f59e0b', '#a78bfa', '#64748b', '#0ea5e9'][i] }} /></div><b>{fmt(m.credits)}</b></div>)}</div>
        </Card>
      </div>

      <div className="admin-grid-2">
        <Card>
          <div className="card-head"><div><h3>Newest users</h3><p>Recent signups</p></div><Badge tone="default">{recentUsers.length}</Badge></div>
          <div className="recent-user-list">{recentUsers.map(u => <div key={u.id} className="recent-user"><Avatar user={u} size={32} /><div><b>{u.name}</b><span>{u.email}</span></div><Badge tone={u.plan === 'free' ? 'default' : u.plan === 'pro' ? 'violet' : u.plan === 'business' ? 'blue' : 'amber'}>{u.plan}</Badge><span className="muted small">{dateFmt(u.createdAt)}</span></div>)}</div>
        </Card>
        <Card>
          <div className="card-head"><div><h3>Support queue</h3><p>Latest tickets across the workspace</p></div><Badge tone={tickets.some(t => t.priority === 'urgent') ? 'red' : 'green'}>{tickets.filter(t => t.status !== 'resolved').length} open</Badge></div>
          <div className="admin-ticket-list">{tickets.map(t => <div key={t.id} className="admin-ticket"><Badge tone={t.priority === 'urgent' ? 'red' : t.priority === 'high' ? 'amber' : 'default'}>{t.priority}</Badge><div><b>{t.subject}</b><span>{t.customer} · {t.company}</span></div><Badge tone={t.status === 'open' ? 'blue' : t.status === 'pending' ? 'amber' : 'green'}>{t.status}</Badge></div>)}</div>
        </Card>
      </div>

      <Card>
        <div className="card-head"><div><h3>Recent activity</h3><p>Security-relevant events</p></div><Badge tone="default">{audit.length} events</Badge></div>
        <div className="audit-list compact">{audit.map(a => <div key={a.id} className="audit-row"><span className="audit-dot" /><div><b>{a.action}</b><span>{a.actor} · {timeAgo(a.at)}</span></div><span className="mono small muted">{a.ip || 'local'}</span></div>)}</div>
      </Card>
    </>
  );
}

function Users() {
  const { data, loading, reload } = useFetch(() => api('/admin/users'));
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [plan, setPlan] = useState('all');
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState('');

  useEffect(() => { if (data) setUsers(data); }, [data]);

  const visible = users.filter(u => (plan === 'all' || u.plan === plan) && (!q || (u.name + ' ' + u.email + ' ' + (u.company || '')).toLowerCase().includes(q.toLowerCase())));

  const patch = async (u, body, message) => {
    setBusy(u.id);
    try {
      const updated = await api('/admin/users/' + u.id, 'PATCH', body);
      setUsers(list => list.map(x => x.id === updated.id ? { ...x, ...updated } : x));
      toast(message, 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(''); }
  };

  return (
    <>
      <div className="ws-toolbar">
        <div className="agents-controls">
          <div className="chat-search"><Icon name="search" size={15} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email or company" /></div>
          <div className="seg">{[['all', 'All'], ['free', 'Free'], ['pro', 'Pro'], ['business', 'Business'], ['enterprise', 'Enterprise']].map(([v, l]) => <button key={v} className={plan === v ? 'on' : ''} onClick={() => setPlan(v)}>{l}</button>)}</div>
        </div>
        <div className="row"><Btn variant="outline" icon="download" onClick={() => download('nexai-users.csv', ['name,email,plan,company,role,status,conversations,creditsUsed', ...visible.map(u => `${u.name},${u.email},${u.plan},${u.company || ''},${u.role},${u.suspended ? 'suspended' : 'active'},${u.conversations},${u.creditsUsed}`)].join('\n'))}>Export CSV</Btn><Btn variant="primary" icon="refresh" onClick={reload}>Refresh</Btn></div>
      </div>

      {loading && !users.length ? <div className="row" style={{ padding: 40 }}><Spinner size={22} /></div> : (
        <Card className="table-card">
          <div className="table-wrap"><table>
            <thead><tr><th>User</th><th>Plan</th><th>Company</th><th>Conversations</th><th>Credits used</th><th>Last active</th><th>Status</th><th></th></tr></thead>
            <tbody>{visible.map(u => (
              <tr key={u.id}>
                <td><div className="member-cell"><Avatar user={u} size={32} /><div><b>{u.name}{u.role === 'admin' && <Badge tone="red">admin</Badge>}</b><span>{u.email}</span></div></div></td>
                <td><Badge tone={u.plan === 'free' ? 'default' : u.plan === 'pro' ? 'violet' : u.plan === 'business' ? 'blue' : 'amber'}>{u.plan}</Badge></td>
                <td className="muted">{u.company || '—'}</td>
                <td>{u.conversations}</td>
                <td>{fmt(u.creditsUsed)}</td>
                <td className="muted">{u.lastActive ? timeAgo(u.lastActive) : 'Never'}</td>
                <td><Badge tone={u.suspended ? 'red' : 'green'} dot>{u.suspended ? 'Suspended' : 'Active'}</Badge></td>
                <td><div className="row end"><IconBtn name="settings" size={15} label="Edit" onClick={() => setEditing(u)} />{u.suspended ? <IconBtn name="checkCircle" size={15} label="Reactivate" onClick={() => patch(u, { suspended: false }, `${u.name} reactivated`)} /> : <IconBtn name="lock" size={15} label="Suspend" onClick={() => patch(u, { suspended: true }, `${u.name} suspended`)} />}</div></td>
              </tr>
            ))}</tbody>
          </table></div>
        </Card>
      )}

      {editing && <UserModal user={editing} busy={busy === editing.id} onClose={() => setEditing(null)} onSave={async (body) => { await patch(editing, body, 'User updated'); setEditing(null); }} />}
    </>
  );
}

function UserModal({ user, busy, onClose, onSave }) {
  const [form, setForm] = useState({ plan: user.plan, role: user.role || 'user', credits: user.credits, suspended: !!user.suspended });
  return (
    <Modal title={user.name} subtitle={user.email} onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon="check" loading={busy} onClick={() => onSave(form)}>Save changes</Btn></>}>
      <div className="grid-2">
        <Field label="Plan"><Select value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })}>{['free', 'pro', 'business', 'enterprise'].map(p => <option key={p}>{p}</option>)}</Select></Field>
        <Field label="Role"><Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="user">User</option><option value="admin">Admin</option></Select></Field>
      </div>
      <Field label="Credits" hint="Setting a plan resets to that plan’s allowance."><Input type="number" min="0" value={form.credits} onChange={e => setForm({ ...form, credits: Number(e.target.value) })} /></Field>
      <label className="check-row"><input type="checkbox" checked={form.suspended} onChange={e => setForm({ ...form, suspended: e.target.checked })} /><span>Suspend this account</span></label>
      <div className="detail-note"><Icon name="info" size={14} /><span>Changing a plan immediately replaces the credit balance with the new plan allowance.</span></div>
    </Modal>
  );
}

function Revenue({ data }) {
  const { planDist, stats } = data;
  const colors = ['#64748b', '#818cf8', '#22d3ee', '#f59e0b'];
  return (
    <>
      <div className="revenue-hero">
        <Card className="revenue-main"><Badge tone="green" dot>Monthly recurring revenue</Badge><h2>{money(stats.mrr)}</h2><p>{money(stats.arr)} annualised · {stats.conversion}% of accounts are paid</p><div className="revenue-bars">{planDist.map((p, i) => <div key={p.plan}><span className="capitalize">{p.plan}</span><div className="revenue-bar"><i style={{ width: Math.round((p.mrr / Math.max(1, stats.mrr)) * 100) + '%', background: colors[i] }} /></div><b>{money(p.mrr)}</b></div>)}</div></Card>
        <div className="revenue-side">
          <Card><div className="card-head"><div><h3>Conversion</h3><p>Free → paid</p></div></div><div className="revenue-kpi"><b>{stats.conversion}%</b><Badge tone="green">Healthy</Badge></div><Progress value={stats.conversion} /></Card>
          <Card><div className="card-head"><div><h3>Net revenue retention</h3><p>Expansion minus churn</p></div></div><div className="revenue-kpi"><b>114%</b><Badge tone="green">Expanding</Badge></div><Sparkline values={[98, 101, 103, 105, 104, 108, 111, 110, 113, 114]} color="#34d399" width={220} height={40} /></Card>
        </div>
      </div>
      <div className="admin-grid-2">
        <Card><div className="card-head"><div><h3>Revenue by plan</h3><p>Contribution to MRR</p></div></div><div className="table-wrap"><table><thead><tr><th>Plan</th><th>Accounts</th><th>MRR</th><th>Share</th></tr></thead><tbody>{planDist.map(p => <tr key={p.plan}><td className="capitalize">{p.plan}</td><td>{p.count}</td><td>{money(p.mrr)}</td><td>{Math.round((p.mrr / Math.max(1, stats.mrr)) * 100)}%</td></tr>)}</tbody></table></div></Card>
        <Card><div className="card-head"><div><h3>Unit economics</h3><p>Demo workspace estimates</p></div><Badge tone="amber">Illustrative</Badge></div><div className="kv-list"><div><span>ARPA</span><b>{money(stats.mrr / Math.max(1, stats.activeUsers))}</b></div><div><span>Gross margin</span><b>82%</b></div><div><span>Payback period</span><b>4.1 months</b></div><div><span>Logo churn (monthly)</span><b>1.8%</b></div><div><span>Credits per paid account</span><b>{fmt(stats.creditsUsed / Math.max(1, stats.activeUsers))}</b></div></div></Card>
      </div>
      <Card className="revenue-note"><Icon name="info" size={17} /><p>Revenue here is computed from seeded users and plans, not from a payment provider. In production, sync Stripe invoices, tax and dunning into the same console.</p></Card>
    </>
  );
}

function Audit({ data }) {
  const { data: log, loading } = useFetch(() => api('/admin/audit'));
  const [q, setQ] = useState('');
  const items = (log || data.audit || []).filter(a => !q || (a.action + ' ' + a.actor).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="ws-toolbar"><div className="chat-search wide"><Icon name="search" size={15} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search the audit log" /></div><Btn variant="outline" icon="download" onClick={() => download('nexai-audit.json', JSON.stringify(items, null, 2), 'application/json')}>Export JSON</Btn></div>
      <Card className="audit-card">
        <div className="audit-head"><span>Event</span><span>Actor</span><span>When</span><span>Source</span></div>
        {loading && !items.length ? <div className="row" style={{ padding: 30 }}><Spinner size={20} /></div> : items.map(a => <div key={a.id} className="audit-row"><span className="audit-dot" /><div><b>{a.action}</b><span className="mono small muted">{a.id}</span></div><span>{a.actor}</span><span className="muted">{timeAgo(a.at)}</span><span className="mono small muted">{a.ip || 'local'}</span></div>)}
        {!items.length && <Empty icon="shield" title="No events match" text="Try a broader search." />}
      </Card>
    </>
  );
}

function Coupons({ data, reload }) {
  const [coupons, setCoupons] = useState(data.coupons || []);
  const [open, setOpen] = useState(false);
  const create = async (form) => {
    try {
      const c = await api('/admin/coupons', 'POST', form);
      setCoupons(x => [c, ...x]); setOpen(false); reload(); toast(`Coupon ${c.code} created`, 'success');
    } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <>
      <div className="ws-toolbar"><div><h3 className="section-title">Discount coupons</h3><p className="muted small">Percentage discounts, capped with a use limit and expiry.</p></div><Btn variant="primary" icon="plus" onClick={() => setOpen(true)}>New coupon</Btn></div>
      <div className="coupon-grid">
        {coupons.map(c => (
          <Card key={c.code} className="coupon-card">
            <div className="coupon-top"><span className="coupon-code">{c.code}</span><Badge tone={c.active ? 'green' : 'default'} dot={c.active}>{c.active ? 'Active' : 'Inactive'}</Badge></div>
            <div className="coupon-percent">{c.percent}% off</div>
            <div className="coupon-meta"><span>{c.uses} / {c.maxUses} uses</span><span>Expires {c.expires}</span></div>
            <Progress value={Math.round((c.uses / Math.max(1, c.maxUses)) * 100)} />
            <Btn size="sm" variant="ghost" icon="copy" onClick={async () => { await copy(c.code); toast('Coupon code copied', 'success'); }}>Copy code</Btn>
          </Card>
        ))}
        {!coupons.length && <Empty icon="card" title="No coupons yet" text="Create a discount code to test the billing flow." action={<Btn variant="primary" icon="plus" onClick={() => setOpen(true)}>New coupon</Btn>} />}
      </div>
      {open && <CouponModal onClose={() => setOpen(false)} onSubmit={create} />}
    </>
  );
}

function CouponModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ code: '', percent: 20, maxUses: 100, expires: '2027-12-31' });
  return (
    <Modal title="Create a coupon" subtitle="Discounts apply at the simulated checkout." onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon="plus" disabled={!form.code.trim()} onClick={() => onSubmit(form)}>Create coupon</Btn></>}>
      <Field label="Code"><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="LAUNCH30" autoFocus /></Field>
      <div className="grid-3"><Field label="Percent off"><Input type="number" min="5" max="90" value={form.percent} onChange={e => setForm({ ...form, percent: Number(e.target.value) })} /></Field><Field label="Max uses"><Input type="number" min="1" value={form.maxUses} onChange={e => setForm({ ...form, maxUses: Number(e.target.value) })} /></Field><Field label="Expires"><Input type="date" value={form.expires} onChange={e => setForm({ ...form, expires: e.target.value })} /></Field></div>
    </Modal>
  );
}

function System({ data }) {
  const sys = data.system || {};
  const services = [
    { name: 'API server', status: 'Operational', p95: sys.p95, icon: 'plug' },
    { name: 'AI gateway', status: sys.demoMode ? 'Demo mode' : 'Live', p95: '860ms', icon: 'cpu' },
    { name: 'JSON store', status: 'Operational', p95: '4ms', icon: 'database' },
    { name: 'SSE streaming', status: 'Operational', p95: '120ms', icon: 'zap' }
  ];
  return (
    <>
      <div className="admin-grid-2">
        <Card><div className="card-head"><div><h3>Service health</h3><p>Local development environment</p></div><Badge tone="green" dot>{sys.uptime} uptime</Badge></div><div className="service-list">{services.map(s => <div key={s.name} className="service-row"><span className="route-ic"><Icon name={s.icon} size={15} /></span><div><b>{s.name}</b><span>p95 {s.p95}</span></div><Badge tone={s.status === 'Demo mode' ? 'amber' : 'green'} dot>{s.status}</Badge></div>)}</div></Card>
        <Card><div className="card-head"><div><h3>Environment</h3><p>Runtime configuration</p></div></div><div className="kv-list"><div><span>Region</span><b>{sys.region}</b></div><div><span>Plan</span><b>{sys.plan}</b></div><div><span>Storage used</span><b>{sys.storage}</b></div><div><span>Error rate</span><b>{sys.errorRate}</b></div><div><span>AI mode</span><b>{sys.demoMode ? 'Demo engine' : 'Live provider'}</b></div></div><div className="row" style={{ marginTop: 14 }}><Btn size="sm" variant="outline" icon="download" onClick={() => download('nexai-system.json', JSON.stringify(data.system, null, 2), 'application/json')}>Export config</Btn><Btn size="sm" variant="ghost" icon="refresh" onClick={() => toast('Health checks run automatically every 30s.', 'info')}>Run checks</Btn></div></Card>
      </div>
      <Card>
        <div className="card-head"><div><h3>Storage</h3><p>db.json and generated media</p></div></div>
        <div className="storage-bars">{[['Database', 38, '#818cf8'], ['Generated images', 22, '#f472b6'], ['Documents', 14, '#22d3ee'], ['Logs', 9, '#f59e0b']].map(([l, v, c]) => <div key={l} className="storage-row"><span>{l}</span><div className="storage-bar"><i style={{ width: v + '%', background: c }} /></div><b>{v}%</b></div>)}</div>
        <div className="detail-note"><Icon name="shield" size={14} /><span>The JSON store is intentionally simple for zero-config demos. For production, swap it for Postgres and move generated media to object storage.</span></div>
      </Card>
      <Card className="danger-zone">
        <div><h3>Danger zone</h3><p>Restore the seeded workspace and remove everything created in this demo.</p></div>
        <Btn variant="danger" icon="alert" onClick={() => { if (window.confirm('Reset all demo data? This cannot be undone.')) { api('/admin/reset-demo', 'POST', {}).then(() => { toast('Demo data restored', 'success'); setTimeout(() => window.location.reload(), 600); }); } }}>Reset demo data</Btn>
      </Card>
    </>
  );
}
