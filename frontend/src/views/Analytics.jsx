import React, { useRef, useState } from 'react';
import { api, parseCsv, download, extractFile } from '../api.js';
import { useApp, go } from '../context.js';
import { Icon, Btn, IconBtn, Card, Badge, Markdown, Empty, Field, Input, useFetch, fmt, timeAgo, cls, toast, Spinner, BarChart, AreaChart } from '../ui.jsx';
import { MODULES } from '../nav.js';

const COLORS = ['#818cf8', '#22d3ee', '#f472b6', '#34d399', '#f59e0b', '#a78bfa'];

export default function Analytics({ params }) {
  const { refreshUser } = useApp();
  const { data: history, reload: reloadHistory } = useFetch(() => api('/analytics/datasets'), []);
  const [dataset, setDataset] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [askCharts, setAskCharts] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [tab, setTab] = useState('overview');
  const fileRef = useRef();

  const loadSample = async () => {
    setBusy('Loading sample dataset…');
    try {
      const d = await api('/analytics/sample');
      setDataset({ name: d.name, rows: d.rows });
      setResult(null); setAnswer(''); setAskCharts([]);
      toast(`${d.rows.length} rows loaded — run the analysis when ready`, 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(''); }
  };

  const readFile = async (file) => {
    if (!file) return;
    setBusy('Reading ' + file.name + '…');
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let rows;
      if (['csv', 'tsv'].includes(ext)) rows = parseCsv(await file.text());
      else {
        const ex = await extractFile(file, setBusy);
        if (ext === 'xlsx' || ext === 'xls') rows = ex.sheets?.[0]?.rows || [];
        else rows = parseCsv(ex.text || '');
      }
      if (!rows?.length) throw new Error('No readable rows found in this file.');
      setDataset({ name: file.name, rows });
      setResult(null); setAnswer(''); setAskCharts([]); setTab('overview');
      toast(`${rows.length} rows × ${Object.keys(rows[0]).length} columns ready`, 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(''); if (fileRef.current) fileRef.current.value = ''; }
  };

  const analyze = async () => {
    if (!dataset?.rows?.length) return toast('Upload a dataset or load the sample first.', 'error');
    setBusy('Analysing your dataset…'); setResult(null); setAnswer(''); setAskCharts([]);
    try {
      const d = await api('/analytics/analyze', 'POST', { name: dataset.name, rows: dataset.rows });
      setResult(d); reloadHistory(); refreshUser?.(); setTab('overview');
      toast('Analysis ready · 1 credit', 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(''); }
  };

  const ask = async () => {
    if (!result?.datasetId || !question.trim()) return;
    setBusy('Answering your question…');
    const q = question; setQuestion('');
    try {
      const d = await api('/analytics/ask', 'POST', { datasetId: result.datasetId, question: q });
      setAnswer(d.answer); setAskCharts(d.charts || []); refreshUser?.();
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(''); }
  };

  const openHistory = async (id) => {
    setBusy('Loading dataset…');
    try {
      const d = await api('/analytics/datasets/' + id);
      setDataset({ name: d.name, rows: d.data || [] });
      setResult(null); setAnswer(''); setAskCharts([]);
      toast(`${d.name} loaded — run analysis to refresh the brief`, 'info');
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(''); }
  };

  const downloadReport = () => {
    if (!result) return;
    const body = `# ${result.name}\n\n${result.rows} rows × ${result.columns.length} columns\n\n${result.insights.join('\n\n')}\n\n## Columns\n\n${result.columns.map(c => `- **${c.name}** — ${c.numeric ? 'numeric' : 'categorical'} · ${c.filled} filled · ${c.missing} missing`).join('\n')}`;
    download(result.name.replace(/\.[^.]+$/, '') + '-analysis.md', body, 'text/markdown;charset=utf-8');
  };

  const previewRows = dataset?.rows?.slice(0, 8) || [];
  const columns = previewRows[0] ? Object.keys(previewRows[0]) : [];

  return (
    <div className="analytics-page">
      <div className="analytics-head">
        <div><Badge tone="cyan" dot>Data analytics</Badge><h2>Upload the spreadsheet. Get the decision.</h2><p>Profile columns, catch missing data, visualise the drivers and ask questions in plain English. Every answer tells you what it can’t prove.</p></div>
        <div className="analytics-head-actions"><Btn variant="outline" icon="table" loading={busy === 'Loading sample dataset…'} onClick={loadSample}>Load sample data</Btn><Btn variant="primary" icon="upload" onClick={() => fileRef.current?.click()}>Upload CSV</Btn><input ref={fileRef} type="file" hidden accept=".csv,.tsv,.xlsx,.xls" onChange={e => readFile(e.target.files?.[0])} /></div>
      </div>

      {!dataset ? (
        <div className="analytics-empty">
          <div className={cls('dropzone analytics-drop', dragging && 'over')} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); readFile(e.dataTransfer.files?.[0]); }} onClick={() => fileRef.current?.click()}>
            <span className="dropzone-ic"><Icon name="chart" size={28} /></span>
            <h3>{busy || 'Drop a CSV or Excel file here'}</h3>
            <p>or load our sample marketing dataset and explore the full workflow</p>
            <div className="row" style={{ justifyContent: 'center' }}><Btn variant="outline" icon="table" onClick={e => { e.stopPropagation(); loadSample(); }}>Use sample data</Btn></div>
          </div>
          <div className="analytics-empty-grid">
            <Card><span className="stat-ic violet"><Icon name="table" size={18} /></span><h3>Profile every column</h3><p>Types, missing values, ranges, duplicates and the shape of the data before you trust it.</p></Card>
            <Card><span className="stat-ic cyan"><Icon name="chart" size={18} /></span><h3>See the drivers</h3><p>Automatic charts for the metric that matters most, plus a directional forecast you can challenge.</p></Card>
            <Card><span className="stat-ic green"><Icon name="chat" size={18} /></span><h3>Ask in plain English</h3><p>“Which channel is leading?” gets a grounded answer, not a hallucinated table.</p></Card>
          </div>
          {history?.length > 0 && <Card><div className="card-head"><div><h3>Recent datasets</h3><p>Pick up where you left off</p></div></div><div className="dataset-list">{history.map(d => <button key={d.id} onClick={() => openHistory(d.id)}><span className="file-type small">CSV</span><span><b>{d.name}</b><small>{fmt(d.rows)} rows × {d.columns} columns · {timeAgo(d.createdAt)}</small></span><Icon name="right" size={13} /></button>)}</div></Card>}
        </div>
      ) : (
        <div className="analytics-layout">
          <div className="analytics-main">
            <Card className="dataset-bar">
              <div className="dataset-file"><span className="file-type">DATA</span><div><b>{dataset.name}</b><span>{fmt(dataset.rows.length)} rows × {Object.keys(dataset.rows[0] || {}).length} columns</span></div></div>
              <div className="row"><Btn size="sm" variant="ghost" icon="refresh" onClick={() => { setDataset(null); setResult(null); setAnswer(''); }}>Change</Btn><Btn variant="primary" size="sm" icon="sparkles" loading={!!busy && busy.startsWith('Analysing')} onClick={analyze}>{result ? 'Re-run analysis' : 'Analyse dataset'}</Btn></div>
            </Card>

            {busy && busy.startsWith('Analysing') && <Card className="analysis-loading"><Spinner size={22} /><div><b>Profiling {fmt(dataset.rows.length)} rows</b><p className="muted">Checking types, missing values, distribution and trend.</p></div></Card>}

            {!result && !busy && <Card className="preview-card"><div className="card-head"><div><h3>Data preview</h3><p>First 8 rows · check the shape before analysing</p></div><Badge tone="default">{columns.length} columns</Badge></div><DataTable rows={previewRows} /></Card>}

            {result && (
              <>
                <div className="analysis-stats">
                  <Card className="stat"><div className="stat-top"><span className="stat-ic violet"><Icon name="table" size={17} /></span></div><div className="stat-value">{fmt(result.rows)}</div><div className="stat-label">rows analysed</div></Card>
                  <Card className="stat"><div className="stat-top"><span className="stat-ic cyan"><Icon name="grid" size={17} /></span></div><div className="stat-value">{result.columns.length}</div><div className="stat-label">columns</div></Card>
                  <Card className="stat"><div className="stat-top"><span className="stat-ic amber"><Icon name="alert" size={17} /></span></div><div className="stat-value">{fmt(result.missing)}</div><div className="stat-label">missing cells</div></Card>
                  <Card className="stat"><div className="stat-top"><span className="stat-ic pink"><Icon name="copy" size={17} /></span></div><div className="stat-value">{result.duplicates}</div><div className="stat-label">duplicate rows</div></Card>
                </div>

                <Card>
                  <div className="card-head"><div><h3>What the data says</h3><p>{result.numericColumns.length} numeric columns · {result.columns.length - result.numericColumns.length} categorical</p></div><div className="row"><Btn size="sm" variant="outline" icon="download" onClick={downloadReport}>Report</Btn></div></div>
                  <div className="insight-list">{result.insights.map((text, i) => <div key={i} className="insight"><span>{String(i + 1).padStart(2, '0')}</span><Markdown>{text}</Markdown></div>)}</div>
                </Card>

                {result.charts?.length > 0 && (
                  <div className="chart-grid">
                    <Card>
                      <div className="card-head"><div><h3>{result.charts[0].title}</h3><p>{result.charts[0].type === 'bar' ? 'Top rows by the primary metric' : 'Trend across rows'}</p></div><Badge tone="violet">Auto chart</Badge></div>
                      {result.charts[0].type === 'bar' ? <BarChart labels={result.charts[0].labels} values={result.charts[0].values} height={210} color="#818cf8" /> : <AreaChart data={result.charts[0].values.map((v, i) => ({ day: '#' + (i + 1), value: v }))} yKey="value" height={210} />}
                    </Card>
                    {result.charts[1] && <Card><div className="card-head"><div><h3>{result.charts[1].title}</h3><p>Pattern across the first 24 rows</p></div><Badge tone="cyan">Trend</Badge></div><AreaChart data={result.charts[1].values.map((v, i) => ({ day: '#' + (i + 1), value: v }))} yKey="value" height={210} color="#22d3ee" /></Card>}
                  </div>
                )}

                <div className="analytics-bottom">
                  <Card className="forecast-card">
                    <div className="card-head"><div><h3>Forecast</h3><p>{result.forecast ? result.forecast.basis : 'Not enough periods'}</p></div><Badge tone={result.forecast?.direction === 'up' ? 'green' : result.forecast?.direction === 'down' ? 'red' : 'default'}>{result.forecast?.direction || 'n/a'}</Badge></div>
                    {result.forecast ? <><div className="forecast-values">{[...result.forecast.next].map((v, i) => <div key={i}><span>+{i + 1}</span><b>{fmt(v)}</b></div>)}</div><p className="muted small">Directional only. Validate with a holdout before acting. Change per step: {result.forecast.change}%.</p></> : <p className="muted">At least four numeric periods are needed for a directional forecast.</p>}
                  </Card>
                  <Card>
                    <div className="card-head"><div><h3>Column profile</h3><p>Quality and distribution</p></div></div>
                    <div className="column-list">{result.columns.map((c, i) => <div key={c.name} className="column-row"><span className="col-dot" style={{ background: COLORS[i % COLORS.length] }} /><span><b>{c.name}</b><small>{c.numeric ? 'numeric' : 'categorical'} · {c.unique} unique</small></span><span className="col-miss">{c.missing ? `${c.missing} missing` : 'complete'}</span></div>)}</div>
                  </Card>
                </div>

                <Card className="ask-data">
                  <div className="card-head"><div><h3>Ask your data</h3><p>Grounded in this dataset only · 1 credit</p></div><Badge tone="green">Natural language</Badge></div>
                  <div className="ask-box"><Input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask()} placeholder="Which channel has the highest revenue? What is the average signup rate? Predict next month." /><Btn variant="primary" icon="send" loading={!!busy && busy.startsWith('Answering')} onClick={ask}>Ask</Btn></div>
                  <div className="row wrap gap" style={{ marginTop: 10 }}>{['Which channel performs best?', 'What is the average revenue?', 'Forecast the next four periods', 'Where is data missing?'].map(q => <button key={q} className="example-q" onClick={() => { setQuestion(q); }}>{q}</button>)}</div>
                  {answer && <div className="answer-box"><Markdown>{answer}</Markdown>{askCharts.map((c, i) => <div key={i} className="mini-chart"><BarChart labels={c.labels} values={c.values} height={160} color={COLORS[i + 1]} /></div>)}</div>}
                </Card>
              </>
            )}
          </div>

          <aside className="analytics-side">
            <Card>
              <div className="card-head"><div><h3>Dataset history</h3><p>Last 12 uploads</p></div><IconBtn name="refresh" label="Refresh" onClick={reloadHistory} /></div>
              <div className="dataset-list">{(history || []).length === 0 && <p className="muted small">No saved datasets yet.</p>}{(history || []).map(d => <button key={d.id} onClick={() => openHistory(d.id)}><span className="file-type small">CSV</span><span><b>{d.name}</b><small>{fmt(d.rows)} rows · {timeAgo(d.createdAt)}</small></span><Icon name="right" size={12} /></button>)}</div>
            </Card>
            <Card className="analytics-tip"><Icon name="shield" size={18} /><div><b>Correlation is not causation</b><p>NexAI separates what the data shows from what it might mean. Treat forecasts as directional and test before you commit budget.</p></div></Card>
            <Card>
              <div className="card-head"><div><h3>Data tools</h3><p>20 analytics capabilities</p></div><Btn size="sm" variant="ghost" onClick={() => go('features')}>All</Btn></div>
              <div className="mini-feature-list">{(MODULES.find(m => m.id === 'analytics')?.features || []).slice(0, 5).map(f => <button key={f.id} onClick={() => go('chat', { tool: f.id })}><span>{String(f.number).padStart(3, '0')}</span><b>{f.name}</b><Icon name="arrowUpRight" size={13} /></button>)}</div>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}

function DataTable({ rows }) {
  if (!rows.length) return <p className="muted">No preview rows.</p>;
  const cols = Object.keys(rows[0]);
  return (
    <div className="table-wrap data-table"><table><thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{cols.map(c => <td key={c}>{String(r[c] ?? '')}</td>)}</tr>)}</tbody></table></div>
  );
}
