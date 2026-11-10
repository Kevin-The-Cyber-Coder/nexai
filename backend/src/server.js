import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  db, save, uid, PLANS, INTEGRATIONS, publicUser, checkPassword, hashPassword, resetDemoData
} from './store.js';
import { MODULES, FEATURES, findTool, catalogStats } from './catalog.js';
import { MODELS, findModel, streamAI, askAI, isDemo, liveModels, demoMeta } from './ai.js';
import { generateArt, storyboard, analyzeDataset, sampleDataset } from './media.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET || 'nexai-dev-secret-change-me';

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '6mb' }));

/* ---------------------------------------------------------------- */
/* Helpers                                                           */
/* ---------------------------------------------------------------- */

const fail = (status, message) => Object.assign(new Error(message), { status });
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Lightweight in-memory rate limiting (no extra dependency)
const buckets = new Map();
app.use('/api', (req, res, next) => {
  const key = req.ip || 'anon';
  const now = Date.now();
  const b = buckets.get(key) || { count: 0, reset: now + 60_000 };
  if (now > b.reset) { b.count = 0; b.reset = now + 60_000; }
  b.count++;
  buckets.set(key, b);
  if (b.count > 400) return res.status(429).json({ error: 'Too many requests — slow down for a moment.' });
  next();
});

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
function signToken(userId) {
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({ sub: userId, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 7 * 86400 });
  const sig = crypto.createHmac('sha256', SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}
function verifyToken(token = '') {
  const [header, payload, sig] = token.split('.');
  if (!header || !payload || !sig) throw new Error('bad token');
  const expected = crypto.createHmac('sha256', SECRET).update(`${header}.${payload}`).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new Error('bad signature');
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (!data.exp || data.exp < Date.now() / 1000) throw new Error('expired');
  return data;
}
const bearer = (req) => (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

function auth(req, res, next) {
  try {
    const data = verifyToken(bearer(req));
    const user = db.users.find(u => u.id === data.sub);
    if (!user || user.suspended) throw new Error('inactive');
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Please sign in' });
  }
}
const adminOnly = (req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admins only' });
function optionalAuth(req, _res, next) {
  try { req.user = db.users.find(u => u.id === verifyToken(bearer(req)).sub) || null; } catch { req.user = null; }
  next();
}
const money = (n) => Math.round(n * 100) / 100;
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
function daysAgoIso(n) { return new Date(Date.now() - n * 86400000).toISOString(); }
function lastDays(n) { return Array.from({ length: n }, (_, i) => dayKey(daysAgoIso(n - 1 - i))); }

const publicCatalog = MODULES.map(({ tools, ...m }) => ({
  ...m,
  features: tools.map(({ system, ...t }) => t)
}));

function usageFor(userId, days = 30) {
  const cutoff = Date.now() - days * 86400000;
  const records = db.usage.filter(u => u.userId === userId && new Date(u.at).getTime() >= cutoff);
  const keys = lastDays(days);
  const series = keys.map(day => {
    const dayRecs = records.filter(r => dayKey(r.at) === day);
    return { day, credits: dayRecs.reduce((a, r) => a + r.credits, 0), requests: dayRecs.length, tokens: dayRecs.reduce((a, r) => a + (r.tokens || 0), 0) };
  });
  const byModuleMap = {};
  records.forEach(r => {
    const key = r.moduleId || r.kind || 'chat';
    byModuleMap[key] = byModuleMap[key] || { moduleId: key, credits: 0, requests: 0 };
    byModuleMap[key].credits += r.credits;
    byModuleMap[key].requests += 1;
  });
  const topTools = {};
  records.forEach(r => { if (r.toolId) topTools[r.toolId] = (topTools[r.toolId] || 0) + 1; });
  return {
    series, byModule: Object.values(byModuleMap).sort((a, b) => b.credits - a.credits),
    totals: {
      credits: series.reduce((a, b) => a + b.credits, 0),
      requests: records.length,
      tokens: series.reduce((a, b) => a + b.tokens, 0)
    },
    topTools: Object.entries(topTools).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([toolId, count]) => ({ toolId, name: findTool(toolId)?.name || toolId, count }))
  };
}

function charge(user, credits, meta = {}) {
  if (user.credits < credits) throw fail(402, 'You’re out of AI credits. Upgrade your plan or top up to continue.');
  user.credits -= credits;
  if (meta.moduleId || meta.toolId) {
    db.usage.push({
      id: uid('usg'), userId: user.id, kind: meta.moduleId || 'chat', moduleId: meta.moduleId || 'chat',
      toolId: meta.toolId || '', credits, tokens: meta.tokens || 0, at: new Date().toISOString()
    });
  }
}

function notify(userId, type, title, body, href = '/') {
  db.notifications.unshift({ id: uid('ntf'), userId, type, title, body, href, read: false, at: new Date().toISOString() });
}
function audit(userId, actor, action) {
  db.audit.unshift({ id: uid('aud'), userId, actor, action, ip: '127.0.0.1', at: new Date().toISOString() });
  db.audit = db.audit.slice(0, 300);
}
const convSummary = (c) => ({
  id: c.id, title: c.title, pinned: !!c.pinned, archived: !!c.archived, folder: c.folder || '',
  toolId: c.toolId || null, model: c.model || 'nexai-core', updatedAt: c.updatedAt, createdAt: c.createdAt,
  shareId: c.shareId || null, messages: c.messages.length,
  preview: (c.messages.at(-1)?.content || '').replace(/[#>*`]/g, '').slice(0, 140)
});
function cleanTitle(text) {
  return (text || 'New chat').replace(/\s+/g, ' ').trim().slice(0, 64) || 'New chat';
}
function invoicesFor(user) {
  const price = PLANS[user.plan]?.price || 0;
  const created = new Date(user.createdAt || Date.now());
  const out = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(created.getFullYear(), created.getMonth() + i, Math.min(created.getDate(), 28));
    if (d > new Date()) break;
    out.push({
      id: `INV-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(Math.abs(user.id.length * 97 + i * 13)).padStart(4, '0')}`,
      amount: price, plan: user.plan, status: 'paid', date: d.toISOString(),
      description: `${PLANS[user.plan]?.name || 'NexAI'} plan · monthly`
    });
  }
  return out.reverse();
}
const publicAgent = (a) => ({
  ...a,
  author: a.isPublic ? (a.author || db.users.find(u => u.id === a.userId)?.name || 'NexAI user') : undefined
});

/* ---------------------------------------------------------------- */
/* Auth & profile                                                    */
/* ---------------------------------------------------------------- */

app.post('/api/auth/register', wrap(async (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  if (!name || !email || password.length < 8) throw fail(400, 'Name, email and a password of 8+ characters are required.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw fail(400, 'That email doesn’t look right.');
  if (db.users.some(u => u.email === email)) throw fail(409, 'That email is already registered.');
  const user = {
    id: uid('u'), name, email, password: hashPassword(password), role: db.users.length === 0 ? 'admin' : 'user',
    plan: 'free', credits: PLANS.free.credits, suspended: false, systemPrompt: '', avatar: null, twoFactor: false,
    company: '', jobTitle: '', timezone: 'UTC', language: 'English', createdAt: new Date().toISOString(),
    prefs: { theme: 'dark', tone: 'balanced', length: 'medium', model: 'nexai-core', suggestions: true, memory: true, citations: true },
    integrations: [], favorites: []
  };
  db.users.push(user);
  notify(user.id, 'system', 'Welcome to NexAI', 'Start with a chat, or build your first agent in under four minutes.', '/agents');
  save();
  res.json({ token: signToken(user.id), user: publicUser(user) });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const user = db.users.find(u => u.email === email);
  if (!user || !checkPassword(req.body.password || '', user.password)) throw fail(401, 'Wrong email or password.');
  if (user.suspended) throw fail(403, 'This account is suspended. Contact support.');
  res.json({ token: signToken(user.id), user: publicUser(user) });
}));

app.post('/api/auth/demo', wrap(async (_req, res) => {
  const user = db.users.find(u => u.id === 'u_demo');
  res.json({ token: signToken(user.id), user: publicUser(user) });
}));

app.get('/api/me', auth, (req, res) => res.json({ ...publicUser(req.user), stats: { conversations: db.conversations.filter(c => c.userId === req.user.id).length, agents: db.agents.filter(a => a.userId === req.user.id).length } }));

app.patch('/api/me', auth, wrap(async (req, res) => {
  const { name, company, jobTitle, timezone, language, systemPrompt, prefs, avatar, favorites } = req.body;
  Object.assign(req.user, {
    ...(name !== undefined ? { name: String(name).slice(0, 80) } : {}),
    ...(company !== undefined ? { company: String(company).slice(0, 80) } : {}),
    ...(jobTitle !== undefined ? { jobTitle: String(jobTitle).slice(0, 80) } : {}),
    ...(timezone !== undefined ? { timezone } : {}),
    ...(language !== undefined ? { language } : {}),
    ...(systemPrompt !== undefined ? { systemPrompt: String(systemPrompt).slice(0, 4000) } : {}),
    ...(avatar !== undefined ? { avatar } : {}),
    ...(favorites !== undefined ? { favorites } : {}),
    prefs: { ...(req.user.prefs || {}), ...(prefs || {}) }
  });
  save();
  res.json(publicUser(req.user));
}));

app.post('/api/me/password', auth, wrap(async (req, res) => {
  if (!checkPassword(req.body.current || '', req.user.password)) throw fail(400, 'Current password is incorrect.');
  if ((req.body.next || '').length < 8) throw fail(400, 'New password must be at least 8 characters.');
  req.user.password = hashPassword(req.body.next);
  audit(req.user.id, req.user.name, 'Changed account password');
  save();
  res.json({ ok: true });
}));

app.post('/api/me/2fa', auth, wrap(async (req, res) => {
  req.user.twoFactor = !!req.body.enabled;
  audit(req.user.id, req.user.name, `${req.user.twoFactor ? 'Enabled' : 'Disabled'} two-factor authentication`);
  save();
  res.json({ twoFactor: req.user.twoFactor });
}));

app.post('/api/me/avatar', auth, wrap(async (req, res) => {
  const data = req.body.avatar;
  if (typeof data !== 'string' || !data.startsWith('data:image/')) throw fail(400, 'Upload a PNG or JPG image.');
  if (data.length > 900_000) throw fail(400, 'Please use an image under 600KB.');
  req.user.avatar = data;
  save();
  res.json({ avatar: data });
}));

/* ---------------------------------------------------------------- */
/* Catalog, models, plans, integrations                              */
/* ---------------------------------------------------------------- */

app.get('/api/catalog', (_req, res) => res.json({ ...catalogStats(), generatedAt: MODULES[0] ? new Date().toISOString() : null, modules: publicCatalog }));
app.get('/api/models', (_req, res) => res.json({ models: MODELS, live: liveModels(), demo: isDemo() }));
app.get('/api/plans', (_req, res) => res.json({ plans: Object.entries(PLANS).map(([id, p]) => ({ id, ...p })) }));
app.get('/api/integrations', auth, (req, res) => res.json({
  integrations: INTEGRATIONS.map(i => ({ ...i, connected: (req.user.integrations || []).includes(i.id) }))
}));
app.post('/api/integrations/:id/toggle', auth, wrap(async (req, res) => {
  const integration = INTEGRATIONS.find(i => i.id === req.params.id);
  if (!integration) throw fail(404, 'Integration not found');
  const list = req.user.integrations || [];
  const connected = list.includes(integration.id);
  req.user.integrations = connected ? list.filter(x => x !== integration.id) : [...list, integration.id];
  audit(req.user.id, req.user.name, `${connected ? 'Disconnected' : 'Connected'} ${integration.name}`);
  save();
  res.json({ connected: !connected });
}));

/* ---------------------------------------------------------------- */
/* Conversations & chat                                             */
/* ---------------------------------------------------------------- */

app.get('/api/conversations', auth, wrap(async (req, res) => {
  let list = db.conversations.filter(c => c.userId === req.user.id);
  const archived = req.query.archived === 'true';
  list = list.filter(c => !!c.archived === archived);
  if (req.query.folder) list = list.filter(c => c.folder === req.query.folder);
  if (req.query.q) {
    const q = String(req.query.q).toLowerCase();
    list = list.filter(c => c.title.toLowerCase().includes(q) || c.messages.some(m => m.content.toLowerCase().includes(q)));
  }
  list.sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (new Date(b.updatedAt) - new Date(a.updatedAt)));
  res.json(list.slice(0, 150).map(convSummary));
}));

app.get('/api/conversations/folders', auth, (req, res) => {
  const folders = [...new Set(db.conversations.filter(c => c.userId === req.user.id && c.folder).map(c => c.folder))];
  res.json(folders);
});

app.post('/api/conversations', auth, wrap(async (req, res) => {
  const c = {
    id: uid('c'), userId: req.user.id, title: cleanTitle(req.body.title || 'New chat'), pinned: false, archived: false,
    folder: req.body.folder || '', toolId: req.body.toolId || null, model: req.body.model || 'nexai-core',
    shareId: null, messages: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  db.conversations.unshift(c); save();
  res.json(c);
}));

app.get('/api/conversations/:id', auth, wrap(async (req, res) => {
  const c = db.conversations.find(c => c.id === req.params.id && c.userId === req.user.id);
  if (!c) throw fail(404, 'Conversation not found');
  res.json(c);
}));

app.patch('/api/conversations/:id', auth, wrap(async (req, res) => {
  const c = db.conversations.find(c => c.id === req.params.id && c.userId === req.user.id);
  if (!c) throw fail(404, 'Conversation not found');
  for (const key of ['title', 'pinned', 'archived', 'folder', 'model']) if (req.body[key] !== undefined) c[key] = req.body[key];
  if (req.body.title) c.title = cleanTitle(req.body.title);
  c.updatedAt = new Date().toISOString();
  save();
  res.json(c);
}));

app.delete('/api/conversations/:id', auth, wrap(async (req, res) => {
  const i = db.conversations.findIndex(c => c.id === req.params.id && c.userId === req.user.id);
  if (i === -1) throw fail(404, 'Conversation not found');
  db.conversations.splice(i, 1);
  save();
  res.json({ ok: true });
}));

app.post('/api/conversations/:id/share', auth, wrap(async (req, res) => {
  const c = db.conversations.find(c => c.id === req.params.id && c.userId === req.user.id);
  if (!c) throw fail(404, 'Conversation not found');
  c.shareId = c.shareId || uid('share');
  save();
  res.json({ shareId: c.shareId, url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/share/${c.shareId}` });
}));

app.delete('/api/conversations/:id/share', auth, wrap(async (req, res) => {
  const c = db.conversations.find(c => c.id === req.params.id && c.userId === req.user.id);
  if (!c) throw fail(404, 'Conversation not found');
  c.shareId = null; save();
  res.json({ ok: true });
}));

app.get('/api/share/:shareId', (req, res) => {
  const c = db.conversations.find(c => c.shareId === req.params.shareId);
  if (!c) return res.status(404).json({ error: 'This shared conversation is unavailable.' });
  const owner = db.users.find(u => u.id === c.userId);
  res.json({ title: c.title, messages: c.messages.map(({ role, content, at }) => ({ role, content, at })), author: owner?.name || 'NexAI user', updatedAt: c.updatedAt });
});

app.get('/api/conversations/:id/export', auth, wrap(async (req, res) => {
  const c = db.conversations.find(c => c.id === req.params.id && c.userId === req.user.id);
  if (!c) throw fail(404, 'Conversation not found');
  const format = req.query.format || 'md';
  if (format === 'md' || format === 'txt') {
    const body = c.messages.map(m => `### ${m.role === 'user' ? 'You' : 'NexAI'}\n\n${m.content}`).join('\n\n---\n\n');
    return res.json({ filename: `${cleanTitle(c.title).replace(/[^\w -]/g, '') || 'nexai-chat'}.md`, content: `# ${c.title}\n\n_Exported from NexAI · ${new Date().toLocaleDateString()}_\n\n${body}` });
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${c.title}</title><style>body{font:16px/1.65 system-ui,Segoe UI,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#111827}h1{font-size:28px}.msg{margin:20px 0;padding:16px;border-radius:12px;background:#f3f4f6;white-space:pre-wrap}.user{background:#eef2ff}h3{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280}</style></head><body><h1>${c.title}</h1><p><em>Exported from NexAI · ${new Date().toLocaleString()}</em></p>${c.messages.map(m => `<div class="msg ${m.role}"><h3>${m.role === 'user' ? 'You' : 'NexAI'}</h3>${escapeHtml(m.content)}</div>`).join('')}</body></html>`;
  res.json({ filename: `${cleanTitle(c.title).replace(/[^\w -]/g, '') || 'nexai-chat'}.html`, content: html });
}));

function escapeHtml(s = '') {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
}

function buildSystem(user, tool, tone, length) {
  const parts = [
    tool?.system || 'You are NexAI, a helpful, accurate AI assistant. Be direct and well structured.',
    `Tone: ${tone || user.prefs?.tone || 'balanced'}. Length: ${length || user.prefs?.length || 'medium'}.`,
    'Use markdown. Prefer concrete specifics over generic advice.',
    user.systemPrompt ? `User instructions: ${user.systemPrompt}` : '',
    `Today is ${new Date().toISOString().slice(0, 10)}.`
  ];
  return parts.filter(Boolean).join('\n\n');
}

function suggestionsFor(tool, content) {
  const n = (tool?.name || '').toLowerCase();
  if (n.includes('email')) return ['Make it shorter and warmer', 'Add a clear next step', 'Rewrite for a skeptical reader'];
  if (n.includes('code') || n.includes('debug')) return ['Add tests for this', 'Explain the trade-offs', 'Optimise for readability'];
  if (n.includes('blog') || n.includes('article')) return ['Turn this into an outline', 'Write a stronger hook', 'Adapt it for LinkedIn'];
  return ['Make it more concise', 'Give me the counter-argument', 'Turn this into an action plan', 'Adapt it for an executive audience'];
}

app.post('/api/chat/stream', auth, wrap(async (req, res) => {
  const { conversationId, toolId, model, tone, length, regenerate, editMessageId, attachment } = req.body;
  const content = String(req.body.content || '').trim();
  const tool = toolId ? findTool(toolId) : null;
  if (!content && !regenerate && !editMessageId) throw fail(400, 'Message is empty.');
  if (req.user.credits < 1) throw fail(402, 'You’re out of AI credits. Upgrade to keep going.');

  let c = conversationId && db.conversations.find(x => x.id === conversationId && x.userId === req.user.id);
  if (!c) {
    c = {
      id: uid('c'), userId: req.user.id, title: cleanTitle(content), pinned: false, archived: false,
      folder: '', toolId: toolId || null, model: model || 'nexai-core', shareId: null, messages: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    db.conversations.unshift(c);
  }
  if (toolId) c.toolId = toolId;
  if (model) c.model = model;

  let promptForModel = content;
  let context = '';
  if (attachment?.text) {
    context = String(attachment.text).slice(0, 80_000);
    promptForModel = `${content}\n\n--- Attached: ${attachment.name || 'document'} ---\n${context}`;
  }

  if (editMessageId) {
    const idx = c.messages.findIndex(m => m.id === editMessageId);
    if (idx === -1) throw fail(404, 'Message not found');
    c.messages[idx].content = content;
    c.messages = c.messages.slice(0, idx + 1);
    promptForModel = content;
  } else if (regenerate) {
    while (c.messages.length && c.messages.at(-1).role === 'assistant') c.messages.pop();
    const lastUser = [...c.messages].reverse().find(m => m.role === 'user');
    if (!lastUser) throw fail(400, 'Nothing to regenerate.');
    promptForModel = lastUser.content;
  } else {
    const userMsg = {
      id: uid('m'), role: 'user', content, at: new Date().toISOString(),
      ...(attachment?.name ? { attachment: attachment.name, context } : {})
    };
    c.messages.push(userMsg);
  }
  if (c.title === 'New chat' && content) c.title = cleanTitle(content);
  c.updatedAt = new Date().toISOString();

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  let closed = false;
  res.on('close', () => { if (!res.writableEnded) closed = true; });
  const send = (obj) => { if (!closed) res.write(`data: ${JSON.stringify(obj)}\n\n`); };

  const usedTool = tool || (c.toolId ? findTool(c.toolId) : null);
  const activeModel = findModel(model || c.model);
  send({ type: 'start', demo: isDemo(), model: activeModel.name, conversationId: c.id, tool: usedTool?.name || null });

  const history = c.messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-24)
    .map((m, i, arr) => {
      const lastUser = arr[arr.length - 1];
      if (m.role === 'user' && m.id === lastUser.id && context) return { role: 'user', content: promptForModel };
      return { role: m.role, content: m.content };
    });

  let text = '';
  try {
    for await (const chunk of streamAI({
      messages: history,
      system: buildSystem(req.user, usedTool, tone, length),
      model: model || c.model, tool: usedTool, tone, length
    })) {
      if (closed) break;
      text += chunk;
      send({ type: 'delta', text: chunk });
    }
  } catch (err) {
    if (!text) {
      send({ type: 'error', message: err.message });
      c.updatedAt = new Date().toISOString();
      save();
      return res.end();
    }
  }

  if (!text.trim()) { if (!closed) send({ type: 'error', message: 'The model returned an empty response.' }); return res.end(); }

  const meta = demoMeta(usedTool, length);
  const assistant = {
    id: uid('m'), role: 'assistant', content: text, at: new Date().toISOString(),
    model: activeModel.name, confidence: meta.confidence
  };
  c.messages.push(assistant);
  c.updatedAt = new Date().toISOString();
  charge(req.user, 1, { moduleId: usedTool?.route || 'chat', toolId: usedTool?.id, tokens: Math.round(text.length / 4) });
  save();

  if (!closed) {
    send({
      type: 'done', conversation: convSummary(c), message: assistant, credits: req.user.credits,
      demo: isDemo(), suggestions: suggestionsFor(usedTool, text), confidence: meta.confidence, model: activeModel.name
    });
    res.end();
  }
}));

// Non-streaming convenience endpoint (also used by the public API)
app.post('/api/chat', auth, wrap(async (req, res) => {
  const content = String(req.body.content || '').trim();
  if (!content) throw fail(400, 'Message is empty.');
  if (req.user.credits < 1) throw fail(402, 'You’re out of AI credits.');
  const tool = req.body.toolId ? findTool(req.body.toolId) : null;
  let c = req.body.conversationId && db.conversations.find(x => x.id === req.body.conversationId && x.userId === req.user.id);
  if (!c) {
    c = { id: uid('c'), userId: req.user.id, title: cleanTitle(content), pinned: false, archived: false, folder: '', toolId: tool?.id || null, model: req.body.model || 'nexai-core', shareId: null, messages: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.conversations.unshift(c);
  }
  c.messages.push({ id: uid('m'), role: 'user', content, at: new Date().toISOString() });
  const reply = await askAI({
    messages: c.messages.slice(-24).map(({ role, content }) => ({ role, content })),
    system: buildSystem(req.user, tool, req.body.tone, req.body.length),
    model: req.body.model, tool, tone: req.body.tone, length: req.body.length
  });
  const assistant = { id: uid('m'), role: 'assistant', content: reply, at: new Date().toISOString(), model: findModel(req.body.model).name };
  c.messages.push(assistant);
  c.updatedAt = new Date().toISOString();
  charge(req.user, 1, { moduleId: tool?.route || 'chat', toolId: tool?.id, tokens: Math.round(reply.length / 4) });
  save();
  res.json({ conversation: c, reply: assistant.content, credits: req.user.credits, demo: isDemo() });
}));

/* ---------------------------------------------------------------- */
/* Dashboard, usage, notifications, search                          */
/* ---------------------------------------------------------------- */

app.get('/api/dashboard', auth, wrap(async (req, res) => {
  const convos = db.conversations.filter(c => c.userId === req.user.id && !c.archived);
  const agents = db.agents.filter(a => a.userId === req.user.id);
  const projects = db.projects.filter(p => p.userId === req.user.id);
  const files = db.files.filter(f => f.userId === req.user.id);
  const usage = usageFor(req.user.id, 30);
  const plan = PLANS[req.user.plan] || PLANS.free;
  const recommendedNumbers = [46, 162, 204, 264, 302, 141];
  res.json({
    user: publicUser(req.user),
    plan: { id: req.user.plan, ...plan, used: plan.credits - req.user.credits, remaining: req.user.credits, percent: Math.min(100, Math.round(((plan.credits - req.user.credits) / Math.max(1, plan.credits)) * 100)) },
    counts: {
      conversations: convos.length, agents: agents.length, activeAgents: agents.filter(a => a.status === 'active').length,
      projects: projects.length, files: files.length, images: db.images.filter(i => i.userId === req.user.id).length,
      tickets: db.tickets.filter(t => t.userId === req.user.id).length, openTickets: db.tickets.filter(t => t.userId === req.user.id && t.status !== 'resolved').length,
      team: Math.max(1, db.users.filter(u => u.id !== req.user.id && !u.suspended && (u.company === req.user.company || ['u_maya', 'u_theo', 'u_priya'].includes(u.id))).length)
    },
    usage,
    recent: convos.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 6).map(convSummary),
    agents: agents.slice(0, 4).map(a => ({ id: a.id, name: a.name, emoji: a.emoji, status: a.status, runs: a.runs, successRate: a.successRate, lastRun: a.lastRun })),
    activity: [...db.usage.filter(u => u.userId === req.user.id).slice(-8)].reverse().map(u => ({ ...u, name: findTool(u.toolId)?.name || 'AI chat' })),
    recommended: FEATURES.filter(f => recommendedNumbers.includes(f.number)).map(({ system, ...f }) => f),
    notifications: db.notifications.filter(n => n.userId === req.user.id && !n.read).length
  });
}));

app.get('/api/usage', auth, (req, res) => {
  const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
  const usage = usageFor(req.user.id, days);
  const plan = PLANS[req.user.plan] || PLANS.free;
  res.json({ ...usage, days, credits: req.user.credits, plan: { id: req.user.plan, ...plan }, percent: Math.min(100, Math.round(((plan.credits - req.user.credits) / Math.max(1, plan.credits)) * 100)) });
});

app.get('/api/notifications', auth, (req, res) => res.json(db.notifications.filter(n => n.userId === req.user.id).slice(0, 50)));
app.patch('/api/notifications/:id', auth, (req, res) => {
  const n = db.notifications.find(n => n.id === req.params.id && n.userId === req.user.id);
  if (n) n.read = true;
  save(); res.json({ ok: true });
});
app.post('/api/notifications/read-all', auth, (req, res) => {
  db.notifications.filter(n => n.userId === req.user.id).forEach(n => n.read = true);
  save(); res.json({ ok: true });
});

app.get('/api/search', auth, (req, res) => {
  const q = String(req.query.q || '').toLowerCase().trim();
  if (!q) return res.json({ conversations: [], features: [], agents: [], prompts: [], projects: [], files: [] });
  res.json({
    conversations: db.conversations.filter(c => c.userId === req.user.id && (c.title.toLowerCase().includes(q) || c.messages.some(m => m.content.toLowerCase().includes(q)))).slice(0, 5).map(convSummary),
    features: FEATURES.filter(f => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) || f.tags.some(t => t.includes(q))).slice(0, 8).map(({ system, ...f }) => f),
    agents: db.agents.filter(a => (a.userId === req.user.id || a.isPublic) && (a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q))).slice(0, 4).map(a => ({ id: a.id, name: a.name, emoji: a.emoji, description: a.description, isPublic: !!a.isPublic })),
    prompts: db.prompts.filter(p => (p.isPublic || p.userId === req.user.id) && (p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q))).slice(0, 4).map(p => ({ id: p.id, title: p.title, category: p.category })),
    projects: db.projects.filter(p => p.userId === req.user.id && p.name.toLowerCase().includes(q)).slice(0, 4),
    files: db.files.filter(f => f.userId === req.user.id && f.name.toLowerCase().includes(q)).slice(0, 4)
  });
});

app.get('/api/activity', auth, (req, res) => {
  const usage = db.usage.filter(u => u.userId === req.user.id).slice(-20).reverse().map(u => ({ id: u.id, type: 'usage', title: `Used ${u.credits} credit${u.credits === 1 ? '' : 's'}`, body: findTool(u.toolId)?.name || 'AI chat', at: u.at }));
  const audit = db.audit.filter(a => a.userId === req.user.id).slice(0, 10).map(a => ({ id: a.id, type: 'audit', title: a.action, body: 'Security & account', at: a.at }));
  res.json([...usage, ...audit].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 30));
});

/* ---------------------------------------------------------------- */
/* Agents & marketplace                                             */
/* ---------------------------------------------------------------- */

app.get('/api/agents', auth, (req, res) => res.json(db.agents.filter(a => a.userId === req.user.id)));
app.get('/api/agents/:id', auth, (req, res) => {
  const a = db.agents.find(a => a.id === req.params.id && a.userId === req.user.id);
  if (!a) return res.status(404).json({ error: 'Agent not found' });
  res.json(a);
});
const AGENT_FIELDS = ['name', 'emoji', 'role', 'description', 'instructions', 'model', 'tools', 'schedule', 'status', 'approved', 'knowledge'];
app.post('/api/agents', auth, wrap(async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) throw fail(400, 'Give your agent a name.');
  const agent = {
    id: uid('a'), userId: req.user.id, name, emoji: req.body.emoji || '🤖', role: req.body.role || 'AI assistant',
    description: req.body.description || '', instructions: req.body.instructions || '', model: req.body.model || 'nexai-core',
    tools: req.body.tools || [], schedule: req.body.schedule || 'On demand', status: req.body.status || 'draft',
    approved: false, knowledge: req.body.knowledge || '', runs: 0, successRate: 100, creditsPerRun: 3,
    createdAt: new Date().toISOString(), lastRun: null, isPublic: false, runsLog: []
  };
  db.agents.unshift(agent);
  audit(req.user.id, req.user.name, `Created agent “${agent.name}”`);
  save();
  res.json(agent);
}));
app.patch('/api/agents/:id', auth, wrap(async (req, res) => {
  const a = db.agents.find(a => a.id === req.params.id && a.userId === req.user.id);
  if (!a) throw fail(404, 'Agent not found');
  for (const key of AGENT_FIELDS) if (req.body[key] !== undefined) a[key] = req.body[key];
  save(); res.json(a);
}));
app.delete('/api/agents/:id', auth, wrap(async (req, res) => {
  const i = db.agents.findIndex(a => a.id === req.params.id && a.userId === req.user.id);
  if (i === -1) throw fail(404, 'Agent not found');
  db.agents.splice(i, 1); save(); res.json({ ok: true });
}));
app.post('/api/agents/:id/run', auth, wrap(async (req, res) => {
  const a = db.agents.find(a => a.id === req.params.id && a.userId === req.user.id);
  if (!a) throw fail(404, 'Agent not found');
  if (req.user.credits < a.creditsPerRun) throw fail(402, 'Not enough credits to run this agent.');
  if (a.status === 'paused') throw fail(400, 'Resume the agent before running it.');
  charge(req.user, a.creditsPerRun, { moduleId: 'agents', toolId: 'agents-autonomous-task-execution-with-user-authorization', tokens: 1800 });
  const summaries = [
    `Completed ${a.role.toLowerCase()} workflow. 6 sources reviewed, 3 findings surfaced, 1 action recommended.`,
    `Ran end-to-end successfully. Produced a structured deliverable and queued one approval request.`,
    `Finished with 0 errors. Reviewed 12 items and drafted the summary for your review.`
  ];
  const run = { id: uid('run'), at: new Date().toISOString(), status: 'success', duration: `${20 + Math.round(Math.random() * 80)}s`, summary: summaries[Math.floor(Math.random() * summaries.length)] };
  a.runs = (a.runs || 0) + 1;
  a.runsLog = [run, ...(a.runsLog || [])].slice(0, 20);
  a.lastRun = run.at;
  a.successRate = Math.min(100, Math.max(88, a.successRate || 95));
  notify(req.user.id, 'agent', `${a.name} finished a run`, run.summary, '/agents');
  save();
  res.json({ agent: a, run, credits: req.user.credits });
}));

app.get('/api/marketplace/agents', (_req, res) => {
  res.json(db.agents.filter(a => a.isPublic).map(publicAgent).sort((a, b) => (b.installs || 0) - (a.installs || 0)));
});
app.post('/api/marketplace/agents/:id/install', auth, wrap(async (req, res) => {
  const source = db.agents.find(a => a.id === req.params.id && a.isPublic);
  if (!source) throw fail(404, 'Agent not found');
  const copy = {
    ...source, id: uid('a'), userId: req.user.id, isPublic: false, runs: 0, runsLog: [], createdAt: new Date().toISOString(),
    lastRun: null, status: 'draft', approved: false, installs: undefined, author: undefined, rating: undefined, name: source.name
  };
  db.agents.unshift(copy);
  source.installs = (source.installs || 0) + 1;
  audit(req.user.id, req.user.name, `Installed agent “${source.name}” from the marketplace`);
  notify(req.user.id, 'agent', `Installed ${source.name}`, 'Review its instructions, then approve it to run.', '/agents');
  save();
  res.json(copy);
}));

/* ---------------------------------------------------------------- */
/* Prompt library                                                   */
/* ---------------------------------------------------------------- */

app.get('/api/prompts', auth, (req, res) => {
  const mine = db.prompts.filter(p => p.userId === req.user.id);
  const pub = db.prompts.filter(p => p.isPublic && p.userId !== req.user.id);
  res.json({ mine, public: pub.sort((a, b) => (b.uses || 0) - (a.uses || 0)) });
});
app.post('/api/prompts', auth, wrap(async (req, res) => {
  if (!req.body.title || !req.body.body) throw fail(400, 'Title and prompt body are required.');
  const p = {
    id: uid('p'), userId: req.user.id, title: req.body.title.slice(0, 90), category: req.body.category || 'Custom',
    description: req.body.description || '', body: req.body.body, isPublic: !!req.body.isPublic, uses: 0,
    tags: req.body.tags || [], createdAt: new Date().toISOString()
  };
  db.prompts.unshift(p); save(); res.json(p);
}));
app.patch('/api/prompts/:id', auth, wrap(async (req, res) => {
  const p = db.prompts.find(p => p.id === req.params.id && p.userId === req.user.id);
  if (!p) throw fail(404, 'Prompt not found');
  for (const k of ['title', 'body', 'category', 'description', 'isPublic', 'tags']) if (req.body[k] !== undefined) p[k] = req.body[k];
  save(); res.json(p);
}));
app.delete('/api/prompts/:id', auth, wrap(async (req, res) => {
  const i = db.prompts.findIndex(p => p.id === req.params.id && p.userId === req.user.id);
  if (i === -1) throw fail(404, 'Prompt not found');
  db.prompts.splice(i, 1); save(); res.json({ ok: true });
}));
app.post('/api/prompts/:id/use', auth, wrap(async (req, res) => {
  const p = db.prompts.find(p => p.id === req.params.id && (p.isPublic || p.userId === req.user.id));
  if (!p) throw fail(404, 'Prompt not found');
  p.uses = (p.uses || 0) + 1; save();
  res.json(p);
}));

/* ---------------------------------------------------------------- */
/* Projects, files, team                                            */
/* ---------------------------------------------------------------- */

const PROJECT_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
app.get('/api/projects', auth, (req, res) => res.json(db.projects.filter(p => p.userId === req.user.id)));
app.post('/api/projects', auth, wrap(async (req, res) => {
  if (!req.body.name) throw fail(400, 'Project name is required.');
  const p = {
    id: uid('pr'), userId: req.user.id, name: req.body.name.slice(0, 80), description: req.body.description || '',
    color: req.body.color || PROJECT_COLORS[db.projects.length % PROJECT_COLORS.length], icon: req.body.icon || '📁',
    status: 'active', progress: 0, members: 1, items: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  db.projects.unshift(p); save(); res.json(p);
}));
app.patch('/api/projects/:id', auth, wrap(async (req, res) => {
  const p = db.projects.find(p => p.id === req.params.id && p.userId === req.user.id);
  if (!p) throw fail(404, 'Project not found');
  for (const k of ['name', 'description', 'status', 'progress', 'members', 'items', 'color', 'icon']) if (req.body[k] !== undefined) p[k] = req.body[k];
  p.updatedAt = new Date().toISOString(); save(); res.json(p);
}));
app.delete('/api/projects/:id', auth, wrap(async (req, res) => {
  const i = db.projects.findIndex(p => p.id === req.params.id && p.userId === req.user.id);
  if (i === -1) throw fail(404, 'Project not found');
  db.projects.splice(i, 1); save(); res.json({ ok: true });
}));

app.get('/api/files', auth, (req, res) => res.json(db.files.filter(f => f.userId === req.user.id)));
app.post('/api/files', auth, wrap(async (req, res) => {
  if (!req.body.name) throw fail(400, 'File name is required.');
  const file = {
    id: uid('f'), userId: req.user.id, name: req.body.name, type: req.body.type || 'Text',
    size: req.body.size || 0, pages: req.body.pages || 1, projectId: req.body.projectId || null,
    source: req.body.source || 'upload', summary: req.body.summary || '', createdAt: new Date().toISOString()
  };
  db.files.unshift(file); save(); res.json(file);
}));
app.delete('/api/files/:id', auth, wrap(async (req, res) => {
  const i = db.files.findIndex(f => f.id === req.params.id && f.userId === req.user.id);
  if (i === -1) throw fail(404, 'File not found');
  db.files.splice(i, 1); save(); res.json({ ok: true });
}));

app.get('/api/team', auth, (req, res) => {
  const members = db.users.filter(u => u.id !== req.user.id && ['u_maya', 'u_theo', 'u_priya', 'u_sam', 'u_olivia'].includes(u.id)).map(u => ({
    id: u.id, name: u.name, email: u.email, role: u.id === 'u_priya' ? 'Owner' : u.id === 'u_theo' ? 'Admin' : 'Editor',
    plan: u.plan, avatar: u.avatar, status: u.suspended ? 'suspended' : 'active', lastActive: u.id === 'u_maya' ? '2 min ago' : u.id === 'u_theo' ? '1 hour ago' : 'Yesterday',
    projects: u.id === 'u_maya' ? 4 : u.id === 'u_theo' ? 3 : 2, color: ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'][Math.floor(Math.random() * 5)]
  }));
  res.json({ members, seats: PLANS[req.user.plan]?.seats || 1, used: members.length + 1 });
});

/* ---------------------------------------------------------------- */
/* Documents                                                        */
/* ---------------------------------------------------------------- */

app.get('/api/documents', auth, (req, res) => res.json(db.docs.filter(d => d.userId === req.user.id).map(({ text, ...d }) => d)));
app.post('/api/documents/analyze', auth, wrap(async (req, res) => {
  const { name = 'Untitled document', text = '', question = '', mode = 'summarize' } = req.body;
  if (!text.trim()) throw fail(400, 'Add some text to analyse.');
  if (req.user.credits < 2) throw fail(402, 'Document analysis needs 2 credits.');
  const tool = findTool(req.body.toolId) || findTool('documents-document-summarization');
  const instructions = mode === 'question'
    ? `Answer the question using only the document. If the answer isn't present, say so.\n\nQuestion: ${question}\n\nDocument (${name}):\n${text.slice(0, 50_000)}`
    : `Analyse this document and return: a 3-sentence summary, key points, notable risks or gaps, and 3 follow-up questions.\n\nDocument (${name}):\n${text.slice(0, 50_000)}`;
  const summary = await askAI({
    messages: [{ role: 'user', content: instructions }],
    system: tool.system, model: req.body.model || 'nexai-core', tool, tone: 'precise', length: 'medium'
  });
  const existing = db.docs.find(d => d.userId === req.user.id && d.name === name);
  const doc = existing || { id: uid('doc'), userId: req.user.id, name, type: name.split('.').pop()?.toUpperCase() || 'Text', chars: text.length, createdAt: new Date().toISOString() };
  doc.summary = summary; doc.chars = text.length; doc.text = text.slice(0, 120_000); doc.updatedAt = new Date().toISOString();
  if (!existing) db.docs.unshift(doc); else Object.assign(existing, doc);
  charge(req.user, 2, { moduleId: 'documents', toolId: tool.id, tokens: Math.round(text.length / 3) });
  notify(req.user.id, 'document', `Analysed ${name}`, 'Your document brief is ready in Documents.', '/documents');
  save();
  res.json({ doc: { ...doc, text: undefined }, analysis: summary, credits: req.user.credits, demo: isDemo() });
}));
app.post('/api/documents/:id/ask', auth, wrap(async (req, res) => {
  const doc = db.docs.find(d => d.id === req.params.id && d.userId === req.user.id);
  if (!doc) throw fail(404, 'Document not found');
  if (req.user.credits < 1) throw fail(402, 'You’re out of credits.');
  const answer = await askAI({
    messages: [{ role: 'user', content: `Question: ${req.body.question}\n\nDocument (${doc.name}):\n${(doc.text || '').slice(0, 50_000)}` }],
    system: findTool('documents-ask-questions-about-documents').system, tool: findTool('documents-ask-questions-about-documents'), tone: 'precise', length: 'medium'
  });
  charge(req.user, 1, { moduleId: 'documents', toolId: 'documents-ask-questions-about-documents' });
  save();
  res.json({ answer, credits: req.user.credits, demo: isDemo() });
}));
app.delete('/api/documents/:id', auth, wrap(async (req, res) => {
  const i = db.docs.findIndex(d => d.id === req.params.id && d.userId === req.user.id);
  if (i === -1) throw fail(404, 'Document not found');
  db.docs.splice(i, 1); save(); res.json({ ok: true });
}));

/* ---------------------------------------------------------------- */
/* Research (real search when available, graceful fallback)          */
/* ---------------------------------------------------------------- */

async function webSearch(query) {
  const key = process.env.TAVILY_API_KEY;
  try {
    if (key) {
      const r = await fetch('https://api.tavily.com/search', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ api_key: key, query, max_results: 6, search_depth: 'advanced', include_answer: false })
      });
      if (r.ok) {
        const d = await r.json();
        return (d.results || []).map(x => ({ title: x.title, url: x.url, snippet: x.content?.slice(0, 320) || '', domain: safeDomain(x.url) }));
      }
    }
    const r = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, {
      headers: { 'user-agent': 'NexAI/1.0 research connector' }, signal: AbortSignal.timeout(6000)
    });
    if (!r.ok) return [];
    const d = await r.json();
    const sources = [];
    if (d.AbstractText) sources.push({ title: d.Heading || query, url: d.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`, snippet: d.AbstractText, domain: safeDomain(d.AbstractURL) });
    for (const t of (d.RelatedTopics || []).flatMap(x => x.Topics || [x]).slice(0, 5)) {
      if (t.Text && t.FirstURL) sources.push({ title: t.Text.split(' - ')[0].slice(0, 90), url: t.FirstURL, snippet: t.Text.slice(0, 280), domain: safeDomain(t.FirstURL) });
    }
    return sources;
  } catch { return []; }
}
function safeDomain(url = '') { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } }

app.post('/api/research/run', auth, wrap(async (req, res) => {
  const query = String(req.body.query || '').trim();
  if (!query) throw fail(400, 'Enter a research question.');
  if (req.user.credits < 3) throw fail(402, 'Deep research needs 3 credits.');
  const sources = await webSearch(query);
  const tool = findTool('research-ai-powered-web-research');
  const sourceBlock = sources.length
    ? sources.map((s, i) => `[${i + 1}] ${s.title} (${s.domain}) — ${s.snippet}`).join('\n')
    : '';
  const brief = await askAI({
    messages: [{ role: 'user', content: `Research question: ${query}\n\n${sourceBlock ? `Sources found:\n${sourceBlock}\n\nSynthesize these sources into a brief. Cite with [n].` : 'No live sources were reachable, so produce a structured research brief from established knowledge and clearly flag what should be verified.'}` }],
    system: tool.system, model: req.body.model || 'nexai-research', tool, tone: 'precise', length: 'long'
  });
  const saved = [];
  for (const s of sources) {
    if (!db.sources.some(x => x.userId === req.user.id && x.url === s.url)) {
      const src = { id: uid('src'), userId: req.user.id, ...s, query, savedAt: new Date().toISOString() };
      db.sources.unshift(src); saved.push(src);
    }
  }
  charge(req.user, 3, { moduleId: 'research', toolId: tool.id, tokens: 4200 });
  save();
  res.json({ query, brief, sources, savedCount: saved.length, credits: req.user.credits, demo: isDemo(), live: sources.length > 0 });
}));

app.get('/api/research/sources', auth, (req, res) => res.json(db.sources.filter(s => s.userId === req.user.id).slice(0, 60)));
app.delete('/api/research/sources/:id', auth, (req, res) => {
  const i = db.sources.findIndex(s => s.id === req.params.id && s.userId === req.user.id);
  if (i > -1) db.sources.splice(i, 1);
  save(); res.json({ ok: true });
});

/* ---------------------------------------------------------------- */
/* Support                                                          */
/* ---------------------------------------------------------------- */

app.get('/api/tickets', auth, (req, res) => {
  const tickets = db.tickets.filter(t => t.userId === req.user.id);
  const open = tickets.filter(t => t.status === 'open').length;
  const resolved = tickets.filter(t => t.status === 'resolved');
  const csat = resolved.filter(t => t.csat).reduce((a, t) => a + t.csat, 0) / Math.max(1, resolved.filter(t => t.csat).length);
  res.json({
    tickets, stats: {
      open, pending: tickets.filter(t => t.status === 'pending').length, resolved: resolved.length,
      urgent: tickets.filter(t => t.priority === 'urgent' && t.status !== 'resolved').length,
      csat: Number(csat.toFixed(1)), total: tickets.length,
      avgFirstReply: '2m 14s', deflection: 64
    }
  });
});
app.patch('/api/tickets/:id', auth, wrap(async (req, res) => {
  const t = db.tickets.find(t => t.id === req.params.id && t.userId === req.user.id);
  if (!t) throw fail(404, 'Ticket not found');
  for (const k of ['status', 'priority', 'sentiment']) if (req.body[k] !== undefined) t[k] = req.body[k];
  save(); res.json(t);
}));
app.post('/api/tickets/:id/reply', auth, wrap(async (req, res) => {
  const t = db.tickets.find(t => t.id === req.params.id && t.userId === req.user.id);
  if (!t) throw fail(404, 'Ticket not found');
  if (req.user.credits < 1) throw fail(402, 'You’re out of credits.');
  const tool = findTool('support-ai-generated-support-responses');
  const reply = await askAI({
    messages: [{ role: 'user', content: `Write a support reply for this ticket.\n\nCustomer: ${t.customer} (${t.company})\nSubject: ${t.subject}\nSentiment: ${t.sentiment}\nPriority: ${t.priority}\n${req.body.context ? `Context: ${req.body.context}` : ''}\n\nUse a warm, concise tone. Include concrete next steps. Then add an internal note with root cause and risk.` }],
    system: tool.system, tool, tone: 'friendly', length: 'medium'
  });
  t.messages = (t.messages || 1) + 1;
  charge(req.user, 1, { moduleId: 'support', toolId: tool.id });
  notify(req.user.id, 'support', `Draft ready for #${t.id}`, t.subject, '/support');
  save();
  res.json({ reply, credits: req.user.credits, demo: isDemo() });
}));
app.post('/api/tickets', auth, wrap(async (req, res) => {
  const t = {
    id: `t_${Math.floor(4800 + Math.random() * 190)}`, userId: req.user.id, customer: req.body.customer || req.user.name,
    company: req.body.company || req.user.company || '—', subject: req.body.subject || 'New inquiry', status: 'open',
    priority: req.body.priority || 'normal', sentiment: 'neutral', channel: req.body.channel || 'chat',
    createdAt: new Date().toISOString(), messages: 1, csat: null
  };
  db.tickets.unshift(t); save(); res.json(t);
}));

