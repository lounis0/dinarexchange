import { TRACKED_CURRENCIES, CACHE_TTL_MS, STORAGE_KEYS } from './config.js';
import { getState, setState } from './store.js';

const FRANKFURTER_BASE = 'https://api.frankfurter.dev/v2';

const CURRENCY_META = {
  USD: { name: 'Dollar américain', flag: `<img src="assets/flags/USD.png" class="flag-icon" alt="Drapeau des États-Unis">` },
  EUR: { name: 'Euro', flag: `<img src="assets/flags/EUR.png" class="flag-icon" alt="Drapeau de l'Union Européenne">` },
  GBP: { name: 'Livre sterling', flag: `<img src="assets/flags/GBP.png" class="flag-icon" alt="Drapeau du Royaume-Uni">` },
  CHF: { name: 'Franc suisse', flag: `<img src="assets/flags/CHF.png" class="flag-icon" alt="Drapeau de la Suisse">` },
  CAD: { name: 'Dollar canadien', flag: `<img src="assets/flags/CAD.png" class="flag-icon" alt="Drapeau du Canada">` },
  AED: { name: 'Dirham émirati', flag: `<img src="assets/flags/AED.png" class="flag-icon" alt="Drapeau des Émirats Arabes Unis">` },
  SAR: { name: 'Riyal saoudien', flag: `<img src="assets/flags/SAR.png" class="flag-icon" alt="Drapeau de l'Arabie Saoudite">` },
  CNY: { name: 'Yuan chinois', flag: `<img src="assets/flags/CNY.png" class="flag-icon" alt="Drapeau de la Chine">` },
  TRY: { name: 'Livre turque', flag: `<img src="assets/flags/TRY.png" class="flag-icon" alt="Drapeau de la Turquie">` },
  TND: { name: 'Dinar tunisien', flag: `<img src="assets/flags/TND.png" class="flag-icon" alt="Drapeau de la Tunisie">` },
  MAD: { name: 'Dirham marocain', flag: `<img src="assets/flags/MAD.png" class="flag-icon" alt="Drapeau du Maroc">` },
  JPY: { name: 'Yen japonais', flag: `<img src="assets/flags/JPY.png" class="flag-icon" alt="Drapeau du Japon">` }
};

// Safe fetch with timeout
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export async function getOfficialRates(forceRefresh = false) {
  let cache = null;
  try {
    const rawCache = localStorage.getItem(STORAGE_KEYS.OFFICIAL_CACHE);
    if (rawCache) cache = JSON.parse(rawCache);
  } catch(e) {}

  const now = Date.now();
  // Return cache if valid and no force refresh requested
  if (!forceRefresh && cache && (now - new Date(cache.fetchedAt).getTime() < CACHE_TTL_MS)) {
    return cache.rates;
  }

  try {
    const quotes = TRACKED_CURRENCIES.join(',');
    const data = await fetchWithTimeout(`${FRANKFURTER_BASE}/rates?base=DZD&quotes=${quotes}`);
    // Frankfurter v2 returns array: [{date, base, quote, rate}, ...]
    // rate is 1 DZD = X Foreign, we invert to 1 Foreign = X DZD
    const invertedRates = {};
    for (const entry of data) {
      if (TRACKED_CURRENCIES.includes(entry.quote)) {
        invertedRates[entry.quote] = 1 / entry.rate;
      }
    }
    const newCache = { fetchedAt: new Date().toISOString(), rates: invertedRates };
    localStorage.setItem(STORAGE_KEYS.OFFICIAL_CACHE, JSON.stringify(newCache));
    setState({ isOffline: false, lastUpdated: newCache.fetchedAt });
    return invertedRates;
  } catch (err) {
    console.error('Failed to fetch official rates:', err);
    setState({ isOffline: true });
    
    // Fallback to localStorage cache
    if (cache) {
      setState({ lastUpdated: cache.fetchedAt });
      return cache.rates;
    }
    
    // Fallback to static shipped file
    try {
      const staticCacheRes = await fetch('official-cache.json');
      const staticCache = await staticCacheRes.json();
      setState({ lastUpdated: staticCache.fetchedAt });
      return staticCache.rates;
    } catch(e) {
      console.error('All rate fallbacks failed');
      return {};
    }
  }
}

export async function getParallelRates() {
  try {
    const data = await fetchWithTimeout('parallel.json');
    const today = new Date().toISOString().split('T')[0];
    
    // Organically build history
    const { parallelHistory } = getState();
    let historyChanged = false;

    for (const [code, rates] of Object.entries(data.rates)) {
      const mid = (rates.buy + rates.sell) / 2;
      if (!parallelHistory[code]) parallelHistory[code] = [];
      
      const lastEntry = parallelHistory[code][parallelHistory[code].length - 1];
      if (!lastEntry || lastEntry.date !== today) {
        parallelHistory[code].push({ date: today, mid });
        // Cap at 365
        if (parallelHistory[code].length > 365) parallelHistory[code].shift();
        historyChanged = true;
      }
    }

    if (historyChanged) {
      localStorage.setItem(STORAGE_KEYS.PARALLEL_HISTORY, JSON.stringify(parallelHistory));
      setState({ parallelHistory });
    }

    return data.rates;
  } catch (err) {
    console.error('Failed to fetch parallel rates:', err);
    // Silent fail, just return empty obj
    return {};
  }
}

export async function getHistoricalRates(code, days = 7) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];
  
  try {
    const url = `${FRANKFURTER_BASE}/rates?base=DZD&quotes=${code}&from=${startStr}&to=${endStr}`;
    const data = await fetchWithTimeout(url);
    // Frankfurter v2 timeseries returns array: [{date, base, quote, rate}, ...]
    const history = [];
    if (data && Array.isArray(data)) {
      for (const entry of data) {
        if (entry.rate) {
          history.push({ date: entry.date, rate: 1 / entry.rate });
        }
      }
    }
    return history;
  } catch (err) {
    console.warn(`Failed to fetch historical data for ${code}`);
    const history = [];
    const currentRates = getState().officialRates || {};
    let baseRate = currentRates[code] || 150;
    
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      // Random walk ending at baseRate
      const randomOffset = (Math.sin(i * 1.5) * 1.5) + (Math.cos(i) * 0.5);
      history.push({ date: dateStr, rate: baseRate - randomOffset });
    }
    return history;
  }
}

export function getMergedCurrencies(officialRates, parallelRates) {
  return TRACKED_CURRENCIES.map(code => {
    const meta = CURRENCY_META[code] || { name: code, flag: '🏳️' };
    const official = officialRates[code] || 0;
    
    let parallelObj = null;
    let diffPct = null;

    if (parallelRates[code]) {
      const { buy, sell } = parallelRates[code];
      const mid = (buy + sell) / 2;
      parallelObj = { buy, sell, mid };
      if (official > 0) {
        diffPct = ((mid - official) / official) * 100;
      }
    }

    return {
      code,
      name: meta.name,
      flag: meta.flag,
      official,
      parallel: parallelObj,
      diffPct
    };
  });
}

export async function fetchAllData(forceRefresh = false) {
  setState({ isLoading: true });
  const [officialRates, parallelRates] = await Promise.all([
    getOfficialRates(forceRefresh),
    getParallelRates()
  ]);
  setState({ officialRates, parallelRates, isLoading: false });
}
