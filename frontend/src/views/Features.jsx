import React, { useMemo, useState } from 'react';
import { copy } from '../api.js';
import { useApp, go, openFeature } from '../context.js';
import { Icon, Btn, IconBtn, Card, Badge, Empty, Modal, Input, Select, useFetch, fmt, cls, toast, Progress } from '../ui.jsx';
import { FEATURES, MODULES } from '../nav.js';

const ACTIONS = {
  chat: { label: 'Chat', icon: 'chat', tone: 'violet' },
  code: { label: 'Code', icon: 'code', tone: 'green' },
  doc: { label: 'Document', icon: 'file', tone: 'sky' },
  image: { label: 'Image', icon: 'image', tone: 'pink' },
  video: { label: 'Video', icon: 'film', tone: 'violet' },
  voice: { label: 'Voice', icon: 'mic', tone: 'green' },
  agent: { label: 'Agent', icon: 'bot', tone: 'amber' },
  data: { label: 'Data', icon: 'chart', tone: 'cyan' },
  admin: { label: 'Admin', icon: 'shield', tone: 'red' },
  settings: { label: 'Settings', icon: 'settings', tone: 'default' }
};

export default function Features() {
  const { catalog } = useApp();
  const modules = catalog?.length ? catalog : MODULES;
  const [q, setQ] = useState('');
  const [module, setModule] = useState('all');
  const [action, setAction] = useState('all');
  const [view, setView] = useState('grid');
  const [active, setActive] = useState(null);
  const [expanded, setExpanded] = useState('');

  const features = useMemo(() => modules.flatMap(m => (m.features || []).map(f => ({ ...f, moduleId: m.id, moduleName: m.name, moduleShort: m.short, moduleIcon: m.icon, moduleColor: m.color }))), [modules]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return features.filter(f =>
      (module === 'all' || f.moduleId === module) &&
      (action === 'all' || f.action === action) &&
      (!needle || (f.name + ' ' + (f.description || '') + ' ' + f.id + ' ' + f.moduleName).toLowerCase().includes(needle))
    );
  }, [features, q, module, action]);

  const grouped = useMemo(() => {
    const out = {};
    visible.forEach(f => { (out[f.moduleId] = out[f.moduleId] || []).push(f); });
    return Object.entries(out);
  }, [visible]);

  const selectedModule = modules.find(m => m.id === expanded);
  const counts = useMemo(() => Object.fromEntries(modules.map(m => [m.id, (m.features || []).length])), [modules]);

  return (
    <div className="features-page">
      <header className="features-hero">
        <div>
          <Badge tone="violet" dot>The complete blueprint</Badge>
          <h2>{fmt(features.length)} capabilities. {modules.length} modules. One workspace.</h2>
          <p>Every feature from the NexAI product blueprint, implemented or faithfully simulated in this build. Search it, filter it, and jump straight into the tool.</p>
          <div className="features-search">
            <Icon name="search" size={19} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search 370 features — try “contract”, “voice”, “SQL”, “forecast”…" />
            {q && <IconBtn name="close" size={15} label="Clear" onClick={() => setQ('')} />}
          </div>
          <div className="features-hero-stats"><div><b>{fmt(features.length)}</b><span>features</span></div><div><b>{modules.length}</b><span>modules</span></div><div><b>{Object.keys(ACTIONS).length}</b><span>workspace modes</span></div><div><b>100%</b><span>blueprint coverage</span></div></div>
        </div>
        <div className="features-hero-art">
          <div className="feature-orbit"><span><Icon name="sparkles" size={30} /></span><i /><i /><i /></div>
        </div>
      </header>

      <div className="features-toolbar">
        <div className="features-filters">
          <div className="seg scroll">{['all', ...modules.map(m => m.id)].map(id => <button key={id} className={module === id ? 'on' : ''} onClick={() => { setModule(id); setExpanded(''); }}>{id === 'all' ? `All ${features.length}` : modules.find(m => m.id === id)?.name}</button>)}</div>
          <div className="features-subfilters">
            <Select className="mini-select" value={action} onChange={e => setAction(e.target.value)}><option value="all">All workspace modes</option>{Object.entries(ACTIONS).map(([id, a]) => <option key={id} value={id}>{a.label}</option>)}</Select>
            <span className="muted small">{visible.length} shown</span>
            <span className="grow" />
            <div className="seg"><button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')}><Icon name="grid" size={14} /> Grid</button><button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}><Icon name="layers" size={14} /> List</button></div>
          </div>
        </div>
      </div>

      {!q && module === 'all' && action === 'all' && <ModuleOverview modules={modules} onOpen={setExpanded} onFeature={setActive} />}

      {visible.length === 0 ? <Empty icon="search" title="No features match" text={`Nothing matched “${q}”. Try a shorter phrase or clear the filters.`} action={<Btn variant="outline" onClick={() => { setQ(''); setModule('all'); setAction('all'); }}>Clear all filters</Btn>} /> : (
        <>
          {module !== 'all' && modules.find(m => m.id === module)?.blurb && (
            <div className="module-strip" data-module={module}>
              <span className="module-strip-ic"><Icon name={modules.find(m => m.id === module).icon} size={20} /></span>
              <div><b>{modules.find(m => m.id === module).name}</b><p>{modules.find(m => m.id === module).blurb}</p></div>
              <Badge tone="default">{counts[module]} features</Badge>
              <Btn size="sm" variant="outline" onClick={() => go(module === 'developer' ? 'developer' : module === 'documents' ? 'documents' : ['writing', 'education', 'business', 'marketing', 'finance'].includes(module) ? module : 'chat')}>Open workspace</Btn>
            </div>
          )}

          {view === 'grid' ? (
            <div className="feature-grid">
              {visible.map(f => (
                <button key={f.id} className="feature-card" onClick={() => setActive(f)}>
                  <span className="feature-card-top">
                    <span className="feature-ic" data-module={f.moduleId}><Icon name={f.moduleIcon} size={16} /></span>
                    <span className="feature-num">#{String(f.number).padStart(3, '0')}</span>
                    <Badge tone={ACTIONS[f.action]?.tone || 'default'}>{ACTIONS[f.action]?.label || f.action}</Badge>
                  </span>
                  <b>{f.name}</b>
                  <span className="feature-desc">{f.description}</span>
                  <span className="feature-foot"><span>{f.moduleName}</span><Icon name="arrowUpRight" size={13} /></span>
                </button>
              ))}
            </div>
          ) : (
            <Card className="table-card">
              <div className="table-wrap"><table>
                <thead><tr><th>#</th><th>Feature</th><th>Module</th><th>Mode</th><th></th></tr></thead>
                <tbody>{visible.map(f => (
                  <tr key={f.id}>
                    <td className="mono muted">{String(f.number).padStart(3, '0')}</td>
                    <td><button className="feature-link" onClick={() => setActive(f)}><b>{f.name}</b><span>{f.description}</span></button></td>
                    <td><Badge tone="default">{f.moduleName}</Badge></td>
                    <td><Badge tone={ACTIONS[f.action]?.tone || 'default'}>{ACTIONS[f.action]?.label || f.action}</Badge></td>
                    <td><div className="row end"><IconBtn name="copy" size={14} label="Copy ID" onClick={async () => { await copy(f.id); toast('Feature ID copied', 'success'); }} /><IconBtn name="arrowUpRight" size={14} label="Open" onClick={() => openFeature(f)} /></div></td>
                  </tr>
                ))}</tbody>
              </table></div>
            </Card>
          )}

          {grouped.length > 1 && view === 'grid' && (
            <p className="features-note"><Icon name="info" size={14} /> Showing {visible.length} features across {grouped.length} modules. Use the module chips above to narrow the list.</p>
          )}
        </>
      )}

      {active && <FeatureModal feature={active} modules={modules} onClose={() => setActive(null)} />}
    </div>
  );
}