/* ---------------------------------------------------------------- */
/* Analytics                                                        */
/* ---------------------------------------------------------------- */

app.get('/api/analytics/sample', (req, res) => res.json({ name: 'marketing-performance.csv', rows: sampleDataset() }));
app.post('/api/analytics/analyze', auth, wrap(async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows.slice(0, 5000) : [];
  if (!rows.length) throw fail(400, 'Upload a CSV or connect a dataset first.');
  const result = analyzeDataset(rows);
  result.name = req.body.name || 'dataset.csv';
  const dataset = {
    id: uid('ds'), userId: req.user.id, name: result.name, rows: result.rows, columns: result.columns.length,
    createdAt: new Date().toISOString(), data: rows.slice(0, 5000)
  };
  db.datasets.unshift(dataset);
  charge(req.user, 1, { moduleId: 'analytics', toolId: 'analytics-upload-and-analyze-csv-files', tokens: 2400 });
  save();
  res.json({ ...result, datasetId: dataset.id, credits: req.user.credits });
}));
app.get('/api/analytics/datasets', auth, (req, res) => res.json(db.datasets.filter(d => d.userId === req.user.id).map(({ data, ...d }) => d).slice(0, 12)));
app.get('/api/analytics/datasets/:id', auth, (req, res) => {
  const d = db.datasets.find(d => d.id === req.params.id && d.userId === req.user.id);
  if (!d) return res.status(404).json({ error: 'Dataset not found' });
  res.json(d);
});
app.post('/api/analytics/ask', auth, wrap(async (req, res) => {
  const d = db.datasets.find(d => d.id === req.body.datasetId && d.userId === req.user.id) || db.datasets.filter(x => x.userId === req.user.id)[0];
  if (!d) throw fail(404, 'Analyse a dataset first.');
  const result = analyzeDataset(d.data);
  const q = String(req.body.question || '').toLowerCase();
  const primary = result.columns.find(c => c.numeric);
  let answer;
  if (q.includes('top') || q.includes('best') || q.includes('highest')) {
    const chart = result.charts[0];
    const pairs = chart ? chart.labels.map((l, i) => [l, chart.values[i]]).sort((a, b) => b[1] - a[1]) : [];
    answer = pairs.length ? `### Top performers\n${pairs.slice(0, 5).map(([l, v], i) => `${i + 1}. **${l}** — ${v.toLocaleString()}`).join('\n')}\n\n${pairs[0][0]} leads by a clear margin. I’d look at what’s structurally different there before copying tactics.` : 'There isn’t enough numeric data to rank rows.';
  } else if (q.includes('average') || q.includes('mean') || q.includes('typical')) {
    answer = primary ? `**${primary.name}** averages **${primary.mean.toLocaleString()}** (median ${primary.median.toLocaleString()}). The spread is wide (σ=${primary.stdev}), so segment before acting on the average.` : 'No numeric column found.';
  } else if (q.includes('forecast') || q.includes('predict') || q.includes('next')) {
    answer = result.forecast ? `**${result.forecast.metric}** is trending **${result.forecast.direction}** at roughly ${result.forecast.change}% per period. Next four periods: **${result.forecast.next.map(v => v.toLocaleString()).join(', ')}**. Directional only — validate with a holdout.` : 'Not enough periods for a forecast.';
  } else {
    answer = result.insights.slice(0, 4).join('\n\n');
  }
  charge(req.user, 1, { moduleId: 'analytics', toolId: 'analytics-natural-language-data-queries' });
  save();
  res.json({ answer, charts: result.charts.slice(0, 2), dataset: { id: d.id, name: d.name }, credits: req.user.credits });
}));

