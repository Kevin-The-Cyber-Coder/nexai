import React, { useMemo, useState } from 'react';
import { api, copy, download } from '../api.js';
import { useApp, go } from '../context.js';
import { Icon, Btn, IconBtn, Card, Badge, Markdown, Empty, Field, Input, Textarea, Select, Tabs, useFetch, timeAgo, cls, toast, Spinner } from '../ui.jsx';
import { MODULES, FEATURES, findFeature } from '../nav.js';

const TASKS = [
  { id: 'developer-ai-code-generation', label: 'Generate', icon: 'sparkles', hint: 'A complete implementation from a spec.' },
  { id: 'developer-code-review-assistance', label: 'Review', icon: 'eye', hint: 'Find bugs, risks and unclear code.' },
  { id: 'developer-code-debugging-assistance', label: 'Debug', icon: 'alert', hint: 'Diagnose an error and propose a fix.' },
  { id: 'developer-code-explanation', label: 'Explain', icon: 'book', hint: 'Understand unfamiliar code.' },
  { id: 'developer-generate-unit-tests', label: 'Tests', icon: 'checkCircle', hint: 'Generate edge-case test coverage.' },
  { id: 'developer-generate-sql-queries', label: 'SQL', icon: 'database', hint: 'Write a query from a schema and question.' },
  { id: 'developer-generate-react-components', label: 'React', icon: 'layout', hint: 'Build a typed, accessible component.' },
  { id: 'developer-generate-backend-apis', label: 'API', icon: 'plug', hint: 'Design an endpoint with validation.' }
];
const LANGS = ['Auto', 'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'C#', 'SQL', 'PHP', 'Ruby'];
const STARTER = `async function fetchInvoices(clientId, { page = 1, limit = 50 } = {}) {
  const res = await fetch(\`/api/invoices?client=\${clientId}&page=\${page}&limit=\${limit}\`);
  const data = await res.json();
  return data.items;
}`;

export default function Developer({ params }) {
  const { models, user } = useApp();
  const initial = params?.tool || 'developer-ai-code-generation';
  const [task, setTask] = useState(initial);
  const [language, setLanguage] = useState('Auto');
  const [model, setModel] = useState('nexai-reason');
  const [prompt, setPrompt] = useState('');
  const [code, setCode] = useState(STARTER);
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('composer');
  const [snippets, setSnippets] = useState(() => { try { return JSON.parse(localStorage.getItem('nexai.snippets') || '[]'); } catch { return []; } });
  const selected = TASKS.find(t => t.id === task) || TASKS[0];
  const feature = findFeature(task);
  const devFeatures = MODULES.find(m => m.id === 'developer')?.features || [];

  const stats = useMemo(() => ({ lines: code ? code.split('\n').length : 0, chars: code.length }), [code]);

  const run = async () => {
    if (!prompt.trim() && !code.trim()) return toast('Add a requirement or some code first.', 'error');
    setBusy(true); setOutput(''); setError('');
    const message = [
      `Task: ${selected.label} â€” ${selected.hint}`,
      `Language: ${language === 'Auto' ? 'detect and use the most appropriate language' : language}`,
      prompt.trim() ? `Requirement:\n${prompt.trim()}` : '',
      code.trim() ? `Code:\n\`\`\`${language === 'Auto' ? '' : language.toLowerCase()}\n${code}\n\`\`\`` : ''
    ].filter(Boolean).join('\n\n');
    try {
      const d = await api('/chat', 'POST', { content: message, toolId: task, model, tone: 'precise', length: 'long' });
      setOutput(d.reply);
      toast('Response ready Â· 1 credit', 'success');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const saveSnippet = () => {
    if (!output) return;
    const s = { id: Date.now(), title: prompt.slice(0, 60) || selected.label + ' snippet', task: selected.label, language, code: output, at: new Date().toISOString() };
    const next = [s, ...snippets].slice(0, 20);
    setSnippets(next); localStorage.setItem('nexai.snippets', JSON.stringify(next));
    toast('Saved to snippets', 'success');
  };
  const removeSnippet = (id) => { const next = snippets.filter(s => s.id !== id); setSnippets(next); localStorage.setItem('nexai.snippets', JSON.stringify(next)); };
  const useSnippet = (s) => { setOutput(s.code); setTab('composer'); };

  return (
    <div className="dev-page">
      <div className="dev-head">
        <div><Badge tone="green" dot>Developer Tools</Badge><h2>Ship the change. Understand every line.</h2><p>Generate, review, debug, test and document code with the full repository context you paste in. No magic â€” just a senior pair with perfect recall.</p></div>
        <div className="dev-head-actions"><Btn variant="outline" icon="key" onClick={() => go('keys')}>API keys</Btn><Btn variant="primary" icon="terminal" onClick={() => setTab('api')}>API playground</Btn></div>
      </div>

      <div className="tabs dev-tabs">
        <button className={cls(tab === 'composer' && 'on')} onClick={() => setTab('composer')}>Code assistant</button>
        <button className={cls(tab === 'snippets' && 'on')} onClick={() => setTab('snippets')}>Snippets <span className="tab-count">{snippets.length}</span></button>
        <button className={cls(tab === 'api' && 'on')} onClick={() => setTab('api')}>API playground</button>
        <button className={cls(tab === 'tools' && 'on')} onClick={() => setTab('tools')}>All 20 tools</button>
      </div>

      {tab === 'composer' && (
        <div className="dev-layout">
          <div className="dev-main">
            <Card className="dev-composer">
              <div className="task-grid">{TASKS.map(t => <button key={t.id} className={cls('task-chip', task === t.id && 'on')} onClick={() => setTask(t.id)}><Icon name={t.icon} size={15} /><span><b>{t.label}</b><small>{t.hint}</small></span></button>)}</div>
              <div className="grid-3">
                <Field label="Language"><Select value={language} onChange={e => setLanguage(e.target.value)}>{LANGS.map(l => <option key={l}>{l}</option>)}</Select></Field>
                <Field label="Model"><Select value={model} onChange={e => setModel(e.target.value)}>{(models?.length ? models : [{ id: 'nexai-reason', name: 'NexAI Reason' }]).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
                <Field label="Tool"><div className="tool-locked"><Icon name="code" size={14} /><span>{feature?.name || selected.label}</span></div></Field>
              </div>
              <Field label="What do you need?"><Textarea rows={4} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={task === 'developer-generate-sql-queries' ? 'Given orders(id, customer_id, total, created_at) and customers(id, name), list the top 10 customers by revenue this quarter.' : task === 'developer-ai-code-generation' ? 'Build a paginated invoice list endpoint with validation, cursor pagination and tests.' : 'Paste the requirement, error message or question hereâ€¦'} /></Field>
              <div className="code-editor">
                <div className="code-editor-bar"><span><Icon name="code" size={14} /> Code context</span><span>{stats.lines} lines Â· {stats.chars} chars</span><button onClick={() => setCode('')}>Clear</button></div>
                <textarea className="code-input" rows={12} spellCheck={false} value={code} onChange={e => setCode(e.target.value)} placeholder="Paste code hereâ€¦" />
              </div>
              <div className="row between">
                <span className="credit-hint"><Icon name="zap" size={13} /> {user?.credits?.toLocaleString()} credits Â· 1 per request</span>
                <Btn variant="primary" icon="sparkles" loading={busy} onClick={run}>{busy ? 'Thinking through itâ€¦' : `${selected.label} code`}</Btn>
              </div>
            </Card>

            {error && <Empty icon="alert" title="The assistant hit an error" text={error} action={<Btn onClick={run}>Try again</Btn>} />}
            {busy && <Card className="dev-loading"><Spinner size={22} /><div><b>Working through the code</b><p className="muted">Reading context, checking edge cases and drafting a response.</p></div></Card>}
            {output && (
              <Card className="dev-output">
                <div className="card-head"><div><h3>{selected.label} result</h3><p>{new Date().toLocaleString()} Â· {model}</p></div><div className="row"><Btn size="sm" variant="outline" icon="copy" onClick={async () => { await copy(output); toast('Copied', 'success'); }}>Copy</Btn><Btn size="sm" variant="outline" icon="download" onClick={() => download('nexai-code.md', output, 'text/markdown;charset=utf-8')}>Download</Btn><Btn size="sm" variant="ghost" icon="pin" onClick={saveSnippet}>Save</Btn></div></div>
                <Markdown>{output}</Markdown>
                <div className="dev-followups">{['Add tests for this', 'Explain the trade-offs', 'Optimise for readability', 'Review for security issues'].map(s => <button key={s} onClick={() => { setPrompt(s); setTimeout(run, 50); }}>{s} <Icon name="right" size={12} /></button>)}</div>
              </Card>
            )}
            {!output && !busy && !error && <Card className="dev-empty"><div className="dev-empty-art"><Icon name="terminal" size={32} /></div><h3>Paste code. Describe the change.</h3><p>Choose a task, add requirements and code, then run. The assistant returns a finished response with implementation notes, tests and risks.</p><div className="dev-empty-grid"><div><b>Generate</b><span>Complete implementations with validation.</span></div><div><b>Review</b><span>Bugs, edge cases and security risks.</span></div><div><b>Test</b><span>Unit tests that cover the sad path too.</span></div></div></Card>}
          </div>

          <aside className="dev-side">
            <Card>
              <div className="card-head"><div><h3>Developer tools</h3><p>20 focused capabilities</p></div></div>
              <div className="dev-tool-list">
                {devFeatures.map(f => <button key={f.id} className={cls(task === f.id && 'on')} onClick={() => { setTask(f.id); setTab('composer'); }}><span className="tool-num">{String(f.number).padStart(3, '0')}</span><span><b>{f.name}</b><small>{f.description.slice(0, 62)}â€¦</small></span><Icon name="right" size={12} /></button>)}
              </div>
            </Card>
            <Card>
              <div className="card-head"><div><h3>Model routing</h3><p>Code benefits from reasoning</p></div><Badge tone="violet">Auto</Badge></div>
              <div className="model-mini">{(models || []).filter(m => (m.abilities || []).includes('code') || m.id === 'nexai-reason').slice(0, 4).map(m => <div key={m.id} className="model-row"><span className="model-dot" style={{ background: m.color }} /><span><b>{m.name}</b><small>{m.provider} Â· {m.context}</small></span><Badge tone="default">{m.badge}</Badge></div>)}</div>
              <Btn size="sm" variant="ghost" className="w-full" onClick={() => go('models')}>Compare models</Btn>
            </Card>
            <Card className="dev-credit"><Icon name="shield" size={18} /><div><b>Review before you ship</b><p>Generated code is a starting point. Run your tests, review permissions and never paste secrets into a prompt.</p></div></Card>
          </aside>
        </div>
      )}

      {tab === 'snippets' && (
        <div className="snippet-grid">
          {snippets.length === 0 ? <Empty icon="pin" title="No snippets saved" text="Save any generated result and it will live here, in this browser." action={<Btn variant="primary" onClick={() => setTab('composer')}>Open the assistant</Btn>} /> : snippets.map(s => (
            <Card key={s.id} className="snippet-card">
              <div className="card-head"><div><Badge tone="violet">{s.task}</Badge><h3>{s.title}</h3><p>{s.language} Â· {timeAgo(s.at)}</p></div><IconBtn name="trash" label="Delete" onClick={() => removeSnippet(s.id)} /></div>
              <pre className="snippet-code">{s.code.slice(0, 700)}{s.code.length > 700 ? '\nâ€¦' : ''}</pre>
              <div className="row"><Btn size="sm" variant="outline" onClick={() => useSnippet(s)}>Open</Btn><Btn size="sm" variant="ghost" icon="copy" onClick={async () => { await copy(s.code); toast('Copied', 'success'); }}>Copy</Btn></div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'api' && <ApiPlayground user={user} models={models} />}

      {tab === 'tools' && (
        <div className="dev-tools-grid">
          {devFeatures.map(f => (
            <Card key={f.id} className="dev-tool-card">
              <div className="card-head"><div><Badge tone="default">#{f.number}</Badge><h3>{f.name}</h3><p>{f.description}</p></div></div>
              <div className="row"><Btn size="sm" variant="outline" onClick={() => { setTask(f.id); setTab('composer'); }}>Use tool <Icon name="right" size={13} /></Btn><Btn size="sm" variant="ghost" onClick={async () => { await copy(f.id); toast('Tool ID copied', 'success'); }}>Copy ID</Btn></div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ApiPlayground({ user, models }) {
  const [model, setModel] = useState('nexai-core');
  const [message, setMessage] = useState('Explain the difference between optimistic and pessimistic locking in PostgreSQL, with a concrete example.');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const curl = `curl https://api.nexai.app/api/v1/chat \\
  -H "Authorization: Bearer nx_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${model}","message":"${message.replace(/"/g, '\\"').slice(0, 120)}"}'`;
  const tryIt = async () => {
    setBusy(true); setResult('');
    try {
      const d = await api('/chat', 'POST', { content: message, model, tone: 'precise' });
      setResult(d.reply);
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };
  return (
    <div className="api-page">
      <div className="api-grid">
        <Card>
          <div className="card-head"><div><h3>Public API</h3><p>One endpoint, any model, your workspace credits.</p></div><Badge tone="green" dot>v1</Badge></div>
          <div className="api-endpoint"><Badge tone="green">POST</Badge><code>/api/v1/chat</code><button onClick={async () => { await copy('/api/v1/chat'); toast('Endpoint copied', 'success'); }}><Icon name="copy" size={13} /></button></div>
          <div className="grid-2">
            <Field label="Model"><Select value={model} onChange={e => setModel(e.target.value)}>{(models || []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
            <Field label="Auth"><div className="tool-locked"><Icon name="key" size={14} /><span>{user?.credits?.toLocaleString()} credits Â· bearer key</span></div></Field>
          </div>
          <Field label="Message"><Textarea rows={4} value={message} onChange={e => setMessage(e.target.value)} /></Field>
          <div className="row between"><span className="muted small">1 credit per request</span><Btn variant="primary" icon="send" loading={busy} onClick={tryIt}>Try in workspace</Btn></div>
          {result && <div className="api-result"><Badge tone="violet">200 OK</Badge><Markdown>{result}</Markdown></div>}
        </Card>
        <Card>
          <div className="card-head"><div><h3>Quick start</h3><p>Create a key, then call the endpoint.</p></div><Btn size="sm" variant="outline" icon="key" onClick={() => go('keys')}>Create key</Btn></div>
          <div className="codeblock static"><div className="codebar"><span>cURL</span><button onClick={async () => { await copy(curl); toast('Copied', 'success'); }}>Copy</button></div><pre>{curl}</pre></div>
          <div className="api-facts"><div><span>Base URL</span><b>https://api.nexai.app</b></div><div><span>Auth</span><b>Bearer token</b></div><div><span>Format</span><b>JSON</b></div><div><span>Rate limit</span><b>400 req/min</b></div><div><span>Credits</span><b>1 per chat</b></div><div><span>Models</span><b>8 available</b></div></div>
          <div className="detail-note"><Icon name="info" size={14} /><span>In local development the base URL is <b>http://localhost:5000</b>. API keys are hashed and shown only once.</span></div>
        </Card>
      </div>
      <Card>
        <div className="card-head"><div><h3>Response shape</h3><p>Everything you need to display an answer.</p></div></div>
        <div className="codeblock static"><div className="codebar"><span>JSON</span></div><pre>{JSON.stringify({ id: 'cmpl_8f2a91', model: 'nexai-core', created: 1794326400, content: 'â€¦', usage: { credits: 1, remaining: 18450 } }, null, 2)}</pre></div>
      </Card>
    </div>
  );
}