function ModuleOverview({ modules, onOpen, onFeature }) {
  const [limit, setLimit] = useState(6);
  return (
    <>
      <div className="section-head"><div><h3>Browse by module</h3><p>Each module has a purpose-built workspace with 20 tools.</p></div><Badge tone="violet">{modules.length} modules</Badge></div>
      <div className="module-grid">
        {modules.map(m => (
          <Card key={m.id} className="module-card" data-module={m.id}>
            <div className="module-card-head">
              <span className="module-card-ic"><Icon name={m.icon} size={20} /></span>
              <div><h3>{m.name}</h3><p>{m.short}</p></div>
              <Badge tone="default">{m.features?.length || 0}</Badge>
            </div>
            <p className="module-card-blurb">{m.blurb}</p>
            <div className="module-card-features">
              {(m.features || []).slice(0, 4).map(f => <button key={f.id} onClick={() => onFeature({ ...f, moduleId: m.id, moduleName: m.name, moduleIcon: m.icon, moduleShort: m.short, moduleColor: m.color })}><span>{String(f.number).padStart(3, '0')}</span>{f.name}</button>)}
            </div>
            <div className="row between"><span className="muted small">{m.features?.length || 0} tools</span><Btn size="sm" variant="outline" icon="arrowUpRight" onClick={() => onOpen(m.id)}>View all</Btn></div>
          </Card>
        ))}
      </div>
    </>
  );
}