/* ---------------------------------------------------------------- */
/* Image, video, voice                                              */
/* ---------------------------------------------------------------- */

app.get('/api/image/gallery', auth, (req, res) => res.json(db.images.filter(i => i.userId === req.user.id).slice(0, 40)));
app.post('/api/image/generate', auth, wrap(async (req, res) => {
  const prompt = String(req.body.prompt || '').trim();
  if (!prompt) throw fail(400, 'Describe the image you want.');
  if (req.user.credits < 2) throw fail(402, 'Image generation needs 2 credits.');
  const variants = Math.min(4, Math.max(1, Number(req.body.variants) || 1));
  const images = Array.from({ length: variants }, (_, v) => {
    const image = {
      id: uid('img'), userId: req.user.id, prompt, style: req.body.style || 'Abstract', aspect: req.body.aspect || '16:9',
      svg: generateArt({ prompt, style: req.body.style, aspect: req.body.aspect, seed: Math.floor(Math.random() * 9999), variant: v }),
      toolId: req.body.toolId || 'image-text-to-image-generation', createdAt: new Date().toISOString()
    };
    return image;
  });
  db.images.unshift(...images);
  charge(req.user, 2, { moduleId: 'image', toolId: 'image-text-to-image-generation', tokens: 0 });
  save();
  res.json({ images, credits: req.user.credits, demo: true });
}));
app.delete('/api/image/:id', auth, (req, res) => {
  const i = db.images.findIndex(x => x.id === req.params.id && x.userId === req.user.id);
  if (i > -1) db.images.splice(i, 1);
  save(); res.json({ ok: true });
});

