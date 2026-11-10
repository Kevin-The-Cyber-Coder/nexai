import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, download, copy } from '../api.js';
import { useApp, go } from '../context.js';
import { Icon, Btn, IconBtn, Card, Badge, Modal, Empty, Field, Input, Textarea, Select, useFetch, fmt, timeAgo, cls, toast, Spinner } from '../ui.jsx';
import { MODULES, findFeature } from '../nav.js';

const IMAGE_STYLES = ['Abstract', '3D render', 'Minimal', 'Cinematic', 'Watercolor', 'Neon', 'Editorial', 'Product'];
const ASPECTS = [{ id: '16:9', label: 'Landscape 16:9' }, { id: '1:1', label: 'Square 1:1' }, { id: '4:5', label: 'Portrait 4:5' }, { id: '9:16', label: 'Story 9:16' }, { id: '3:2', label: 'Photo 3:2' }];
const VIDEO_STYLES = ['Cinematic', 'Documentary', 'Product demo', 'Social ad', 'Explainer', 'Editorial'];

/* ------------------------------- image ------------------------------- */
export function ImageStudio({ params }) {
  const { refreshUser } = useApp();
  const { data, reload } = useFetch(() => api('/image/gallery'), []);
  const [images, setImages] = useState([]);
  const [prompt, setPrompt] = useState(params?.tool ? 'A bold visual for ' + (findFeature(params.tool)?.name || 'your next campaign') : '');
  const [style, setStyle] = useState('Cinematic');
  const [aspect, setAspect] = useState('16:9');
  const [variants, setVariants] = useState(2);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [tab, setTab] = useState('create');

  useEffect(() => { if (data) setImages(data); }, [data]);

  const generate = async () => {
    if (!prompt.trim()) return toast('Describe the image you want.', 'error');
    setBusy(true);
    try {
      const d = await api('/image/generate', 'POST', { prompt, style, aspect, variants });
      setImages(prev => [...d.images, ...prev]);
      setPreview(d.images[0]);
      refreshUser?.(); reload();
      toast(`${d.images.length} image${d.images.length > 1 ? 's' : ''} generated · 2 credits`, 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const remove = async (img) => {
    if (!window.confirm('Remove this image from your gallery?')) return;
    try { await api('/image/' + img.id, 'DELETE'); setImages(x => x.filter(i => i.id !== img.id)); if (preview?.id === img.id) setPreview(null); toast('Image removed', 'success'); }
    catch (e) { toast(e.message, 'error'); }
  };

  const downloadImage = (img) => download(`${img.prompt.slice(0, 40).replace(/[^\w]+/g, '-') || 'nexai-image'}.svg`, img.svg, 'image/svg+xml');

  return (
    <div className="studio-page">
      <div className="studio-head">
        <div><Badge tone="pink" dot>Image Studio</Badge><h2>From a sentence to a visual system.</h2><p>Generate on-brand hero images, social variants and concept boards. Every output is yours to download, edit or iterate on.</p></div>
        <div className="studio-stats"><div><b>{images.length}</b><span>generations</span></div><div><b>8</b><span>styles</span></div><div><b>5</b><span>aspect ratios</span></div></div>
      </div>

      <div className="studio-layout">
        <Card className="studio-controls">
          <div className="card-head"><div><h3>Create an image</h3><p>2 credits per generation</p></div><Badge tone="amber">Demo renderer</Badge></div>
          <Field label="Prompt"><Textarea rows={4} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Isometric analytics workspace, indigo and mint, soft studio light, glass surfaces…" /></Field>
          <div className="prompt-chips">{['Product hero, violet rim light', 'Minimal editorial poster', 'Abstract data landscape', 'Warm founder portrait'].map(p => <button key={p} onClick={() => setPrompt(p)}>{p}</button>)}</div>
          <Field label="Style"><div className="style-grid">{IMAGE_STYLES.map(s => <button key={s} className={cls('style-chip', style === s && 'on')} onClick={() => setStyle(s)}>{s}</button>)}</div></Field>
          <div className="grid-2">
            <Field label="Aspect ratio"><Select value={aspect} onChange={e => setAspect(e.target.value)}>{ASPECTS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</Select></Field>
            <Field label="Variants"><Select value={variants} onChange={e => setVariants(Number(e.target.value))}><option value={1}>1 image</option><option value={2}>2 images</option><option value={3}>3 images</option><option value={4}>4 images</option></Select></Field>
          </div>
          <Btn variant="primary" icon="sparkles" loading={busy} onClick={generate} className="w-full">{busy ? 'Rendering your image…' : 'Generate image · 2 credits'}</Btn>
          <div className="detail-note"><Icon name="info" size={14} /><span>Images are generated as scalable SVG art in demo mode. Add an image provider key to render photorealistic outputs.</span></div>
        </Card>

        <div className="studio-results">
          <div className="studio-tabs"><button className={cls(tab === 'create' && 'on')} onClick={() => setTab('create')}>Latest <span>{images.length}</span></button><button className={cls(tab === 'gallery' && 'on')} onClick={() => setTab('gallery')}>Gallery</button></div>
          {images.length === 0 && !busy ? <Empty icon="image" title="No images yet" text="Write a prompt and generate your first visual. Try a product hero or an editorial poster." /> : (
            <div className="image-grid">
              {images.map(img => (
                <button key={img.id} className="image-card" onClick={() => setPreview(img)}>
                  <span className="image-render" dangerouslySetInnerHTML={{ __html: img.svg }} />
                  <span className="image-meta"><b>{img.prompt}</b><small>{img.style} · {img.aspect} · {timeAgo(img.createdAt)}</small></span>
                  <span className="image-actions"><span role="button" tabIndex={0} title="Download" onClick={e => { e.stopPropagation(); downloadImage(img); }}><Icon name="download" size={13} /></span><span role="button" tabIndex={0} title="Delete" onClick={e => { e.stopPropagation(); remove(img); }}><Icon name="trash" size={13} /></span></span>
                </button>
              ))}
              {busy && Array.from({ length: variants }).map((_, i) => <div key={i} className="image-card skeleton" style={{ height: 260 }} />)}
            </div>
          )}
        </div>
      </div>

      {preview && (
        <Modal title="Image preview" subtitle={preview.style + ' · ' + preview.aspect} onClose={() => setPreview(null)} width={900}
          footer={<><Btn variant="ghost" icon="close" onClick={() => setPreview(null)}>Close</Btn><Btn variant="outline" icon="download" onClick={() => downloadImage(preview)}>Download SVG</Btn><Btn variant="primary" icon="copy" onClick={async () => { await copy(preview.prompt); toast('Prompt copied', 'success'); }}>Copy prompt</Btn></>}>
          <div className="preview-image" dangerouslySetInnerHTML={{ __html: preview.svg }} />
          <div className="preview-meta"><Badge tone="violet">{preview.style}</Badge><span>{preview.prompt}</span></div>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------- video ------------------------------- */
export function VideoStudio({ params }) {
  const { refreshUser } = useApp();
  const { data, reload } = useFetch(() => api('/video/gallery'), []);
  const [videos, setVideos] = useState([]);
  const [prompt, setPrompt] = useState(params?.tool ? 'A 60 second launch film for ' + (findFeature(params.tool)?.name || 'NexAI') : '');
  const [style, setStyle] = useState('Cinematic');
  const [duration, setDuration] = useState(60);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => { if (data) { setVideos(data); if (data[0]) setSelected(data[0]); } }, [data]);

  const generate = async () => {
    if (!prompt.trim()) return toast('Describe the video you want.', 'error');
    setBusy(true);
    try {
      const d = await api('/video/generate', 'POST', { prompt, style, duration });
      setVideos(v => [d.video, ...v]); setSelected(d.video); refreshUser?.(); reload();
      toast('Storyboard ready · 5 credits', 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const remove = async (v) => {
    if (!window.confirm('Delete this storyboard?')) return;
    try { await api('/video/' + v.id, 'DELETE'); setVideos(x => x.filter(i => i.id !== v.id)); if (selected?.id === v.id) setSelected(null); toast('Storyboard deleted', 'success'); }
    catch (e) { toast(e.message, 'error'); }
  };

  const downloadBoard = (v) => {
    const body = `# ${v.board.title}\n\n${v.board.hook}\n\n## Scenes\n\n${v.board.scenes.map(s => `### ${s.id}. ${s.title} (${s.seconds}s)\n**Shot:** ${s.shot}\n\n${s.description}\n\n**Voiceover:** “${s.voiceover}”`).join('\n\n')}\n\n## CTA\n\n${v.board.cta}\n\n## Notes\n\n${v.board.notes.map(n => '- ' + n).join('\n')}`;
    download(v.board.title.slice(0, 40).replace(/[^\w]+/g, '-') + '-storyboard.md', body, 'text/markdown;charset=utf-8');
  };

  return (
    <div className="studio-page">
      <div className="studio-head video">
        <div><Badge tone="violet" dot>Video Studio</Badge><h2>Script it, board it, ship it.</h2><p>Turn an idea into a production-ready storyboard with shot direction, voiceover and timing. Export the board and hand it to an editor.</p></div>
        <div className="studio-stats"><div><b>{videos.length}</b><span>storyboards</span></div><div><b>180s</b><span>max runtime</span></div><div><b>7</b><span>scene beats</span></div></div>
      </div>

      <div className="studio-layout">
        <Card className="studio-controls">
          <div className="card-head"><div><h3>New storyboard</h3><p>5 credits per film</p></div><Badge tone="violet">Director mode</Badge></div>
          <Field label="Brief"><Textarea rows={4} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="A 60 second product launch film for an analytics platform. Calm, confident, no hype." /></Field>
          <div className="prompt-chips">{['60s product launch', '15s social hook', 'Founder story', 'Customer case study'].map(p => <button key={p} onClick={() => setPrompt(p + ' for NexAI')}>{p}</button>)}</div>
          <Field label="Style"><Select value={style} onChange={e => setStyle(e.target.value)}>{VIDEO_STYLES.map(s => <option key={s}>{s}</option>)}</Select></Field>
          <Field label={`Duration · ${duration}s`} hint="Longer films get more scenes and more detail."><input className="range" type="range" min="15" max="180" step="15" value={duration} onChange={e => setDuration(Number(e.target.value))} /></Field>
          <Btn variant="primary" icon="film" loading={busy} onClick={generate} className="w-full">{busy ? 'Boarding your film…' : 'Generate storyboard · 5 credits'}</Btn>
          <div className="detail-note"><Icon name="info" size={14} /><span>Video Studio creates a production board in demo mode. Add a video provider key to render the final cut.</span></div>
        </Card>

        <div className="studio-results">
          {videos.length > 1 && <div className="video-strip">{videos.map(v => <button key={v.id} className={cls(selected?.id === v.id && 'on')} onClick={() => setSelected(v)}><span>{v.style[0]}</span><div><b>{v.title}</b><small>{v.duration}s · {v.scenes} scenes</small></div></button>)}</div>}
          {!selected && !busy ? <Empty icon="film" title="No storyboards yet" text="Describe the film you want and get a scene-by-scene board with shot direction and voiceover." /> : busy ? (
            <Card className="studio-loading"><Spinner size={22} /><h3>Writing the board</h3><p className="muted">Choosing a narrative arc, breaking it into beats and timing each scene.</p></Card>
          ) : selected && (
            <div className="storyboard">
              <Card className="storyboard-head">
                <div><Badge tone="violet">{selected.style}</Badge><h2>{selected.board.title}</h2><p>{selected.board.hook}</p></div>
                <div className="row"><Btn size="sm" variant="outline" icon="download" onClick={() => downloadBoard(selected)}>Export board</Btn><Btn size="sm" variant="ghost" icon="trash" onClick={() => remove(selected)}>Delete</Btn></div>
              </Card>
              <div className="scene-timeline">
                {selected.board.scenes.map(s => (
                  <div key={s.id} className="scene" style={{ '--scene': s.palette }}>
                    <div className="scene-visual"><span>{String(s.id).padStart(2, '0')}</span><i /><b>{s.seconds}s</b></div>
                    <div className="scene-body">
                      <div className="row between"><h3>{s.title}</h3><Badge tone="default">{s.shot}</Badge></div>
                      <p>{s.description}</p>
                      <blockquote>“{s.voiceover}”</blockquote>
                    </div>
                  </div>
                ))}
              </div>
              <Card className="storyboard-foot"><div><h4>Call to action</h4><p>{selected.board.cta}</p></div><div><h4>Production notes</h4>{selected.board.notes.map(n => <p key={n} className="muted small">• {n}</p>)}</div></Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- voice ------------------------------- */
const DEFAULT_SCRIPT = 'Welcome to NexAI. In the next thirty seconds, we will show you how one shared workspace turns scattered AI tools into a single operating system. No tab hopping. No lost context. Just the work, moving forward.';
export function VoiceStudio() {
  const { data } = useFetch(() => api('/voice/voices'), []);
  const voices = data?.voices || [];
  const [voiceId, setVoiceId] = useState('aria');
  const [text, setText] = useState(DEFAULT_SCRIPT);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [scriptBusy, setScriptBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const recognitionRef = useRef(null);
  const voice = voices.find(v => v.id === voiceId) || voices[0];

  useEffect(() => () => { window.speechSynthesis?.cancel(); recognitionRef.current?.stop?.(); }, []);

  const speak = (t = text) => {
    if (!t.trim()) return toast('Add a script first.', 'error');
    if (!window.speechSynthesis) return toast('Your browser doesn’t support speech playback.', 'error');
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.rate = rate; u.pitch = pitch; u.lang = voice?.accent === 'UK' ? 'en-GB' : voice?.accent === 'AU' ? 'en-AU' : voice?.accent === 'IN' ? 'en-IN' : 'en-US';
    u.onend = () => setPlaying(false); u.onerror = () => setPlaying(false);
    window.speechSynthesis.speak(u);
    setPlaying(true);
    setHistory(h => [{ id: Date.now(), name: voice?.name || 'Aria', chars: t.length, at: new Date().toISOString(), text: t }, ...h].slice(0, 6));
  };
  const stop = () => { window.speechSynthesis?.cancel(); setPlaying(false); };

  const listen = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast('Speech recognition needs Chrome or Edge.', 'error');
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const r = new SR(); recognitionRef.current = r;
    r.continuous = true; r.interimResults = true; r.lang = 'en-US';
    let base = transcript;
    r.onresult = e => {
      let final = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      if (final) base += (base ? ' ' : '') + final;
      setTranscript(base + (interim ? (base ? ' ' : '') + interim : ''));
    };
    r.onerror = () => { setListening(false); toast('Microphone access was blocked.', 'error'); };
    r.onend = () => setListening(false);
    r.start(); setListening(true); toast('Listening — speak naturally', 'info');
  };

  const writeScript = async () => {
    setScriptBusy(true);
    try {
      const d = await api('/chat', 'POST', {
        content: `Write a 45-second voiceover script for this idea: ${text || 'a product launch for an AI workspace'}. Format: a short hook, three beats, and a closing call to action. Keep sentences short enough to read aloud.`,
        toolId: 'voice-podcast-script-generation', tone: 'friendly', length: 'short'
      });
      setText(d.reply); toast('Script drafted — press play to hear it', 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setScriptBusy(false); }
  };

  return (
    <div className="studio-page voice-page">
      <div className="studio-head voice">
        <div><Badge tone="green" dot>Voice Studio</Badge><h2>Give the work a voice.</h2><p>Draft a voiceover, audition six voices, tune pace and pitch, then record or dictate. Playback uses your browser’s speech engine.</p></div>
        <div className="studio-stats"><div><b>6</b><span>voices</span></div><div><b>{history.length}</b><span>sessions</span></div><div><b>2</b><span>modes</span></div></div>
      </div>

      <div className="voice-layout">
        <Card className="voice-script">
          <div className="card-head"><div><h3>Script</h3><p>{text.length} characters · ~{Math.max(1, Math.round(text.split(/\s+/).length / 2.6))}s read</p></div><div className="row"><Btn size="sm" variant="ghost" icon="wandSparkle" loading={scriptBusy} onClick={writeScript}>Draft with AI</Btn><Btn size="sm" variant="ghost" icon="download" onClick={() => download('voice-script.txt', text)}>Download</Btn></div></div>
          <Textarea rows={10} value={text} onChange={e => setText(e.target.value)} placeholder="Paste or write your voiceover script…" />
          <div className="voice-controls">
            <div className="voice-control"><span>Speed <b>{rate.toFixed(2)}×</b></span><input className="range" type="range" min="0.6" max="1.6" step="0.05" value={rate} onChange={e => setRate(Number(e.target.value))} /></div>
            <div className="voice-control"><span>Pitch <b>{pitch.toFixed(2)}</b></span><input className="range" type="range" min="0.6" max="1.5" step="0.05" value={pitch} onChange={e => setPitch(Number(e.target.value))} /></div>
          </div>
          <div className="voice-actions">
            {playing ? <Btn variant="danger" icon="stop" onClick={stop}>Stop playback</Btn> : <Btn variant="primary" icon="play" onClick={() => speak()}>Play voiceover</Btn>}
            <Btn variant="outline" icon="mic" onClick={listen}>{listening ? 'Stop dictation' : 'Dictate'}</Btn>
            <Btn variant="ghost" icon="copy" onClick={async () => { await copy(text); toast('Script copied', 'success'); }}>Copy</Btn>
            {playing && <span className="playing-bars"><i /><i /><i /><i /><i /></span>}
          </div>
        </Card>

        <div className="voice-side">
          <Card>
            <div className="card-head"><div><h3>Voice</h3><p>Preview each voice with one click</p></div></div>
            <div className="voice-list">
              {voices.map(v => (
                <button key={v.id} className={cls('voice-card', voiceId === v.id && 'on')} onClick={() => { setVoiceId(v.id); setRate(v.rate || 1); setPitch(v.pitch || 1); }}>
                  <span className="voice-avatar">{v.name[0]}</span>
                  <span><b>{v.name} <small>{v.accent}</small></b><span>{v.tone}</span></span>
                  <span role="button" tabIndex={0} className="voice-play" onClick={e => { e.stopPropagation(); speak(text); }}><Icon name="play" size={13} /></span>
                </button>
              ))}
              {!voices.length && <p className="muted small">Loading voices…</p>}
            </div>
          </Card>
          {transcript && <Card><div className="card-head"><div><h3>Dictation</h3><p>Speech to text</p></div><IconBtn name="trash" label="Clear" onClick={() => setTranscript('')} /></div><div className="transcript">{transcript}</div><div className="row"><Btn size="sm" variant="outline" onClick={() => setText(transcript)}>Use as script</Btn><Btn size="sm" variant="ghost" icon="copy" onClick={async () => { await copy(transcript); toast('Transcript copied', 'success'); }}>Copy</Btn></div></Card>}
          {history.length > 0 && <Card><div className="card-head"><div><h3>Recent sessions</h3><p>This browser only</p></div></div><div className="voice-history">{history.map(h => <button key={h.id} onClick={() => { setText(h.text); }}><Icon name="mic" size={14} /><span><b>{h.name}</b><small>{h.chars} chars · {timeAgo(h.at)}</small></span><Icon name="right" size={13} /></button>)}</div></Card>}
          <Card className="voice-note"><Icon name="info" size={16} /><p>Speech playback and dictation run locally in your browser. Add <b>ELEVENLABS_API_KEY</b> to the backend to stream premium voices.</p></Card>
        </div>
      </div>
    </div>
  );
}
