// Simple pub/sub for AI panel control across components
type Listener = () => void;

const listeners: Set<Listener> = new Set();

export const aiEvents = {
  subscribe(fn: Listener) { listeners.add(fn); return () => listeners.delete(fn); },
  emit() { listeners.forEach(fn => fn()); },
};
