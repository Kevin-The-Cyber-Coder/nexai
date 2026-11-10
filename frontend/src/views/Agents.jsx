import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useApp, go } from '../context.js';
import { Icon, Btn, Card, Badge, Modal, Drawer, Empty, Field, Input, Textarea, Select, Toggle, Progress, Avatar, useFetch, fmt, timeAgo, cls, toast, Spinner } from '../ui.jsx';
import { MODULES, findFeature } from '../nav.js';

const EMOJIS = ['🤖', '🧠', '🔭', '✍️', '📊', '🛰️', '⚡', '🎯', '🧾', '📣', '🎧', '🚀', '🕵️', '🧪'];
const SCHEDULES = ['On demand', 'Every morning, 8am', 'Every Monday, 9am', 'Daily, 6pm', 'Hourly', 'Weekly, Friday 4pm', 'Monthly, last Friday'];
const STATUS_TONE = { active: 'green', draft: 'default', paused: 'amber' };
const TOOL_OPTIONS = ['web-search', 'documents', 'knowledge-base', 'tickets', 'calendar', 'notion', 'slack', 'images', 'sheets', 'csv', 'email', 'github', 'stripe', 'database'];

const emptyForm = (model = 'nexai-core') => ({
  name: '', emoji: '🤖', role: 'AI assistant', description: '', instructions: '',
  model, tools: ['web-search', 'documents'], schedule: 'On demand', status: 'draft', knowledge: ''
});