app.get('/api/video/gallery', auth, (req, res) => res.json(db.videos.filter(v => v.userId === req.user.id).slice(0, 30)));
app.post('/api/video/generate', auth, wrap(async (req, res) => {
  const prompt = String(req.body.prompt || '').trim();
  if (!prompt) throw fail(400, 'Describe the video you want.');
  if (req.user.credits < 5) throw fail(402, 'Video generation needs 5 credits.');
  const board = storyboard({ prompt, style: req.body.style, duration: req.body.duration });
  const video = { id: uid('vid'), userId: req.user.id, prompt, style: board.style, duration: board.duration, title: board.title, scenes: board.scenes.length, board, createdAt: new Date().toISOString() };
  db.videos.unshift(video);
  charge(req.user, 5, { moduleId: 'video', toolId: 'video-text-to-video-generation', tokens: 3200 });
  save();
  res.json({ video, credits: req.user.credits, demo: true });
}));
app.delete('/api/video/:id', auth, (req, res) => {
  const i = db.videos.findIndex(x => x.id === req.params.id && x.userId === req.user.id);
  if (i > -1) db.videos.splice(i, 1);
  save(); res.json({ ok: true });
});

app.get('/api/voice/voices', (_req, res) => res.json({
  voices: [
    { id: 'aria', name: 'Aria', accent: 'US', tone: 'Warm, confident', tags: ['narration', 'explainer'], pitch: 1, rate: 1 },
    { id: 'atlas', name: 'Atlas', accent: 'UK', tone: 'Calm, authoritative', tags: ['documentary', 'corporate'], pitch: 0.9, rate: 0.95 },
    { id: 'juno', name: 'Juno', accent: 'US', tone: 'Bright, energetic', tags: ['ads', 'social'], pitch: 1.1, rate: 1.08 },
    { id: 'sable', name: 'Sable', accent: 'AU', tone: 'Friendly, casual', tags: ['podcast', 'tutorial'], pitch: 1, rate: 1 },
    { id: 'orion', name: 'Orion', accent: 'UK', tone: 'Deep, cinematic', tags: ['trailer', 'story'], pitch: 0.8, rate: 0.9 },
    { id: 'mira', name: 'Mira', accent: 'IN', tone: 'Clear, precise', tags: ['training', 'support'], pitch: 1.05, rate: 1 }
  ],
  note: 'Playback uses your browser’s speech engine. Add ELEVENLABS_API_KEY to stream premium voices.'
}));

