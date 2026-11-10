export const getToken = () => localStorage.getItem('nexai.token') || '';
export const setToken = (t) => t ? localStorage.setItem('nexai.token', t) : localStorage.removeItem('nexai.token');

const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const API_BASE = API_ORIGIN + '/api';

export async function api(path, method = 'GET', body) {
  const r = await fetch(API_BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Request failed (${r.status})`);
  return d;
}

/** Streams a chat completion. onEvent receives parsed SSE objects. */
export async function streamChat(payload, onEvent, signal) {
  const r = await fetch(API_BASE + '/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
    body: JSON.stringify(payload),
    signal
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || `Request failed (${r.status})`);
  }
  if (!r.body) throw new Error('Streaming is not supported in this browser.');
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';
    for (const part of parts) {
      const line = part.split('\n').find(l => l.startsWith('data: '));
      if (!line) continue;
      try { onEvent(JSON.parse(line.slice(6))); } catch { /* keepalive */ }
    }
  }
}

export function download(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function printHtml(title, html) {
  const win = window.open('', '_blank', 'width=860,height=900');
  if (!win) return;
  win.document.write(html);
  win.document.title = title;
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 350);
}

export function copy(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement('textarea');
  ta.value = text; document.body.appendChild(ta); ta.select();
  document.execCommand('copy'); ta.remove();
  return Promise.resolve();
}

const MAX = 60000;
const decodeXml = (s = '') => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'");

/** Extracts text from PDF, DOCX, XLSX/CSV or plain-text files in the browser. */
export async function extractFile(file, onProgress) {
  const name = file.name || 'file';
  const ext = name.split('.').pop().toLowerCase();
  const mb = (file.size / 1048576).toFixed(1);

  if (['txt', 'md', 'markdown', 'json', 'html', 'htm', 'js', 'jsx', 'ts', 'tsx', 'py', 'css', 'sql', 'xml', 'yml', 'yaml', 'log'].includes(ext)) {
    const text = await file.text();
    return { name, type: ext.toUpperCase(), size: file.size, text: text.slice(0, MAX), chars: text.length, truncated: text.length > MAX, note: `${mb} MB · text extracted` };
  }

  if (ext === 'pdf') {
    onProgress?.('Reading PDF…');
    const pdfjs = await import('pdfjs-dist');
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    let out = '';
    const pages = Math.min(doc.numPages, 80);
    for (let i = 1; i <= pages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      out += `\n\n--- Page ${i} ---\n` + content.items.map(x => x.str).join(' ');
      onProgress?.(`Extracting page ${i} of ${pages}…`);
      if (out.length > MAX) break;
    }
    return { name, type: 'PDF', size: file.size, pages: doc.numPages, text: out.trim().slice(0, MAX), chars: out.length, truncated: out.length > MAX, note: `${doc.numPages} pages · ${mb} MB` };
  }

  if (ext === 'docx') {
    onProgress?.('Reading Word document…');
    const { unzipSync, strFromU8 } = await import('fflate');
    const zip = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const fileXml = zip['word/document.xml'];
    if (!fileXml) throw new Error('This .docx file contains no readable text.');
    const xml = strFromU8(fileXml);
    const text = decodeXml(xml
      .replace(/<w:tab[^>]*\/>/g, '\t')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<[^>]+>/g, ''))
      .replace(/\n{3,}/g, '\n\n').trim();
    return { name, type: 'Word', size: file.size, text: text.slice(0, MAX), chars: text.length, truncated: text.length > MAX, note: `${mb} MB · text extracted` };
  }

  if (['xlsx', 'xls', 'csv', 'tsv'].includes(ext)) {
    onProgress?.('Reading spreadsheet…');
    const XLSX = await import('xlsx');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheets = wb.SheetNames.map(sn => {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: '', raw: false });
      return { name: sn, rows };
    });
    const all = sheets.map(s => `## Sheet: ${s.name}\n` + (s.rows.slice(0, 500).map(r => Object.values(r).join('\t')).join('\n'))).join('\n\n');
    return { name, type: ext === 'csv' || ext === 'tsv' ? 'CSV' : 'Excel', size: file.size, sheets, text: all.slice(0, MAX), chars: all.length, truncated: all.length > MAX, note: `${sheets.length} sheet${sheets.length === 1 ? '' : 's'} · ${sheets.reduce((a, s) => a + s.rows.length, 0)} rows` };
  }

  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
    return { name, type: 'Image', size: file.size, text: '', chars: 0, note: 'Images are used as visual context. Describe what you need in the prompt.' };
  }

  const text = await file.text().catch(() => '');
  return { name, type: ext.toUpperCase(), size: file.size, text: text.slice(0, MAX), chars: text.length, truncated: text.length > MAX, note: `${mb} MB` };
}

export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0].map((h, i) => (h.trim() || `Column ${i + 1}`));
  return rows.slice(1).filter(r => r.some(v => v !== '')).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
}
