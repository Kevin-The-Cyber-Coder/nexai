import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, streamChat, extractFile, download, copy } from '../api.js';
import { useApp, go } from '../context.js';
import { Icon, Btn, IconBtn, Badge, Modal, Markdown, Empty, Avatar, useDebounced, toast, timeAgo, cls, fmt, Spinner } from '../ui.jsx';
import { FEATURES, MODULES, findFeature } from '../nav.js';

const STARTERS = [
  { icon: 'megaphone', title: 'Build a launch plan', text: 'Build a 6-week launch plan for our new analytics product, including channel mix, messaging and success metrics.' },
  { icon: 'code', title: 'Review some code', text: 'Review this function for correctness, edge cases and readability. Suggest a safer implementation with tests.' },
  { icon: 'chart', title: 'Explain the numbers', text: 'Turn this month’s metrics into a one-page operating brief: headline, wins, risks, decisions needed and next priorities.' },
  { icon: 'book', title: 'Teach me something', text: 'Explain how transformer attention works to a senior engineer who has never studied ML. Use a concrete analogy and one worked example.' }
];

const TONES = ['balanced', 'precise', 'friendly', 'creative'];
const LENGTHS = ['short', 'medium', 'long'];

export default function Chat({ params, user, refreshUser, models }) {
  const { data: modelData } = useFetchModels();
  const [convos, setConvos] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [toolId, setToolId] = useState(params.tool || '');
  const [model, setModel] = useState('nexai-core');
  const [tone, setTone] = useState('balanced');
  const [length, setLength] = useState('medium');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [meta, setMeta] = useState(null);
  const [attach, setAttach] = useState(null);
  const [attachBusy, setAttachBusy] = useState('');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [toolOpen, setToolOpen] = useState(false);
  const [toolQuery, setToolQuery] = useState('');
  const [rename, setRename] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [feedback, setFeedback] = useState({});
  const [errorBanner, setErrorBanner] = useState('');
  const threadRef = useRef();
  const inputRef = useRef();
  const abortRef = useRef();
  const fileRef = useRef();
  const dq = useDebounced(toolQuery, 120);

  const tool = toolId ? findFeature(toolId) : null;
  const recentModel = models?.find(m => m.id === model);

  async function loadConvos() {
    try { setConvos(await api('/conversations?archived=' + showArchived)); } catch { /* ignore */ }
  }
  useEffect(() => { loadConvos(); }, [showArchived]);

  useEffect(() => {
    if (!params.c) return;
    api('/conversations/' + params.c).then(c => {
      setActive(c); setMessages(c.messages || []);
      if (c.toolId) setToolId(c.toolId);
      if (c.model) setModel(c.model);
      setSuggestions([]); setMeta(null);
    }).catch(e => setErrorBanner(e.message));
  }, [params.c]);

  useEffect(() => {
    if (!params.tool) return;
    setToolId(params.tool);
    setActive(null); setMessages([]); setSuggestions([]); setMeta(null);
  }, [params.tool]);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streamText, streaming]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return convos.filter(c => !q || c.title.toLowerCase().includes(q) || (c.preview || '').toLowerCase().includes(q));
  }, [convos, search]);

  const toolResults = useMemo(() => {
    const q = dq.trim().toLowerCase();
    return FEATURES.filter(f => f.action === 'chat' || ['writing', 'business', 'marketing', 'education', 'finance', 'research', 'documents'].includes(f.route))
      .filter(f => !q || f.name.toLowerCase().includes(q) || f.moduleName.toLowerCase().includes(q) || f.description.toLowerCase().includes(q))
      .slice(0, 80);
  }, [dq]);

  const openConversation = async (id) => {
    setSidebarOpen(false);
    try {
      const c = await api('/conversations/' + id);
      setActive(c); setMessages(c.messages || []);
      if (c.toolId) setToolId(c.toolId);
      if (c.model) setModel(c.model);
      setSuggestions([]); setMeta(null); setErrorBanner('');
      window.history.replaceState(null, '', '#/chat?c=' + id);
    } catch (e) { toast(e.message, 'error'); }
  };

  const newChat = (tool) => {
    setActive(null); setMessages([]); setInput(''); setSuggestions([]); setMeta(null);
    setAttach(null); setErrorBanner(''); setSidebarOpen(false);
    if (tool !== undefined) setToolId(tool || '');
    window.history.replaceState(null, '', '#/chat' + (tool ? '?tool=' + tool : ''));
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const updateConversation = async (id, patch, quiet) => {
    try {
      const c = await api('/conversations/' + id, 'PATCH', patch);
      if (active?.id === id) setActive(c);
      loadConvos();
      if (!quiet) toast('Conversation updated', 'success');
      return c;
    } catch (e) { toast(e.message, 'error'); }
  };

  const deleteConversation = async (id) => {
    if (!window.confirm('Delete this conversation permanently?')) return;
    try {
      await api('/conversations/' + id, 'DELETE');
      if (active?.id === id) newChat('');
      toast('Conversation deleted', 'success'); loadConvos();
    } catch (e) { toast(e.message, 'error'); }
  };

  const shareConversation = async () => {
    if (!active) return toast('Send a message first.', 'info');
    try {
      const d = await api('/conversations/' + active.id + '/share', 'POST', {});
      await copy(d.url);
      toast('Share link copied to clipboard', 'success');
      setActive({ ...active, shareId: d.shareId });
      loadConvos();
    } catch (e) { toast(e.message, 'error'); }
  };

  const exportConversation = async (format = 'md') => {
    if (!active) return toast('Nothing to export yet.', 'info');
    try {
      const d = await api(`/conversations/${active.id}/export?format=${format}`);
      download(d.filename, d.content, format === 'html' ? 'text/html;charset=utf-8' : 'text/markdown;charset=utf-8');
      toast('Export downloaded', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  const pickFile = async (file) => {
    if (!file) return;
    setAttachBusy('Reading ' + file.name + '…');
    try {
      const extracted = await extractFile(file, setAttachBusy);
      setAttach(extracted);
      toast(`${file.name} attached · ${extracted.note || 'ready'}`, 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setAttachBusy(''); if (fileRef.current) fileRef.current.value = ''; }
  };

  const generate = async ({ content = '', regenerate = false, editMessageId = null, attachment = attach } = {}) => {
    const trimmed = content.trim();
    if (!trimmed && !regenerate) return;
    if (streaming) return;
    if ((user?.credits || 0) < 1) return toast('You’re out of credits. Upgrade to keep going.', 'error');

    setErrorBanner('');
    setSuggestions([]);
    setMeta(null);
    setStreamText('');
    const optimistic = { id: 'tmp_' + Date.now(), role: 'user', content: trimmed || 'Regenerate response', at: new Date().toISOString(), attachment: attachment?.name };
    if (!regenerate) setMessages(m => [...m, optimistic]);
    else setMessages(m => {
      const next = [...m];
      while (next.length && next.at(-1).role === 'assistant') next.pop();
      return next;
    });
    setInput('');
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    let acc = '';
    let convId = active?.id;

    try {
      await streamChat({
        conversationId: active?.id, toolId: toolId || undefined, model, tone, length,
        content: trimmed, regenerate: !!regenerate, editMessageId: editMessageId || undefined,
        attachment: attachment?.text ? { name: attachment.name, text: attachment.text } : undefined
      }, ev => {
        if (ev.type === 'start') {
          convId = ev.conversationId;
          setMeta({ model: ev.model, demo: ev.demo, tool: ev.tool, confidence: null });
        }
        if (ev.type === 'delta') {
          acc += ev.text;
          setStreamText(acc);
        }
        if (ev.type === 'done') {
          setMeta(m => ({ ...(m || {}), ...ev, confidence: ev.confidence }));
          setSuggestions(ev.suggestions || []);
          if (ev.conversation) {
            setActive(ev.conversation);
            api('/conversations/' + ev.conversation.id).then(c => {
              setMessages(c.messages || []);
              setActive(c);
            }).catch(() => {});
            window.history.replaceState(null, '', '#/chat?c=' + ev.conversation.id);
          } else if (ev.message) {
            setMessages(m => [...m, ev.message]);
          }
          loadConvos();
        }
        if (ev.type === 'error') {
          setErrorBanner(ev.message);
          toast(ev.message, 'error');
        }
      }, controller.signal);
    } catch (e) {
      if (e.name !== 'AbortError') {
        setErrorBanner(e.message);
        toast(e.message, 'error');
      }
    } finally {
      setStreaming(false);
      setStreamText('');
      setAttach(null);
      abortRef.current = null;
      refreshUser?.();
      loadConvos();
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setStreaming(false);
    toast('Generation stopped', 'info');
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate({ content: input }); }
  };

  const regenerate = () => generate({ regenerate: true });
  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');

  const copyMessage = async (text) => { await copy(text); toast('Copied to clipboard', 'success'); };

  return (
    <div className={cls('chat-layout', sidebarOpen && 'side-open')}>
      <aside className="chat-side">
        <div className="chat-side-head">
          <div className="row"><h2>Conversations</h2><IconBtn name="close" className="chat-side-close" label="Close" onClick={() => setSidebarOpen(false)} /></div>
          <button className="chat-new" onClick={() => newChat('')}><Icon name="plus" size={16} /> New chat <kbd>⌘⇧N</kbd></button>
          <div className="chat-search"><Icon name="search" size={15} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations" />{search && <IconBtn name="close" size={13} label="Clear" onClick={() => setSearch('')} />}</div>
        </div>
        <div className="chat-convos">
          {filtered.length === 0 && <p className="chat-empty-note">{search ? 'No conversations match.' : 'No conversations here yet.'}</p>}
          {filtered.map(c => (
            <button key={c.id} className={cls('chat-convo', active?.id === c.id && 'on')} onClick={() => openConversation(c.id)}>
              <span className="convo-ic"><Icon name={c.toolId ? 'sparkles' : 'chat'} size={15} /></span>
              <span className="convo-body"><b>{c.pinned && <Icon name="pin" size={10} />} {c.title}</b><small>{c.preview || 'No messages yet'} · {timeAgo(c.updatedAt)}</small></span>
              <span className="convo-tools">
                <span role="button" tabIndex={0} title={c.pinned ? 'Unpin' : 'Pin'} onClick={e => { e.stopPropagation(); updateConversation(c.id, { pinned: !c.pinned }, true); }}><Icon name="pin" size={12} /></span>
                <span role="button" tabIndex={0} title="Rename" onClick={e => { e.stopPropagation(); setRename(c); setRenameValue(c.title); }}><Icon name="edit" size={12} /></span>
                <span role="button" tabIndex={0} title="Archive" onClick={e => { e.stopPropagation(); updateConversation(c.id, { archived: !showArchived }, true); }}><Icon name="archive" size={12} /></span>
                <span role="button" tabIndex={0} title="Delete" onClick={e => { e.stopPropagation(); deleteConversation(c.id); }}><Icon name="trash" size={12} /></span>
              </span>
            </button>
          ))}
        </div>
        <button className="chat-archive-toggle" onClick={() => setShowArchived(v => !v)}>
          <Icon name="archive" size={15} /> {showArchived ? 'Back to active' : 'Archived conversations'}
        </button>
      </aside>

      <section className="chat-main">
        <header className="chat-head">
          <div className="chat-head-left">
            <IconBtn name="menu" className="chat-side-toggle" label="Conversations" onClick={() => setSidebarOpen(true)} />
            <span className={cls('chat-tool-ic', tool && 'on')}><Icon name={tool?.moduleIcon || 'sparkles'} size={18} /></span>
            <div>
              <h2>{active?.title || tool?.name || 'New conversation'}</h2>
              <p>{tool ? <><Badge tone="violet">{tool.moduleName}</Badge> <span>Tool #{tool.number}</span></> : <>NexAI assistant · <b>{recentModel?.name || 'NexAI Core'}</b></>}</p>
            </div>
          </div>
          <div className="chat-head-actions">
            <Btn variant="outline" size="sm" icon="share" onClick={shareConversation}>Share</Btn>
            <Btn variant="ghost" size="sm" icon="download" onClick={() => exportConversation('md')}>Export</Btn>
            <Btn variant="ghost" size="sm" icon="refresh" onClick={() => newChat('')}>New</Btn>
          </div>
        </header>

        <div className="chat-thread" ref={threadRef}>
          {!messages.length && !streaming ? (
            <div className="chat-welcome">
              <div className="chat-orb"><Icon name="sparkles" size={26} /></div>
              <h1>{tool ? tool.name : 'What should we create today?'}</h1>
              <p>{tool ? tool.description : 'Ask anything. Or pick one of the 370 tools and drive a specific workflow end to end.'}</p>
              <div className="chat-starters">
                {STARTERS.map(s => (
                  <button key={s.title} onClick={() => generate({ content: s.text })}>
                    <span className="starter-ic"><Icon name={s.icon} size={17} /></span>
                    <span><b>{s.title}</b><small>{s.text}</small></span>
                    <Icon name="arrowUpRight" size={14} />
                  </button>
                ))}
              </div>
              <div className="chat-welcome-foot"><Badge tone={modelData?.demo === false ? 'green' : 'amber'} dot>{modelData?.demo === false ? 'Live providers connected' : 'Demo intelligence'}</Badge><span>370 features · 19 modules · shared memory</span></div>
            </div>
          ) : (
            <div className="chat-messages">
              {messages.map((m, i) => (
                <Message key={m.id || i} message={m} user={user} onCopy={copyMessage} feedback={feedback[m.id]} onFeedback={v => setFeedback(f => ({ ...f, [m.id]: v }))} onRegenerate={i === messages.length - 1 && m.role === 'assistant' ? regenerate : null} />
              ))}
              {streaming && (
                <div className="msg assistant streaming">
                  <div className="msg-avatar ai"><Icon name="sparkles" size={15} /></div>
                  <div className="msg-content">
                    <div className="msg-meta"><b>NexAI</b><span>{meta?.model || recentModel?.name || 'NexAI Core'}</span>{meta?.demo && <Badge tone="amber">Demo</Badge>}</div>
                    {streamText ? <div className="streaming-md"><Markdown>{streamText}</Markdown><span className="caret" /></div> : <div className="typing"><i /><i /><i /></div>}
                  </div>
                </div>
              )}
              {errorBanner && <div className="chat-error"><Icon name="alert" size={16} /><span>{errorBanner}</span><button onClick={() => setErrorBanner('')}><Icon name="close" size={13} /></button></div>}
            </div>
          )}
        </div>

        <div className="chat-composer-wrap">
          {suggestions.length > 0 && !streaming && (
            <div className="chat-suggestions">
              <span>Try next</span>
              {suggestions.slice(0, 4).map(s => <button key={s} onClick={() => generate({ content: s })}>{s}</button>)}
            </div>
          )}
          <div className="composer">
            {attach && <div className="attach-chip"><Icon name="file" size={14} /><span>{attach.name}<small>{attach.note}</small></span><button onClick={() => setAttach(null)}><Icon name="close" size={12} /></button></div>}
            {attachBusy && <div className="attach-chip busy"><Spinner size={13} /><span>{attachBusy}</span></div>}
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
              placeholder={tool ? `Describe what you need — ${tool.name.toLowerCase()}…` : 'Message NexAI…  (Enter to send, Shift+Enter for a new line)'} rows={1} />
            <div className="composer-bar">
              <div className="composer-left">
                <IconBtn name="plus" label="Attach a file" onClick={() => fileRef.current?.click()} />
                <input ref={fileRef} type="file" hidden accept=".pdf,.docx,.xlsx,.xls,.csv,.tsv,.txt,.md,.json,.html,.js,.jsx,.ts,.tsx,.py,.css,.sql,.xml,.yml,.yaml,.log" onChange={e => pickFile(e.target.files?.[0])} />
                <button className={cls('tool-pick', tool && 'on')} onClick={() => setToolOpen(true)}>
                  <Icon name="wand" size={15} /> {tool ? tool.name : 'Choose a tool'}
                </button>
                <select className="composer-select" value={model} onChange={e => setModel(e.target.value)} title="Model">
                  {(models?.length ? models : [{ id: 'nexai-core', name: 'NexAI Core' }]).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <select className="composer-select" value={tone} onChange={e => setTone(e.target.value)} title="Tone">
                  {TONES.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
                </select>
                <select className="composer-select" value={length} onChange={e => setLength(e.target.value)} title="Length">
                  {LENGTHS.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div className="composer-right">
                <span className="credit-hint"><Icon name="zap" size={13} /> {fmt(user?.credits)}</span>
                {streaming
                  ? <Btn variant="danger" icon="stop" onClick={stop}>Stop</Btn>
                  : <Btn variant="primary" icon="send" onClick={() => generate({ content: input })} disabled={!input.trim()}>Send</Btn>}
              </div>
            </div>
          </div>
          <p className="composer-note">NexAI can make mistakes. Verify important facts, especially numbers. <button onClick={() => exportConversation('html')}>Export this chat</button>{lastAssistant && <> · <button onClick={regenerate}>Regenerate last answer</button></>}</p>
        </div>
      </section>

      {toolOpen && (
        <Modal title="Choose a tool" subtitle="All 370 features are available here. Pick one to focus the conversation." onClose={() => setToolOpen(false)} width={760}>
          <div className="tool-picker">
            <div className="chat-search"><Icon name="search" size={15} /><input autoFocus value={toolQuery} onChange={e => setToolQuery(e.target.value)} placeholder="Search tools, modules or tasks…" /></div>
            <div className="tool-picker-list">
              <button className={cls('tool-pick-row', !toolId && 'on')} onClick={() => { setToolId(''); setToolOpen(false); }}>
                <span className="tp-ic"><Icon name="sparkles" size={16} /></span>
                <span><b>General assistant</b><small>No specific tool — ask anything</small></span>
                {!toolId && <Icon name="check" size={15} />}
              </button>
              {toolResults.map(f => (
                <button key={f.id} className={cls('tool-pick-row', toolId === f.id && 'on')} onClick={() => { setToolId(f.id); setToolOpen(false); setMessages([]); setActive(null); }}>
                  <span className="tp-ic"><Icon name={f.moduleIcon} size={16} /></span>
                  <span><b>{f.name}</b><small>{f.moduleName} · feature #{f.number}</small></span>
                  {toolId === f.id && <Icon name="check" size={15} />}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {rename && (
        <Modal title="Rename conversation" onClose={() => setRename(null)} footer={<><Btn variant="ghost" onClick={() => setRename(null)}>Cancel</Btn><Btn variant="primary" onClick={async () => { await updateConversation(rename.id, { title: renameValue }); setRename(null); }}>Save</Btn></>}>
          <label className="field"><span className="field-label">Conversation title</span><input className="input" autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && updateConversation(rename.id, { title: renameValue }).then(() => setRename(null))} /></label>
        </Modal>
      )}
    </div>
  );
}

function useFetchModels() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/models').then(setData).catch(() => {}); }, []);
  return { data };
}

function Message({ message, user, onCopy, onRegenerate, feedback, onFeedback }) {
  const mine = message.role === 'user';
  return (
    <div className={cls('msg', mine ? 'user' : 'assistant')}>
      {mine ? <Avatar user={user} size={32} /> : <div className="msg-avatar ai"><Icon name="sparkles" size={15} /></div>}
      <div className="msg-content">
        <div className="msg-meta">
          <b>{mine ? 'You' : 'NexAI'}</b>
          <span>{timeAgo(message.at)}</span>
          {!mine && message.model && <span className="msg-model">{message.model}</span>}
          {!mine && message.confidence != null && <Badge tone="green">{Math.round(message.confidence * 100)}% confidence</Badge>}
        </div>
        {message.attachment && <div className="msg-attachment"><Icon name="file" size={13} /> {message.attachment}</div>}
        {mine ? <div className="msg-plain">{message.content}</div> : <Markdown>{message.content}</Markdown>}
        <div className="msg-actions">
          <button onClick={() => onCopy(message.content)}><Icon name="copy" size={13} /> Copy</button>
          {!mine && <><button className={cls(feedback === 'up' && 'on')} onClick={() => onFeedback(feedback === 'up' ? null : 'up')}><Icon name="checkCircle" size={13} /> Helpful</button>
            <button className={cls(feedback === 'down' && 'on')} onClick={() => onFeedback(feedback === 'down' ? null : 'down')}><Icon name="alert" size={13} /> Not quite</button></>}
          {onRegenerate && <button onClick={onRegenerate}><Icon name="refresh" size={13} /> Regenerate</button>}
        </div>
      </div>
    </div>
  );
}
