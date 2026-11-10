import React, { useEffect, useMemo, useState } from 'react';
import { api, copy, download } from '../api.js';
import { useApp, go } from '../context.js';
import { Icon, Btn, IconBtn, Card, Badge, Markdown, Empty, Spinner, useFetch, fmt, timeAgo, cls, toast } from '../ui.jsx';
import { MODULES } from '../nav.js';

const IDEAS = [
  'What is changing in the mid-market analytics market in 2027?',
  'Compare the pricing and positioning of Notion, Linear and Asana.',
  'What does the evidence say about four-day work weeks?',
  'Summarise the current state of EU AI Act compliance for SaaS startups.'
];

export default function Research({ params }) {
  const { models } = useApp();
  const [query, setQuery] = useState(params?.q || '');
  const [model, setModel] = useState('nexai-research');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sources, setSources] = useState([]);
  const { data: savedSources, reload } = useFetch(() => api('/research/sources'), []);
  const sourceList = sources.length ? sources : (savedSources || []);

  useEffect(() => { if (savedSources) setSources(savedSources); }, [savedSources]);

  const history = useMemo(() => {
    const groups = {};
    (savedSources || []).forEach(s => { if (s.query) groups[s.query] = (groups[s.query] || 0) + 1; });
    return Object.entries(groups).slice(0, 6);
  }, [savedSources]);

  const run = async (q = query) => {
    if (!q.trim() || busy) return;
    setBusy(true); setError(''); setResult(null); setQuery(q);
    try {
      const d = await api('/research/run', 'POST', { query: q, model });
      setResult(d);
      setSources(d.sources || []);
      reload();
      toast(d.live ? `Brief ready with ${d.sources.length} live sources` : 'Brief ready — live search was unavailable, sources flagged for verification', d.live ? 'success' : 'info');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const removeSource = async (id) => {
    try { await api('/research/sources/' + id, 'DELETE'); setSources(s => s.filter(x => x.id !== id)); reload(); }
    catch (e) { toast(e.message, 'error'); }
  };

  const downloadBrief = () => {
    if (!result) return;
    const body = `# Research brief: ${result.query}\n\n${result.brief}\n\n## Sources\n\n${(result.sources || []).map((s, i) => `${i + 1}. [${s.title}](${s.url}) — ${s.domain}`).join('\n')}`;
    download(result.query.slice(0, 40).replace(/[^\w]+/g, '-') + '.md', body, 'text/markdown;charset=utf-8');
  };

  return (
    <div className="research-page">
      <section className="research-hero">
        <div className="research-copy">
          <Badge tone="sky" dot>Web-grounded research</Badge>
          <h2>Ask a hard question.<br />Get a cited brief, not a guess.</h2>
          <p>NexAI searches the live web, reads across sources and returns a structured brief with claims tied back to evidence. When nothing can be verified, it says so.</p>
          <div className="research-input">
            <Icon name="search" size={19} />
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()}
              placeholder="e.g. How are B2B SaaS teams measuring AI ROI in 2027?" />
            <Btn variant="primary" icon={busy ? undefined : 'sparkles'} loading={busy} onClick={() => run()}>{busy ? 'Researching' : 'Research'}</Btn>
          </div>
          <div className="research-options">
            <span><Icon name="globe" size={14} /> Live web search</span>
            <span><Icon name="checkCircle" size={14} /> Source citations</span>
            <span><Icon name="shield" size={14} /> Uncertainty flagged</span>
            <select className="composer-select" value={model} onChange={e => setModel(e.target.value)}>
              {(models?.length ? models : [{ id: 'nexai-research', name: 'NexAI Research' }]).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="idea-row">{IDEAS.map(i => <button key={i} onClick={() => run(i)}>{i}</button>)}</div>
        </div>
        <div className="research-art">
          <div className="radar"><i /><i /><i /><span><Icon name="brain" size={30} /></span></div>
          <div className="radar-card rc1"><span><Icon name="globe" size={14} /></span><div><b>14 sources</b><small>scanned this week</small></div></div>
          <div className="radar-card rc2"><span><Icon name="checkCircle" size={14} /></span><div><b>97% grounded</b><small>claims with citations</small></div></div>
        </div>
      </section>

      <div className="research-layout">
        <div className="research-main">
          {busy && (
            <Card className="research-loading">
              <div className="scan-line"><i /></div>
              <div className="research-steps"><span className="on"><Spinner size={13} /> Searching the web</span><span>Reading sources</span><span>Cross-checking claims</span><span>Writing the brief</span></div>
              <p className="muted">Pulling primary sources, checking dates and looking for disagreement between sources. This usually takes 10–25 seconds.</p>
            </Card>
          )}
          {error && <Empty icon="alert" title="Research failed" text={error} action={<Btn onClick={() => run()}>Try again</Btn>} />}
          {!busy && !result && !error && (
            <Card className="research-empty">
              <div className="research-empty-art"><Icon name="globe" size={32} /></div>
              <h3>Your next brief starts here</h3>
              <p>Ask a question above, or pick one of the suggestions. Deep research costs 3 credits and returns a long-form brief with sources.</p>
              <div className="research-empty-grid">
                <div><b>What you get</b><span>Executive summary, evidence, counterpoints and open questions.</span></div>
                <div><b>How it cites</b><span>Inline [n] references map to the source cards below the brief.</span></div>
                <div><b>What it won’t do</b><span>Invent a source. If a claim is unverified, it says so explicitly.</span></div>
              </div>
            </Card>
          )}
          {result && (
            <div className="research-result">
              <Card className="research-result-head">
                <div className="row between">
                  <div><Badge tone="violet" dot>{result.live ? `${result.sources.length} live sources` : 'Knowledge brief'}</Badge><h2>{result.query}</h2><p className="muted">Generated {timeAgo(new Date().toISOString())} · {result.demo ? 'Demo intelligence' : 'Live model'} · 3 credits</p></div>
                  <div className="row"><Btn size="sm" variant="outline" icon="copy" onClick={async () => { await copy(result.brief); toast('Brief copied', 'success'); }}>Copy</Btn><Btn size="sm" variant="outline" icon="download" onClick={downloadBrief}>Markdown</Btn><Btn size="sm" variant="ghost" icon="refresh" onClick={() => run(result.query)}>Redo</Btn></div>
                </div>
              </Card>
              <Card className="research-brief"><Markdown>{result.brief}</Markdown></Card>
              {result.sources?.length > 0 && (
                <Card>
                  <div className="section-head"><div><h3>Sources</h3><p>{result.sources.length} pages read · {result.savedCount} newly saved to your library</p></div><Badge tone="green">Cited</Badge></div>
                  <div className="source-list">
                    {result.sources.map((s, i) => (
                      <a key={s.url + i} href={s.url} target="_blank" rel="noreferrer" className="source-card">
                        <span className="source-num">{i + 1}</span>
                        <span className="source-body"><b>{s.title}</b><span>{s.snippet}</span><small>{s.domain}</small></span>
                        <Icon name="external" size={15} />
                      </a>
                    ))}
                  </div>
                </Card>
              )}
              {!result.sources?.length && <div className="detail-note"><Icon name="alert" size={15} /><span>No live sources were reachable. Treat this as a structured starting point and verify key claims before publishing.</span></div>}
            </div>
          )}
        </div>

        <aside className="research-side">
          <Card>
            <div className="card-head"><div><h3>Research library</h3><p>{sourceList.length} saved sources</p></div><IconBtn name="refresh" label="Refresh" onClick={reload} /></div>
            <div className="saved-source-list">
              {sourceList.length === 0 && <p className="muted small">Sources you find are saved here automatically.</p>}
              {sourceList.slice(0, 14).map(s => (
                <div key={s.id || s.url} className="saved-source">
                  <a href={s.url} target="_blank" rel="noreferrer"><b>{s.title}</b><span>{s.domain || 'web'}</span></a>
                  {s.id && <IconBtn name="trash" size={13} label="Remove" onClick={() => removeSource(s.id)} />}
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="card-head"><div><h3>Recent questions</h3><p>Jump back into a thread</p></div></div>
            {history.length === 0 ? <p className="muted small">Your research history will appear here.</p> : history.map(([q, n]) => (
              <button key={q} className="history-row" onClick={() => run(q)}><Icon name="search" size={14} /><span>{q}<small>{n} source{n === 1 ? '' : 's'}</small></span><Icon name="right" size={13} /></button>
            ))}
          </Card>
          <Card className="research-credit">
            <Icon name="zap" size={18} />
            <div><b>3 credits per deep brief</b><p>Each brief searches up to 6 sources, synthesises them and saves them to your library.</p></div>
            <Btn size="sm" variant="ghost" onClick={() => go('usage')}>Usage</Btn>
          </Card>
          <Card>
            <div className="card-head"><div><h3>Related tools</h3><p>From the research module</p></div><Btn size="sm" variant="ghost" onClick={() => go('features')}>All</Btn></div>
            <div className="mini-feature-list">
              {(MODULES.find(m => m.id === 'research')?.features || []).slice(0, 5).map(f => (
                <button key={f.id} onClick={() => go('chat', { tool: f.id })}><span>{String(f.number).padStart(3, '0')}</span><b>{f.name}</b><Icon name="arrowUpRight" size={13} /></button>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
