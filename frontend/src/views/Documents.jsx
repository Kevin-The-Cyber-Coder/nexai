import React, { useRef, useState } from 'react';
import { api, extractFile, download, copy } from '../api.js';
import { useApp, go } from '../context.js';
import { Icon, Btn, IconBtn, Card, Badge, Markdown, Empty, Drawer, Field, Input, Textarea, Select, useFetch, fmt, timeAgo, cls, toast, Spinner, bytes } from '../ui.jsx';
import { MODULES, findFeature } from '../nav.js';

const MODES = [
  { id: 'summarize', label: 'Summarise & extract', text: 'Summary, key points, risks and follow-ups' },
  { id: 'question', label: 'Ask a question', text: 'Answer grounded in the document only' }
];

export default function Documents({ params }) {
  const { refreshUser } = useApp();
  const { data: docs, reload } = useFetch(() => api('/documents'), []);
  const [tab, setTab] = useState('analyze');
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState('summarize');
  const [busy, setBusy] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [resultDoc, setResultDoc] = useState(null);
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();
  const tool = params?.tool ? findFeature(params.tool) : null;

  const onFile = async (f) => {
    if (!f) return;
    setBusy('Reading ' + f.name + '…'); setAnalysis(''); setResultDoc(null);
    try {
      const ex = await extractFile(f, setBusy);
      setFile(ex); setName(ex.name); setText(ex.text || '');
      setTab('analyze');
      toast(`${f.name} extracted · ${ex.note || 'ready'}`, 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(''); if (fileRef.current) fileRef.current.value = ''; }
  };

  const analyze = async () => {
    if (!text.trim()) return toast('Upload a file or paste some text first.', 'error');
    if (mode === 'question' && !question.trim()) return toast('Write the question you want answered.', 'error');
    setBusy('Analysing with NexAI…'); setAnalysis('');
    try {
      const d = await api('/documents/analyze', 'POST', { name: name || 'Pasted notes', text, question, mode, toolId: params?.tool || 'documents-document-summarization' });
      setAnalysis(d.analysis); setResultDoc(d.doc); reload(); refreshUser?.();
      toast('Document brief ready · 2 credits', 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(''); }
  };

  const removeDoc = async (doc) => {
    if (!window.confirm(`Delete “${doc.name}” from your library?`)) return;
    try { await api('/documents/' + doc.id, 'DELETE'); reload(); if (selected?.id === doc.id) setSelected(null); toast('Document deleted', 'success'); }
    catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div className="docs-page">
      <div className="docs-head">
        <div><Badge tone="sky" dot>Documents & PDF</Badge><h2>Read the whole document. Not just the first page.</h2><p>Upload PDF, Word, Excel, CSV or plain text. NexAI extracts the content, summarises it, flags risks and answers questions with the document in context.</p></div>
        <div className="doc-formats"><span>PDF</span><span>DOCX</span><span>XLSX</span><span>CSV</span><span>TXT</span><span>MD</span></div>
      </div>

      <div className="tabs doc-tabs">
        <button className={cls(tab === 'analyze' && 'on')} onClick={() => setTab('analyze')}>Analyse a document</button>
        <button className={cls(tab === 'library' && 'on')} onClick={() => setTab('library')}>Library <span className="tab-count">{docs?.length || 0}</span></button>
        <button className={cls(tab === 'ask' && 'on')} onClick={() => setTab('ask')}>Ask across documents</button>
      </div>

      {tab === 'analyze' && (
        <div className="docs-layout">
          <div className="docs-main">
            <div className={cls('dropzone', dragging && 'over')} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); onFile(e.dataTransfer.files?.[0]); }} onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" hidden accept=".pdf,.docx,.xlsx,.xls,.csv,.tsv,.txt,.md,.json,.html,.js,.jsx,.ts,.tsx,.py,.css,.sql,.xml,.yml,.yaml,.log" onChange={e => onFile(e.target.files?.[0])} />
              <span className="dropzone-ic"><Icon name="upload" size={26} /></span>
              <h3>{busy && busy.startsWith('Reading') ? busy : 'Drop a document here'}</h3>
              <p>or click to browse · up to 60,000 characters extracted per file</p>
              <div className="dropzone-pills"><span>PDF</span><span>Word</span><span>Excel</span><span>CSV</span><span>Text</span></div>
            </div>

            {file && (
              <Card className="file-extract">
                <div className="file-extract-top"><span className="file-type">{file.type}</span><div><b>{file.name}</b><span>{file.note} · {bytes(file.size)}</span></div><Badge tone="green">Extracted</Badge><IconBtn name="close" label="Remove" onClick={() => { setFile(null); setText(''); setName(''); setAnalysis(''); }} /></div>
                {file.sheets?.length > 0 && <div className="sheet-preview">{file.sheets.map(s => <span key={s.name}>{s.name} · {s.rows.length} rows</span>)}</div>}
                {file.truncated && <p className="detail-note"><Icon name="alert" size={13} /> The file is large — the first 60,000 characters were extracted.</p>}
              </Card>
            )}

            <Card className="doc-paste">
              <div className="card-head"><div><h3>{file ? 'Extracted text' : 'Or paste text'}</h3><p>{text.length ? `${fmt(text.length)} characters ready` : 'No text yet'} · {tool ? tool.name : 'Document summariser'}</p></div>{text && <Btn size="sm" variant="ghost" icon="trash" onClick={() => { setText(''); setFile(null); setName(''); }}>Clear</Btn>}</div>
              <Textarea rows={text ? 12 : 8} value={text} onChange={e => setText(e.target.value)} placeholder="Paste an article, contract, meeting notes or report…" />
              <div className="doc-options">
                <div className="doc-modes">{MODES.map(m => <button key={m.id} className={cls(mode === m.id && 'on')} onClick={() => setMode(m.id)}><b>{m.label}</b><span>{m.text}</span></button>)}</div>
                <div className="grid-2">
                  <Field label="Document name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="vendor-agreement.docx" /></Field>
                  {mode === 'question' ? <Field label="Your question"><Input value={question} onChange={e => setQuestion(e.target.value)} placeholder="What is the termination notice period?" /></Field> : <Field label="Focus" hint="Optional, e.g. 'focus on commercial risk'"><Input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Anything specific to look for?" /></Field>}
                </div>
              </div>
              <div className="row between">
                <span className="credit-hint"><Icon name="zap" size={13} /> 2 credits per analysis</span>
                <Btn variant="primary" icon="sparkles" loading={!!busy && !busy.startsWith('Reading')} onClick={analyze}>{mode === 'question' ? 'Answer from document' : 'Analyse document'}</Btn>
              </div>
            </Card>

            {analysis && (
              <Card className="doc-result">
                <div className="card-head"><div><h3>{resultDoc?.name || name || 'Document brief'}</h3><p>{resultDoc ? timeAgo(resultDoc.createdAt) : 'Just now'} · 2 credits</p></div><div className="row"><Btn size="sm" variant="outline" icon="copy" onClick={async () => { await copy(analysis); toast('Brief copied', 'success'); }}>Copy</Btn><Btn size="sm" variant="outline" icon="download" onClick={() => download((name || 'document').replace(/\.[^.]+$/, '') + '-brief.md', analysis, 'text/markdown;charset=utf-8')}>Download</Btn><Btn size="sm" variant="ghost" icon="chat" onClick={() => { if (resultDoc) setSelected(resultDoc); }}>Ask follow-up</Btn></div></div>
                <Markdown>{analysis}</Markdown>
              </Card>
            )}
            {!analysis && busy && !busy.startsWith('Reading') && <Card className="doc-loading"><Spinner size={22} /><div><b>{busy}</b><p className="muted">Extracting structure, checking claims and drafting the brief.</p></div></Card>}
          </div>

          <aside className="docs-side">
            <Card>
              <div className="card-head"><div><h3>How it works</h3><p>Three steps, no setup</p></div></div>
              <ol className="step-list">
                <li><span>1</span><div><b>Extract</b><p>PDF, Word and Excel are parsed in your browser. Nothing is uploaded until you analyse.</p></div></li>
                <li><span>2</span><div><b>Analyse</b><p>NexAI produces a summary, key points, risks and follow-up questions.</p></div></li>
                <li><span>3</span><div><b>Ask</b><p>Keep asking grounded questions. If the answer isn’t in the document, it says so.</p></div></li>
              </ol>
            </Card>
            <Card>
              <div className="card-head"><div><h3>Recent documents</h3><p>From your library</p></div><Btn size="sm" variant="ghost" onClick={() => setTab('library')}>View all</Btn></div>
              <div className="doc-mini-list">
                {(docs || []).slice(0, 5).map(d => <button key={d.id} onClick={() => { setSelected(d); setTab('library'); }}><span className="file-type small">{d.type}</span><span><b>{d.name}</b><small>{fmt(d.chars)} chars · {timeAgo(d.createdAt)}</small></span><Icon name="right" size={13} /></button>)}
                {!(docs || []).length && <p className="muted small">No documents yet. Analyse your first file.</p>}
              </div>
            </Card>
            <Card className="doc-tip"><Icon name="shield" size={18} /><div><b>Your files stay yours</b><p>Extraction happens locally. Only the text you explicitly analyse is sent to the model, and you can delete any document at any time.</p></div></Card>
          </aside>
        </div>
      )}

      {tab === 'library' && (
        <div className="doc-library">
          {!(docs || []).length ? <Empty icon="file" title="Your library is empty" text="Analyse a document and it will appear here with its brief and follow-up questions." action={<Btn variant="primary" icon="upload" onClick={() => setTab('analyze')}>Upload a document</Btn>} /> : (
            <div className="doc-library-grid">
              {(docs || []).map(d => (
                <Card key={d.id} className="doc-card">
                  <div className="doc-card-top"><span className="file-type">{d.type}</span><Badge tone="green">Analysed</Badge><IconBtn name="trash" label="Delete" onClick={() => removeDoc(d)} /></div>
                  <h3>{d.name}</h3>
                  <p>{d.summary || 'No summary stored.'}</p>
                  <div className="doc-card-meta"><span><Icon name="file" size={13} /> {fmt(d.chars)} chars</span><span><Icon name="clock" size={13} /> {timeAgo(d.createdAt)}</span></div>
                  <div className="row"><Btn size="sm" variant="outline" onClick={() => setSelected(d)}>Open brief</Btn><Btn size="sm" variant="ghost" icon="chat" onClick={() => setSelected(d)}>Ask</Btn></div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'ask' && (
        <Card className="ask-across">
          <div className="ask-across-art"><Icon name="chat" size={30} /></div>
          <h3>Ask across your document library</h3>
          <p>Pick a document below, then ask a grounded question. Answers cite the relevant section and admit when something isn’t covered.</p>
          <div className="doc-library-grid compact">
            {(docs || []).map(d => <button key={d.id} className="doc-ask-row" onClick={() => setSelected(d)}><span className="file-type small">{d.type}</span><span><b>{d.name}</b><small>{fmt(d.chars)} characters</small></span><Icon name="chat" size={15} /></button>)}
          </div>
          {!(docs || []).length && <Btn variant="primary" onClick={() => setTab('analyze')}>Analyse a document first</Btn>}
        </Card>
      )}

      {selected && <DocDrawer doc={selected} onClose={() => setSelected(null)} onDelete={() => removeDoc(selected)} />}
    </div>
  );
}

function DocDrawer({ doc, onClose, onDelete }) {
  const { refreshUser } = useApp();
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const ask = async () => {
    if (!q.trim()) return;
    setBusy(true);
    const question = q;
    setQ('');
    try {
      const d = await api('/documents/' + doc.id + '/ask', 'POST', { question });
      setAnswer(d.answer); setHistory(h => [{ q: question, a: d.answer, at: new Date().toISOString() }, ...h]);
      refreshUser?.();
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };
  return (
    <Drawer title={doc.name} subtitle={`${doc.type} · ${fmt(doc.chars)} characters · ${timeAgo(doc.createdAt)}`} onClose={onClose} width={620}>
      <div className="doc-drawer">
        <div className="row"><Badge tone="green">Analysed</Badge><Badge tone="default">2 credits used</Badge><span className="grow" /><Btn size="sm" variant="ghost" icon="trash" onClick={onDelete}>Delete</Btn></div>
        <div className="detail-section"><h4>Document brief</h4>{doc.summary ? <Markdown>{doc.summary}</Markdown> : <p className="muted">No summary stored for this document.</p>}</div>
        <div className="detail-section">
          <h4>Ask this document</h4>
          <p className="muted small">Grounded in the extracted text. 1 credit per question.</p>
          <div className="ask-box"><Textarea rows={3} value={q} onChange={e => setQ(e.target.value)} placeholder="What are the termination terms? What changed vs. last year?" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }} /><Btn variant="primary" icon="send" loading={busy} onClick={ask}>Ask</Btn></div>
        </div>
        {busy && <div className="doc-loading small"><Spinner size={16} /><span>Reading the document…</span></div>}
        {history.map((h, i) => <div key={i} className="qa-block"><div className="qa-q"><Icon name="chat" size={14} /><b>{h.q}</b></div><div className="qa-a"><Markdown>{h.a}</Markdown></div></div>)}
        {!history.length && answer && <div className="qa-block"><div className="qa-a"><Markdown>{answer}</Markdown></div></div>}
      </div>
    </Drawer>
  );
}
