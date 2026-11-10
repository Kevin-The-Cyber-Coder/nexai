import { createContext, useContext, useEffect, useState } from 'react';

export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

export function useRoute() {
  const [hash, setHash] = useState(() => window.location.hash.replace(/^#\/?/, '') || 'dashboard');
  useEffect(() => {
    const on = () => setHash(window.location.hash.replace(/^#\/?/, '') || 'dashboard');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const [pathPart, query] = hash.split('?');
  const segments = pathPart.split('/').filter(Boolean);
  const params = Object.fromEntries(new URLSearchParams(query || ''));
  return { hash, path: segments[0] || 'dashboard', segments, params };
}

export function go(path, params) {
  const q = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString() : '';
  window.location.hash = '#/' + path + (q ? '?' + q : '');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function openFeature(feature) {
  if (!feature) return;
  switch (feature.action) {
    case 'chat': return go('chat', { tool: feature.id });
    case 'code': return go('developer', { tool: feature.id });
    case 'doc': return go('documents', { tool: feature.id });
    case 'image': return go('image', { tool: feature.id });
    case 'video': return go('video', { tool: feature.id });
    case 'voice': return go('voice', { tool: feature.id });
    case 'agent': return go('agents', { tool: feature.id });
    case 'data': return go('analytics', { tool: feature.id });
    case 'admin': return go('admin');
    case 'settings': return go('settings');
    default: return go(feature.route || 'features');
  }
}

export const toneOptions = [
  { id: 'balanced', label: 'Balanced' },
  { id: 'precise', label: 'Precise' },
  { id: 'friendly', label: 'Friendly' },
  { id: 'creative', label: 'Creative' }
];
export const lengthOptions = [
  { id: 'short', label: 'Short' },
  { id: 'medium', label: 'Medium' },
  { id: 'long', label: 'Long' }
];