/* ---------------------------------------------------------------- */
/* Billing                                                          */
/* ---------------------------------------------------------------- */

app.get('/api/billing', auth, (req, res) => {
  const plan = PLANS[req.user.plan] || PLANS.free;
  const invoices = invoicesFor(req.user);
  const usage = usageFor(req.user.id, 30);
  res.json({
    plan: { id: req.user.plan, ...plan, creditsRemaining: req.user.credits, percent: Math.min(100, Math.round(((plan.credits - req.user.credits) / Math.max(1, plan.credits)) * 100)) },
    plans: Object.entries(PLANS).map(([id, p]) => ({ id, ...p, current: id === req.user.plan })),
    invoices,
    upcoming: { amount: plan.price, date: new Date(Date.now() + 6 * 86400000).toISOString(), plan: plan.name },
    payment: { brand: 'Visa', last4: '4242', expiry: '08/28' },
    usage: usage.totals,
    seats: { used: 5, total: plan.seats }
  });
});

app.post('/api/billing/plan', auth, wrap(async (req, res) => {
  const plan = req.body.plan;
  if (!PLANS[plan]) throw fail(400, 'Unknown plan');
  const previous = req.user.plan;
  req.user.plan = plan;
  req.user.credits = PLANS[plan].credits;
  audit(req.user.id, req.user.name, `Changed plan from ${previous} to ${plan}`);
  notify(req.user.id, 'billing', `You’re on ${PLANS[plan].name}`, `${PLANS[plan].credits.toLocaleString()} AI credits are now available.`, '/usage');
  save();
  res.json({ plan: { id: plan, ...PLANS[plan] }, user: publicUser(req.user), invoice: invoicesFor(req.user)[0] });
}));

