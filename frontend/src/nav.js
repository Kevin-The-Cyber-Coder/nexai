import CATALOG from './catalog.json';

export const MODULES = CATALOG.modules;
export const FEATURES = CATALOG.modules.flatMap(m => m.features.map(f => ({ ...f, moduleName: m.name, moduleShort: m.short, moduleIcon: m.icon })));
export const findFeature = (id) => FEATURES.find(f => f.id === id);
export const featuresForModule = (moduleId) => FEATURES.filter(f => f.id.startsWith(moduleId + '-'));

export const NAV = [
  {
    group: 'Main menu',
    items: [
      { path: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { path: 'chat', label: 'AI Chat', icon: 'chat' },
      { path: 'agents', label: 'AI Agents', icon: 'bot' },
      { path: 'automation', label: 'Automation', icon: 'zap' },
      { path: 'research', label: 'AI Research', icon: 'globe' },
      { path: 'image', label: 'Image Studio', icon: 'image' },
      { path: 'video', label: 'Video Studio', icon: 'film' },
      { path: 'voice', label: 'Voice Studio', icon: 'mic' },
      { path: 'documents', label: 'Documents', icon: 'file' },
      { path: 'developer', label: 'Developer Tools', icon: 'code' },
      { path: 'analytics', label: 'Analytics', icon: 'chart' },
      { path: 'writing', label: 'Writing Studio', icon: 'pen', module: 'writing' },
      { path: 'education', label: 'Education', icon: 'book', module: 'education' },
      { path: 'business', label: 'Business AI', icon: 'briefcase', module: 'business' },
      { path: 'marketing', label: 'Marketing AI', icon: 'megaphone', module: 'marketing' },
      { path: 'support', label: 'Support Desk', icon: 'headset' },
      { path: 'finance', label: 'Finance', icon: 'wallet', module: 'finance' }
    ]
  },
  {
    group: 'Workspace',
    items: [
      { path: 'projects', label: 'My Projects', icon: 'folder' },
      { path: 'files', label: 'My Files', icon: 'file' },
      { path: 'prompts', label: 'Prompt Library', icon: 'sparkles' },
      { path: 'marketplace', label: 'AI Marketplace', icon: 'store' },
      { path: 'integrations', label: 'Integrations', icon: 'plug' },
      { path: 'team', label: 'Team Workspace', icon: 'users' },
      { path: 'features', label: 'Feature Library', icon: 'layers' }
    ]
  },
  {
    group: 'Account',
    items: [
      { path: 'billing', label: 'Subscription & Billing', icon: 'card' },
      { path: 'usage', label: 'Usage & Credits', icon: 'gauge' },
      { path: 'keys', label: 'API Keys', icon: 'key' },
      { path: 'models', label: 'AI Models', icon: 'cpu' },
      { path: 'settings', label: 'Settings', icon: 'settings' },
      { path: 'help', label: 'Help & Support', icon: 'help' }
    ]
  }
];

export const PAGE_META = {
  dashboard: { title: 'Dashboard', sub: 'Your intelligent workspace at a glance' },
  chat: { title: 'AI Chat', sub: 'Ask anything, or run one of 370 tools' },
  agents: { title: 'AI Agents', sub: 'Build agents that do the work for you' },
  automation: { title: 'Automation', sub: 'Schedules, runs and approvals' },
  research: { title: 'AI Research', sub: 'Grounded answers with sources' },
  image: { title: 'Image Studio', sub: 'Generate, edit and upscale visuals' },
  video: { title: 'Video Studio', sub: 'Script, storyboard and publish' },
  voice: { title: 'Voice Studio', sub: 'Speak, transcribe and produce audio' },
  documents: { title: 'Documents', sub: 'Read, extract and compare files' },
  developer: { title: 'Developer Tools', sub: 'Build, review and ship code' },
  analytics: { title: 'Analytics', sub: 'Turn data into decisions' },
  writing: { title: 'Writing Studio', sub: 'Draft, rewrite and polish anything' },
  education: { title: 'Education', sub: 'A personal tutor for every subject' },
  business: { title: 'Business AI', sub: 'Plan, analyse and operate' },
  marketing: { title: 'Marketing AI', sub: 'Campaigns, content and channels' },
  support: { title: 'Support Desk', sub: 'Resolve tickets faster with AI' },
  finance: { title: 'Finance', sub: 'Budget, track and forecast' },
  projects: { title: 'My Projects', sub: 'Everything your team is working on' },
  files: { title: 'My Files', sub: 'Documents, exports and uploads' },
  prompts: { title: 'Prompt Library', sub: 'Save, share and reuse your best prompts' },
  marketplace: { title: 'AI Marketplace', sub: 'Install agents, prompts and apps' },
  integrations: { title: 'Integrations', sub: 'Connect NexAI to your stack' },
  team: { title: 'Team Workspace', sub: 'People, roles and seats' },
  features: { title: 'Feature Library', sub: '370 capabilities across 19 modules' },
  billing: { title: 'Subscription & Billing', sub: 'Plans, invoices and payment method' },
  usage: { title: 'Usage & Credits', sub: 'Track every AI credit' },
  keys: { title: 'API Keys', sub: 'Build on the NexAI API' },
  models: { title: 'AI Models', sub: 'Compare and route across providers' },
  settings: { title: 'Settings', sub: 'Profile, preferences and security' },
  help: { title: 'Help & Support', sub: 'Answers, docs and a real support desk' },
  admin: { title: 'Admin', sub: 'Users, revenue, security and system health' }
};

export const PLAN_LABELS = { free: 'Free', pro: 'Pro', business: 'Business', enterprise: 'Enterprise' };
