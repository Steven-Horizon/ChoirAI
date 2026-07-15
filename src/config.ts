// Use empty string for relative API calls (works when frontend and backend are on same domain)
// For local dev with separate backend, change to 'http://localhost:3001'
export const API_BASE = import.meta.env.DEV ? '' : '';