app.post('/api/billing/coupon', auth, wrap(async (req, res) => {
  const code = String(req.body.code || '').toUpperCase().trim();
  const coupon = db.coupons.find(c => c.code === code && c.active);
  if (!coupon) throw fail(404, 'That code isn’t valid.');
  if (coupon.uses >= coupon.maxUses) throw fail(400, 'That code has reached its limit.');
  coupon.uses += 1;
  save();
  res.json({ code, percent: coupon.percent, message: `${coupon.percent}% off applied to your next invoice.` });
}));

/* ---------------------------------------------------------------- */
/* API keys & public API                                            */
/* ---------------------------------------------------------------- */

app.get('/api/keys', auth, (req, res) => res.json(db.apiKeys.filter(k => k.userId === req.user.id).map(({ hash, ...k }) => k)));
app.post('/api/keys', auth, wrap(async (req, res) => {
  const name = (req.body.name || 'New key').slice(0, 40);
  const full = `nx_live_${crypto.randomBytes(20).toString('hex')}`;
  const key = {
    id: uid('key'), userId: req.user.id, name, prefix: full.slice(0, 12), lastFour: full.slice(-4),
    hash: crypto.createHash('sha256').update(full).digest('hex'), scopes: req.body.scopes || ['chat'],
    lastUsed: null, createdAt: new Date().toISOString(), active: true
  };
  db.apiKeys.unshift(key);
  audit(req.user.id, req.user.name, `Created API key “${name}”`);
  save();
  res.json({ ...key, hash: undefined, key: full });
}));
app.delete('/api/keys/:id', auth, wrap(async (req, res) => {
  const i = db.apiKeys.findIndex(k => k.id === req.params.id && k.userId === req.user.id);
  if (i === -1) throw fail(404, 'Key not found');
  db.apiKeys.splice(i, 1); save(); res.json({ ok: true });
}));

