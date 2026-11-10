/**
 * NexAI model gateway.
 * Routes to Anthropic / OpenAI / Gemini / OpenRouter / Groq / Ollama when a key is present,
 * and otherwise produces a rich, tool-aware demo response so the product is fully explorable.
 */
export const MODELS = [
  { id: 'nexai-core', name: 'NexAI Core', provider: 'NexAI', tagline: 'Balanced everyday model', description: 'The default. Fast, capable and routed automatically to the best available provider.', context: '200K', speed: 'Fast', cost: '$$', badge: 'Default', color: '#6366f1', abilities: ['chat', 'writing', 'documents', 'analysis', 'images'] },
  { id: 'nexai-reason', name: 'NexAI Reason', provider: 'NexAI', tagline: 'Deep reasoning & planning', description: 'Spends more time thinking before answering. Best for strategy, code and hard analysis.', context: '200K', speed: 'Deliberate', cost: '$$$', badge: 'Reasoning', color: '#8b5cf6', abilities: ['reasoning', 'code', 'planning', 'analytics'] },
  { id: 'nexai-research', name: 'NexAI Research', provider: 'NexAI', tagline: 'Grounded, cited answers', description: 'Web-grounded research with structured briefs, counterpoints and sources.', context: '1M', speed: 'Thorough', cost: '$$$', badge: 'Research', color: '#0ea5e9', abilities: ['research', 'citations', 'web'] },
  { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', provider: 'Anthropic', tagline: 'Long-form writing & analysis', description: 'Excellent at nuanced writing, long documents and careful reasoning.', context: '200K', speed: 'Fast', cost: '$$$', badge: 'Writing', color: '#d97757', abilities: ['writing', 'documents', 'code'] },
  { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI', tagline: 'General purpose flagship', description: 'Strong all-rounder with excellent tool use and instruction following.', context: '128K', speed: 'Fast', cost: '$$$', badge: 'Flagship', color: '#10a37f', abilities: ['chat', 'code', 'vision'] },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', tagline: 'Huge context, multimodal', description: 'A million-token context with strong multimodal understanding.', context: '1M', speed: 'Fast', cost: '$$', badge: 'Long context', color: '#4285f4', abilities: ['vision', 'documents', 'analysis'] },
  { id: 'llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta', tagline: 'Open-weight value', description: 'Open-weight model with great quality per dollar. Runs on Groq or together.', context: '128K', speed: 'Very fast', cost: '$', badge: 'Open', color: '#0866ff', abilities: ['chat', 'code', 'speed'] },
  { id: 'nexai-fast', name: 'NexAI Fast', provider: 'NexAI', tagline: 'Lowest latency', description: 'Optimised for short replies, classification and realtime chat.', context: '128K', speed: 'Instant', cost: '$', badge: 'Fast', color: '#f59e0b', abilities: ['chat', 'support', 'classification'] }
];

export const findModel = (id) => MODELS.find(m => m.id === id) || MODELS[0];

const PROVIDER_KEYS = () => ({
  anthropic: process.env.ANTHROPIC_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
  groq: process.env.GROQ_API_KEY,
  ollama: process.env.OLLAMA_URL
});

export function liveModels() {
  const keys = PROVIDER_KEYS();
  return Object.entries(keys).filter(([, v]) => v).map(([k]) => k);
}
export const isDemo = () => liveModels().length === 0;

function route(modelId) {
  const keys = PROVIDER_KEYS();
  const model = findModel(modelId);
  const provider = model.provider;
  if (provider === 'Anthropic' && keys.anthropic) return { provider: 'anthropic', model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5' };
  if (provider === 'OpenAI' && keys.openai) return { provider: 'openai', model: process.env.OPENAI_MODEL || 'gpt-4.1' };
  if (provider === 'Google' && keys.gemini) return { provider: 'gemini', model: process.env.GEMINI_MODEL || 'gemini-2.5-pro' };
  if (provider === 'Meta' && keys.groq) return { provider: 'groq', model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile' };
  // NexAI auto-routing
  if (modelId === 'nexai-reason' && keys.anthropic) return { provider: 'anthropic', model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5' };
  if (modelId === 'nexai-research' && keys.openai) return { provider: 'openai', model: process.env.OPENAI_MODEL || 'gpt-4.1' };
  if (keys.anthropic) return { provider: 'anthropic', model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5' };
  if (keys.openai) return { provider: 'openai', model: process.env.OPENAI_MODEL || 'gpt-4.1' };
  if (keys.openrouter) return { provider: 'openrouter', model: process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4.5' };
  if (keys.gemini) return { provider: 'gemini', model: process.env.GEMINI_MODEL || 'gemini-2.5-pro' };
  if (keys.groq) return { provider: 'groq', model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile' };
  if (keys.ollama) return { provider: 'ollama', model: process.env.OLLAMA_MODEL || 'llama3.1' };
  return null;
}

async function* sseLines(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() || '';
    for (const line of parts) yield line.trim();
  }
  if (buffer.trim()) yield buffer.trim();
}

async function* streamOpenAICompatible({ url, key, model, messages, system, temperature, maxTokens, extraHeaders = {} }) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}`, ...extraHeaders },
    body: JSON.stringify({ model, stream: true, temperature, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, ...messages] })
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error?.message || `Provider error ${r.status}`);
  for await (const line of sseLines(r.body)) {
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (data === '[DONE]') return;
    try {
      const j = JSON.parse(data);
      const text = j.choices?.[0]?.delta?.content;
      if (text) yield text;
    } catch { /* partial keepalive */ }
  }
}

async function* streamAnthropic({ key, model, messages, system, maxTokens }) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages, stream: true })
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error?.message || `Anthropic error ${r.status}`);
  for await (const line of sseLines(r.body)) {
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    try {
      const j = JSON.parse(data);
      if (j.type === 'content_block_delta' && j.delta?.text) yield j.delta.text;
    } catch { /* ignore */ }
  }
}

async function* streamGemini({ key, model, messages, system, maxTokens }) {
  const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 } })
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error?.message || `Gemini error ${r.status}`);
  for await (const line of sseLines(r.body)) {
    if (!line.startsWith('data:')) continue;
    try {
      const j = JSON.parse(line.slice(5).trim());
      const text = j.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('');
      if (text) yield text;
    } catch { /* ignore */ }
  }
}

async function* streamOllama({ url, model, messages, system }) {
  const r = await fetch(`${url.replace(/\/$/, '')}/api/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, stream: true, messages: [{ role: 'system', content: system }, ...messages] })
  });
  if (!r.ok) throw new Error(`Ollama error ${r.status}`);
  for await (const line of sseLines(r.body)) {
    try { const j = JSON.parse(line); if (j.message?.content) yield j.message.content; } catch { /* ignore */ }
  }
}

export async function* streamAI({ messages, system, model = 'nexai-core', tool, tone = 'balanced', length = 'medium' }) {
  const keys = PROVIDER_KEYS();
  const routeInfo = route(model);
  const maxTokens = length === 'short' ? 600 : length === 'long' ? 4000 : 1800;
  const temperature = tone === 'creative' ? 0.95 : tone === 'precise' ? 0.25 : 0.7;

  if (!routeInfo) {
    yield* streamDemo({ messages, tool, tone, length });
    return;
  }
  try {
    if (routeInfo.provider === 'anthropic') {
      yield* streamAnthropic({ key: keys.anthropic, model: routeInfo.model, messages, system, maxTokens });
    } else if (routeInfo.provider === 'gemini') {
      yield* streamGemini({ key: keys.gemini, model: routeInfo.model, messages, system, maxTokens });
    } else if (routeInfo.provider === 'ollama') {
      yield* streamOllama({ url: keys.ollama, model: routeInfo.model, messages, system });
    } else {
      const urls = {
        openai: 'https://api.openai.com/v1/chat/completions',
        openrouter: 'https://openrouter.ai/api/v1/chat/completions',
        groq: 'https://api.groq.com/openai/v1/chat/completions'
      };
      const key = keys[routeInfo.provider];
      const extraHeaders = routeInfo.provider === 'openrouter' ? { 'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173', 'X-Title': 'NexAI' } : {};
      yield* streamOpenAICompatible({ url: urls[routeInfo.provider], key, model: routeInfo.model, messages, system, temperature, maxTokens, extraHeaders });
    }
  } catch (err) {
    yield `\n\n> **Provider error:** ${err.message}\n\nFalling back to a NexAI demo response.\n\n`;
    yield* streamDemo({ messages, tool, tone, length });
  }
}

export async function askAI({ messages, system, model, tool, tone, length }) {
  let out = '';
  for await (const chunk of streamAI({ messages, system, model, tool, tone, length })) out += chunk;
  return out;
}

/* ------------------------------------------------------------------ */
/* Demo intelligence                                                    */
/* ------------------------------------------------------------------ */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function cleanTopic(messages) {
  const last = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const firstLine = last.split('\n').find(l => l.trim()) || '';
  let t = firstLine.replace(/^[#*\->\s]+/, '').replace(/\s+/g, ' ').trim();
  if (t.length > 110) t = t.slice(0, 110).replace(/\s\S*$/, '') + '…';
  return t || 'your request';
}
function titleOf(topic) {
  const words = topic.replace(/[.!?].*$/, '').split(/\s+/).slice(0, 8).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
function topicShort(topic) {
  const words = topic.split(/\s+/);
  return words.slice(0, 5).join(' ').replace(/[.,:;]$/, '');
}

function codeBlock(toolName = '', topic = '', prompt = '') {
  const p = (toolName + ' ' + topic + ' ' + prompt).toLowerCase();
  if (p.includes('sql') || p.includes('database schema')) {
    return {
      intro: 'Here’s a query that answers the question, plus the schema assumptions behind it.',
      lang: 'sql',
      body: `-- Accounts at risk this quarter: high usage, low seats, no decision-maker activity\nWITH activity AS (\n  SELECT account_id,\n         COUNT(*) FILTER (WHERE event = 'run_agent')      AS agent_runs_30d,\n         COUNT(*) FILTER (WHERE event = 'invite_seat')    AS invites_30d,\n         MAX(occurred_at)                                 AS last_event\n  FROM events\n  WHERE occurred_at >= NOW() - INTERVAL '30 days'\n  GROUP BY account_id\n)\nSELECT a.id,\n       a.name,\n       a.plan,\n       a.seats,\n       COALESCE(ac.agent_runs_30d, 0) AS agent_runs_30d,\n       COALESCE(ac.invites_30d, 0)    AS invites_30d\nFROM accounts a\nLEFT JOIN activity ac ON ac.account_id = a.id\nWHERE a.mrr > 1000\n  AND COALESCE(ac.agent_runs_30d, 0) > 40\n  AND COALESCE(ac.invites_30d, 0) = 0\nORDER BY a.mrr DESC\nLIMIT 50;`,
      notes: ['Add an index on `events (account_id, occurred_at)` — the window filter is the expensive part.', 'Swap `NOW()` for a report date parameter so the query is deterministic in tests.', 'Materialise this into a daily `account_health` table once it exceeds ~50k accounts.']
    };
  }
  if (p.includes('react') || p.includes('html') || p.includes('css') || p.includes('component')) {
    return {
      intro: 'Here’s a self-contained component with accessible states and a small amount of local state.',
      lang: 'jsx',
      body: `import { useMemo, useState } from 'react';\n\nexport default function UsageMeter({ used = 0, limit = 1000, label = 'AI credits' }) {\n  const [open, setOpen] = useState(false);\n  const pct = useMemo(() => Math.min(100, Math.round((used / Math.max(1, limit)) * 100)), [used, limit]);\n  const tone = pct > 90 ? 'danger' : pct > 70 ? 'warn' : 'ok';\n\n  return (\n    <section className={\`meter meter--\${tone}\`} aria-label={label}>\n      <header>\n        <strong>{label}</strong>\n        <span>{used.toLocaleString()} / {limit.toLocaleString()}</span>\n      </header>\n      <div className="meter__track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>\n        <div className="meter__fill" style={{ width: pct + '%' }} />\n      </div>\n      <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open}>\n        {open ? 'Hide' : 'Show'} details\n      </button>\n      {open && <p>{pct}% of your monthly allowance used.</p>}\n    </section>\n  );\n}`,
      notes: ['The percentage is clamped so a bug upstream can’t overflow the bar.', '`aria-valuenow` keeps the visual meter screen-reader friendly.', 'If this polls usage, move the fetch into a parent and pass values down.']
    };
  }
  if (p.includes('unit test') || p.includes('test')) {
    return {
      intro: 'Here’s a focused test suite covering the happy path and the two failure modes that usually bite.',
      lang: 'js',
      body: `import { describe, it, expect, vi } from 'vitest';\nimport { calculateCredits } from './credits.js';\n\ndescribe('calculateCredits', () => {\n  it('charges one credit for a short chat', () => {\n    expect(calculateCredits({ kind: 'chat', tokens: 320 })).toBe(1);\n  });\n\n  it('scales for image generation', () => {\n    expect(calculateCredits({ kind: 'image', tokens: 0 })).toBe(4);\n  });\n\n  it('never returns a negative charge', () => {\n    expect(calculateCredits({ kind: 'chat', tokens: -10 })).toBe(0);\n  });\n\n  it('throws on an unknown kind', () => {\n    expect(() => calculateCredits({ kind: 'teleport' })).toThrow(/unknown/i);\n  });\n});`,
      notes: ['Name tests after behaviour, not implementation — they survive refactors.', 'Add one integration test at the route boundary; unit tests alone won’t catch serialization bugs.', 'Run with coverage in CI and keep a 90% floor on billing code.']
    };
  }
  if (p.includes('regex')) {
    return {
      intro: 'Here’s a pattern with named groups, plus the cases it deliberately rejects.',
      lang: 'js',
      body: `// Matches invoice ids like INV-2027-0042\nconst INVOICE = /^INV-(?<year>\\d{4})-(?<sequence>\\d{4,6})$/i;\n\nexport function parseInvoiceId(value) {\n  const match = INVOICE.exec(value.trim());\n  if (!match) return null;\n  return { year: Number(match.groups.year), sequence: Number(match.groups.sequence) };\n}\n\n// Valid:   INV-2027-0042, inv-2026-118\n// Invalid: INV-27-42, INV-2027-4, INV-2027-0042-X`,
      notes: ['Named groups make the call site readable and the regex self-documenting.', 'If this runs on untrusted input at scale, cap length before testing to avoid backtracking cost.', 'Keep the valid/invalid examples as tests — regex regressions are silent otherwise.']
    };
  }
  return {
    intro: 'Here’s a production-minded implementation with validation, typing and an explicit contract.',
    lang: 'js',
    body: `/**\n * ${toolName || 'NexAI helper'} — ${topicShort(topic)}\n * Returns a normalized result or throws a typed error.\n */\nexport class NexError extends Error {\n  constructor(code, message) {\n    super(message);\n    this.name = 'NexError';\n    this.code = code;\n  }\n}\n\nexport async function run(input, { timeoutMs = 15000 } = {}) {\n  if (!input || typeof input !== 'object') {\n    throw new NexError('INVALID_INPUT', 'input must be an object');\n  }\n\n  const controller = new AbortController();\n  const timer = setTimeout(() => controller.abort(), timeoutMs);\n\n  try {\n    const res = await fetch('/api/execute', {\n      method: 'POST',\n      headers: { 'content-type': 'application/json' },\n      body: JSON.stringify(input),\n      signal: controller.signal\n    });\n    if (!res.ok) throw new NexError('UPSTREAM', \`request failed: \${res.status}\`);\n    return await res.json();\n  } finally {\n    clearTimeout(timer);\n  }\n}\n\nexport const __testing = { NexError };`,
    notes: ['The timeout is enforced with an AbortController so hung requests can’t pin a worker.', 'Errors carry a stable `code` for the UI to branch on without parsing messages.', 'Add retries with jitter only for idempotent calls — never blanket-retry writes.']
  };
}

function socialBlock(topic, tool) {
  const t = titleOf(topic);
  return `## 3 angles for “${topicShort(topic)}”\n\n### 1. The contrarian\n**Hook:** Everyone is optimising ${topicShort(topic)} for speed. The teams winning are optimising for signal.\n\nMost AI rollouts stall because they automate the busywork and leave the judgement work untouched. Flip it: automate the judgement, and let people own the relationships.\n\n**CTA:** What would you automate first if quality mattered more than speed?\n\n### 2. The practical list\n**Hook:** ${t} in 5 moves.\n\n1. Pick one workflow that costs you a full day each week.\n2. Map the inputs — documents, data, context.\n3. Draft the output with AI, but keep a human approval gate.\n4. Measure cycle time before and after.\n5. Share the win publicly; that’s how adoption spreads.\n\n**CTA:** Save this for your next ops review.\n\n### 3. The story\n**Hook:** We deleted 11 recurring meetings last quarter. Nobody noticed.\n\nInstead of meeting to produce updates, we let an agent assemble the brief at 7am. The team read it async and only met when a decision was needed. Decision latency dropped 38%.\n\n**CTA:** The full teardown is in the comments.\n\n---\n**Hashtags:** #AI #Operations #Productivity #FutureOfWork #NexAI`;
}

function emailBlock(topic, toolName) {
  const isCover = /cover/i.test(toolName);
  if (isCover) {
    return `**${titleOf(topic)}**\n\nDear Hiring Team,\n\nI’m applying for the ${topicShort(topic)} role. What draws me to it is the combination of craft and ownership — the chance to shape decisions, not just deliver outputs.\n\nIn my current role I led a cross-functional project that reduced turnaround time by 38% while raising quality scores. I did it by making the work legible: clear owners, visible trade-offs and a weekly operating review that surfaced problems early. That’s the muscle I’d bring to your team.\n\nWhat I admire about your work is the standard you hold — thoughtful, specific and unfussy. I’d love to contribute to the next chapter.\n\nThank you for your time and consideration.\n\nSincerely,\nAlex Morgan`;
  }
  return `**Subject:** ${titleOf(topic)}\n\nHi {{first_name}},\n\nI’ll keep this short. ${topicShort(topic)} is something I’ve been thinking about a lot — and I think your team is one of the few positioned to do it properly.\n\nHere’s the specific problem I keep seeing: teams buy tools to save time, then spend the saved time managing the tools. The gap isn’t capability, it’s integration.\n\nWe’ve built a way to close that gap in under a week, without ripping out anything you already use. Three customers cut reporting time by more than half in the first month.\n\nWould a 20-minute walkthrough next week be useful? I can show the workflow end-to-end and you can tell me if it’s a fit.\n\nBest,\nAlex Morgan\nFounder, Northstar Studio`;
}

function academicBlock(topic, tool) {
  return `# ${titleOf(topic)}\n\n## Abstract\nThis briefing examines ${topicShort(topic)}, with attention to the evidence base, the mechanisms that explain observed outcomes, and the practical limits of current claims. The central finding is that results depend less on the technology itself than on the operating context in which it is deployed.\n\n## 1. Context\nThe conversation around ${topicShort(topic)} has moved from possibility to implementation. That shift exposes a gap: the evidence is strongest for narrow, well-instrumented workflows and weakest for broad, ambiguous ones.\n\n## 2. Key findings\n- **Effect sizes are context-dependent.** Gains concentrate where feedback is fast and outputs are verifiable.\n- **Adoption is uneven.** Teams with clear data ownership see materially better outcomes than those without.\n- **Quality control is the bottleneck.** Review capacity, not generation capacity, limits throughput.\n- **Measurement is immature.** Most published claims rely on self-reported time savings.\n\n## 3. Analysis\nThe evidence supports a staged approach: start where feedback loops are short, instrument the workflow before scaling, and treat human review as a designed component rather than a fallback. Where those conditions are absent, expected gains should be discounted substantially.\n\n| Condition | Expected gain | Confidence |\n| --- | --- | --- |\n| Narrow, verifiable task | High | Medium–high |\n| Cross-functional workflow | Moderate | Medium |\n| Open-ended strategy | Low–moderate | Low |\n\n## 4. Limitations\nSmall sample sizes, publication bias toward positive results, and inconsistent definitions of “productivity” all constrain what can be concluded. Findings should be read as directional.\n\n## 5. Conclusion\n${titleOf(topic)} is best treated as an operating change rather than a tool purchase. The organisations that benefit most will be those that redesign review, measurement and ownership alongside deployment.\n\n## References\n1. Internal workflow review, Northstar Studio, 2026.\n2. Industry benchmark report, 2025 — treat as illustrative, not peer-reviewed.\n3. Practitioner interviews (n=12), 2026.`;
}

function planBlock(topic, toolName) {
  const isLesson = /lesson|teaching|study|timetable/i.test(toolName);
  if (isLesson) {
    return `# Lesson plan: ${titleOf(topic)}\n\n**Level:** Intermediate · **Duration:** 60 minutes · **Format:** Workshop\n\n## Learning objectives\nBy the end, learners can:\n1. Explain the core concept of ${topicShort(topic)} in their own words.\n2. Apply it to a new example with 80% accuracy.\n3. Identify one common misconception and correct it.\n\n## Materials\n- One worked example and one counter-example\n- Printed practice set (6 questions, mixed difficulty)\n- Exit ticket (3 questions)\n\n## Run of show\n| Time | Activity | Purpose |\n| --- | --- | --- |\n| 0–5 | Hook: surprising example | Activate curiosity |\n| 5–15 | Direct instruction + checks | Build the model |\n| 15–30 | Guided practice | Scaffold application |\n| 30–45 | Independent practice | Build fluency |\n| 45–55 | Pair explain-back | Surface misconceptions |\n| 55–60 | Exit ticket | Assess understanding |\n\n## Differentiation\n- **Support:** worked example with the first step completed.\n- **Stretch:** open-ended extension requiring a counter-example.\n- **ELL:** glossary with visual anchors.\n\n## Assessment\nExit ticket scored 0–3. Two or more correct = ready to move on; below that, a 10-minute small-group reteach tomorrow.`;
  }
  return `# ${titleOf(topic)}\n\n## Objective\nA focused plan to deliver ${topicShort(topic)} within one quarter, with clear owners, measurable milestones and an explicit risk budget.\n\n## Strategic frame\n- **Where to play:** the segment with the shortest path from pain to proof.\n- **How to win:** speed of implementation plus a visible quality bar.\n- **What to ignore:** adjacent opportunities that don’t compound.\n\n## Workstreams\n| Workstream | Owner | 30-day outcome | Metric |\n| --- | --- | --- | --- |\n| Positioning | Marketing | Message tested with 10 buyers | Reply rate |\n| Product | Engineering | Core workflow live for 5 design partners | Activation |\n| Revenue | Sales | 20 qualified conversations | Pipeline |\n| Operations | Ops | Instrumented dashboard + weekly review | Cycle time |\n\n## Timeline\n- **Weeks 1–2:** Discovery, success criteria, instrumentation plan.\n- **Weeks 3–6:** Build and test with design partners.\n- **Weeks 7–10:** Iterate on the top two friction points.\n- **Weeks 11–13:** Launch, measure, and write the retrospective.\n\n## Budget\n| Line | Allocation |\n| --- | --- |\n| Product & engineering | 55% |\n| Go-to-market | 30% |\n| Tools & data | 10% |\n| Contingency | 5% |\n\n## Risks & mitigations\n1. **Scope creep** → one-page scope, weekly change review, explicit non-goals.\n2. **Weak adoption** → design partners with named champions and weekly check-ins.\n3. **Measurement gaps** → instrument before launch, not after.\n\n## Success criteria\n- 70% of target users complete the core workflow unaided.\n- Cycle time down 25% versus baseline.\n- Three referenceable customers by quarter end.`;
}

function summaryBlock(topic) {
  return `## Summary\n${titleOf(topic)} — the through-line is a shift from generating more output to improving the quality of decisions around that output.\n\n## Key points\n- **What changed:** capability is now good enough for narrow workflows; the constraint moved to review and integration.\n- **What matters:** clear ownership, instrumented feedback and an explicit quality bar.\n- **What’s still weak:** measurement, long-horizon reliability and cross-team handoffs.\n\n## Decisions & actions\n| Action | Owner | Due |\n| --- | --- | --- |\n| Pick one workflow and baseline cycle time | Alex | This week |\n| Draft the review checklist | Maya | Next Tuesday |\n| Run a 5-person pilot | Sam | End of month |\n\n## Open questions\n1. Which metric will we trust when self-reported time savings disagree with throughput?\n2. What is the fallback when the model is confidently wrong?\n3. Who signs off on external-facing output?`;
}

function creativeBlock(topic) {
  return `## Creative direction: ${topicShort(topic)}\n\n**Concept.** A quiet, confident visual language: deep navy field, one electric accent, generous negative space. The idea should feel engineered, not decorated.\n\n### Visual system\n- **Palette:** #0B1020 base · #6366F1 primary · #5EEAD4 accent · #F8FAFC type\n- **Type:** geometric sans for headlines, humanist sans for body; tight tracking on large sizes.\n- **Texture:** subtle film grain at 3–5% opacity; soft 40px radius highlights.\n- **Motion:** 180ms ease-out for state changes; no looping animation in product surfaces.\n\n### Prompt\n> ${topic}, cinematic isometric composition, volumetric light, deep navy and violet palette, mint accent, ultra-clean product render, soft shadows, high detail, 3:2, no text\n\n### Negative prompt\n> clutter, lens flare, neon overload, illegible typography, watermark, low contrast\n\n### Deliverables\n1. Hero visual — 3:2, 2400px wide\n2. Social crop — 4:5 with safe area for headline\n3. Thumbnail — 16:9 with high-contrast focal point\n\n### Art direction notes\n- One idea per frame. If two elements compete, remove one.\n- Keep the accent colour under 10% of the frame.\n- Test at 120px wide — if the silhouette fails, simplify it.`;
}

function supportBlock(topic) {
  return `**Suggested reply**\n\nHi {{customer_name}},\n\nThanks for flagging this — I can see why it’s frustrating. You’re right that ${topicShort(topic)} shouldn’t behave that way.\n\nHere’s what I’ve done:\n1. Confirmed the issue on your account (reference {{ticket_id}}).\n2. Applied the fix and verified it with a test run.\n3. Added a note so the team can spot this pattern earlier.\n\nYou should see the correct result within a few minutes. If anything still looks off, reply here and I’ll pick it up personally.\n\n— {{agent_name}}, NexAI Support\n\n---\n**Internal note**\n- Root cause: stale cache key after plan change.\n- Pattern: 4 similar tickets in 7 days — flag to engineering.\n- Sentiment before: negative · after: neutral.\n- Do **not** offer a refund unless the duplicate charge is confirmed in Stripe.`;
}

function educationBlock(topic, toolName) {
  if (/quiz|exam|flashcard/i.test(toolName)) {
    return `# Quiz: ${titleOf(topic)}\n\n**10 questions · mixed format · answer key included**\n\n1. **Multiple choice.** Which statement best describes the core idea? \n   A) …  B) …  C) …  D) …\n2. **True or false.** The effect is always proportional to input size. Explain in one line.\n3. **Short answer.** Give one example and one counter-example.\n4. **Apply.** Predict what happens if the key variable doubles.\n5. **Analyse.** Which assumption is most fragile? Why?\n6. **Compare.** Name one similarity and one difference between the two approaches.\n7. **Explain.** Describe the mechanism in under 30 words.\n8. **Diagnose.** A student gets X. What misconception is most likely?\n9. **Design.** Outline a 3-step test of the claim.\n10. **Reflect.** What would change your mind?\n\n## Answer key\n1. C — it captures the mechanism, not just the correlation.\n2. False — the relationship is nonlinear beyond the threshold.\n3. *(accept any valid pair with a clear mechanism)*\n4. Output rises, but with diminishing returns.\n5. The assumption of independence.\n6. Both rely on feedback; only one requires labelled data.\n7. *(check for mechanism, not vocabulary)*\n8. Confusing correlation with causation.\n9. Vary one input, hold others fixed, measure twice.\n10. A credible counter-example reproduced independently.`;
  }
  return `# ${titleOf(topic)}\n\n## Start here\nBefore the method, the intuition: ${topicShort(topic)} is about finding the relationship between what you change and what actually moves. Everything else is bookkeeping.\n\n## Step by step\n1. **Name the unknowns.** Write down what you know and what you’re solving for.\n2. **Choose the simplest model.** Start linear; only add complexity when the data demands it.\n3. **Work one transformation at a time.** Show the operation on both sides and note why it’s valid.\n4. **Check with a second method.** Substitute the answer back, or estimate the magnitude.\n5. **Explain it out loud.** If you can’t, the gap is conceptual, not arithmetic.\n\n## Worked example\nSuppose the input grows from 4 to 9. Because the relationship is quadratic, the output scales by (9/4)² = 5.06, not 2.25. That difference is exactly where most errors happen.\n\n## Common misconceptions\n- Assuming proportional change when the relationship is nonlinear.\n- Forgetting to check units and domain constraints.\n- Treating a plausible answer as a verified one.\n\n## Practice check\n1. If the input triples, what happens to the output under a quadratic relationship?\n2. Give a real-world case where the linear assumption would mislead you.\n3. Explain the mechanism to a friend in 60 seconds.\n\n*(Answers: ×9; any case with saturation or compounding; check for mechanism.)*`;
}

function quickBlock(topic, toolName) {
  const t = topic.toLowerCase();
  const quoted = topic.match(/(?:called|named)\s+["'“]?([A-Za-z0-9][\w .&+-]{0,32}?)(?:["'”]|$)/);
  const subject = (quoted?.[1] || topicShort(topic)).replace(/[.?!]+$/, '').trim();

  if (/tagline|slogan|one-liner|one line|headline/i.test(t)) {
    return `## Five taglines for ${subject}

**1. Confident**
> Think less. Ship more.

**2. Outcome-first**
> From question to decision in one workspace.

**3. Category play**
> The operating system for applied AI.

**4. Human**
> AI that does the work, so you can do the thinking.

**5. Short and sharp**
> One workspace. Every answer.

### Why these work
- They promise a result, not a feature list.
- Each is short enough for a hero, a badge and an app icon caption.
- They leave room for proof on the page beneath.

### Choosing one
Pick **2** for acquisition pages, **1** for product surfaces and **3** if you are defining a category rather than competing inside one.`;
  }

  if (/^(hi|hey|hello|thanks|thank you|good morning|good evening)[!. ]*$/i.test(topic.trim())) {
    return `Hey Alex — good to see you. What are we working on?

A few things I can do right now:
- **Draft** a launch plan, email or brief
- **Research** a question and return a cited summary
- **Build** an agent for a recurring workflow
- **Analyse** a CSV, PDF or spreadsheet

Or pick a tool from the composer for a more focused result.`;
  }

  if (/(what|who|when|where|why|how)\b.+\?$/.test(topic.trim())) {
    return `### ${titleOf(topic)}

**Short answer.** ${topicShort(topic)} depends on context — the useful version of the answer starts with the constraint you care about most: speed, cost, quality or risk.

**How I'd think about it**
1. **Frame the decision.** Write the question as a choice between two options, not a topic.
2. **Name the constraint.** The right answer changes when the bottleneck changes.
3. **Check the evidence.** Prefer a small test you can run this week over a general argument.
4. **Decide and review.** Set a review date; otherwise the decision quietly reverses itself.

**What I need from you.** Tell me your context (team size, timeline, current stack) and I'll make this specific rather than general.`;
  }

  return null;
}

function demoText(tool, messages, tone, length) {
  const topic = cleanTopic(messages);
  const toolName = tool?.name || 'NexAI Assistant';
  const kind = tool?.kind || 'chat';
  const n = (toolName + ' ' + topic).toLowerCase();
  const sections = [];

  if (kind === 'code') {
    const c = codeBlock(toolName, topic, messages.at(-1)?.content || '');
    return `### ${toolName}\n\n${c.intro}\n\n\`\`\`${c.lang}\n${c.body}\n\`\`\`\n\n### Why this works\n${c.notes.map(x => `- ${x}`).join('\n')}\n\n### Next step\nTell me your runtime version and constraints (latency, scale, existing stack) and I’ll tighten this to your environment.`;
  }

  if (kind === 'image' || kind === 'video' || kind === 'voice') return creativeBlock(topic);
  if (/email|cover letter|outreach|follow.?up/i.test(toolName)) return emailBlock(topic, toolName);
  if (kind === 'marketing' || /instagram|linkedin|tiktok|social|caption|hashtag|advert/i.test(toolName)) return socialBlock(topic, toolName);
  if (/quiz|exam|flashcard/i.test(toolName)) return educationBlock(topic, toolName);
  if (kind === 'education') return educationBlock(topic, toolName);
  if (/summary|summarise|summarize|meeting/i.test(toolName)) return summaryBlock(topic);
  if (kind === 'support') return supportBlock(topic);
  if (/plan|strategy|campaign|proposal|timeline|budget|timetable/i.test(toolName)) return planBlock(topic, toolName);
  if (/essay|report|academic|research|paper|analysis/i.test(toolName) || kind === 'research') return academicBlock(topic, tool);
  if (/swot/i.test(toolName)) {
    return `## SWOT: ${titleOf(topic)}\n\n| | Helpful | Harmful |\n| --- | --- | --- |\n| **Internal** | **Strengths** — focused wedge, fast implementation, strong quality bar | **Weaknesses** — thin brand awareness, review capacity, single-channel GTM |\n| **External** | **Opportunities** — underserved mid-market, integration demand, pricing gap | **Threats** — incumbents bundling AI, model cost volatility, security scrutiny |\n\n### Strategic implications\n1. **Lead with the wedge.** Win one workflow completely before expanding.\n2. **Turn review into a feature.** Visible quality control is a differentiator, not overhead.\n3. **Price on outcome.** Seat pricing invites comparison; workflow pricing doesn’t.\n\n### What would change this analysis\nTwo enterprise logos in 60 days would shift the opportunity toward upmarket. A major incumbent shipping native agents would compress the window.`;
  }

  const quick = quickBlock(topic, toolName);
  if (quick) return quick;

  const paragraphs = {
    short: `### ${toolName}\n\n**${titleOf(topic)}**\n\nHere’s the direct answer: focus on the smallest workflow that produces a visible result, instrument it, and only then expand. Most of the value is in the integration, not the generation.\n\n- Start with one measurable outcome.\n- Keep a human approval gate on anything external.\n- Review the result weekly against a baseline.`,
    medium: `# ${titleOf(topic)}\n\n**The short version:** ${topicShort(topic)} works best as a narrow, instrumented workflow with a visible quality bar. Everything else is optimisation.\n\n## What matters most\n- **Define the outcome first.** “Save time” is not measurable. “Cut the weekly report from 3 hours to 30 minutes” is.\n- **Design the review step.** Generation is cheap; judgement is the constraint. Put a named owner on every external output.\n- **Instrument before you scale.** Capture cycle time and error rate at day one, or you’ll be arguing from anecdotes by week six.\n- **Keep the feedback loop short.** The faster a bad output is caught, the cheaper the system is to run.\n\n## A practical sequence\n1. **Week 1 — Baseline.** Measure the current workflow end to end, including waiting time.\n2. **Week 2 — Prototype.** Build the smallest version that produces a real deliverable.\n3. **Week 3 — Pilot.** Run it with 3–5 people who will tell you the truth.\n4. **Week 4 — Harden.** Fix the top two failure modes; write the checklist.\n5. **Week 5+ — Expand.** Add one adjacent workflow, not five.\n\n## What to watch\n| Risk | Early signal | Response |\n| --- | --- | --- |\n| Silent quality drop | Review edits increase | Tighten the prompt and checklist |\n| Low adoption | Usage concentrated in one person | Remove a step; don’t add training |\n| Cost creep | Credits rising faster than output | Route simple tasks to a cheaper model |\n\n## Bottom line\nTreat ${topicShort(topic)} as an operating change. The teams that win are the ones that redesign review and ownership alongside the tooling.`,
    long: `# ${titleOf(topic)}\n\n**Executive summary.** ${topicShort(topic)} is best understood as an operating change rather than a tooling upgrade. The technology is capable enough for narrow, well-instrumented workflows; the binding constraint has moved to review capacity, integration quality and measurement discipline.\n\n## 1. The real problem\nThe temptation is to automate the visible work — drafting, summarising, formatting. That’s where demos shine and where durable value is thinnest. The higher-leverage target is the judgement work around it: deciding what matters, checking what’s true and owning what ships.\n\n## 2. What good looks like\n- **One workflow, end to end.** Not five pilots; one complete loop.\n- **A named owner.** Every output has a human accountable for it.\n- **A visible quality bar.** A checklist that a new teammate could apply.\n- **A baseline.** Numbers captured before the change, not reconstructed after.\n- **A cost ceiling.** A per-workflow budget that forces routing decisions.\n\n## 3. Implementation plan\n| Phase | Duration | Output | Gate |\n| --- | --- | --- | --- |\n| Baseline | 1 week | Current-state map + metrics | Sponsor sign-off |\n| Prototype | 2 weeks | Working loop for one workflow | 3 real deliverables |\n| Pilot | 3 weeks | 5 users, instrumented | Error rate < 5% |\n| Harden | 2 weeks | Checklist, runbook, fallback | Review capacity proven |\n| Expand | Ongoing | One adjacent workflow per month | Cost per output stable |\n\n## 4. Measurement\nTrack four numbers, weekly: **cycle time**, **first-pass acceptance**, **escalation rate** and **cost per accepted output**. Anything else is commentary. If cycle time improves but acceptance falls, you’ve moved work downstream, not removed it.\n\n## 5. Failure modes\n1. **Pilot purgatory.** Success never generalises because no one owns the rollout.\n2. **Review debt.** Output volume rises faster than review capacity, so quality silently degrades.\n3. **Metric drift.** Teams report time saved while throughput stays flat.\n4. **Cost blindness.** Usage grows in the background until unit economics break.\n\n## 6. What I’d do next\nPick the workflow with the shortest feedback loop and the clearest owner. Baseline it this week. Build the ugliest version that produces a real deliverable. Then decide with evidence — not enthusiasm.\n\n## Bottom line\n${titleOf(topic)} will be won by teams that are boring about measurement and ruthless about scope.`
  };
  let text = paragraphs[length] || paragraphs.medium;
  if (tone === 'friendly') text += '\n\nIf you want, I can turn this into a one-page plan you can share with your team.';
  if (tone === 'precise') text += '\n\n*Assumptions: one workflow, one owner, a four-week window. Change any of these and the plan changes.*';
  if (tone === 'creative') text += '\n\n**A sharper angle:** the constraint isn’t intelligence — it’s trust. Design for trust and the rest follows.';
  if (!sections.length) return text;
  return text;
}

function demoMeta(tool, length) {
  const base = 0.84 + (tool?.number ? (tool.number % 11) / 100 : 0.05);
  return {
    confidence: Math.min(0.97, Number(base.toFixed(2))),
    suggestions: [
      'Turn this into a one-page brief',
      'Give me the counter-argument',
      'Adapt it for a skeptical executive',
      'Create a checklist from this'
    ]
  };
}

async function* streamDemo({ messages, tool, tone, length }) {
  const text = demoText(tool, messages, tone, length);
  const words = text.split(/(\s+)/);
  let buf = '';
  let count = 0;
  for (const w of words) {
    buf += w;
    if (++count % 7 === 0) {
      yield buf;
      buf = '';
      await sleep(12);
    }
  }
  if (buf) yield buf;
}

export { demoMeta, titleOf, topicShort };
