/**
 * NexAI API smoke test.
 * Requires the backend to be running on http://localhost:5000.
 *
 *   node scripts/smoke-test.mjs
 *   NEXAI_API=http://host:5000/api node scripts/smoke-test.mjs
 */

const API = (process.env.NEXAI_API || 'http://localhost:5000/api').replace(/\/+$/, '');
let passed = 0;
let failed = 0;

const pass = (name, detail = '') => { passed++; console.log(`PASS  ${name}${detail ? ' — ' + detail : ''}`); };
const fail = (name, error) => { failed++; console.error(`FAIL  ${name} — ${error.message || error}`); };

async function call(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function check(name, fn) {
  try {
    const detail = await fn();
    pass(name, detail);
  } catch (error) {
    fail(name, error);
  }
}

console.log(`NexAI smoke test → ${API}\n`);

let token = '';
await check('POST /auth/login', async () => {
  const data = await call('/auth/login', { method: 'POST', body: { email: 'demo@nexai.app', password: 'demo1234' } });
  token = data.token;
  if (!token) throw new Error('no token returned');
  return data.user?.name || 'authenticated';
});

const auth = { token };

await check('GET /catalog', async () => {
  const data = await call('/catalog', auth);
  if (data.total !== 370) throw new Error(`expected 370 features, got ${data.total}`);
  if (!Array.isArray(data.modules) || data.modules.length !== 19) throw new Error('expected 19 modules');
  return '370 features / 19 modules';
});

await check('GET /models', async () => {
  const data = await call('/models', auth);
  if (!Array.isArray(data) || data.length < 8) throw new Error('model catalogue too small');
  return `${data.length} models`;
});

await check('GET /plans', async () => {
  const data = await call('/plans', auth);
  if (!Array.isArray(data) || data.length < 4) throw new Error('plan list too small');
  return `${data.length} plans`;
});

await check('GET /dashboard', async () => {
  const data = await call('/dashboard', auth);
  if (!data.user?.email) throw new Error('missing user');
  return `${data.user.plan} plan, ${data.user.credits} credits`;
});

await check('GET /conversations', async () => {
  const data = await call('/conversations', auth);
  if (!Array.isArray(data)) throw new Error('expected array');
  return `${data.length} conversations`;
});

await check('GET /usage', async () => {
  const data = await call('/usage?days=30', auth);
  if (!data.totals || !data.plan) throw new Error('missing usage totals');
  return `${data.totals.requests} requests / ${data.totals.credits} credits`;
});

await check('GET /analytics/datasets', async () => {
  const data = await call('/analytics/datasets', auth);
  if (!Array.isArray(data)) throw new Error('expected array');
  return `${data.length} datasets`;
});

await check('GET /billing', async () => {
  const data = await call('/billing', auth);
  if (!data.plan) throw new Error('missing plan');
  return `${data.plan.name} / ${data.invoices?.length || 0} invoices`;
});

for (const [name, path] of [
  ['projects', '/projects'],
  ['files', '/files'],
  ['prompts', '/prompts'],
  ['team', '/team'],
  ['tickets', '/tickets'],
  ['notifications', '/notifications'],
  ['activity', '/activity'],
  ['admin overview', '/admin/overview'],
  ['api keys', '/keys']
]) {
  await check(`GET /${name.replace(' ', '/')}`, async () => {
    const data = await call(path, auth);
    if (data === undefined || data === null) throw new Error('empty response');
    return Array.isArray(data) ? `${data.length} items` : 'ok';
  });
}

await check('POST /chat/stream (SSE)', async () => {
  const res = await fetch(API + '/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content: 'Smoke test: give me one sentence about reliable AI workflows.' })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text.includes('"type":"delta"')) throw new Error('no delta event');
  if (!text.includes('"type":"done"')) throw new Error('no done event');
  return `${text.length} bytes streamed`;
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