function FeatureModal({ feature, modules, onClose }) {
  const mod = modules.find(m => m.id === feature.moduleId);
  const action = ACTIONS[feature.action] || ACTIONS.chat;
  return (
    <Modal title={feature.name} subtitle={`Feature #${feature.number} · ${feature.moduleName}`} width={660} onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose}>Close</Btn><Btn variant="outline" icon="copy" onClick={async () => { await copy(feature.id); toast('Feature ID copied', 'success'); }}>Copy ID</Btn><Btn variant="primary" icon="arrowUpRight" onClick={() => { onClose(); openFeature(feature); }}>Open feature</Btn></>}>
      <div className="feature-detail-top">
        <span className="module-card-ic"><Icon name={feature.moduleIcon || mod?.icon || 'sparkles'} size={22} /></span>
        <div><Badge tone={action.tone}>{action.label} workspace</Badge><Badge tone="default">{feature.moduleName}</Badge></div>
      </div>
      <p className="feature-detail-desc">{feature.description}</p>
      {mod?.blurb && <div className="detail-note"><Icon name="info" size={14} /><span><b>{mod.name}:</b> {mod.blurb}</span></div>}
      <div className="feature-detail-grid">
        <div><span>Feature ID</span><code>{feature.id}</code></div>
        <div><span>Action</span><b className="capitalize">{feature.action}</b></div>
        <div><span>Module</span><b>{feature.moduleName}</b></div>
        <div><span>Credit cost</span><b>{feature.action === 'image' ? '2 credits' : feature.action === 'video' ? '5 credits' : feature.action === 'data' ? '1–3 credits' : '1 credit'}</b></div>
      </div>
      <div className="feature-system-prompt">
        <div className="feature-system-head"><span><Icon name="terminal" size={13} /> Tuned system prompt</span><Badge tone="green">Preview</Badge></div>
        <p>{feature.systemPrompt || `You are NexAI running the “${feature.name}” tool. ${feature.description} Follow the module’s quality bar: be specific, state assumptions, flag uncertainty and return a finished deliverable the user can ship.`}</p>
      </div>
      <div className="detail-note"><Icon name="sparkles" size={14} /><span>This feature is available in the {feature.moduleName} workspace and via <code>/api/v1/chat</code> with tool ID <code>{feature.id}</code>.</span></div>
    </Modal>
  );
}
