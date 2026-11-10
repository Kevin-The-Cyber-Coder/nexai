import React, { useEffect, useMemo, useState } from 'react';
import { api, copy } from '../api.js';
import { useApp, go } from '../context.js';
import { Icon, Btn, IconBtn, Card, Badge, Markdown, Empty, Modal, Field, Input, Textarea, Select, useFetch, fmt, timeAgo, cls, toast, Spinner } from '../ui.jsx';

const STATUS = { open: { tone: 'blue', label: 'Open' }, pending: { tone: 'amber', label: 'Pending' }, resolved: { tone: 'green', label: 'Resolved' } };
const PRIORITY = { urgent: 'red', high: 'amber', normal: 'default', low: 'default' };
const SENTIMENT = { negative: 'red', neutral: 'default', positive: 'green' };

const detailFor = (t) => `Hi ${t.customer.split(' ')[0]},

${t.subject.startsWith('How') ? 'I’m trying to' : 'We’re seeing an issue with'} ${t.subject.charAt(0).toLowerCase() + t.subject.slice(1)}.

${t.priority === 'urgent' ? 'This is blocking our team right now, so a quick answer would help.' : 'Could you point me in the right direction?'}

Thanks,
${t.customer}
${t.company}`;

export default function Support() {
  const { refreshUser } = useApp();
  const { data, loading, reload } = useFetch(() => api('/tickets'), []);
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [search, setSearch] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const stats = data?.stats || {};

  useEffect(() => {
    if (data?.tickets) { setTickets(data.tickets); setSelected(prev => prev ? data.tickets.find(t => t.id === prev.id) || data.tickets[0] : data.tickets[0]); }
  }, [data]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter(t => (status === 'all' || t.status === status) && (priority === 'all' || t.priority === priority) && (!q || t.subject.toLowerCase().includes(q) || t.customer.toLowerCase().includes(q) || t.company.toLowerCase().includes(q)));
  }, [tickets, status, priority, search]);

  const patch = async (patchBody, message) => {
    if (!selected) return;
    try {
      const t = await api('/tickets/' + selected.id, 'PATCH', patchBody);
      setTickets(list => list.map(x => x.id === t.id ? t : x)); setSelected(t); reload();
      if (message) toast(message, 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  const draftReply = async () => {
    if (!selected) return;
    setBusy(true); setReply('');
    try {
      const d = await api('/tickets/' + selected.id + '/reply', 'POST', { context: detailFor(selected) });
      setReply(d.reply); refreshUser?.();
      toast('Draft ready · 1 credit', 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const createTicket = async (form) => {
    try {
      const t = await api('/tickets', 'POST', form);
      setTickets(list => [t, ...list]); setSelected(t); setNewOpen(false); reload();
      toast('Ticket created', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div className="support-page">
      <section className="support-hero">
        <div><Badge tone="green" dot>AI support desk</Badge><h2>Answer faster. Escalate smarter.</h2><p>A queue that summarises context, drafts the reply and tells you when a human should take over. Every ticket keeps its customer, sentiment and SLA.</p></div>
        <div className="support-stats">
          <div><span className="stat-ic blue"><Icon name="headset" size={16} /></span><b>{stats.open || 0}</b><span>open</span></div>
          <div><span className="stat-ic red"><Icon name="alert" size={16} /></span><b>{stats.urgent || 0}</b><span>urgent</span></div>
          <div><span className="stat-ic green"><Icon name="checkCircle" size={16} /></span><b>{stats.resolved || 0}</b><span>resolved</span></div>
          <div><span className="stat-ic amber"><Icon name="star" size={16} /></span><b>{stats.csat || '—'}</b><span>CSAT</span></div>
        </div>
      </section>

      <div className="support-toolbar">
        <div className="agents-controls">
          <div className="chat-search"><Icon name="search" size={15} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets" /></div>
          <div className="seg">{[['all', 'All'], ['open', 'Open'], ['pending', 'Pending'], ['resolved', 'Resolved']].map(([v, l]) => <button key={v} className={status === v ? 'on' : ''} onClick={() => setStatus(v)}>{l}</button>)}</div>
          <div className="seg">{[['all', 'Any priority'], ['urgent', 'Urgent'], ['high', 'High']].map(([v, l]) => <button key={v} className={priority === v ? 'on' : ''} onClick={() => setPriority(v)}>{l}</button>)}</div>
        </div>
        <Btn variant="primary" icon="plus" onClick={() => setNewOpen(true)}>New ticket</Btn>
      </div>

      <div className="support-layout">
        <div className="ticket-list">
          <div className="ticket-list-head"><span>{visible.length} tickets</span><span>Priority · updated</span></div>
          {visible.map(t => (
            <button key={t.id} className={cls('ticket-row', selected?.id === t.id && 'on', t.priority === 'urgent' && 'urgent')} onClick={() => { setSelected(t); setReply(''); }}>
              <span className="ticket-sentiment" style={{ background: { negative: '#f87171', neutral: '#94a3b8', positive: '#34d399' }[t.sentiment] }} />
              <span className="ticket-row-body">
                <span className="ticket-row-top"><b>{t.customer}</b><span>{timeAgo(t.createdAt)}</span></span>
                <span className="ticket-subject">{t.subject}</span>
                <span className="ticket-row-meta"><Badge tone={STATUS[t.status]?.tone}>{STATUS[t.status]?.label}</Badge><span>{t.company}</span><span>·</span><span>{t.messages} messages</span><Badge tone={PRIORITY[t.priority]}>{t.priority}</Badge></span>
              </span>
            </button>
          ))}
          {!visible.length && <Empty icon="headset" title="No tickets match" text="Try a different status or priority." action={<Btn variant="outline" onClick={() => { setStatus('all'); setPriority('all'); setSearch(''); }}>Clear filters</Btn>} />}
        </div>

        <div className="ticket-detail">
          {!selected ? <Empty icon="headset" title="Select a ticket" text="Choose a conversation from the queue." /> : (
            <>
              <Card className="ticket-main">
                <div className="ticket-head">
                  <div><div className="row"><Badge tone={STATUS[selected.status]?.tone} dot>{STATUS[selected.status]?.label}</Badge><Badge tone={PRIORITY[selected.priority]}>{selected.priority}</Badge><Badge tone={SENTIMENT[selected.sentiment]}>{selected.sentiment}</Badge><span className="muted small">#{selected.id.replace('t_', '')}</span></div><h2>{selected.subject}</h2><p>{selected.customer} · {selected.company} · via {selected.channel} · {timeAgo(selected.createdAt)}</p></div>
                  <IconBtn name="external" label="Open customer" onClick={() => toast('Customer profile is part of the demo workspace.', 'info')} />
                </div>
                <div className="ticket-message">
                  <div className="ticket-msg-head"><span className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{selected.customer.split(' ').map(x => x[0]).join('')}</span><div><b>{selected.customer}</b><span>{selected.company} · customer</span></div><span className="grow" /><span className="muted small">{selected.messages} messages</span></div>
                  <div className="ticket-msg-body">{detailFor(selected)}</div>
                </div>
                <div className="ticket-actions">
                  <div className="row wrap gap">
                    <Select className="mini-select" value={selected.status} onChange={e => patch({ status: e.target.value }, 'Status updated')}><option value="open">Open</option><option value="pending">Pending</option><option value="resolved">Resolved</option></Select>
                    <Select className="mini-select" value={selected.priority} onChange={e => patch({ priority: e.target.value }, 'Priority updated')}><option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></Select>
                    <Btn size="sm" variant="ghost" onClick={() => toast('Assigned to you', 'success')}>Assign to me</Btn>
                  </div>
                  <div className="row"><Btn variant="primary" icon="sparkles" loading={busy} onClick={draftReply}>Draft reply</Btn>{selected.status !== 'resolved' && <Btn variant="outline" icon="check" onClick={() => patch({ status: 'resolved' }, 'Ticket resolved')}>Resolve</Btn>}</div>
                </div>
              </Card>

              <Card className="reply-card">
                <div className="card-head"><div><h3>AI draft</h3><p>Warm, concise, with concrete next steps · 1 credit</p></div>{reply && <Badge tone="violet">Editable draft</Badge>}</div>
                {busy ? <div className="reply-loading"><Spinner size={18} /><span>Reading the ticket and drafting a response…</span></div> : reply ? (
                  <>
                    <div className="reply-output"><Markdown>{reply}</Markdown></div>
                    <div className="row between"><span className="muted small">Review before sending. Internal notes are marked separately.</span><div className="row"><Btn size="sm" variant="ghost" icon="refresh" onClick={draftReply}>Regenerate</Btn><Btn size="sm" variant="outline" icon="copy" onClick={async () => { await copy(reply); toast('Draft copied', 'success'); }}>Copy</Btn><Btn size="sm" variant="primary" icon="send" onClick={() => { toast('Reply sent — demo mode does not deliver email.', 'success'); patch({ status: 'pending' }, null); }}>Send reply</Btn></div></div>
                  </>
                ) : (
                  <div className="reply-empty"><span className="empty-ic"><Icon name="wand" size={22} /></span><div><b>No draft yet</b><p>Generate a reply grounded in the ticket and the customer’s sentiment. You can edit anything before sending.</p></div></div>
                )}
              </Card>

              <div className="ticket-context">
                <Card><div className="card-head"><div><h3>Customer context</h3><p>Account and history</p></div></div><div className="kv-list"><div><span>Company</span><b>{selected.company}</b></div><div><span>Sentiment</span><b className="capitalize">{selected.sentiment}</b></div><div><span>Channel</span><b className="capitalize">{selected.channel}</b></div><div><span>Messages</span><b>{selected.messages}</b></div><div><span>CSAT</span><b>{selected.csat ? `${selected.csat}/5` : 'Not rated'}</b></div></div></Card>
                <Card><div className="card-head"><div><h3>Suggested next step</h3><p>Based on the queue</p></div></div><p className="muted">{selected.priority === 'urgent' ? 'Escalate now: urgent tickets are breaching the response target. Draft, review and send within 15 minutes.' : selected.status === 'resolved' ? 'Ask for a CSAT rating and log the resolution reason for deflection learning.' : 'Send the draft, then set the ticket to pending while you wait for the customer.'}</p><div className="row" style={{ marginTop: 10 }}><Btn size="sm" variant="outline" onClick={() => go('features')}>Support tools</Btn><Btn size="sm" variant="ghost" onClick={() => go('usage')}>Usage</Btn></div></Card>
              </div>
            </>
          )}
        </div>
      </div>

      {newOpen && <NewTicket onClose={() => setNewOpen(false)} onCreate={createTicket} />}
    </div>
  );
}

function NewTicket({ onClose, onCreate }) {
  const [form, setForm] = useState({ customer: '', company: '', subject: '', priority: 'normal', channel: 'chat' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal title="New ticket" subtitle="Log a customer issue and route it into the AI queue." onClose={onClose} footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon="plus" disabled={!form.subject} onClick={() => onCreate(form)}>Create ticket</Btn></>}>
      <div className="grid-2"><Field label="Customer"><Input value={form.customer} onChange={e => set('customer', e.target.value)} placeholder="Elena Rossi" /></Field><Field label="Company"><Input value={form.company} onChange={e => set('company', e.target.value)} placeholder="Fable" /></Field></div>
      <Field label="Subject"><Input value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Invoice shows the old plan" /></Field>
      <div className="grid-2"><Field label="Priority"><Select value={form.priority} onChange={e => set('priority', e.target.value)}><option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></Select></Field><Field label="Channel"><Select value={form.channel} onChange={e => set('channel', e.target.value)}><option value="chat">Chat</option><option value="email">Email</option><option value="phone">Phone</option></Select></Field></div>
    </Modal>
  );
}