function apiKeyAuth(req, res, next) {
  const raw = bearer(req);
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const key = db.apiKeys.find(k => k.hash === hash && k.active);
  const user = key && db.users.find(u => u.id === key.userId && !u.suspended);
  if (!key || !user) return res.status(401).json({ error: 'Invalid API key' });
  key.lastUsed = new Date().toISOString();
  req.user = user; req.apiKey = key;
  next();
}
app.get('/api/v1/models', apiKeyAuth, (_req, res) => res.json({ models: MODELS.map(({ id, name, provider, context, abilities }) => ({ id, name, provider, context, abilities })) }));
app.post('/api/v1/chat', apiKeyAuth, wrap(async (req, res) => {
  const content = String(req.body.message || req.body.content || '').trim();
  if (!content) throw fail(400, 'message is required');
  if (req.user.credits < 1) throw fail(402, 'Credit limit reached');
  const system = req.body.system || 'You are NexAI, a helpful and accurate AI assistant.';
  const reply = await askAI({ messages: [{ role: 'user', content }], system, model: req.body.model, tone: 'balanced', length: 'medium' });
  charge(req.user, 1, { moduleId: 'chat', toolId: 'chat-ai-powered-conversational-chatbot', tokens: Math.round(reply.length / 4) });
  save();
  res.json({ id: uid('cmpl'), model: req.body.model || 'nexai-core', created: Math.floor(Date.now() / 1000), content: reply, usage: { credits: 1, remaining: req.user.credits } });
}));

