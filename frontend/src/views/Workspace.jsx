import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, copy, download } from '../api.js';
import { useApp, go, openFeature } from '../context.js';
import { Icon, Btn, IconBtn, Card, Badge, Avatar, Empty, Modal, Progress, Field, Input, Textarea, Select, useFetch, fmt, money, timeAgo, dateFmt, bytes, cls, toast, Spinner, Ring } from '../ui.jsx';
import { MODULES } from '../nav.js';

const VIEWS = {
  projects: { icon: 'folder', badge: 'Workspace', title: 'My Projects', lead: 'Every thread, file, agent and brief grouped around the work it belongs to.', tone: 'violet' },
  files: { icon: 'file', badge: 'Workspace', title: 'My Files', lead: 'Uploads, exports and generated deliverables — one searchable library.', tone: 'sky' },
  prompts: { icon: 'sparkles', badge: 'Library', title: 'Prompt Library', lead: 'Save the prompts that work, share them with your team, reuse them forever.', tone: 'amber' },
  marketplace: { icon: 'store', badge: 'Marketplace', title: 'AI Marketplace', lead: 'Install proven agents built by operators, researchers and support leads.', tone: 'pink' },
  integrations: { icon: 'plug', badge: 'Connections', title: 'Integrations', lead: 'Connect NexAI to the tools where the work already lives.', tone: 'green' },
  team: { icon: 'users', badge: 'People', title: 'Team Workspace', lead: 'Seats, roles and shared context across the whole workspace.', tone: 'cyan' }
};

export default function Workspace({ view = 'projects' }) {
  const meta = VIEWS[view] || VIEWS.projects;
  return (
    <div className="workspace-page">
      <header className="page-head surface-head">
        <div>
          <Badge tone={meta.tone} dot>{meta.badge}</Badge>
          <h2>{meta.title}</h2>
          <p>{meta.lead}</p>
        </div>
        <div className="page-head-art"><span className="stat-ic violet"><Icon name={meta.icon} size={22} /></span></div>
      </header>
      {view === 'projects' && <Projects />}
      {view === 'files' && <Files />}
      {view === 'prompts' && <Prompts />}
      {view === 'marketplace' && <Marketplace />}
      {view === 'integrations' && <Integrations />}
      {view === 'team' && <Team />}
    </div>
  );
}

