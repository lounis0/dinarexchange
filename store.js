import { STORAGE_KEYS } from './config.js';

// Default initial state
let state = {
  favorites: [],
  settings: { theme: 'dark', language: 'fr', notificationsEnabled: false },
  onboarded: false,
  officialRates: null,
  parallelRates: null,
  parallelHistory: {},
  currentRoute: '#/home',
  isLoading: true,
  lastUpdated: null,
  isOffline: false,
  canInstall: false
};

const listeners = new Set();

export function getState() {
  return state;
}

export function setState(patch) {
  let hasChange = false;
  for (const key in patch) {
    if (state[key] !== patch[key]) {
      hasChange = true;
      break;
    }
  }
  if (!hasChange) return;

  state = { ...state, ...patch };
  listeners.forEach(fn => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// LocalStorage helpers
function loadFromStorage(key, defaultValue) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch (e) {
    console.error(`Failed to load ${key} from storage:`, e);
    return defaultValue;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save ${key} to storage:`, e);
  }
}

// Initialize persistent state from localStorage
export function initStore() {
  const favorites = loadFromStorage(STORAGE_KEYS.FAVORITES, []);
  const settings = loadFromStorage(STORAGE_KEYS.SETTINGS, state.settings);
  const onboarded = loadFromStorage(STORAGE_KEYS.ONBOARDED, false);
  const parallelHistory = loadFromStorage(STORAGE_KEYS.PARALLEL_HISTORY, {});

  setState({ favorites, settings, onboarded, parallelHistory });
}

// Specific state mutators
export function toggleFavorite(code) {
  const { favorites } = state;
  const newFavorites = favorites.includes(code)
    ? favorites.filter(c => c !== code)
    : [...favorites, code];
  
  saveToStorage(STORAGE_KEYS.FAVORITES, newFavorites);
  setState({ favorites: newFavorites });
}

export function updateSettings(patch) {
  const newSettings = { ...state.settings, ...patch };
  saveToStorage(STORAGE_KEYS.SETTINGS, newSettings);
  setState({ settings: newSettings });
}

export function setOnboarded() {
  saveToStorage(STORAGE_KEYS.ONBOARDED, true);
  setState({ onboarded: true });
}

// Formatting helpers
export function formatDZD(value) {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatDiff(diffPct) {
  if (diffPct == null || isNaN(diffPct)) return '';
  const sign = diffPct > 0 ? '+' : '';
  return `${sign}${diffPct.toFixed(2)}%`;
}