/* ---------------------------------------------------------------- */
/* Admin                                                            */
/* ---------------------------------------------------------------- */

app.get('/api/admin/overview', auth, adminOnly, wrap(async (req, res) => {
  const users = db.users;
  const mrr = users.filter(u => !u.suspended).reduce((a, u) => a + (PLANS[u.plan]?.price || 0), 0);
  const days = lastDays(30);
  const signupSeries = days.map(d => ({ day: d, count: users.filter(u => dayKey(u.createdAt) === d).length }));
  const usageSeries = days.map(d => {
    const recs = db.usage.filter(u => dayKey(u.at) === d);
    return { day: d, credits: recs.reduce((a, r) => a + r.credits, 0), requests: recs.length };
  });
  const planDist = Object.keys(PLANS).map(id => ({ plan: id, count: users.filter(u => u.plan === id).length, mrr: users.filter(u => u.plan === id && !u.suspended).length * PLANS[id].price }));
  const moduleUsage = {};
  db.usage.forEach(u => { moduleUsage[u.moduleId || 'chat'] = (moduleUsage[u.moduleId || 'chat'] || 0) + u.credits; });
  res.json({
    stats: {
      users: users.length, activeUsers: users.filter(u => !u.suspended).length, suspended: users.filter(u => u.suspended).length,
      mrr, arr: mrr * 12, conversations: db.conversations.length, agents: db.agents.length,
      tickets: db.tickets.filter(t => t.status !== 'resolved').length, creditsUsed: db.usage.reduce((a, u) => a + u.credits, 0),
      conversion: Math.round((users.filter(u => u.plan !== 'free').length / Math.max(1, users.length)) * 100)
    },
    signupSeries, usageSeries, planDist,
    moduleUsage: Object.entries(moduleUsage).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([moduleId, credits]) => ({ moduleId, name: MODULES.find(m => m.id === moduleId)?.name || moduleId, credits })),
    recentUsers: users.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6).map(publicUser),
    audit: db.audit.slice(0, 8),
    tickets: db.tickets.slice(0, 5),
    coupons: db.coupons,
    system: { plan: 'Business', region: 'eu-west-1', uptime: '99.98%', p95: '412ms', errorRate: '0.07%', storage: '38%', demoMode: isDemo() }
  });
}));

app.get('/api/admin/users', auth, adminOnly, (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  const users = db.users.filter(u => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.company?.toLowerCase().includes(q));
  res.json(users.map(u => ({
    ...publicUser(u), conversations: db.conversations.filter(c => c.userId === u.id).length,
    creditsUsed: db.usage.filter(x => x.userId === u.id).reduce((a, x) => a + x.credits, 0),
    lastActive: db.usage.filter(x => x.userId === u.id).at(-1)?.at || null
  })));
});
app.patch('/api/admin/users/:id', auth, adminOnly, wrap(async (req, res) => {
  const u = db.users.find(u => u.id === req.params.id);
  if (!u) throw fail(404, 'User not found');
  const { plan, suspended, role, credits } = req.body;
  if (plan && PLANS[plan]) { u.plan = plan; u.credits = PLANS[plan].credits; }
  if (typeof suspended === 'boolean') u.suspended = suspended;
  if (role && ['user', 'admin'].includes(role)) u.role = role;
  if (typeof credits === 'number') u.credits = Math.max(0, credits);
  audit(req.user.id, req.user.name, `Updated ${u.name}${plan ? ` → ${plan}` : ''}${suspended !== undefined ? suspended ? ' (suspended)' : ' (reactivated)' : ''}`);
  save();
  res.json(publicUser(u));
}));
app.get('/api/admin/audit', auth, adminOnly, (req, res) => res.json(db.audit));
app.get('/api/admin/coupons', auth, adminOnly, (req, res) => res.json(db.coupons));
app.post('/api/admin/coupons', auth, adminOnly, wrap(async (req, res) => {
  const code = String(req.body.code || '').toUpperCase().trim();
  if (!code) throw fail(400, 'Coupon code is required');
  if (db.coupons.some(c => c.code === code)) throw fail(409, 'That coupon already exists');
  const coupon = { code, percent: Math.min(90, Math.max(5, Number(req.body.percent) || 20)), uses: 0, maxUses: Number(req.body.maxUses) || 100, expires: req.body.expires || '2027-12-31', active: true };
  db.coupons.unshift(coupon); audit(req.user.id, req.user.name, `Created coupon ${code}`); save();
  res.json(coupon);
}));
app.post('/api/admin/reset-demo', auth, adminOnly, wrap(async (_req, res) => {
  resetDemoData();
  res.json({ ok: true });
}));

/* ---------------------------------------------------------------- */
/* Static frontend + errors                                         */
/* ---------------------------------------------------------------- */

const dist = path.resolve(here, '../../frontend/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) return res.sendFile(path.join(dist, 'index.html'));
    next();
  });
}

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`NexAI API ready on http://localhost:${PORT} · ${catalogStats().total} features · ${isDemo() ? 'demo intelligence' : 'live provider connected'}`);
});