/* ------------------------------- projects ------------------------------- */
function Projects() {
  const { data, loading, reload } = useFetch(() => api('/projects'));
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);

  useEffect(() => { if (data) setProjects(data); }, [data]);

  const visible = projects.filter(p => filter === 'all' || p.status === filter);

  const create = async (form) => {
    try {
      const p = await api('/projects', 'POST', form);
      setProjects(x => [p, ...x]); setOpen(false); reload();
      toast('Project created', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  const save = async (form) => {
    try {
      const p = await api('/projects/' + editing.id, 'PATCH', form);
      setProjects(x => x.map(i => i.id === p.id ? p : i)); setEditing(null); reload();
      toast('Project updated', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete “${p.name}”? Files stay in your library.`)) return;
    try { await api('/projects/' + p.id, 'DELETE'); setProjects(x => x.filter(i => i.id !== p.id)); toast('Project deleted', 'success'); }
    catch (e) { toast(e.message, 'error'); }
  };

  const totals = useMemo(() => ({
    active: projects.filter(p => p.status === 'active').length,
    items: projects.reduce((a, p) => a + (p.items || 0), 0),
    members: projects.reduce((a, p) => a + (p.members || 0), 0),
    progress: projects.length ? Math.round(projects.reduce((a, p) => a + (p.progress || 0), 0) / projects.length) : 0
  }), [projects]);

  return (
    <>
      <div className="ws-stats">
        <Card><div className="ws-stat"><span className="stat-ic violet"><Icon name="folder" size={17} /></span><div><b>{projects.length}</b><span>projects</span></div></div></Card>
        <Card><div className="ws-stat"><span className="stat-ic green"><Icon name="zap" size={17} /></span><div><b>{totals.active}</b><span>in flight</span></div></div></Card>
        <Card><div className="ws-stat"><span className="stat-ic cyan"><Icon name="layers" size={17} /></span><div><b>{fmt(totals.items)}</b><span>work items</span></div></div></Card>
        <Card><div className="ws-stat"><span className="stat-ic amber"><Icon name="users" size={17} /></span><div><b>{totals.members}</b><span>member slots</span></div></div></Card>
      </div>

      <div className="ws-toolbar">
        <div className="seg">{['all', 'active', 'review', 'planning', 'paused'].map(s => <button key={s} className={filter === s ? 'on' : ''} onClick={() => setFilter(s)}>{s === 'all' ? 'All projects' : s[0].toUpperCase() + s.slice(1)}</button>)}</div>
        <div className="row"><Btn variant="outline" icon="layers" onClick={() => go('features')}>Browse features</Btn><Btn variant="primary" icon="plus" onClick={() => setOpen(true)}>New project</Btn></div>
      </div>

      {loading && !projects.length ? <div className="row" style={{ padding: 40 }}><Spinner size={22} /></div> : visible.length === 0 ? (
        <Empty icon="folder" title="No projects here yet" text="Create a project to group conversations, files and agent runs around a single outcome." action={<Btn variant="primary" icon="plus" onClick={() => setOpen(true)}>New project</Btn>} />
      ) : (
        <div className="project-grid">
          {visible.map(p => (
            <Card key={p.id} className="project-card">
              <div className="project-top">
                <span className="project-icon" style={{ background: (p.color || '#6366f1') + '22', color: p.color || '#6366f1' }}><Icon name="folder" size={18} /></span>
                <Badge tone={p.status === 'active' ? 'green' : p.status === 'review' ? 'amber' : p.status === 'planning' ? 'blue' : 'default'}>{p.status}</Badge>
                <span className="grow" />
                <IconBtn name="settings" size={15} label="Edit" onClick={() => setEditing(p)} />
                <IconBtn name="trash" size={15} label="Delete" onClick={() => remove(p)} />
              </div>
              <h3>{p.name}</h3>
              <p>{p.description || 'No description yet.'}</p>
              <div className="project-progress"><span>Progress</span><b>{p.progress || 0}%</b></div>
              <Progress value={p.progress || 0} />
              <div className="project-meta">
                <span><Icon name="layers" size={13} /> {p.items || 0} items</span>
                <span><Icon name="users" size={13} /> {p.members || 1}</span>
                <span><Icon name="clock" size={13} /> {timeAgo(p.updatedAt || p.createdAt)}</span>
              </div>
              <div className="row"><Btn size="sm" variant="outline" icon="chat" onClick={() => go('chat', { c: p.id, q: p.name })}>Open work</Btn><Btn size="sm" variant="ghost" icon="file" onClick={() => go('files')}>Files</Btn></div>
            </Card>
          ))}
        </div>
      )}

      {(open || editing) && <ProjectModal project={editing} onClose={() => { setOpen(false); setEditing(null); }} onSubmit={editing ? save : create} />}
    </>
  );
}

function ProjectModal({ project, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: project?.name || '', description: project?.description || '', status: project?.status || 'active', progress: project?.progress || 0, color: project?.color || '#6366f1' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const colors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
  return (
    <Modal title={project ? 'Edit project' : 'New project'} subtitle="Group the work around one outcome." onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={project ? 'check' : 'plus'} disabled={!form.name.trim()} onClick={() => onSubmit(form)}>{project ? 'Save changes' : 'Create project'}</Btn></>}>
      <Field label="Project name"><Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Q1 launch" autoFocus /></Field>
      <Field label="Description"><Textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What does done look like?" /></Field>
      <div className="grid-2">
        <Field label="Status"><Select value={form.status} onChange={e => set('status', e.target.value)}>{['active', 'planning', 'review', 'paused'].map(s => <option key={s} value={s}>{s}</option>)}</Select></Field>
        <Field label={`Progress · ${form.progress}%`}><input className="range" type="range" min="0" max="100" step="1" value={form.progress} onChange={e => set('progress', Number(e.target.value))} /></Field>
      </div>
      <Field label="Colour"><div className="color-row">{colors.map(c => <button key={c} className={cls('color-swatch', form.color === c && 'on')} style={{ background: c }} onClick={() => set('color', c)} aria-label={c} />)}</div></Field>
    </Modal>
  );
}

/* -------------------------------- files -------------------------------- */
const FILE_TYPES = ['PDF', 'Word', 'Excel', 'CSV', 'Markdown', 'Image', 'Text'];

function Files() {
  const { data, loading, reload } = useFetch(() => api('/files'));
  const [files, setFiles] = useState([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');

  useEffect(() => { if (data) setFiles(data); }, [data]);

  const visible = files.filter(f => (type === 'all' || f.type === type) && (!q || f.name.toLowerCase().includes(q.toLowerCase())));
  const totalSize = files.reduce((a, f) => a + (f.size || 0), 0);

  const add = async (form) => {
    try {
      const f = await api('/files', 'POST', form);
      setFiles(x => [f, ...x]); setOpen(false); reload();
      toast('File added to your library', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  const remove = async (f) => {
    if (!window.confirm(`Remove ${f.name}?`)) return;
    try { await api('/files/' + f.id, 'DELETE'); setFiles(x => x.filter(i => i.id !== f.id)); toast('File removed', 'success'); }
    catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <div className="ws-stats">
        <Card><div className="ws-stat"><span className="stat-ic sky"><Icon name="file" size={17} /></span><div><b>{files.length}</b><span>files</span></div></div></Card>
        <Card><div className="ws-stat"><span className="stat-ic violet"><Icon name="database" size={17} /></span><div><b>{bytes(totalSize)}</b><span>stored</span></div></div></Card>
        <Card><div className="ws-stat"><span className="stat-ic green"><Icon name="sparkles" size={17} /></span><div><b>{files.filter(f => f.source === 'generated').length}</b><span>generated</span></div></div></Card>
        <Card><div className="ws-stat"><span className="stat-ic amber"><Icon name="upload" size={17} /></span><div><b>{files.filter(f => f.source === 'upload').length}</b><span>uploaded</span></div></div></Card>
      </div>

      <div className="ws-toolbar">
        <div className="agents-controls">
          <div className="chat-search"><Icon name="search" size={15} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search files" /></div>
          <div className="seg"><button className={type === 'all' ? 'on' : ''} onClick={() => setType('all')}>All</button>{FILE_TYPES.slice(0, 4).map(t => <button key={t} className={type === t ? 'on' : ''} onClick={() => setType(t)}>{t}</button>)}</div>
        </div>
        <div className="row"><Btn variant="outline" icon="upload" onClick={() => go('documents')}>Analyse a file</Btn><Btn variant="primary" icon="plus" onClick={() => setOpen(true)}>Add file</Btn></div>
      </div>

      {loading && !files.length ? <div className="row" style={{ padding: 40 }}><Spinner size={22} /></div> : visible.length === 0 ? (
        <Empty icon="file" title="No files match" text="Upload a document, or clear the filters to see your whole library." action={<Btn variant="outline" onClick={() => { setQ(''); setType('all'); }}>Clear filters</Btn>} />
      ) : (
        <Card className="table-card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Source</th><th>Added</th><th></th></tr></thead>
              <tbody>
                {visible.map(f => (
                  <tr key={f.id}>
                    <td><div className="file-name"><span className="file-type small">{f.type}</span><div><b>{f.name}</b><span>{f.summary || 'No summary yet'}</span></div></div></td>
                    <td><Badge tone="default">{f.type}</Badge></td>
                    <td className="mono">{bytes(f.size)}</td>
                    <td><Badge tone={f.source === 'generated' ? 'violet' : 'default'}>{f.source}</Badge></td>
                    <td className="muted">{timeAgo(f.createdAt)}</td>
                    <td><div className="row end"><IconBtn name="download" size={15} label="Export" onClick={() => download(f.name.replace(/\.[^.]+$/, '') + '.md', `# ${f.name}\n\n${f.summary || 'No summary stored.'}`, 'text/markdown;charset=utf-8')} /><IconBtn name="trash" size={15} label="Delete" onClick={() => remove(f)} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {open && <FileModal onClose={() => setOpen(false)} onSubmit={add} />}
    </>
  );
}

function FileModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '', type: 'PDF', size: 0, pages: 1, summary: '', source: 'upload' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal title="Add a file" subtitle="Register an upload or an exported deliverable." onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon="plus" disabled={!form.name.trim()} onClick={() => onSubmit(form)}>Add file</Btn></>}>
      <Field label="File name"><Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="board-deck-q1.pdf" autoFocus /></Field>
      <div className="grid-3">
        <Field label="Type"><Select value={form.type} onChange={e => set('type', e.target.value)}>{FILE_TYPES.map(t => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Size (KB)"><Input type="number" min="0" value={Math.round(form.size / 1024)} onChange={e => set('size', Number(e.target.value) * 1024)} /></Field>
        <Field label="Source"><Select value={form.source} onChange={e => set('source', e.target.value)}><option value="upload">Upload</option><option value="generated">Generated</option></Select></Field>
      </div>
      <Field label="Summary"><Textarea rows={3} value={form.summary} onChange={e => set('summary', e.target.value)} placeholder="What is in this file and why it matters?" /></Field>
    </Modal>
  );
}

/* -------------------------------- prompts -------------------------------- */
function Prompts() {
  const { data, reload } = useFetch(() => api('/prompts'));
  const [mine, setMine] = useState([]);
  const [pub, setPub] = useState([]);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [tab, setTab] = useState('mine');

  useEffect(() => { if (data) { setMine(data.mine || []); setPub(data.public || []); } }, [data]);

  const create = async (form) => {
    try {
      const p = await api('/prompts', 'POST', form);
      setMine(x => [p, ...x]); setOpen(false); reload();
      toast('Prompt saved', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  const use = async (p) => {
    try { await api('/prompts/' + p.id + '/use', 'POST', {}); } catch {}
    go('chat', { q: p.body, title: p.title });
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete “${p.title}”?`)) return;
    try { await api('/prompts/' + p.id, 'DELETE'); setMine(x => x.filter(i => i.id !== p.id)); toast('Prompt deleted', 'success'); }
    catch (e) { toast(e.message, 'error'); }
  };

  const share = async (p) => {
    try {
      const updated = await api('/prompts/' + p.id, 'PATCH', { isPublic: !p.isPublic });
      setMine(x => x.map(i => i.id === p.id ? updated : i)); toast(updated.isPublic ? 'Prompt is now public' : 'Prompt set to private', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  const list = tab === 'mine' ? mine : pub;

  return (
    <>
      <div className="ws-toolbar">
        <div className="seg"><button className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>My prompts <span className="tab-count">{mine.length}</span></button><button className={tab === 'public' ? 'on' : ''} onClick={() => setTab('public')}>Community <span className="tab-count">{pub.length}</span></button></div>
        <Btn variant="primary" icon="plus" onClick={() => setOpen(true)}>New prompt</Btn>
      </div>

      {list.length === 0 ? (
        <Empty icon="sparkles" title={tab === 'mine' ? 'No saved prompts yet' : 'Nothing public yet'} text="Save the prompts that consistently work. Add variables with {{braces}} to reuse them with new context." action={<Btn variant="primary" icon="plus" onClick={() => setOpen(true)}>Create a prompt</Btn>} />
      ) : (
        <div className="prompt-grid">
          {list.map(p => (
            <Card key={p.id} className="prompt-card">
              <div className="card-head"><div><Badge tone={p.isPublic ? 'green' : 'default'}>{p.category || 'Custom'}</Badge><h3>{p.title}</h3><p>{p.description || 'No description'}</p></div>{tab === 'mine' && <IconBtn name="trash" size={15} label="Delete" onClick={() => remove(p)} />}</div>
              <pre className="snippet-code small">{p.body.length > 260 ? p.body.slice(0, 260) + '…' : p.body}</pre>
              <div className="prompt-tags">{(p.tags || []).map(t => <span key={t}>{t}</span>)}{p.uses ? <span className="uses"><Icon name="zap" size={11} /> {fmt(p.uses)} uses</span> : null}</div>
              <div className="row between">
                <Btn size="sm" variant="outline" onClick={() => setViewing(p)}>View</Btn>
                <div className="row">
                  {tab === 'mine' && <Btn size="sm" variant="ghost" icon={p.isPublic ? 'lock' : 'globe'} onClick={() => share(p)}>{p.isPublic ? 'Private' : 'Share'}</Btn>}
                  <Btn size="sm" variant="primary" icon="arrowUpRight" onClick={() => use(p)}>Use prompt</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && <PromptModal onClose={() => setOpen(false)} onSubmit={create} />}
      {viewing && (
        <Modal title={viewing.title} subtitle={`${viewing.category} · ${fmt(viewing.uses || 0)} uses`} width={680} onClose={() => setViewing(null)}
          footer={<><Btn variant="ghost" onClick={() => setViewing(null)}>Close</Btn><Btn variant="outline" icon="copy" onClick={async () => { await copy(viewing.body); toast('Prompt copied', 'success'); }}>Copy</Btn><Btn variant="primary" icon="arrowUpRight" onClick={() => use(viewing)}>Use prompt</Btn></>}>
          <pre className="snippet-code">{viewing.body}</pre>
          <div className="prompt-tags">{(viewing.tags || []).map(t => <span key={t}>{t}</span>)}</div>
        </Modal>
      )}
    </>
  );
}

function PromptModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ title: '', description: '', category: 'Writing', body: '', isPublic: false, tags: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal title="Save a prompt" subtitle="A good prompt states the role, the task, the constraints and the output shape." width={640} onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon="plus" disabled={!form.title.trim() || !form.body.trim()} onClick={() => onSubmit({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) })}>Save prompt</Btn></>}>
      <Field label="Title"><Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ruthless editor" autoFocus /></Field>
      <div className="grid-2">
        <Field label="Category"><Select value={form.category} onChange={e => set('category', e.target.value)}>{['Writing', 'Business', 'Marketing', 'Developer', 'Documents', 'Finance', 'Custom'].map(c => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Tags" hint="Comma separated"><Input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="editing, tone" /></Field>
      </div>
      <Field label="Description"><Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="What does this prompt do well?" /></Field>
      <Field label="Prompt body" hint="Use {{variables}} for context you will add later."><Textarea rows={9} value={form.body} onChange={e => set('body', e.target.value)} placeholder={'You are a…\n\nTask:…\n\nConstraints:…\n\nOutput format:…'} /></Field>
      <label className="check-row"><input type="checkbox" checked={form.isPublic} onChange={e => set('isPublic', e.target.checked)} /><span>Share with the community</span></label>
    </Modal>
  );
}

/* ------------------------------ marketplace ------------------------------ */
function Marketplace() {
  const { data, loading, reload } = useFetch(() => api('/marketplace/agents'));
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [installing, setInstalling] = useState('');

  useEffect(() => { if (data) setItems(data); }, [data]);

  const categories = useMemo(() => ['all', ...Array.from(new Set(items.map(a => a.role || 'Other')))], [items]);
  const visible = items.filter(a => (category === 'all' || a.role === category) && (!q || (a.name + ' ' + (a.description || '')).toLowerCase().includes(q.toLowerCase())));

  const install = async (a) => {
    setInstalling(a.id);
    try {
      await api('/marketplace/agents/' + a.id + '/install', 'POST', {});
      toast(`${a.name} installed — review it in AI Agents`, 'success');
      reload(); go('agents');
    } catch (e) { toast(e.message, 'error'); }
    finally { setInstalling(''); }
  };

  return (
    <>
      <div className="market-hero">
        <div><Badge tone="pink" dot>Curated</Badge><h3>Agents with a track record.</h3><p>Each listing includes instructions, tools, schedule and success rate. Install a copy, then edit it like your own.</p></div>
        <div className="market-orb"><Icon name="store" size={34} /></div>
      </div>

      <div className="ws-toolbar">
        <div className="agents-controls">
          <div className="chat-search"><Icon name="search" size={15} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search agents" /></div>
          <div className="seg scroll">{categories.slice(0, 6).map(c => <button key={c} className={category === c ? 'on' : ''} onClick={() => setCategory(c)}>{c === 'all' ? 'All' : c}</button>)}</div>
        </div>
        <Btn variant="outline" icon="bot" onClick={() => go('agents')}>My agents</Btn>
      </div>

      {loading && !items.length ? <div className="row" style={{ padding: 40 }}><Spinner size={22} /></div> : visible.length === 0 ? (
        <Empty icon="store" title="No agents match" text="Try a different search or category." />
      ) : (
        <div className="market-grid">
          {visible.map(a => (
            <Card key={a.id} className="market-card">
              <div className="market-top"><span className="agent-emoji lg">{a.emoji || '🤖'}</span><div><h3>{a.name}</h3><p>{a.role}</p></div><Badge tone="amber"><Icon name="star" size={11} /> {(4.5 + ((a.installs || 0) % 5) / 10).toFixed(1)}</Badge></div>
              <p className="market-desc">{a.description}</p>
              <div className="market-facts">
                <span><Icon name="download" size={13} /> {fmt(a.installs || 0)} installs</span>
                <span><Icon name="checkCircle" size={13} /> {a.successRate || 95}% success</span>
                <span><Icon name="clock" size={13} /> {a.schedule || 'On demand'}</span>
              </div>
              <div className="market-tools">{['web-search', 'documents', 'slack', 'gmail', 'notion'].slice(0, 3).map(t => <span key={t}>{t}</span>)}<span>+{a.tools?.length || 2}</span></div>
              <div className="row between"><span className="muted small">by {a.author || 'NexAI'}</span><Btn size="sm" variant="primary" icon="download" loading={installing === a.id} onClick={() => install(a)}>Install</Btn></div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

/* ------------------------------ integrations ------------------------------ */
function Integrations() {
  const { data, loading, reload } = useFetch(() => api('/integrations'));
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState('');

  useEffect(() => { if (data?.integrations) setItems(data.integrations); }, [data]);

  const toggle = async (i) => {
    setBusy(i.id);
    try {
      const d = await api('/integrations/' + i.id + '/toggle', 'POST', {});
      setItems(x => x.map(v => v.id === i.id ? { ...v, connected: d.connected } : v));
      toast(`${i.name} ${d.connected ? 'connected' : 'disconnected'}`, 'success');
      reload();
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(''); }
  };

  const groups = useMemo(() => {
    const g = {};
    items.forEach(i => { (g[i.category] = g[i.category] || []).push(i); });
    return Object.entries(g);
  }, [items]);

  return (
    <>
      <div className="integration-banner"><span className="stat-ic green"><Icon name="plug" size={18} /></span><div><b>{items.filter(i => i.connected).length} of {items.length} connected</b><p>Connections are simulated in demo mode. Add provider credentials to enable live sync.</p></div><Btn variant="outline" icon="help" onClick={() => go('help')}>Setup guide</Btn></div>

      {loading && !items.length ? <div className="row" style={{ padding: 40 }}><Spinner size={22} /></div> : groups.map(([group, list]) => (
        <div key={group} className="integration-group">
          <div className="section-head"><div><h3>{group}</h3><p>{list.filter(i => i.connected).length} of {list.length} connected</p></div></div>
          <div className="integration-grid">
            {list.map(i => (
              <Card key={i.id} className={cls('integration-card', i.connected && 'on')}>
                <div className="integration-top">
                  <span className="integration-logo" style={{ background: i.color }}>{i.initial}</span>
                  <div><h3>{i.name}</h3><p>{i.desc}</p></div>
                  <Badge tone={i.connected ? 'green' : 'default'} dot={i.connected}>{i.connected ? 'Connected' : 'Available'}</Badge>
                </div>
                <div className="row between">
                  <span className="muted small">{i.connected ? 'Syncing every 15 minutes' : 'Read-only until connected'}</span>
                  <Btn size="sm" variant={i.connected ? 'ghost' : 'outline'} loading={busy === i.id} onClick={() => toggle(i)}>{i.connected ? 'Disconnect' : 'Connect'}</Btn>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/* --------------------------------- team --------------------------------- */
function Team() {
  const { data, reload } = useFetch(() => api('/team'));
  const [invite, setInvite] = useState(false);
  const members = data?.members || [];
  const seats = data?.seats || 1;
  const used = data?.used || 1;

  const inviteMember = async (form) => {
    toast(`Invitation sent to ${form.email} — demo mode does not deliver email.`, 'success');
    setInvite(false); reload();
  };

  return (
    <>
      <div className="ws-stats">
        <Card><div className="ws-stat"><span className="stat-ic cyan"><Icon name="users" size={17} /></span><div><b>{used}</b><span>people</span></div></div></Card>
        <Card><div className="ws-stat"><span className="stat-ic violet"><Icon name="layers" size={17} /></span><div><b>{seats}</b><span>seats in plan</span></div></div></Card>
        <Card><div className="ws-stat"><span className="stat-ic green"><Icon name="checkCircle" size={17} /></span><div><b>{members.filter(m => m.status === 'active').length}</b><span>active</span></div></div></Card>
        <Card><div className="ws-stat"><span className="stat-ic amber"><Icon name="shield" size={17} /></span><div><b>{members.filter(m => m.role === 'Admin' || m.role === 'Owner').length}</b><span>admins</span></div></div></Card>
      </div>

      <div className="ws-toolbar">
        <div className="seat-usage"><Icon name="users" size={15} /><span>{used} of {seats} seats used</span><Progress value={Math.min(100, Math.round((used / Math.max(1, seats)) * 100))} /></div>
        <div className="row"><Btn variant="outline" icon="card" onClick={() => go('billing')}>Manage plan</Btn><Btn variant="primary" icon="plus" onClick={() => setInvite(true)}>Invite teammate</Btn></div>
      </div>

      <Card className="table-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Person</th><th>Role</th><th>Plan</th><th>Projects</th><th>Last active</th><th>Status</th></tr></thead>
            <tbody>
              <tr>
                <td><div className="member-cell"><Avatar user={{ name: 'Alex Morgan' }} size={32} /><div><b>Alex Morgan</b><span>demo@nexai.app</span></div></div></td>
                <td><Badge tone="violet">Owner</Badge></td>
                <td>Business</td><td>5</td><td className="muted">Now</td><td><Badge tone="green" dot>Active</Badge></td>
              </tr>
              {members.map(m => (
                <tr key={m.id}>
                  <td><div className="member-cell"><Avatar user={{ name: m.name }} size={32} color={m.color} /><div><b>{m.name}</b><span>{m.email}</span></div></div></td>
                  <td><Badge tone={m.role === 'Owner' ? 'violet' : m.role === 'Admin' ? 'blue' : 'default'}>{m.role}</Badge></td>
                  <td className="capitalize">{m.plan}</td><td>{m.projects}</td><td className="muted">{m.lastActive}</td>
                  <td><Badge tone={m.status === 'active' ? 'green' : 'red'} dot>{m.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="team-grid">
        <Card><div className="card-head"><div><h3>Roles &amp; permissions</h3><p>What each role can do</p></div></div><div className="kv-list"><div><span>Owner</span><b>Everything, including billing and deletion</b></div><div><span>Admin</span><b>Members, integrations, workspace settings</b></div><div><span>Editor</span><b>Create, run and share — no billing</b></div><div><span>Viewer</span><b>Read shared work only</b></div></div></Card>
        <Card className="team-note"><Icon name="shield" size={18} /><div><b>Shared context, separate history</b><p>Team members can share projects, prompts and files, but conversation history stays private unless explicitly shared.</p></div></Card>
      </div>

      {invite && <InviteModal seats={seats} used={used} onClose={() => setInvite(false)} onSubmit={inviteMember} onUpgrade={() => { setInvite(false); go('billing'); }} />}
    </>
  );
}

function InviteModal({ seats, used, onClose, onSubmit, onUpgrade }) {
  const [form, setForm] = useState({ email: '', role: 'Editor' });
  const full = used >= seats;
  return (
    <Modal title="Invite a teammate" subtitle={full ? 'Your plan is at its seat limit.' : `${seats - used} seat${seats - used === 1 ? '' : 's'} available on your plan.`} onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn>{full ? <Btn variant="primary" icon="card" onClick={onUpgrade}>Upgrade plan</Btn> : <Btn variant="primary" icon="send" disabled={!form.email.includes('@')} onClick={() => onSubmit(form)}>Send invite</Btn>}</>}>
      <Field label="Email address"><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="teammate@company.com" autoFocus disabled={full} /></Field>
      <Field label="Role"><Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} disabled={full}>{['Admin', 'Editor', 'Viewer'].map(r => <option key={r}>{r}</option>)}</Select></Field>
      <div className="detail-note"><Icon name="info" size={14} /><span>Invites are simulated in demo mode. No email is sent and no seat is consumed.</span></div>
    </Modal>
  );
}
