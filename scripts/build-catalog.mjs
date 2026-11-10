/**
 * NexAI feature catalog generator.
 * Source of truth for the 370-feature blueprint. Run: node scripts/build-catalog.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const modules = [
  {
    id: 'chat', name: 'AI Chat & Assistant', short: 'Chat', icon: 'chat', group: 'main',
    blurb: 'A conversational assistant with memory, sessions, sharing and full control.',
    features: [
      'AI-powered conversational chatbot', 'Real-time AI responses', 'Multiple AI conversation sessions',
      'Conversation history', 'Conversation search', 'Rename conversations', 'Archive conversations',
      'Delete conversations', 'Pin important conversations', 'Organize conversations into folders',
      'Continue previous conversations', 'Regenerate AI responses', 'Stop AI generation',
      'Edit previous prompts', 'Copy AI responses', 'Share conversations using links',
      'Export conversations to PDF', 'Export conversations to Word', 'Custom AI response length',
      'Custom AI response tone'
    ]
  },
  {
    id: 'intelligence', name: 'Advanced Intelligence', short: 'Intelligence', icon: 'brain', group: 'main',
    blurb: 'Model routing, reasoning, memory and grounded answers with citations.',
    features: [
      'Multiple AI model integration', 'Model switching', 'Automatic model selection', 'Advanced reasoning mode',
      'Deep research mode', 'Web-connected AI search', 'Context-aware responses', 'Long-context conversations',
      'Personal memory', 'User preference learning', 'Custom system instructions', 'AI personality customization',
      'Role-based AI assistants', 'Multi-language understanding', 'Automatic language detection',
      'Translation between languages', 'Contextual recommendations', 'Follow-up question suggestions',
      'AI response confidence indicators', 'Source citations and references'
    ]
  },
  {
    id: 'writing', name: 'AI Writing', short: 'Writing', icon: 'pen', group: 'main',
    blurb: 'Draft, rewrite and polish anything — from emails to entire books.',
    features: [
      'Blog post generator', 'Article generator', 'Essay generator', 'Business proposal generator',
      'Professional email generator', 'Cover letter generator', 'CV and resume generator',
      'Social media caption generator', 'Product description generator', 'Website content generator',
      'Marketing copy generator', 'Advertisement generator', 'Press release generator', 'Report generator',
      'Meeting summary generator', 'Speech generator', 'Story generator', 'Book chapter generator',
      'Academic writing assistant', 'Text rewriting and paraphrasing'
    ]
  },
  {
    id: 'documents', name: 'Documents & PDF', short: 'Documents', icon: 'file', group: 'main',
    blurb: 'Read, extract, compare and generate from PDFs, Office files and scans.',
    features: [
      'PDF upload and analysis', 'Word document analysis', 'Excel file analysis', 'PowerPoint analysis',
      'Document summarization', 'Ask questions about documents', 'Extract information from documents',
      'Compare multiple documents', 'Generate documents using AI', 'PDF to Word conversion',
      'Word to PDF conversion', 'Document translation', 'Grammar correction', 'Document formatting assistance',
      'AI contract analysis', 'Invoice data extraction', 'Resume analysis', 'Document classification',
      'OCR text recognition', 'Document chat workspace'
    ]
  },
  {
    id: 'image', name: 'Image Studio', short: 'Images', icon: 'image', group: 'main',
    blurb: 'Generate, edit and upscale visuals with a full creative studio.',
    features: [
      'Text-to-image generation', 'Image-to-image generation', 'AI image editing', 'Background removal',
      'Background replacement', 'Image upscaling', 'Image enhancement', 'Image restoration', 'Object removal',
      'Object replacement', 'AI logo generation', 'AI poster generation', 'AI banner generation',
      'AI thumbnail generation', 'AI product photography', 'AI avatar generation', 'AI portrait generation',
      'Image style transformation', 'Image variation generation', 'Image generation history and gallery'
    ]
  },
  {
    id: 'video', name: 'Video Studio', short: 'Video', icon: 'film', group: 'main',
    blurb: 'Go from idea to storyboard, script, subtitles and a publish-ready cut.',
    features: [
      'Text-to-video generation', 'Image-to-video generation', 'AI video editing', 'Video summarization',
      'Video transcription', 'Automatic subtitles', 'Subtitle translation', 'AI voiceovers',
      'Video background removal', 'AI scene generation', 'Video script generation', 'YouTube video ideas',
      'YouTube description generation', 'Video title generation', 'Short-form video creation',
      'AI talking avatars', 'Video scene detection', 'Video highlights extraction',
      'Video translation and dubbing', 'Video export management'
    ]
  },
  {
    id: 'voice', name: 'Voice & Audio', short: 'Voice', icon: 'mic', group: 'main',
    blurb: 'Speak, transcribe, translate and produce studio-quality audio.',
    features: [
      'Text-to-speech', 'Speech-to-text', 'AI voice assistant', 'Voice conversations with AI', 'Multiple AI voices',
      'Voice speed adjustment', 'Voice tone adjustment', 'Audio transcription', 'Audio summarization',
      'Audio translation', 'Meeting transcription', 'Speaker identification', 'Audio noise reduction',
      'Audio enhancement', 'Podcast script generation', 'Podcast summarization', 'AI podcast generation',
      'Voice command navigation', 'Voice note management', 'Audio file export'
    ]
  },
  {
    id: 'developer', name: 'Developer Tools', short: 'Code', icon: 'code', group: 'main',
    blurb: 'Generate, explain, review and ship code across your whole stack.',
    features: [
      'AI code generation', 'Code explanation', 'Code debugging assistance', 'Code refactoring', 'Code completion',
      'Code optimization suggestions', 'Code translation between programming languages', 'Generate HTML and CSS',
      'Generate React components', 'Generate backend APIs', 'Generate SQL queries', 'Database schema generation',
      'Generate unit tests', 'Generate API documentation', 'Git commit message generation', 'Error log analysis',
      'Regex generator', 'Algorithm explanation', 'Code review assistance', 'AI project scaffolding'
    ]
  },
  {
    id: 'research', name: 'AI Research', short: 'Research', icon: 'globe', group: 'main',
    blurb: 'Search, verify and synthesise knowledge with cited sources.',
    features: [
      'AI-powered web research', 'Search engine integration', 'Research report generation',
      'Academic paper summarization', 'Research source discovery', 'Citation generation',
      'Fact-checking assistance', 'Topic exploration', 'Compare research findings', 'Scientific concept explanation',
      'Research workspace', 'Save research sources', 'Knowledge base creation', 'Ask questions across saved sources',
      'Website content analysis', 'URL summarization', 'News summarization', 'Trend discovery',
      'Competitor research', 'Automated research briefs'
    ]
  },
  {
    id: 'business', name: 'Business AI', short: 'Business', icon: 'briefcase', group: 'main',
    blurb: 'Plan, analyse and run the business with an AI chief of staff.',
    features: [
      'Business plan generator', 'Business name generator', 'Business idea generator', 'SWOT analysis generator',
      'Market research assistant', 'Business strategy assistant', 'Financial report analysis', 'Sales report analysis',
      'Customer feedback analysis', 'Business email automation', 'Invoice generation', 'Proposal generation',
      'Project planning assistant', 'Task management assistant', 'Daily productivity planner',
      'Goal tracking assistant', 'Business meeting assistant', 'Meeting agenda generator', 'Workflow recommendations',
      'Business performance insights'
    ]
  },
  {
    id: 'agents', name: 'AI Agents & Automation', short: 'Agents', icon: 'bot', group: 'main',
    blurb: 'Build no-code agents that research, write, reply and execute for you.',
    features: [
      'Custom AI agent creation', 'No-code AI agent builder', 'Drag-and-drop agent workflow editor',
      'Custom agent instructions', 'Agent personality configuration', 'Agent knowledge base integration',
      'Agent tool integration', 'Multiple agents working together', 'AI agent task scheduling',
      'Autonomous task execution with user authorization', 'Agent task history', 'Agent execution monitoring',
      'Agent performance analytics', 'Agent error reporting', 'Agent approval workflows',
      'Agent communication with external APIs', 'Agent email assistant', 'Agent research assistant',
      'Agent customer support assistant', 'Agent marketplace'
    ]
  },
  {
    id: 'education', name: 'Education & Learning', short: 'Education', icon: 'book', group: 'main',
    blurb: 'A personal tutor for every subject, level and learning style.',
    features: [
      'AI personal tutor', 'AI homework assistant', 'AI mathematics solver', 'Step-by-step problem explanations',
      'AI quiz generator', 'AI examination generator', 'Flashcard generation', 'Study timetable generator',
      'Learning progress tracking', 'AI language tutor', 'Vocabulary learning assistant', 'Grammar learning assistant',
      'Programming tutor', 'Science tutor', 'History tutor', 'AI lesson plan generator',
      'AI teaching material generator', 'Automatic grading assistance', 'Personalized learning recommendations',
      'Student performance analysis'
    ]
  },
  {
    id: 'marketing', name: 'Marketing & Social', short: 'Marketing', icon: 'megaphone', group: 'main',
    blurb: 'Create campaigns, content and calendar across every channel.',
    features: [
      'Social media content generator', 'Instagram post generator', 'Facebook post generator',
      'LinkedIn content generator', 'X post generator', 'TikTok script generator', 'YouTube script generator',
      'Social media calendar generator', 'Hashtag generator', 'Marketing campaign generator',
      'Email marketing content generator', 'Advertisement copy generator', 'Product promotion ideas',
      'Brand identity generator', 'Brand slogan generator', 'Marketing strategy assistant', 'Audience persona generator',
      'Customer segmentation insights', 'Social media analytics assistant', 'Competitor social media analysis'
    ]
  },
  {
    id: 'analytics', name: 'Data Analytics', short: 'Analytics', icon: 'chart', group: 'main',
    blurb: 'Upload data, ask in plain English and get charts, forecasts and insights.',
    features: [
      'Upload and analyze CSV files', 'Upload and analyze Excel spreadsheets', 'Natural language data queries',
      'AI-generated charts', 'AI-generated dashboards', 'Automatic data cleaning suggestions',
      'Missing data detection', 'Duplicate data detection', 'Data pattern recognition', 'Statistical analysis',
      'Predictive analytics', 'Sales forecasting', 'Revenue forecasting', 'Customer behavior analysis',
      'Data comparison', 'Automated data reports', 'Interactive visualizations', 'Database query assistant',
      'KPI monitoring', 'Anomaly detection'
    ]
  },
  {
    id: 'support', name: 'Customer Support', short: 'Support', icon: 'headset', group: 'main',
    blurb: 'Resolve tickets faster with AI replies, triage and sentiment.',
    features: [
      'AI customer support chatbot', 'Website chatbot integration', 'WhatsApp chatbot integration',
      'Telegram chatbot integration', 'Facebook Messenger integration', 'Automated customer responses',
      'Customer inquiry classification', 'Ticket management', 'Ticket prioritization', 'Customer sentiment analysis',
      'Frequently asked questions generator', 'Knowledge base chatbot', 'Multilingual customer support',
      'Live human-agent handover', 'Customer conversation history', 'Automated support summaries',
      'Customer satisfaction analysis', 'Support performance analytics', 'AI-generated support responses',
      'Customer support automation rules'
    ]
  },
  {
    id: 'finance', name: 'Personal Finance', short: 'Finance', icon: 'wallet', group: 'main',
    blurb: 'Budget, track and forecast money with an AI financial planner.',
    features: [
      'Personal budget assistant', 'Expense categorization', 'Spending analysis', 'Savings plan generator',
      'Financial goal planning', 'Monthly financial summaries', 'Invoice analysis', 'Receipt scanning',
      'Subscription tracking', 'Bill reminder assistant', 'Financial spreadsheet analysis', 'Cash flow analysis',
      'Business expense analysis', 'Tax document organization', 'Financial education assistant',
      'Investment concept explanations', 'Loan repayment calculators', 'Budget recommendations',
      'Financial report generation', 'Financial data visualization'
    ]
  },
  {
    id: 'platform', name: 'Platform & UX', short: 'Platform', icon: 'layout', group: 'workspace',
    blurb: 'The professional SaaS foundation: auth, themes, search and collaboration.',
    features: [
      'Modern AI dashboard', 'User registration and login', 'Google authentication', 'Two-factor authentication',
      'User profile management', 'Profile picture upload', 'Customizable user preferences', 'Light mode', 'Dark mode',
      'Multi-language interface', 'Responsive mobile interface', 'Progressive Web App support', 'Global search',
      'Notifications center', 'Keyboard shortcuts', 'User activity history', 'Favorites and bookmarks',
      'Workspace management', 'Team collaboration', 'Real-time synchronization'
    ]
  },
  {
    id: 'admin', name: 'Admin & Enterprise', short: 'Admin', icon: 'shield', group: 'workspace',
    blurb: 'Control users, plans, billing, security and platform health.',
    features: [
      'Super admin dashboard', 'User management', 'User suspension and activation', 'Role-based access control',
      'Subscription management', 'Free subscription plan', 'Pro subscription plan', 'Business subscription plan',
      'Enterprise subscription plan', 'Usage-based billing', 'AI credit management', 'Payment gateway integration',
      'Subscription renewal management', 'Payment transaction history', 'Discount and coupon management',
      'Referral program', 'Affiliate management', 'System usage analytics', 'API key management',
      'Audit logs and security monitoring'
    ]
  },
  {
    id: 'bonus', name: 'Advanced & Enterprise AI', short: 'Advanced', icon: 'star', group: 'workspace',
    blurb: 'Fine-tuning, BYOK, public APIs, webhooks and private deployments.',
    features: [
      'Custom AI model fine-tuning', 'Private organization-specific AI models', 'Bring Your Own API Key (BYOK)',
      'AI model usage comparison', 'AI prompt library and marketplace', 'Custom AI application builder',
      'Public AI API for developers', 'Webhook integrations', 'AI usage and cost optimization',
      'Enterprise data isolation and private deployments'
    ]
  }
];

const KIND = {
  image: 'image', video: 'video', voice: 'voice', documents: 'doc', developer: 'code',
  analytics: 'data', agents: 'agent', admin: 'admin', platform: 'settings', bonus: 'chat'
};

const ROUTE = {
  chat: 'chat', intelligence: 'models', writing: 'chat', documents: 'documents', image: 'image',
  video: 'video', voice: 'voice', developer: 'developer', research: 'research', business: 'business',
  agents: 'agents', education: 'education', marketing: 'marketing', analytics: 'analytics',
  support: 'support', finance: 'finance', platform: 'settings', admin: 'admin', bonus: 'features'
};

const DESC = {
  chat: n => `Your assistant handles ${n} seamlessly inside every conversation.`,
  intelligence: n => `Powers smarter conversations with ${n} across every model and workspace.`,
  writing: n => `Generate ${n} tuned to your audience, tone and goal — ready to edit and publish.`,
  documents: n => `Work with ${n} directly on your files, with structured AI output.`,
  image: n => `Create striking visuals with ${n}, powered by the NexAI image engine.`,
  video: n => `Plan, edit and publish video with ${n} in the NexAI video studio.`,
  voice: n => `Capture, transform and deliver audio with ${n}.`,
  developer: n => `Ship faster with ${n}, from prompt to production-ready code.`,
  research: n => `Find, verify and synthesise knowledge with ${n}.`,
  business: n => `Make sharper decisions with ${n}, built for modern teams.`,
  agents: n => `Automate real work with ${n} — no code required.`,
  education: n => `Learn anything with ${n}, adapted to your pace and level.`,
  marketing: n => `Grow your audience with ${n}, from idea to campaign.`,
  analytics: n => `Turn raw data into decisions with ${n}.`,
  support: n => `Delight customers at scale with ${n}.`,
  finance: n => `Stay in control of money with ${n}.`,
  platform: n => `A polished, secure SaaS experience with ${n}.`,
  admin: n => `Run NexAI with confidence using ${n}.`,
  bonus: n => `Go beyond off-the-shelf AI with ${n}.`
};

const STYLE = {
  writing: 'Write like a senior editor. Use clear structure, strong headings, concrete detail and a confident, human voice.',
  documents: 'Act as a meticulous document analyst. Quote exact evidence, preserve structure and never invent facts.',
  research: 'Act as a rigorous research analyst. Separate fact from inference, cite sources when available and flag uncertainty.',
  education: 'Act as a patient, encouraging tutor. Explain step by step, use examples and finish with a short practice check.',
  business: 'Act as an experienced operator and consultant. Be specific, quantify where possible and end with next actions.',
  marketing: 'Act as a senior brand strategist and copywriter. Be punchy, audience-first and channel-aware.',
  support: 'Act as an empathetic senior support agent. Acknowledge, resolve, and keep replies concise and actionable.',
  finance: 'Act as a careful financial planner. Show your assumptions and never present projections as guarantees.',
  developer: 'Act as a staff engineer. Prefer working code, explain trade-offs and include tests or edge cases.',
  agent: 'Act as an automation architect. Break work into clear, auditable steps with inputs, outputs and approvals.',
  analytics: 'Act as a data scientist. Explain the method, the result and the business implication in plain language.',
  image: 'Act as an art director. Translate the brief into a precise visual direction.',
  video: 'Act as a video director. Think in scenes, shots, pacing and hooks.',
  voice: 'Act as an audio producer. Focus on clarity, pacing and emotion.',
  chat: 'Be helpful, accurate and concise by default, with more depth when the task needs it.',
  intelligence: 'Be precise about capability, trade-offs and the best model for the job.',
  platform: 'Be a concise product guide for the NexAI workspace.',
  admin: 'Be precise and security-minded. Summarise risk and recommended action.',
  bonus: 'Be an expert solutions architect for enterprise AI deployments.'
};

const SPECIAL_SYSTEM = {
  'AI-powered conversational chatbot': 'You are NexAI, an AI assistant that combines the best of ChatGPT, Claude, Gemini and Perplexity. Be genuinely useful, structured and direct.',
  'Advanced reasoning mode': 'Think carefully before answering. Show a compact reasoning summary, then the answer. Check your work for errors.',
  'Deep research mode': 'Research deeply. Build a brief with key findings, evidence, counterpoints and a source list. Clearly label anything unverified.',
  'Source citations and references': 'Include inline citations like [1] and a numbered source list with titles and URLs where available.',
  'Code explanation': 'Explain code top-down: purpose, walkthrough, complexity, then gotchas. Include a small usage example.',
  'Code debugging assistance': 'Diagnose the bug, show the minimal fix, explain the root cause and add a regression test.',
  'AI mathematics solver': 'Solve step by step. State the method, show each transformation and verify the final answer by substitution.',
  'AI quiz generator': 'Create a quiz with mixed question types, an answer key and explanations. Default to 10 questions.',
  'AI lesson plan generator': 'Produce a lesson plan with objectives, materials, timed activities, differentiation and assessment.',
  'SWOT analysis generator': 'Produce a SWOT grid with 4–6 specific, evidence-based points per quadrant and strategic implications.',
  'Business plan generator': 'Produce an investor-ready business plan with executive summary, market, model, GTM, financials and risks.'
};

function titleCase(s) { return s.replace(/\b\w/g, c => c.toUpperCase()); }

let n = 0;
const backendModules = [];
const publicModules = [];

for (const mod of modules) {
  const kind = KIND[mod.id] || 'chat';
  const route = ROUTE[mod.id] || 'features';
  const features = mod.features.map(name => {
    n += 1;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48);
    const system = [
      SPECIAL_SYSTEM[name],
      `You are NexAI's "${name}" specialist inside the ${mod.name} module.`,
      STYLE[mod.id] || STYLE.chat,
      'Return a finished, ready-to-use result rather than a plan, unless the user explicitly asks for a plan. Use markdown formatting.'
    ].filter(Boolean).join(' ');
    return {
      id: `${mod.id}-${slug}`,
      number: n,
      name,
      description: (DESC[mod.id] || DESC.chat)(name.toLowerCase()),
      kind,
      action: kind === 'chat' ? 'chat' : kind,
      route,
      system,
      tags: [mod.short.toLowerCase(), ...name.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3).slice(0, 4)]
    };
  });
  const base = { id: mod.id, name: mod.name, short: mod.short, icon: mod.icon, group: mod.group, blurb: mod.blurb, count: features.length };
  backendModules.push({
    ...base,
    tools: features.map(({ id, number, name, description, kind, action, route, system }) => ({ id, number, name, description, kind, action, route, system }))
  });
  publicModules.push({ ...base, features: features.map(({ system, ...rest }) => rest) });
}

const catalog = { generatedAt: new Date().toISOString(), total: n, modules: publicModules };

const backend = `// AUTO-GENERATED by scripts/build-catalog.mjs — ${n} features across ${modules.length} modules.\nexport const MODULES = ${JSON.stringify(backendModules, null, 2)};\nexport const FEATURES = MODULES.flatMap(m => m.tools.map(t => ({ ...t, moduleId: m.id, moduleName: m.name })));\nexport const findModule = id => MODULES.find(m => m.id === id);\nexport const findTool = id => FEATURES.find(t => t.id === id);\nexport const findFeature = findTool;\nexport const catalogStats = () => ({ total: FEATURES.length, modules: MODULES.length, byModule: Object.fromEntries(MODULES.map(m => [m.id, m.tools.length])) });\n`;

fs.writeFileSync(path.join(root, 'backend/src/catalog.js'), backend);
fs.writeFileSync(path.join(root, 'frontend/src/catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
console.log(`Wrote ${n} features across ${modules.length} modules.`);
