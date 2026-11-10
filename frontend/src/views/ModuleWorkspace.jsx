import React, { useEffect, useMemo, useState } from 'react';
import { api, copy, download } from '../api.js';
import { useApp, go } from '../context.js';
import { Icon, Btn, Card, Badge, Markdown, Empty, Field, Textarea, Select, useFetch, timeAgo, cls, toast, Spinner } from '../ui.jsx';
import { MODULES, findFeature } from '../nav.js';

const IDEAS = {
  writing: ['Turn this rough idea into a 1,200-word article with a strong hook.', 'Rewrite this paragraph so it sounds like a human, not a brochure.', 'Create a content calendar for the next four weeks around our launch.'],
  education: ['Teach me this topic from first principles, with one worked example.', 'Build a 30-day study plan for this subject and hold me to it.', 'Quiz me on this chapter and explain every mistake.'],
  business: ['Turn this into a one-page operating brief with decisions and owners.', 'Pressure-test this plan like a skeptical board member.', 'Map the risks, assumptions and leading indicators for this initiative.'],
  marketing: ['Build a 6-week launch campaign with channel mix and messaging.', 'Write five ad variants for three different buyer personas.', 'Turn this product update into a LinkedIn post, newsletter and thread.'],
  finance: ['Build a monthly budget and show where the money actually goes.', 'Model three scenarios for this decision and explain the trade-offs.', 'Review these numbers and tell me what I should worry about.']
};

