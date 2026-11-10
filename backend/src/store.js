/**
 * NexAI data store.
 * A dependency-free JSON store with a seeded demo workspace. Set DATA_FILE to relocate.
 * (Swap this module for a Postgres/Mongo adapter later — routes only use the arrays below.)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { generateArt, storyboard } from './media.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.env.DATA_FILE || path.resolve(here, '../data/db.json');

export const uid = (prefix = 'id') => `${prefix}_${crypto.randomBytes(9).toString('hex')}`;
export const hashPassword = (pw) => {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
};
export const checkPassword = (pw, stored = '') => {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(key));
};

export const PLANS = {
  free: { name: 'Free', price: 0, credits: 50, seats: 1, blurb: 'Explore NexAI and ship your first AI workflows.', features: ['AI Chat & Writing', 'Limited Document AI', 'Limited Image Studio', 'Prompt library'] },
  pro: { name: 'Pro', price: 19, credits: 2500, seats: 1, blurb: 'For creators and professionals who use AI every day.', features: ['Everything in Free', 'Video Studio (limited)', 'AI Agents', 'Limited analytics', 'API access (limited)'] },
  business: { name: 'Business', price: 79, credits: 20000, seats: 10, blurb: 'For teams that run their work on NexAI.', features: ['Everything in Pro', 'Unlimited Document AI', 'Full Video Studio', 'Team collaboration', 'Advanced analytics', 'API access'] },
  enterprise: { name: 'Enterprise', price: 399, credits: 100000, seats: 100, blurb: 'Governance, scale and private models for the enterprise.', features: ['Everything in Business', 'Custom AI models', 'BYOK & private deployment', 'SSO & audit logs', 'Dedicated support'] }
};

export const INTEGRATIONS = [
  { id: 'slack', name: 'Slack', category: 'Communication', desc: 'Send agent reports and alerts into channels.', color: '#611f69', initial: 'S' },
  { id: 'notion', name: 'Notion', category: 'Docs', desc: 'Sync research briefs and docs to your workspace.', color: '#111111', initial: 'N' },
  { id: 'gdrive', name: 'Google Drive', category: 'Storage', desc: 'Import documents and export generated files.', color: '#1a73e8', initial: 'G' },
  { id: 'gmail', name: 'Gmail', category: 'Communication', desc: 'Let agents draft and triage email.', color: '#ea4335', initial: 'M' },
  { id: 'github', name: 'GitHub', category: 'Developer', desc: 'Review PRs and generate commit messages.', color: '#24292e', initial: 'G' },
  { id: 'zapier', name: 'Zapier', category: 'Automation', desc: 'Trigger 7,000+ apps from agent events.', color: '#ff4f00', initial: 'Z' },
  { id: 'whatsapp', name: 'WhatsApp', category: 'Support', desc: 'Deploy your support agent on WhatsApp.', color: '#25d366', initial: 'W' },
  { id: 'telegram', name: 'Telegram', category: 'Support', desc: 'Connect a Telegram bot to support flows.', color: '#229ed9', initial: 'T' },
  { id: 'stripe', name: 'Stripe', category: 'Billing', desc: 'Sync subscriptions, invoices and payments.', color: '#635bff', initial: 'S' },
  { id: 'hubspot', name: 'HubSpot', category: 'CRM', desc: 'Enrich contacts and log customer research.', color: '#ff7a59', initial: 'H' },
  { id: 'webhook', name: 'Webhooks', category: 'Developer', desc: 'POST agent events to any HTTPS endpoint.', color: '#3a3dff', initial: '↗' },
  { id: 'byok', name: 'Bring Your Own Key', category: 'AI', desc: 'Route requests through your own provider key.', color: '#0f9d8a', initial: 'K' }
];

const now = Date.now();
const daysAgo = (d, h = 12) => new Date(now - d * 86400000 - h * 3600000).toISOString();
const minutesAgo = (m) => new Date(now - m * 60000).toISOString();

function seed() {
  const demoId = 'u_demo';
  const users = [
    {
      id: demoId, name: 'Alex Morgan', email: 'demo@nexai.app', password: hashPassword('demo1234'),
      role: 'admin', plan: 'business', credits: 18450, suspended: false, systemPrompt: '',
      avatar: null, twoFactor: false, company: 'Northstar Studio', jobTitle: 'Founder & Product Lead',
      timezone: 'Europe/London', language: 'English', createdAt: daysAgo(148),
      prefs: { theme: 'dark', tone: 'balanced', length: 'medium', model: 'nexai-core', density: 'comfortable', suggestions: true, memory: true, citations: true },
      integrations: ['slack', 'notion', 'github', 'stripe'],
      favorites: ['chat', 'agents', 'analytics']
    },
    { id: 'u_maya', name: 'Maya Chen', email: 'maya@lumenlabs.io', password: hashPassword('password123'), role: 'user', plan: 'pro', credits: 1840, suspended: false, company: 'Lumen Labs', createdAt: daysAgo(96), prefs: { theme: 'light' }, integrations: ['notion'], favorites: [] },
    { id: 'u_sam', name: 'Sam Rivera', email: 'sam@fieldnote.co', password: hashPassword('password123'), role: 'user', plan: 'free', credits: 32, suspended: false, company: 'Fieldnote', createdAt: daysAgo(41), prefs: { theme: 'dark' }, integrations: [], favorites: [] },
    { id: 'u_priya', name: 'Priya Nair', email: 'priya@atlasbank.com', password: hashPassword('password123'), role: 'user', plan: 'enterprise', credits: 91420, suspended: false, company: 'Atlas Bank', createdAt: daysAgo(220), prefs: { theme: 'light' }, integrations: ['slack', 'gdrive', 'stripe', 'byok'], favorites: [] },
    { id: 'u_jonas', name: 'Jonas Weber', email: 'jonas@kite.studio', password: hashPassword('password123'), role: 'user', plan: 'business', credits: 9120, suspended: true, company: 'Kite Studio', createdAt: daysAgo(67), prefs: { theme: 'dark' }, integrations: ['gmail'], favorites: [] },
    { id: 'u_olivia', name: 'Olivia Park', email: 'olivia@meridian.co', password: hashPassword('password123'), role: 'user', plan: 'pro', credits: 2140, suspended: false, company: 'Meridian', createdAt: daysAgo(12), prefs: { theme: 'light' }, integrations: ['notion'], favorites: [] },
    { id: 'u_theo', name: 'Theo Bennett', email: 'theo@arcforge.dev', password: hashPassword('password123'), role: 'user', plan: 'business', credits: 15600, suspended: false, company: 'Arcforge', createdAt: daysAgo(19), prefs: { theme: 'dark' }, integrations: ['github', 'slack'], favorites: [] },
    { id: 'u_amara', name: 'Amara Okafor', email: 'amara@kindred.health', password: hashPassword('password123'), role: 'user', plan: 'enterprise', credits: 84300, suspended: false, company: 'Kindred Health', createdAt: daysAgo(25), prefs: { theme: 'light' }, integrations: ['slack', 'gdrive'], favorites: [] },
    { id: 'u_lucas', name: 'Lucas Silva', email: 'lucas@northwind.br', password: hashPassword('password123'), role: 'user', plan: 'free', credits: 18, suspended: false, company: 'Northwind', createdAt: daysAgo(3), prefs: { theme: 'dark' }, integrations: [], favorites: [] },
    { id: 'u_hana', name: 'Hana Sato', email: 'hana@papercrane.jp', password: hashPassword('password123'), role: 'user', plan: 'pro', credits: 980, suspended: false, company: 'Paper Crane', createdAt: daysAgo(34), prefs: { theme: 'light' }, integrations: ['notion'], favorites: [] },
    { id: 'u_daniel', name: 'Daniel Cohen', email: 'daniel@valevc.com', password: hashPassword('password123'), role: 'user', plan: 'business', credits: 12000, suspended: false, company: 'Vale VC', createdAt: daysAgo(47), prefs: { theme: 'dark' }, integrations: ['slack', 'stripe'], favorites: [] },
    { id: 'u_emma', name: 'Emma Laurent', email: 'emma@atelier.fr', password: hashPassword('password123'), role: 'user', plan: 'free', credits: 44, suspended: false, company: 'Atelier', createdAt: daysAgo(5), prefs: { theme: 'light' }, integrations: [], favorites: [] },
    { id: 'u_ravi', name: 'Ravi Shah', email: 'ravi@quantumleap.in', password: hashPassword('password123'), role: 'user', plan: 'enterprise', credits: 99000, suspended: false, company: 'Quantum Leap', createdAt: daysAgo(90), prefs: { theme: 'dark' }, integrations: ['byok', 'webhook'], favorites: [] },
    { id: 'u_nina', name: 'Nina Petrova', email: 'nina@formwork.io', password: hashPassword('password123'), role: 'user', plan: 'pro', credits: 1670, suspended: false, company: 'Formwork', createdAt: daysAgo(8), prefs: { theme: 'light' }, integrations: ['gmail'], favorites: [] },
    { id: 'u_caleb', name: 'Caleb Wright', email: 'caleb@harbor.gg', password: hashPassword('password123'), role: 'user', plan: 'free', credits: 7, suspended: true, company: 'Harbor', createdAt: daysAgo(15), prefs: { theme: 'dark' }, integrations: [], favorites: [] },
    { id: 'u_fatima', name: 'Fatima Zahra', email: 'fatima@cedar.ma', password: hashPassword('password123'), role: 'user', plan: 'business', credits: 19800, suspended: false, company: 'Cedar', createdAt: daysAgo(58), prefs: { theme: 'light' }, integrations: ['notion', 'zapier'], favorites: [] }
  ];

  const conversations = [
    {
      id: 'c_seed1', userId: demoId, title: 'Q4 launch narrative', pinned: true, archived: false, folder: 'Launch',
      toolId: 'marketing-marketing-campaign-generator', model: 'nexai-core', shareId: null, createdAt: daysAgo(0, 3), updatedAt: minutesAgo(24),
      messages: [
        { id: 'm1', role: 'user', content: 'Build a Q4 launch campaign for our new AI analytics product. Audience: ops leaders at 50–500 person SaaS companies. Budget: $40k.', at: daysAgo(0, 3) },
        { id: 'm2', role: 'assistant', content: '## Campaign: “See the signal, skip the noise”\n\n**Positioning.** The only analytics layer that turns product + revenue data into a weekly operating brief for ops leaders.\n\n### Channel mix\n| Channel | Share | Play |\n| --- | --- | --- |\n| LinkedIn ABM | 35% | 120 target accounts, 3-touch sequence from founder |\n| Partner webinar | 25% | Co-host with a RevOps community; live teardown of a real dashboard |\n| Content/SEO | 20% | “Ops brief” template + 4 benchmark posts |\n| Paid retargeting | 20% | Demo-request retargeting on pricing + docs visitors |\n\n### 6-week timeline\n1. **Week 1–2** — ICP list, narrative testing, landing page.\n2. **Week 3** — Webinar + founder LinkedIn series.\n3. **Week 4–5** — ABM sequences, case study, retargeting.\n4. **Week 6** — Demo sprint and launch recap.\n\n**Success metrics:** 45 qualified demos, $310k pipeline, 3.2% ABM reply rate.\n\nWant me to turn this into the actual LinkedIn copy and webinar outline?', at: daysAgo(0, 3) }
      ]
    },
    {
      id: 'c_seed2', userId: demoId, title: 'Churn analysis with pandas', pinned: false, archived: false, folder: 'Analytics',
      toolId: 'developer-code-explanation', model: 'nexai-reason', shareId: 'share_demo_churn', createdAt: daysAgo(1, 5), updatedAt: daysAgo(1, 4),
      messages: [
        { id: 'm1', role: 'user', content: 'Explain this pandas churn analysis and suggest what to check next:\n\ndf.groupby("plan").agg(churn=("churned","mean"), users=("id","nunique"))', at: daysAgo(1, 5) },
        { id: 'm2', role: 'assistant', content: 'This groups customers by plan and computes the churn **rate** alongside cohort size.\n\n### What it tells you\n- `churn=("churned","mean")` treats the 0/1 flag as a rate.\n- `users=("id","nunique")` protects against duplicate rows.\n\n### Check next\n1. **Weight by revenue**, not just users — a small enterprise cohort can dominate ARR impact.\n2. **Time-bound it** — use a 90-day window so older cohorts don’t skew the average.\n3. **Segment by tenure** — churn is usually front-loaded in month 1–2.\n\n```python\nwindow = df[df["signup_at"] >= "2025-01-01"]\nwindow.groupby(["plan", pd.cut(window.tenure_days, [0,30,90,180,365,9999])]).agg(\n    churn=("churned","mean"), users=("id","nunique"), mrr=("mrr","sum")\n)\n```\n\n> Rule of thumb: any churn rate computed on fewer than 30 accounts should be shown as a range, not a single number.', at: daysAgo(1, 4) }
      ]
    },
    {
      id: 'c_seed3', userId: demoId, title: 'Series A investor update', pinned: false, archived: false, folder: 'Fundraising',
      toolId: 'business-business-performance-insights', model: 'nexai-core', shareId: null, createdAt: daysAgo(3, 2), updatedAt: daysAgo(3, 1),
      messages: [{ id: 'm1', role: 'user', content: 'Draft a concise monthly investor update. Highlights: ARR $1.84M (+11% MoM), net retention 118%, 9 new logos, one enterprise churn. Lowlights: sales cycle up from 31 to 42 days.', at: daysAgo(3, 2) },
        { id: 'm2', role: 'assistant', content: '**Subject: Northstar — September update ($1.84M ARR, +11% MoM)**\n\nHi all,\n\n**Highlights**\n- ARR reached **$1.84M**, up 11% month over month.\n- Net revenue retention held at **118%**.\n- Closed **9 new logos**, including 3 in the mid-market.\n\n**Lowlights**\n- Average sales cycle extended from **31 → 42 days** as we move upmarket.\n- One enterprise account churned after an internal reorg (2.1% of ARR).\n\n**Asks**\n- Intros to RevOps leaders at 200–1,000 person SaaS companies.\n- Candidate referrals for a senior AE with enterprise experience.\n\nThanks for the support — reply anytime with questions.\n\nAlex', at: daysAgo(3, 1) }]
    },
    {
      id: 'c_seed4', userId: demoId, title: 'Competitor teardown: Orbit', pinned: false, archived: false, folder: 'Research',
      toolId: 'research-competitor-research', model: 'nexai-research', shareId: null, createdAt: daysAgo(6, 7), updatedAt: daysAgo(6, 6),
      messages: [{ id: 'm1', role: 'user', content: 'Compare Orbit and NexAI for mid-market ops teams. Focus on positioning, pricing and AI depth.', at: daysAgo(6, 7) },
        { id: 'm2', role: 'assistant', content: '## Orbit vs NexAI — mid-market ops\n\n| Dimension | Orbit | NexAI |\n| --- | --- | --- |\n| Positioning | “Dashboarding for ops” | “AI operating system for teams” |\n| Entry price | $49/user | $79/workspace (10 seats) |\n| AI depth | Bolt-on summaries | Native agents + tool routing |\n| Time to value | 2–3 weeks of setup | Same-day with templates |\n\n**Where Orbit wins:** polished chart library and a mature connector catalog.\n\n**Where NexAI wins:** agents that act on the data, not just visualise it; predictable workspace pricing.\n\n**Recommended wedge:** “Your dashboard can’t write the board update. NexAI can.” — target teams already paying for Orbit but exporting to slides.', at: daysAgo(6, 6) }]
    },
    {
      id: 'c_seed5', userId: demoId, title: 'Onboarding email sequence', pinned: false, archived: false, folder: 'Growth',
      toolId: 'marketing-email-marketing-content-generator', model: 'nexai-core', shareId: null, createdAt: daysAgo(9), updatedAt: daysAgo(9),
      messages: [{ id: 'm1', role: 'user', content: 'Write a 4-email onboarding sequence for new NexAI Business trials. Goal: first agent created within 7 days.', at: daysAgo(9) },
        { id: 'm2', role: 'assistant', content: '### Email 1 — Welcome (Day 0)\n**Subject:** Your first NexAI agent is 4 minutes away\nShow the one-screen agent builder. Single CTA: “Build an agent”.\n\n### Email 2 — Quick win (Day 1)\n**Subject:** The report that used to take 3 hours\nShare a 90-second screen recording of a research agent producing a competitor brief.\n\n### Email 3 — Social proof (Day 3)\n**Subject:** How Lumen Labs cut reporting time 62%\nOne metric, one quote, one CTA to a template.\n\n### Email 4 — Nudge (Day 6)\n**Subject:** Want us to build it with you?\nOffer a 20-minute working session. Mention the trial end date and what carries over.', at: daysAgo(9) }]
    },
    {
      id: 'c_seed6', userId: demoId, title: 'Customer support macros', pinned: false, archived: true, folder: 'Support',
      toolId: 'support-ai-generated-support-responses', model: 'nexai-fast', shareId: null, createdAt: daysAgo(13), updatedAt: daysAgo(12),
      messages: [{ id: 'm1', role: 'user', content: 'Draft macros for billing, API rate limits and refund requests.', at: daysAgo(13) },
        { id: 'm2', role: 'assistant', content: 'Saved three macros to your Support workspace: **Billing — invoice mismatch**, **API — 429 rate limit**, **Refund — within 14 days**. Each includes an empathetic opener, resolution steps, and an internal escalation note.', at: daysAgo(12) }]
    }
  ];

  const agents = [
    { id: 'a_research', userId: demoId, name: 'Market Scout', emoji: '🔭', role: 'Research analyst', description: 'Tracks competitors, summarises pricing changes and delivers a Monday brief.', instructions: 'Monitor the competitor list. Summarise pricing, positioning and product changes. Cite every claim. Produce a one-page brief with actions.', model: 'nexai-research', tools: ['web-search', 'documents', 'notion'], schedule: 'Every Monday, 08:00', status: 'active', approved: true, runs: 24, successRate: 96, creditsPerRun: 12, createdAt: daysAgo(80), lastRun: minutesAgo(180), isPublic: false, runsLog: [
      { id: 'r1', at: minutesAgo(180), status: 'success', duration: '1m 42s', summary: '3 competitors changed pricing. Orbit added an AI tier at $89/user.' },
      { id: 'r2', at: daysAgo(7), status: 'success', duration: '2m 08s', summary: 'Weekly brief delivered to Slack #market-intel.' }
    ] },
    { id: 'a_inbox', userId: demoId, name: 'Inbox Chief', emoji: '✉️', role: 'Executive assistant', description: 'Triages email, drafts replies and escalates anything urgent.', instructions: 'Classify incoming email. Draft replies in my tone. Escalate legal, security and investor mail. Never send without approval.', model: 'nexai-fast', tools: ['gmail', 'calendar'], schedule: 'Every weekday, 07:30', status: 'active', approved: true, runs: 61, successRate: 99, creditsPerRun: 4, createdAt: daysAgo(64), lastRun: minutesAgo(48), isPublic: false, runsLog: [
      { id: 'r1', at: minutesAgo(48), status: 'success', duration: '38s', summary: '22 emails triaged · 6 drafts ready · 1 escalation (legal).' },
      { id: 'r2', at: daysAgo(1), status: 'warning', duration: '51s', summary: 'Gmail token expired — reconnected automatically after 12 minutes.' }
    ] },
    { id: 'a_support', userId: demoId, name: 'Support Copilot', emoji: '🎧', role: 'Customer support', description: 'Answers known questions, tags sentiment and hands off complex tickets.', instructions: 'Answer from the knowledge base only. If confidence < 80%, hand off to a human. Always summarise the ticket.', model: 'nexai-core', tools: ['knowledge-base', 'tickets'], schedule: 'Always on', status: 'paused', approved: true, runs: 312, successRate: 91, creditsPerRun: 2, createdAt: daysAgo(120), lastRun: daysAgo(2), isPublic: false, runsLog: [
      { id: 'r1', at: daysAgo(2), status: 'success', duration: '2s', summary: 'Resolved 14 tickets · 3 handed off · CSAT 4.7.' }
    ] },
    { id: 'a_content', userId: demoId, name: 'Content Engine', emoji: '✍️', role: 'Content strategist', description: 'Turns one idea into a blog, newsletter and a week of social posts.', instructions: 'Maintain brand voice. Produce a blog outline, long-form draft, newsletter and 5 social posts. Flag claims that need sources.', model: 'nexai-core', tools: ['web-search', 'notion', 'images'], schedule: 'On demand', status: 'draft', approved: false, runs: 3, successRate: 100, creditsPerRun: 18, createdAt: daysAgo(18), lastRun: daysAgo(15), isPublic: false, runsLog: [] },
    { id: 'a_public_1', userId: 'u_maya', name: 'SEO Brief Builder', emoji: '📈', role: 'SEO strategist', description: 'Builds a search-intent brief with outline, entities and internal links.', instructions: 'Create SEO briefs from a keyword and audience.', model: 'nexai-core', tools: ['web-search'], schedule: 'On demand', status: 'active', approved: true, runs: 1284, successRate: 97, creditsPerRun: 6, createdAt: daysAgo(200), isPublic: true, author: 'Maya Chen', installs: 412, rating: 4.8, category: 'Marketing', runsLog: [] },
    { id: 'a_public_2', userId: 'u_priya', name: 'Contract Reviewer', emoji: '⚖️', role: 'Legal ops', description: 'Flags unusual clauses, missing terms and renewal risk in contracts.', instructions: 'Review contracts against a checklist. Flag risk and cite clauses.', model: 'nexai-reason', tools: ['documents'], schedule: 'On demand', status: 'active', approved: true, runs: 642, successRate: 94, creditsPerRun: 14, createdAt: daysAgo(160), isPublic: true, author: 'Priya Nair', installs: 188, rating: 4.7, category: 'Operations', runsLog: [] },
    { id: 'a_public_3', userId: 'u_maya', name: 'Data Storyteller', emoji: '📊', role: 'Analyst', description: 'Turns a CSV into a board-ready narrative with charts and actions.', instructions: 'Analyse the dataset and write an executive narrative.', model: 'nexai-reason', tools: ['csv', 'charts'], schedule: 'On demand', status: 'active', approved: true, runs: 908, successRate: 98, creditsPerRun: 9, createdAt: daysAgo(140), isPublic: true, author: 'Maya Chen', installs: 356, rating: 4.9, category: 'Analytics', runsLog: [] },
    { id: 'a_public_4', userId: 'u_sam', name: 'Job Hunt Coach', emoji: '🎯', role: 'Career coach', description: 'Tailors CVs, drafts outreach and prepares interview answers.', instructions: 'Coach the candidate with tailored CV bullets and interview prep.', model: 'nexai-core', tools: ['documents'], schedule: 'On demand', status: 'active', approved: true, runs: 431, successRate: 92, creditsPerRun: 5, createdAt: daysAgo(90), isPublic: true, author: 'Sam Rivera', installs: 97, rating: 4.5, category: 'Education', runsLog: [] },
    { id: 'a_public_5', userId: 'u_priya', name: 'Finance Close Assistant', emoji: '🧾', role: 'Finance ops', description: 'Checks invoices, flags duplicates and prepares the monthly close.', instructions: 'Reconcile invoices and prepare a close checklist.', model: 'nexai-reason', tools: ['documents', 'sheets'], schedule: 'Monthly, last Friday', status: 'active', approved: true, runs: 214, successRate: 96, creditsPerRun: 16, createdAt: daysAgo(70), isPublic: true, author: 'Priya Nair', installs: 143, rating: 4.6, category: 'Finance', runsLog: [] },
    { id: 'a_public_6', userId: 'u_maya', name: 'Meeting to Action', emoji: '🗂️', role: 'Project manager', description: 'Converts meeting notes into owners, dates and a follow-up draft.', instructions: 'Extract decisions, owners and dates from notes.', model: 'nexai-fast', tools: ['calendar', 'notion'], schedule: 'On demand', status: 'active', approved: true, runs: 2201, successRate: 99, creditsPerRun: 2, createdAt: daysAgo(110), isPublic: true, author: 'Maya Chen', installs: 731, rating: 4.9, category: 'Productivity', runsLog: [] }
  ];

  const prompts = [
    { id: 'p1', userId: 'u_maya', title: 'Ruthless editor', category: 'Writing', description: 'Cuts 30% of the words without losing meaning.', body: 'You are a ruthless editor. Cut at least 30% of the words while preserving every fact and the author’s voice. Return the edited text, then a short list of what you cut and why.', isPublic: true, uses: 2841, tags: ['editing', 'writing'] },
    { id: 'p2', userId: demoId, title: 'Weekly operating brief', category: 'Business', description: 'Turns metrics into a one-page operating review.', body: 'You are a COO. Using the metrics below, produce a one-page weekly operating brief: headline, wins, risks, decisions needed, and next week’s top three priorities. Be specific and quantify impact.\n\nMetrics:\n{{metrics}}', isPublic: true, uses: 1912, tags: ['ops', 'reporting'] },
    { id: 'p3', userId: 'u_priya', title: 'Contract red-flag scan', category: 'Documents', description: 'Finds unusual clauses and missing protections.', body: 'Review this contract for unusual or risky clauses. For each finding give: clause reference, risk level, plain-English explanation and suggested redline. Then list standard protections that are missing.', isPublic: true, uses: 987, tags: ['legal', 'contracts'] },
    { id: 'p4', userId: 'u_sam', title: 'Explain like a staff engineer', category: 'Developer', description: 'Deep technical explanation with trade-offs.', body: 'Explain the following as a staff engineer onboarding a senior developer: what it does, why it exists, the trade-offs, failure modes, and one production gotcha. Code:\n\n{{code}}', isPublic: true, uses: 1560, tags: ['code', 'explain'] },
    { id: 'p5', userId: demoId, title: 'Launch narrative workshop', category: 'Marketing', description: 'Pressure-tests a product narrative in 5 steps.', body: 'Act as a positioning strategist. Ask me up to 5 sharp questions, one at a time, about audience, alternative, differentiation, proof and urgency. Then write a one-sentence narrative and three supporting messages.', isPublic: true, uses: 743, tags: ['positioning', 'launch'] },
    { id: 'p6', userId: 'u_maya', title: 'Socratic tutor', category: 'Education', description: 'Teaches by questions instead of answers.', body: 'Be a Socratic tutor. Do not give the answer. Ask one question at a time, wait for my reply, and guide me to the solution. If I am stuck twice, give a small hint. Topic: {{topic}}', isPublic: true, uses: 3120, tags: ['learning', 'tutor'] },
    { id: 'p7', userId: 'u_priya', title: 'Board update in 200 words', category: 'Business', description: 'Compresses a month into a crisp board note.', body: 'Write a 200-word board update from these notes. Lead with the number that matters most. Include one risk and one ask. No adjectives without evidence.\n\nNotes: {{notes}}', isPublic: true, uses: 611, tags: ['board', 'summary'] },
    { id: 'p8', userId: demoId, title: 'Persona stress test', category: 'Marketing', description: 'Reads copy as three different buyers.', body: 'Review this copy as three buyers: a skeptical CFO, a hands-on operator and an impatient founder. For each, give first reaction, objection and one fix. Then rewrite the headline three ways.\n\nCopy: {{copy}}', isPublic: true, uses: 488, tags: ['copy', 'personas'] },
    { id: 'p9', userId: 'u_maya', title: 'Data story in 5 beats', category: 'Analytics', description: 'Turns analysis into a narrative arc.', body: 'Turn this analysis into a five-beat data story: context, tension, evidence, insight, action. Keep it non-technical and name the decision the audience should make.\n\nAnalysis: {{analysis}}', isPublic: true, uses: 902, tags: ['data', 'storytelling'] },
    { id: 'p10', userId: 'u_sam', title: 'Interview answer coach', category: 'Education', description: 'Builds STAR answers with follow-ups.', body: 'Help me build a STAR answer for this interview question. Ask for missing details, then produce a 90-second answer and three likely follow-ups with strong responses. Question: {{question}}', isPublic: true, uses: 1344, tags: ['career', 'interview'] },
    { id: 'p11', userId: demoId, title: 'Agent spec writer', category: 'Automation', description: 'Turns a vague automation into a buildable spec.', body: 'Convert this automation idea into an agent spec: goal, trigger, inputs, tools, step-by-step workflow, guardrails, approval points, success metric and failure handling.\n\nIdea: {{idea}}', isPublic: true, uses: 374, tags: ['agents', 'spec'] },
    { id: 'p12', userId: 'u_priya', title: 'Security review', category: 'Developer', description: 'Threat-models a design or endpoint.', body: 'Threat-model the following design. List assets, actors, entry points, top 5 threats with likelihood/impact, and concrete mitigations. Note anything that would fail a SOC 2 review.\n\nDesign: {{design}}', isPublic: true, uses: 521, tags: ['security', 'review'] }
  ];

  const projects = [
    { id: 'pr1', userId: demoId, name: 'Q4 Launch', description: 'Campaign, landing page and sales enablement for the analytics launch.', color: '#6366f1', icon: '🚀', status: 'active', progress: 68, members: 5, items: 24, updatedAt: minutesAgo(35), createdAt: daysAgo(30) },
    { id: 'pr2', userId: demoId, name: 'Market Intelligence', description: 'Competitor tracking, pricing monitors and the Monday brief.', color: '#0ea5e9', icon: '🔭', status: 'active', progress: 82, members: 3, items: 11, updatedAt: minutesAgo(180), createdAt: daysAgo(80) },
    { id: 'pr3', userId: demoId, name: 'Support Automation', description: 'Deflection, macros and handover rules for the support team.', color: '#f59e0b', icon: '🎧', status: 'active', progress: 41, members: 4, items: 18, updatedAt: daysAgo(1), createdAt: daysAgo(22) },
    { id: 'pr4', userId: demoId, name: 'Series A Materials', description: 'Deck, model and investor update cadence.', color: '#10b981', icon: '📈', status: 'review', progress: 91, members: 2, items: 9, updatedAt: daysAgo(3), createdAt: daysAgo(60) },
    { id: 'pr5', userId: demoId, name: 'Brand Refresh', description: 'Identity, site and social system for 2027.', color: '#ec4899', icon: '🎨', status: 'planning', progress: 12, members: 6, items: 31, updatedAt: daysAgo(6), createdAt: daysAgo(12) }
  ];

  const files = [
    { id: 'f1', userId: demoId, name: 'Q4-campaign-brief.pdf', type: 'PDF', size: 1843200, pages: 12, projectId: 'pr1', source: 'upload', createdAt: daysAgo(2), summary: 'Launch brief with audience, channel mix, budget split and messaging hierarchy.' },
    { id: 'f2', userId: demoId, name: 'churn-cohorts.xlsx', type: 'Excel', size: 482000, pages: 3, projectId: 'pr2', source: 'upload', createdAt: daysAgo(4), summary: 'Monthly churn by plan and tenure cohort, 18 months of data.' },
    { id: 'f3', userId: demoId, name: 'competitor-pricing.xlsx', type: 'Excel', size: 210400, pages: 2, projectId: 'pr2', source: 'upload', createdAt: daysAgo(6), summary: 'Pricing and packaging comparison across six competitors.' },
    { id: 'f4', userId: demoId, name: 'investor-update-sep.docx', type: 'Word', size: 96400, pages: 2, projectId: 'pr4', source: 'generated', createdAt: daysAgo(3), summary: 'Monthly investor update with ARR, retention and asks.' },
    { id: 'f5', userId: demoId, name: 'support-macros.md', type: 'Markdown', size: 24100, pages: 1, projectId: 'pr3', source: 'generated', createdAt: daysAgo(12), summary: 'Billing, API and refund macros with escalation notes.' },
    { id: 'f6', userId: demoId, name: 'brand-voice-guide.pdf', type: 'PDF', size: 2410000, pages: 28, projectId: 'pr5', source: 'upload', createdAt: daysAgo(9), summary: 'Voice principles, tone spectrum and channel-specific examples.' }
  ];

  const tickets = [
    { id: 't_4821', userId: demoId, customer: 'Elena Rossi', company: 'Fable', subject: 'Invoice shows the old plan', status: 'open', priority: 'high', sentiment: 'negative', channel: 'email', createdAt: minutesAgo(42), messages: 4, csat: null },
    { id: 't_4820', userId: demoId, customer: 'Marcus Webb', company: 'Kestrel', subject: 'API returns 429 on batch jobs', status: 'open', priority: 'urgent', sentiment: 'negative', channel: 'chat', createdAt: minutesAgo(88), messages: 7, csat: null },
    { id: 't_4819', userId: demoId, customer: 'Aiko Tanaka', company: 'Mono', subject: 'How do I export a conversation?', status: 'pending', priority: 'normal', sentiment: 'neutral', channel: 'email', createdAt: minutesAgo(220), messages: 2, csat: null },
    { id: 't_4818', userId: demoId, customer: 'Liam O’Connor', company: 'Northwind', subject: 'Agent created duplicate drafts', status: 'open', priority: 'high', sentiment: 'negative', channel: 'chat', createdAt: minutesAgo(310), messages: 5, csat: null },
    { id: 't_4817', userId: demoId, customer: 'Sofia Alvarez', company: 'Brightline', subject: 'Loving the new analytics view', status: 'resolved', priority: 'low', sentiment: 'positive', channel: 'chat', createdAt: daysAgo(1), messages: 3, csat: 5 },
    { id: 't_4816', userId: demoId, customer: 'Noah Kim', company: 'Parcel', subject: 'SSO setup for enterprise', status: 'resolved', priority: 'normal', sentiment: 'neutral', channel: 'email', createdAt: daysAgo(2), messages: 9, csat: 4 },
    { id: 't_4815', userId: demoId, customer: 'Grace Miller', company: 'Tandem', subject: 'Voice studio cuts off at 30s', status: 'pending', priority: 'normal', sentiment: 'neutral', channel: 'chat', createdAt: daysAgo(2), messages: 6, csat: null },
    { id: 't_4814', userId: demoId, customer: 'Omar Haddad', company: 'Vela', subject: 'Refund request — duplicate charge', status: 'resolved', priority: 'high', sentiment: 'negative', channel: 'email', createdAt: daysAgo(4), messages: 8, csat: 3 }
  ];

  const notifications = [
    { id: 'n1', userId: demoId, type: 'agent', title: 'Market Scout finished its run', body: '3 competitors changed pricing. Brief delivered to Slack.', read: false, at: minutesAgo(180), href: '/agents' },
    { id: 'n2', userId: demoId, type: 'billing', title: 'Business plan renews in 6 days', body: 'Your card ending 4242 will be charged $79.00.', read: false, at: minutesAgo(400), href: '/billing' },
    { id: 'n3', userId: demoId, type: 'usage', title: 'You’re at 8% of monthly credits', body: '18,450 of 20,000 credits remaining. Nice pace.', read: true, at: daysAgo(1), href: '/usage' },
    { id: 'n4', userId: demoId, type: 'system', title: 'New model: NexAI Reason', body: 'Now available to Business and Enterprise workspaces.', read: true, at: daysAgo(2), href: '/models' },
    { id: 'n5', userId: demoId, type: 'support', title: 'Ticket #4820 escalated', body: 'API 429 on batch jobs — urgent, assigned to you.', read: false, at: minutesAgo(88), href: '/support' },
    { id: 'n6', userId: demoId, type: 'team', title: 'Maya joined Market Intelligence', body: 'She now has edit access to 4 project files.', read: true, at: daysAgo(3), href: '/team' }
  ];

  const apiKeys = [
    { id: 'k1', userId: demoId, name: 'Production', prefix: 'nx_live_7f3a', lastFour: '9c21', scopes: ['chat', 'agents'], lastUsed: minutesAgo(12), createdAt: daysAgo(90), active: true },
    { id: 'k2', userId: demoId, name: 'Local dev', prefix: 'nx_test_1b8e', lastFour: '4d02', scopes: ['chat'], lastUsed: daysAgo(2), createdAt: daysAgo(40), active: true }
  ];

  const usage = [];
  let seedNum = 7;
  const rand = () => { seedNum = (seedNum * 9301 + 49297) % 233280; return seedNum / 233280; };
  const moduleMix = [
    ['chat', 'chat-ai-powered-conversational-chatbot', 1], ['writing', 'writing-blog-post-generator', 2],
    ['research', 'research-ai-powered-web-research', 3], ['analytics', 'analytics-natural-language-data-queries', 4],
    ['image', 'image-text-to-image-generation', 5], ['agents', 'agents-custom-ai-agent-creation', 6],
    ['documents', 'documents-document-summarization', 3], ['developer', 'developer-ai-code-generation', 2],
    ['marketing', 'marketing-social-media-content-generator', 2], ['voice', 'voice-text-to-speech', 1],
    ['video', 'video-video-script-generation', 5], ['education', 'education-ai-personal-tutor', 1]
  ];
  for (let d = 59; d >= 0; d--) {
    const base = 3 + Math.floor(rand() * 7);
    for (let i = 0; i < base; i++) {
      const [moduleId, toolId, cost] = moduleMix[Math.floor(rand() * moduleMix.length)];
      usage.push({
        id: uid('usg'), userId: demoId, kind: moduleId, moduleId, toolId,
        credits: cost + Math.floor(rand() * 3), tokens: 800 + Math.floor(rand() * 5200),
        at: new Date(now - d * 86400000 - Math.floor(rand() * 80000000)).toISOString()
      });
    }
  }
  for (let d = 29; d >= 0; d--) {
    for (const [userId, moduleId] of [['u_maya', 'marketing'], ['u_maya', 'writing'], ['u_priya', 'analytics'], ['u_priya', 'documents'], ['u_sam', 'chat']]) {
      if (rand() > 0.35) usage.push({
        id: uid('usg'), userId, kind: moduleId, moduleId, toolId: '', credits: 1 + Math.floor(rand() * 5),
        tokens: 500 + Math.floor(rand() * 3000), at: new Date(now - d * 86400000).toISOString()
      });
    }
  }

  const docs = [
    { id: 'd1', userId: demoId, name: 'Q4-campaign-brief.pdf', type: 'PDF', chars: 18420, summary: 'A 12-page launch brief covering audience, channel mix, budget and messaging.', createdAt: daysAgo(2) },
    { id: 'd2', userId: demoId, name: 'vendor-agreement.docx', type: 'Word', chars: 28110, summary: 'Vendor agreement with auto-renewal and a 60-day termination clause.', createdAt: daysAgo(5) }
  ];

  const images = [
    { id: 'img1', userId: demoId, prompt: 'Isometric analytics workspace, indigo and mint, soft studio light', style: '3D render', aspect: '16:9', svg: generateArt({ prompt: 'Isometric analytics workspace, indigo and mint, soft studio light', style: '3D render', aspect: '16:9', seed: 11 }), createdAt: daysAgo(1) },
    { id: 'img2', userId: demoId, prompt: 'Minimal launch poster, bold typography, deep navy and electric violet', style: 'Minimal', aspect: '4:5', svg: generateArt({ prompt: 'Minimal launch poster, bold typography, deep navy and electric violet', style: 'Minimal', aspect: '4:5', seed: 22 }), createdAt: daysAgo(2) },
    { id: 'img3', userId: demoId, prompt: 'Cinematic product hero, glass surfaces, violet rim light', style: 'Cinematic', aspect: '16:9', svg: generateArt({ prompt: 'Cinematic product hero, glass surfaces, violet rim light', style: 'Cinematic', aspect: '16:9', seed: 33 }), createdAt: daysAgo(3) },
    { id: 'img4', userId: demoId, prompt: 'Editorial portrait of a founder, warm light, quiet confidence', style: 'Editorial', aspect: '4:5', svg: generateArt({ prompt: 'Editorial portrait of a founder, warm light, quiet confidence', style: 'Editorial', aspect: '4:5', seed: 44 }), createdAt: daysAgo(5) }
  ];

  const seedBoard = storyboard({ prompt: '60 second product launch for NexAI Analytics', style: 'Cinematic', duration: 60 });
  const videos = [
    { id: 'v1', userId: demoId, prompt: '60 second product launch for NexAI Analytics', style: 'Cinematic', duration: 60, title: seedBoard.title, scenes: seedBoard.scenes.length, board: seedBoard, createdAt: daysAgo(1) }
  ];

  const audit = [
    { id: uid('aud'), userId: demoId, actor: 'Alex Morgan', action: 'Enabled two-factor authentication', ip: '82.14.22.9', at: daysAgo(2) },
    { id: uid('aud'), userId: demoId, actor: 'Alex Morgan', action: 'Created API key “Local dev”', ip: '82.14.22.9', at: daysAgo(40) },
    { id: uid('aud'), userId: 'u_maya', actor: 'Maya Chen', action: 'Installed agent “SEO Brief Builder”', ip: '91.108.4.17', at: daysAgo(1) },
    { id: uid('aud'), userId: 'u_sam', actor: 'Sam Rivera', action: 'Failed sign-in attempt', ip: '45.77.182.3', at: daysAgo(1) },
    { id: uid('aud'), userId: demoId, actor: 'System', action: 'Nightly backup completed', ip: 'internal', at: daysAgo(1) }
  ];

  return {
    version: 1, seededAt: new Date().toISOString(),
    users, conversations, agents, prompts, projects, files, tickets, notifications, apiKeys, usage, docs, images, videos, audit,
    sources: [], datasets: [],
    coupons: [
      { code: 'LAUNCH30', percent: 30, uses: 214, maxUses: 1000, expires: '2027-01-31', active: true },
      { code: 'TEAM20', percent: 20, uses: 98, maxUses: 500, expires: '2027-06-30', active: true },
      { code: 'FOUNDER50', percent: 50, uses: 47, maxUses: 50, expires: '2026-12-31', active: true }
    ]
  };
}

function load() {
  try {
    if (fs.existsSync(FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      if (parsed && parsed.users) return parsed;
    }
  } catch (e) {
    console.warn('Could not read data file, reseeding:', e.message);
  }
  const fresh = seed();
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(fresh, null, 2));
  return fresh;
}

export const db = load();
export function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}
export function resetDemoData() {
  const fresh = seed();
  Object.keys(db).forEach(k => delete db[k]);
  Object.assign(db, fresh);
  save();
  return db;
}
export const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, plan: u.plan, credits: u.credits, role: u.role,
  company: u.company, jobTitle: u.jobTitle, avatar: u.avatar, twoFactor: !!u.twoFactor,
  timezone: u.timezone, language: u.language, systemPrompt: u.systemPrompt || '',
  prefs: u.prefs || {}, integrations: u.integrations || [], favorites: u.favorites || [],
  createdAt: u.createdAt
});
