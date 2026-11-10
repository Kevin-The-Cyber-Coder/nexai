import React, { useState } from 'react';
import { api } from '../api.js';
import { useApp, go, openFeature } from '../context.js';
import { Icon, Btn, IconBtn, Card, Badge, Progress, Ring, AreaChart, Avatar, useFetch, fmt, timeAgo, cls, Empty, Sparkline } from '../ui.jsx';
import { MODULES, PLAN_LABELS } from '../nav.js';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

export default function Dashboard({ user, refreshUser }) {
  const { data, loading, error, reload } = useFetch(() => api('/dashboard'), []);
  const { models } = useApp();
  const [range, setRange] = useState(30);
  if (loading) return <DashSkeleton />;
  if (error) return <Empty icon="alert" title="Dashboard unavailable" text={error} action={<Btn variant="outline" onClick={reload}>Try again</Btn>} />;

  const series = (data.usage.series || []).slice(-range);
  const plan = data.plan;
  const counts = data.counts;
  const quick = [
    { icon: 'chat', label: 'New chat', sub: 'Ask anything', color: 'violet', onClick: () => go('chat', { new: Date.now() }) },
    { icon: 'globe', label: 'Deep research', sub: 'Cited brief', color: 'sky', onClick: () => go('research') },
    { icon: 'image', label: 'Generate image', sub: 'Text to visual', color: 'pink', onClick: () => go('image') },
    { icon: 'bot', label: 'Build an agent', sub: 'No code', color: 'green', onClick: () => go('agents') },
    { icon: 'chart', label: 'Analyse data', sub: 'CSV or Excel', color: 'amber', onClick: () => go('analytics') },
    { icon: 'documents', label: 'Read a document', sub: 'PDF or Word', color: 'blue', onClick: () => go('documents') }
  ];

  return (
    <div className="dash">
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-main">
          <Badge tone="violet" dot>{PLAN_LABELS[user.plan]} workspace</Badge>
          <h1>{greeting()}, {user.name.split(' ')[0]}.</h1>
          <p>Your workspace is awake. 370 AI capabilities, one shared memory — what should we move forward today?</p>
          <div className="hero-actions">
            <Btn variant="primary" icon="sparkles" onClick={() => go('chat', { new: Date.now() })}>Start a conversation</Btn>
            <Btn variant="glass" icon="bot" onClick={() => go('agents')}>Build an agent</Btn>
          </div>
          <div className="hero-metrics">
            <div><b>{fmt(plan.remaining)}</b><span>credits left</span></div>
            <div><b>{counts.conversations}</b><span>active chats</span></div>
            <div><b>{counts.activeAgents}</b><span>agents running</span></div>
            <div><b>{counts.projects}</b><span>projects</span></div>
          </div>
        </div>
        <div className="hero-art">
          <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
          <div className="float-card fc-1"><span className="fc-ic"><Icon name="checkCircle" size={15} /></span><div><b>Market Scout</b><span>Brief delivered · 3m ago</span></div></div>
          <div className="float-card fc-2"><span className="fc-ic sky"><Icon name="chart" size={15} /></span><div><b>+11% MRR</b><span>Weekly operating brief</span></div></div>
          <div className="float-card fc-3"><span className="fc-ic pink"><Icon name="image" size={15} /></span><div><b>4 visuals</b><span>Image Studio</span></div></div>
        </div>
      </section>

      <div className="quick-grid">
        {quick.map(q => (
          <button key={q.label} className="quick" onClick={q.onClick}>
            <span className={'quick-ic ' + q.color}><Icon name={q.icon} size={19} /></span>
            <span><b>{q.label}</b><small>{q.sub}</small></span>
            <Icon name="arrowUpRight" size={15} className="quick-go" />
          </button>
        ))}
      </div>

      <div className="dash-grid">
        <div className="col-main">
          <Card className="usage-card">
            <div className="card-head">
              <div><h3>AI usage</h3><p>{fmt(data.usage.totals.credits)} credits · {fmt(data.usage.totals.requests)} requests in the last {range} days</p></div>
              <div className="row">
                <div className="seg">{[[7, '7d'], [30, '30d']].map(([v, l]) => <button key={v} className={range === v ? 'on' : ''} onClick={() => setRange(v)}>{l}</button>)}</div>
                <Btn size="sm" variant="ghost" icon="arrowUpRight" onClick={() => go('usage')}>Details</Btn>
              </div>
            </div>
            <div className="usage-top">
              <div><span className="k-label">Total credits</span><b className="k-big">{fmt(data.usage.totals.credits)}</b><span className="k-delta"><Icon name="arrowUp" size={12} /> steady</span></div>
              <div className="usage-mods">{data.usage.byModule.slice(0, 4).map((m, i) => (
                <div key={m.moduleId} className="umod"><i style={{ background: ['#818cf8', '#22d3ee', '#f472b6', '#34d399'][i] }} /><span>{MODULES.find(x => x.id === m.moduleId)?.short || m.moduleId}</span><b>{fmt(m.credits)}</b></div>
              ))}</div>
            </div>
            <AreaChart data={series} height={190} />
          </Card>

          <Card>
            <div className="card-head"><div><h3>Recommended for you</h3><p>Picked from the 370-feature library based on your workspace</p></div><Btn size="sm" variant="ghost" onClick={() => go('features')}>All features <Icon name="right" size={14} /></Btn></div>
            <div className="feature-grid">
              {data.recommended.map(f => (
                <button key={f.id} className="feature-tile" onClick={() => openFeature(f)}>
                  <span className="ft-num">{String(f.number).padStart(3, '0')}</span>
                  <span className="ft-body"><b>{f.name}</b><small>{f.moduleName}</small></span>
                  <span className="ft-go"><Icon name="arrowUpRight" size={14} /></span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="card-head"><div><h3>Recent conversations</h3><p>Pick up exactly where you left off</p></div><Btn size="sm" variant="ghost" icon="plus" onClick={() => go('chat', { new: Date.now() })}>New</Btn></div>
            {data.recent.length === 0 ? <Empty icon="chat" title="No conversations yet" text="Start with a question, or open the feature library." action={<Btn variant="primary" onClick={() => go('chat', { new: Date.now() })}>Start chatting</Btn>} /> : (
              <div className="recent-list">
                {data.recent.map(c => (
                  <button key={c.id} className="recent" onClick={() => go('chat', { c: c.id })}>
                    <span className="recent-ic"><Icon name={c.toolId ? 'sparkles' : 'chat'} size={16} /></span>
                    <span className="recent-body"><b>{c.pinned && <Icon name="pin" size={11} />} {c.title}</b><small>{c.preview || 'No messages yet'}</small></span>
                    <span className="recent-meta">{c.messages} msg · {timeAgo(c.updatedAt)}</span>
                    <Icon name="right" size={15} />
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="col-side">
          <Card className="plan-card">
            <div className="card-head"><div><h3>Your plan</h3><p>{plan.name} · renews monthly</p></div><Badge tone="violet">{PLAN_LABELS[user.plan]}</Badge></div>
            <div className="plan-ring">
              <Ring value={plan.percent} size={108} color="url(#planGrad)">
                <div className="ring-center"><b>{plan.percent}%</b><span>used</span></div>
              </Ring>
              <div className="plan-facts">
                <div><span>Remaining</span><b>{fmt(plan.remaining)}</b></div>
                <div><span>Monthly</span><b>{fmt(plan.credits)}</b></div>
                <div><span>Seats</span><b>{Math.max(1, data.counts.team)} / {plan.seats}</b></div>
              </div>
            </div>
            <div className="plan-bar"><Progress value={plan.percent} /></div>
            <div className="plan-actions"><Btn variant="primary" size="sm" onClick={() => go('billing')}>Upgrade plan</Btn><Btn variant="ghost" size="sm" onClick={() => go('usage')}>View usage</Btn></div>
            <div className="plan-note"><Icon name="zap" size={13} /> Credits reset on the 1st. Unused credits don’t roll over.</div>
          </Card>

          <Card>
            <div className="card-head"><div><h3>Agents at work</h3><p>{counts.activeAgents} active · {counts.agents} total</p></div><IconBtn name="right" label="All agents" onClick={() => go('agents')} /></div>
            <div className="agent-mini-list">
              {data.agents.length === 0 && <p className="muted">No agents yet. Build your first in minutes.</p>}
              {data.agents.map(a => (
                <button key={a.id} className="agent-mini" onClick={() => go('agents', { agent: a.id })}>
                  <span className="agent-emoji">{a.emoji}</span>
                  <span><b>{a.name}</b><small>{a.status === 'active' ? `Ran ${a.runs} times · ${a.successRate}% success` : a.status}</small></span>
                  <span className={'status-dot ' + a.status} />
                </button>
              ))}
            </div>
            <Btn variant="soft" size="sm" icon="plus" className="w-full" onClick={() => go('agents')}>Build a new agent</Btn>
          </Card>

          <Card>
            <div className="card-head"><div><h3>Activity</h3><p>Latest across your workspace</p></div></div>
            <div className="activity-list">
              {data.activity.map(a => (
                <div key={a.id} className="activity">
                  <span className="act-dot" />
                  <div><b>{a.name}</b><span>{a.credits} credit{a.credits === 1 ? '' : 's'} · {timeAgo(a.at)}</span></div>
                </div>
              ))}
              {data.activity.length === 0 && <p className="muted">Nothing yet — your usage will appear here.</p>}
            </div>
          </Card>

          <Card className="coverage-card">
            <div className="coverage-top"><div><span className="k-label">Feature coverage</span><b className="k-big">370</b><span className="muted">across 19 modules</span></div><span className="coverage-ring"><Ring value={100} size={64} stroke={6} color="#34d399"><Icon name="layers" size={20} /></Ring></span></div>
            <div className="coverage-tags">{MODULES.slice(0, 6).map(m => <span key={m.id}>{m.short}</span>)}<span>+13</span></div>
            <Btn variant="ghost" size="sm" onClick={() => go('features')}>Explore the library <Icon name="right" size={14} /></Btn>
          </Card>

          <Card>
            <div className="card-head"><div><h3>Model routing</h3><p>Automatic, per task</p></div><Badge tone="green" dot>Live</Badge></div>
            <div className="model-mini">
              {(models.length ? models : [{ name: 'NexAI Core', provider: 'NexAI', badge: 'Default' }, { name: 'NexAI Reason', provider: 'NexAI', badge: 'Reasoning' }, { name: 'Claude Sonnet 4.5', provider: 'Anthropic', badge: 'Writing' }]).slice(0, 3).map(m => (
                <div key={m.id || m.name} className="model-row"><span className="model-dot" style={{ background: m.color || '#818cf8' }} /><span><b>{m.name}</b><small>{m.provider}</small></span><Badge tone="default">{m.badge}</Badge></div>
              ))}
            </div>
            <Btn variant="ghost" size="sm" className="w-full" onClick={() => go('models')}>Compare models</Btn>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DashSkeleton() {
  return <div className="dash"><div className="hero skeleton" style={{ height: 260 }} /><div className="quick-grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="quick skeleton" style={{ height: 72 }} />)}</div><div className="dash-grid"><div className="col-main">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card skeleton" style={{ height: i === 0 ? 320 : 220 }} />)}</div><div className="col-side">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card skeleton" style={{ height: 180 }} />)}</div></div></div>;
}