export default function Agents({ params, mode = 'agents' }) {
  const { user, refreshUser, models } = useApp();
  const { data, loading, error, reload } = useFetch(() => api('/agents'), []);
  const [tab, setTab] = useState('mine');
  const [market, setMarket] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [builder, setBuilder] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState('');
  const [installing, setInstalling] = useState('');
  const agents = data || [];
  const automation = mode === 'automation';

  useEffect(() => {
    if (tab === 'templates' && !market) api('/marketplace/agents').then(setMarket).catch(() => setMarket([]));
  }, [tab]);

  useEffect(() => {
    if (!params?.agent) return;
    api('/agents/' + params.agent).then(setSelected).catch(() => {});
  }, [params?.agent]);

  useEffect(() => {
    if (!params?.tool) return;
    const f = findFeature(params.tool);
    setForm({ ...emptyForm(), name: f?.name || 'New agent', description: f?.description || '', instructions: f ? `You are the ${f.name} specialist. Complete the task end to end and return a finished deliverable.` : '', tools: ['documents', 'web-search'] });
    setBuilder('create');
  }, [params?.tool]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agents.filter(a => (filter === 'all' || a.status === filter) && (!q || a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.role.toLowerCase().includes(q)));
  }, [agents, search, filter]);

  const stats = {
    total: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    runs: agents.reduce((n, a) => n + (a.runs || 0), 0),
    credits: agents.reduce((n, a) => n + (a.runs || 0) * (a.creditsPerRun || 0), 0),
    scheduled: agents.filter(a => a.schedule && a.schedule !== 'On demand').length
  };

  const openBuilder = (agent) => {
    if (agent) { setForm({ ...emptyForm(), ...agent }); setBuilder(agent.id); }
    else { setForm({ ...emptyForm(), schedule: automation ? 'Every morning, 8am' : 'On demand' }); setBuilder('create'); }
  };

  const saveAgent = async () => {
    if (!form.name.trim()) return toast('Give the agent a name.', 'error');
    setSaving(true);
    try {
      const payload = { ...form, tools: form.tools || [] };
      if (builder === 'create') {
        const a = await api('/agents', 'POST', payload);
        toast('Agent created — review it, then switch it live.', 'success');
        setSelected(a);
      } else {
        const a = await api('/agents/' + builder, 'PATCH', payload);
        toast('Agent saved', 'success');
        setSelected(a);
      }
      setBuilder(null); reload();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const patchAgent = async (agent, patch, message = 'Agent updated') => {
    try {
      const a = await api('/agents/' + agent.id, 'PATCH', patch);
      setSelected(prev => prev?.id === a.id ? a : prev);
      reload();
      if (message) toast(message, 'success');
      return a;
    } catch (e) { toast(e.message, 'error'); }
  };

  const runAgent = async (agent) => {
    setRunning(agent.id);
    try {
      const d = await api('/agents/' + agent.id + '/run', 'POST', {});
      toast(`Run complete · ${d.run.summary}`, 'success');
      setSelected(d.agent);
      reload(); refreshUser?.();
    } catch (e) { toast(e.message, 'error'); }
    finally { setRunning(''); }
  };

  const removeAgent = async (agent) => {
    if (!window.confirm(`Delete “${agent.name}”? Its run history will be removed.`)) return;
    try { await api('/agents/' + agent.id, 'DELETE'); setSelected(null); reload(); toast('Agent deleted', 'success'); }
    catch (e) { toast(e.message, 'error'); }
  };

  const install = async (agent) => {
    setInstalling(agent.id);
    try {
      const a = await api('/marketplace/agents/' + agent.id + '/install', 'POST', {});
      toast(`Installed ${agent.name}`, 'success');
      setSelected(a); setTab('mine'); reload();
    } catch (e) { toast(e.message, 'error'); }
    finally { setInstalling(''); }
  };

  return (
    <div className="agents-page">
      <section className={cls('agents-hero', automation && 'automation')}>
        <div>
          <Badge tone="violet" dot>{automation ? 'Automation control room' : 'Agent workspace'}</Badge>
          <h2>{automation ? 'Put repetitive work on rails.' : 'Build an AI teammate, not a chatbot.'}</h2>
          <p>{automation
            ? 'Scheduled agents, approval points and an auditable run log. Every automation shows its cost and its last result.'
            : 'Describe the job, give an agent its tools and guardrails, then let it run — with approvals where it matters.'}</p>
          <div className="agent-hero-actions">
            <Btn variant="primary" icon="plus" onClick={() => openBuilder()}>{automation ? 'New automation' : 'Build an agent'}</Btn>
            <Btn variant="glass" icon="store" onClick={() => setTab('templates')}>Browse templates</Btn>
          </div>
        </div>
        <div className="agents-hero-stats">
          <div><b>{stats.active}</b><span>live agents</span></div>
          <div><b>{fmt(stats.runs)}</b><span>total runs</span></div>
          <div><b>{stats.scheduled}</b><span>scheduled</span></div>
          <div><b>{fmt(stats.credits)}</b><span>credits used</span></div>
        </div>
        <div className="agent-orb"><Icon name={automation ? 'zap' : 'bot'} size={42} /></div>
      </section>

      <div className="agents-toolbar">
        <div className="tabs">
          <button className={cls(tab === 'mine' && 'on')} onClick={() => setTab('mine')}>My agents <span className="tab-count">{agents.length}</span></button>
          <button className={cls(tab === 'templates' && 'on')} onClick={() => setTab('templates')}>Templates <span className="tab-count">{market?.length || '·'}</span></button>
        </div>
        <div className="agents-controls">
          <div className="chat-search"><Icon name="search" size={15} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agents" /></div>
          <div className="seg">{['all', 'active', 'paused', 'draft'].map(f => <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{f}</button>)}</div>
        </div>
      </div>

      {loading && <div className="agent-grid">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card skeleton" style={{ height: 230 }} />)}</div>}
      {error && <Empty icon="alert" title="Couldn’t load agents" text={error} action={<Btn onClick={reload}>Try again</Btn>} />}

      {tab === 'mine' && !loading && (
        visible.length === 0 ? (
          <Empty icon="bot" title={agents.length ? 'No agents match that filter' : automation ? 'No automations yet' : 'Your first agent is three minutes away'}
            text={agents.length ? 'Try a different status or search.' : 'Start from a template, or describe the job yourself. You can keep it in draft until you’re ready.'}
            action={<div className="row"><Btn variant="primary" icon="plus" onClick={() => openBuilder()}>Create agent</Btn><Btn variant="outline" icon="store" onClick={() => setTab('templates')}>Browse templates</Btn></div>} />
        ) : (
          <div className="agent-grid">
            {visible.map(a => (
              <Card key={a.id} className={cls('agent-card', a.status === 'active' && 'live')}>
                <div className="agent-card-top">
                  <span className="agent-emoji big">{a.emoji || '🤖'}</span>
                  <div className="agent-card-title"><h3>{a.name}</h3><span>{a.role}</span></div>
                  <Badge tone={STATUS_TONE[a.status] || 'default'} dot>{a.status}</Badge>
                </div>
                <p className="agent-desc">{a.description || 'No description yet. Open the agent to add instructions and guardrails.'}</p>
                <div className="agent-meta">
                  <span><Icon name="play" size={13} /> {fmt(a.runs || 0)} runs</span>
                  <span><Icon name="checkCircle" size={13} /> {a.successRate || 100}% success</span>
                  <span><Icon name="clock" size={13} /> {a.schedule || 'On demand'}</span>
                </div>
                <div className="agent-tools-mini">{(a.tools || []).slice(0, 4).map(t => <span key={t}>{t}</span>)}{(a.tools || []).length > 4 && <span>+{(a.tools || []).length - 4}</span>}</div>
                <div className="agent-card-foot">
                  <button onClick={() => setSelected(a)}><Icon name="eye" size={14} /> Open</button>
                  <button onClick={() => patchAgent(a, { status: a.status === 'active' ? 'paused' : 'active' }, a.status === 'active' ? 'Agent paused' : 'Agent is live')}><Icon name={a.status === 'active' ? 'pause' : 'play'} size={14} /> {a.status === 'active' ? 'Pause' : 'Activate'}</button>
                  <button className="agent-run-btn" disabled={running === a.id} onClick={() => runAgent(a)}>{running === a.id ? <Spinner size={13} /> : <Icon name="zap" size={14} />} Run now</button>
                </div>
              </Card>
            ))}
            <button className="agent-add-card" onClick={() => openBuilder()}>
              <span><Icon name="plus" size={22} /></span>
              <b>{automation ? 'New automation' : 'New agent'}</b>
              <small>Start blank or from a template</small>
            </button>
          </div>
        )
      )}

      {tab === 'templates' && (
        <div className="template-section">
          <div className="templates-note"><Icon name="store" size={17} /><span><b>Community templates</b> are published by NexAI users. Installing creates a private copy you can edit before switching live.</span></div>
          <div className="agent-grid">
            {(market || []).map(a => (
              <Card key={a.id} className="agent-card template">
                <div className="agent-card-top">
                  <span className="agent-emoji big">{a.emoji}</span>
                  <div className="agent-card-title"><h3>{a.name}</h3><span>{a.category || a.role} · by {a.author}</span></div>
                  <Badge tone="gold"><Icon name="star" size={11} /> {a.rating || '4.8'}</Badge>
                </div>
                <p className="agent-desc">{a.description}</p>
                <div className="agent-meta"><span><Icon name="download" size={13} /> {fmt(a.installs || 0)} installs</span><span><Icon name="checkCircle" size={13} /> {a.successRate || 96}% success</span><span><Icon name="zap" size={13} /> {a.creditsPerRun} credits/run</span></div>
                <div className="agent-card-foot">
                  <button onClick={() => setSelected(a)}><Icon name="eye" size={14} /> Preview</button>
                  <button className="agent-run-btn" disabled={installing === a.id} onClick={() => install(a)}>{installing === a.id ? <Spinner size={13} /> : <Icon name="download" size={14} />} Install</button>
                </div>
              </Card>
            ))}
            {!market && <div className="card skeleton" style={{ height: 220 }} />}
          </div>
        </div>
      )}

      {selected && <AgentDetail agent={selected} onClose={() => setSelected(null)} onEdit={() => { setSelected(null); openBuilder(selected); }} onRun={() => runAgent(selected)} onPatch={patchAgent} onDelete={removeAgent} running={running === selected.id} automation={automation} />}

      {builder && (
        <AgentBuilder form={form} setForm={setForm} saving={saving} models={models} editing={builder !== 'create'}
          onClose={() => setBuilder(null)} onSave={saveAgent} automation={automation} />
      )}
    </div>
  );
}

/* ------------------------------ detail ------------------------------ */
function AgentDetail({ agent, onClose, onEdit, onRun, onPatch, onDelete, running, automation }) {
  const runs = agent.runsLog || [];
  return (
    <Drawer title={agent.name} subtitle={`${agent.role} · ${agent.model}`} onClose={onClose} width={560}>
      <div className="agent-detail">
        <div className="agent-detail-hero">
          <span className="agent-emoji xl">{agent.emoji || '🤖'}</span>
          <div>
            <div className="row"><Badge tone={STATUS_TONE[agent.status] || 'default'} dot>{agent.status}</Badge>{agent.approved ? <Badge tone="green">Approved</Badge> : <Badge tone="amber">Needs approval</Badge>}</div>
            <p>{agent.description || 'No description yet.'}</p>
          </div>
        </div>
        <div className="agent-detail-stats">
          <div><b>{fmt(agent.runs || 0)}</b><span>runs</span></div>
          <div><b>{agent.successRate || 100}%</b><span>success</span></div>
          <div><b>{agent.creditsPerRun || 3}</b><span>credits/run</span></div>
          <div><b>{agent.schedule || 'On demand'}</b><span>schedule</span></div>
        </div>
        <div className="row wrap gap">
          <Btn variant="primary" icon="zap" loading={running} onClick={onRun}>Run now</Btn>
          <Btn variant="outline" icon="edit" onClick={onEdit}>Edit</Btn>
          <Btn variant="ghost" icon={agent.status === 'active' ? 'pause' : 'play'} onClick={() => onPatch(agent, { status: agent.status === 'active' ? 'paused' : 'active', approved: true }, agent.status === 'active' ? 'Agent paused' : 'Agent is live')}>{agent.status === 'active' ? 'Pause' : 'Activate'}</Btn>
          <Btn variant="ghost" icon="trash" onClick={() => onDelete(agent)}>Delete</Btn>
        </div>
        <div className="detail-section"><h4>Instructions</h4><div className="instruction-box">{agent.instructions || 'No instructions yet.'}</div></div>
        <div className="detail-section"><h4>Tools</h4><div className="chip-row">{(agent.tools || []).map(t => <span key={t} className="chip">{t}</span>)}{!(agent.tools || []).length && <span className="muted">No tools attached</span>}</div></div>
        {agent.knowledge && <div className="detail-section"><h4>Knowledge</h4><p className="muted">{agent.knowledge}</p></div>}
        <div className="detail-section">
          <div className="section-head"><div><h4>Run history</h4><p>Every execution, with duration and outcome.</p></div></div>
          {runs.length === 0 ? <div className="empty small"><span className="empty-ic"><Icon name="clock" size={20} /></span><p>No runs yet. Run this agent to see its first result.</p></div> : (
            <div className="run-list">
              {runs.map(r => (
                <div key={r.id} className="run-row">
                  <span className={cls('run-dot', r.status)} />
                  <div><b>{r.summary}</b><span>{timeAgo(r.at)} · {r.duration} · {r.status}</span></div>
                  <Badge tone={r.status === 'success' ? 'green' : 'red'}>{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
        {!agent.approved && <div className="detail-warning"><Icon name="alert" size={15} /><span>This agent hasn’t been approved. Activate it to grant permission to run.</span></div>}
      </div>
    </Drawer>
  );
}

/* ------------------------------ builder ----------------------------- */
function AgentBuilder({ form, setForm, saving, models, editing, onClose, onSave, automation }) {
  const [step, setStep] = useState(1);
  const set = (k, v) => setForm({ ...form, [k]: v });
  const toggleTool = (t) => set('tools', (form.tools || []).includes(t) ? form.tools.filter(x => x !== t) : [...(form.tools || []), t]);
  return (
    <Modal title={editing ? 'Edit agent' : automation ? 'New automation' : 'Build an agent'} subtitle="Describe the job. Set guardrails. Keep it in draft until it behaves." onClose={onClose} width={780}
      footer={<><span className="modal-step">Step {step} of 3</span><div className="row"><Btn variant="ghost" onClick={onClose}>Cancel</Btn>{step > 1 && <Btn variant="outline" icon="left" onClick={() => setStep(step - 1)}>Back</Btn>}{step < 3 ? <Btn variant="primary" iconRight="right" onClick={() => setStep(step + 1)}>Continue</Btn> : <Btn variant="primary" icon="check" loading={saving} onClick={onSave}>{editing ? 'Save changes' : 'Create agent'}</Btn>}</div></>}>
      <div className="builder-steps">
        {[1, 2, 3].map(n => <span key={n} className={cls(step === n && 'on', step > n && 'done')}>{n === 3 ? 'Review' : n === 1 ? 'Identity' : 'Behaviour'}</span>)}
      </div>
      {step === 1 && (
        <div className="builder-body">
          <div className="emoji-picker">
            <span className="field-label">Agent avatar</span>
            <div className="emoji-row">{EMOJIS.map(e => <button key={e} className={cls(form.emoji === e && 'on')} onClick={() => set('emoji', e)}>{e}</button>)}</div>
          </div>
          <div className="grid-2">
            <Field label="Name"><Input autoFocus value={form.name} onChange={e => set('name', e.target.value)} placeholder="Market Scout" /></Field>
            <Field label="Role"><Input value={form.role} onChange={e => set('role', e.target.value)} placeholder="Competitive intelligence analyst" /></Field>
          </div>
          <Field label="What does it do?" hint="One or two sentences a teammate would understand."><Textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Monitors competitor pricing pages and delivers a Monday brief." /></Field>
          <Field label="Model"><Select value={form.model} onChange={e => set('model', e.target.value)}>{(models?.length ? models : [{ id: 'nexai-core', name: 'NexAI Core' }]).map(m => <option key={m.id} value={m.id}>{m.name} — {m.tagline}</option>)}</Select></Field>
        </div>
      )}
      {step === 2 && (
        <div className="builder-body">
          <Field label="Instructions and guardrails" hint="Be explicit about what it may do, what needs approval, and what it must never do.">
            <Textarea rows={6} value={form.instructions} onChange={e => set('instructions', e.target.value)} placeholder="You monitor 8 competitor sites. Summarise changes that affect pricing or positioning. Cite every claim. Never publish externally. Flag anything uncertain for human review." />
          </Field>
          <div className="grid-2">
            <Field label="Schedule"><Select value={form.schedule} onChange={e => set('schedule', e.target.value)}>{SCHEDULES.map(s => <option key={s}>{s}</option>)}</Select></Field>
            <Field label="Knowledge" hint="Optional context: sources, policies or a glossary."><Input value={form.knowledge} onChange={e => set('knowledge', e.target.value)} placeholder="Brand guide, pricing sheet, support policy…" /></Field>
          </div>
          <div className="field"><span className="field-label">Tools</span><div className="tool-chip-grid">{TOOL_OPTIONS.map(t => <button key={t} className={cls('tool-chip', (form.tools || []).includes(t) && 'on')} onClick={() => toggleTool(t)}><Icon name={t.includes('web') ? 'globe' : t.includes('doc') ? 'file' : t.includes('ticket') ? 'headset' : t.includes('image') ? 'image' : t.includes('sheet') || t === 'csv' || t === 'database' ? 'table' : t.includes('mail') ? 'mail' : t.includes('github') ? 'code' : t.includes('stripe') ? 'card' : t.includes('calendar') ? 'calendar' : t.includes('slack') ? 'chat' : 'plug'} size={14} /> {t}</button>)}</div></div>
        </div>
      )}
      {step === 3 && (
        <div className="builder-body">
          <div className="builder-review">
            <span className="agent-emoji xl">{form.emoji}</span>
            <div><h3>{form.name || 'Untitled agent'}</h3><p>{form.role}</p></div>
            <Badge tone="default">{form.schedule}</Badge>
          </div>
          <div className="review-grid">
            <div><span>Description</span><p>{form.description || '—'}</p></div>
            <div><span>Model</span><p>{models?.find(m => m.id === form.model)?.name || form.model}</p></div>
            <div><span>Tools</span><p>{(form.tools || []).join(', ') || 'None'}</p></div>
            <div><span>Status</span><p>{form.status === 'active' ? 'Live immediately' : 'Starts in draft'}</p></div>
          </div>
          <div className="instruction-box review">{form.instructions || 'No instructions yet.'}</div>
          <Field label="When you create it"><Select value={form.status} onChange={e => set('status', e.target.value)}><option value="draft">Keep in draft — review first</option><option value="active">Activate immediately</option></Select></Field>
          <div className="detail-note"><Icon name="shield" size={15} /><span>Agents can’t spend more than {form.creditsPerRun || 3} credits per run, and external publishing always requires approval.</span></div>
        </div>
      )}
    </Modal>
  );
}