export default function ModuleWorkspace({ moduleId, params }) {
  const { models, user, refreshUser } = useApp();
  const module = MODULES.find(m => m.id === moduleId) || MODULES[0];
  const features = module.features || [];
  const [toolId, setToolId] = useState(params?.tool || features[0]?.id || '');
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState('');
  const [model, setModel] = useState('nexai-core');
  const [tone, setTone] = useState('balanced');
  const [length, setLength] = useState('medium');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [search, setSearch] = useState('');
  const [recent, setRecent] = useState([]);
  const tool = findFeature(toolId) || features[0];

  useEffect(() => {
    if (params?.tool) { setToolId(params.tool); setOutput(''); }
  }, [params?.tool]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return features.filter(f => !q || f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q));
  }, [features, search]);

  const selectTool = (f) => {
    setToolId(f.id); setOutput(''); setConversationId(null);
    setPrompt(IDEAS[module.id]?.[0] || `Run ${f.name} for my workspace.`);
  };

  const run = async () => {
    if (!prompt.trim()) return toast('Describe what you need first.', 'error');
    setBusy(true); setOutput('');
    try {
      const content = context.trim() ? `${prompt.trim()}\n\n--- Context ---\n${context.trim()}` : prompt.trim();
      const d = await api('/chat', 'POST', { content, toolId, model, tone, length, conversationId: conversationId || undefined });
      setOutput(d.reply); setConversationId(d.conversation?.id || conversationId);
      setRecent(r => [{ id: Date.now(), title: prompt.slice(0, 60), tool: tool?.name, at: new Date().toISOString(), reply: d.reply }, ...r].slice(0, 5));
      refreshUser?.();
      toast('Result ready · 1 credit', 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  return (
    <div className="module-page">
      <section className="module-hero" data-module={module.id}>
        <div>
          <Badge tone="violet" dot>{module.name}</Badge>
          <h2>{module.blurb}</h2>
          <p>20 purpose-built capabilities, one shared context. Pick a tool, add your material and get a finished deliverable — not a generic answer.</p>
          <div className="module-tags">{features.slice(0, 6).map(f => <span key={f.id}>{f.name}</span>)}<span>+{Math.max(0, features.length - 6)}</span></div>
        </div>
        <div className="module-hero-stat"><span className="module-big-ic"><Icon name={module.icon} size={36} /></span><b>{features.length}</b><span>tools included</span><small>{user?.plan === 'free' ? 'Free plan' : 'Included in your plan'}</small></div>
      </section>

      <div className="module-layout">
        <div className="module-main">
          <Card className="module-composer">
            <div className="card-head"><div><h3>{tool?.name || module.name}</h3><p>{tool?.description || 'Choose a tool from the right to focus the output.'}</p></div><Badge tone="default">Tool #{tool?.number}</Badge></div>
            <Field label="What do you need?"><Textarea rows={5} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={IDEAS[module.id]?.[0] || 'Describe the outcome you want…'} /></Field>
            <div className="row wrap gap" style={{ marginBottom: 14 }}>{(IDEAS[module.id] || []).map(i => <button key={i} className="example-q" onClick={() => setPrompt(i)}>{i.length > 56 ? i.slice(0, 56) + '…' : i}</button>)}</div>
            <Field label="Context (optional)" hint="Paste notes, a brief, numbers or a transcript. More context gives a sharper result."><Textarea rows={4} value={context} onChange={e => setContext(e.target.value)} placeholder="Audience, constraints, source material, examples you like…" /></Field>
            <div className="grid-3">
              <Field label="Model"><Select value={model} onChange={e => setModel(e.target.value)}>{(models?.length ? models : [{ id: 'nexai-core', name: 'NexAI Core' }]).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
              <Field label="Tone"><Select value={tone} onChange={e => setTone(e.target.value)}>{['balanced', 'precise', 'friendly', 'creative'].map(t => <option key={t}>{t}</option>)}</Select></Field>
              <Field label="Length"><Select value={length} onChange={e => setLength(e.target.value)}>{['short', 'medium', 'long'].map(t => <option key={t}>{t}</option>)}</Select></Field>
            </div>
            <div className="row between">
              <span className="credit-hint"><Icon name="zap" size={13} /> 1 credit · {user?.credits?.toLocaleString()} available</span>
              <div className="row"><Btn variant="ghost" onClick={() => { setPrompt(''); setContext(''); setOutput(''); setConversationId(null); }}>Reset</Btn><Btn variant="primary" icon="sparkles" loading={busy} onClick={run}>{busy ? 'Working…' : `Run ${tool?.name?.split(' ')[0] || 'tool'}`}</Btn></div>
            </div>
          </Card>

          {busy && <Card className="module-loading"><Spinner size={22} /><div><b>Running {tool?.name}</b><p className="muted">Using your context, the tool instructions and the module’s quality bar.</p></div></Card>}

          {output && (
            <Card className="module-output">
              <div className="card-head"><div><h3>Output</h3><p>{tool?.name} · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {model}</p></div><div className="row"><Btn size="sm" variant="outline" icon="copy" onClick={async () => { await copy(output); toast('Copied', 'success'); }}>Copy</Btn><Btn size="sm" variant="outline" icon="download" onClick={() => download(`${module.id}-${Date.now()}.md`, output, 'text/markdown;charset=utf-8')}>Export</Btn><Btn size="sm" variant="ghost" icon="refresh" onClick={run}>Retry</Btn></div></div>
              <Markdown>{output}</Markdown>
              <div className="module-followups">
                <span>Continue</span>
                {['Make it more concise', 'Add a stronger opening', 'Turn this into an action plan', 'Adapt it for an executive'].map(s => <button key={s} onClick={() => { setPrompt(s); setContext(output); setOutput(''); }}>{s}</button>)}
              </div>
            </Card>
          )}

          {!output && !busy && (
            <Card className="module-empty">
              <div className="module-empty-art"><Icon name={module.icon} size={28} /></div>
              <h3>Start with the outcome</h3>
              <p>Describe what you want to have in hand. The tool will handle structure, tone and length using the settings above.</p>
              <div className="module-how"><div><b>1. Pick a tool</b><span>20 capabilities, each with a tuned system prompt.</span></div><div><b>2. Add context</b><span>Your notes are sent only with this request.</span></div><div><b>3. Ship the output</b><span>Copy, export or keep iterating in the thread.</span></div></div>
            </Card>
          )}
        </div>

        <aside className="module-side">
          <Card>
            <div className="card-head"><div><h3>Tools in this module</h3><p>Click to switch</p></div><Badge tone="default">{features.length}</Badge></div>
            <div className="chat-search"><Icon name="search" size={14} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tools" /></div>
            <div className="module-tool-list">
              {visible.map(f => <button key={f.id} className={cls(toolId === f.id && 'on')} onClick={() => selectTool(f)}><span className="tool-num">{String(f.number).padStart(3, '0')}</span><span><b>{f.name}</b><small>{f.description}</small></span>{toolId === f.id ? <Icon name="check" size={14} /> : <Icon name="right" size={12} />}</button>)}
            </div>
          </Card>
          {recent.length > 0 && <Card><div className="card-head"><div><h3>This session</h3><p>Your recent outputs</p></div></div><div className="recent-output-list">{recent.map(r => <button key={r.id} onClick={() => setOutput(r.reply)}><span className="recent-ic"><Icon name={module.icon} size={14} /></span><span><b>{r.title}</b><small>{r.tool} · {timeAgo(r.at)}</small></span></button>)}</div></Card>}
          <Card className="module-credit"><Icon name="sparkles" size={18} /><div><b>Built for real work</b><p>Every tool returns a finished deliverable. No generic “it depends” — the output is yours to edit and ship.</p></div></Card>
          <Btn variant="outline" icon="layers" className="w-full" onClick={() => go('features')}>Browse all 370 features</Btn>
        </aside>
      </div>
    </div>
  );
}
