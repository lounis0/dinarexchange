import { initStore, getState, setState, subscribe } from './store.js';
import { fetchAllData } from './api.js';
import { renderSplash, renderOnboarding, renderHome, renderDetail, renderConverter, renderFavorites, renderHistory, renderSettings, renderAbout, renderTextPage } from './render.js';
import { icon } from './icons.js';
import { STRINGS } from './config.js';

const appRoot = document.getElementById('app-root');
let isInitialLoad = true;

function buildBottomNav() {
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  
  const items = [
    { id: 'home', hash: '#/home', icon: 'home', label: STRINGS.nav_home },
    { id: 'converter', hash: '#/converter', icon: 'arrow-left-right', label: STRINGS.nav_converter },
    { id: 'favorites', hash: '#/favorites', icon: 'star', label: STRINGS.nav_favorites },
    { id: 'settings', hash: '#/settings', icon: 'settings', label: STRINGS.nav_settings }
  ];

  nav.innerHTML = items.map(item => `
    <a href="${item.hash}" class="nav-item" id="nav-${item.id}">
      ${icon(item.icon, 24)}
      <span>${item.label}</span>
    </a>
  `).join('');

  return nav;
}

function updateNavHighlight(hash) {
  const base = hash.split('?')[0];
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  if (base.startsWith('#/home')) document.getElementById('nav-home')?.classList.add('active');
  if (base.startsWith('#/converter')) document.getElementById('nav-converter')?.classList.add('active');
  if (base.startsWith('#/favorites')) document.getElementById('nav-favorites')?.classList.add('active');
  if (base.startsWith('#/settings')) document.getElementById('nav-settings')?.classList.add('active');
}

async function handleRoute() {
  const hash = window.location.hash || '#/home';
  const state = getState();
  
  // Guard onboarding
  if (!state.onboarded && hash !== '#/onboarding') {
    window.location.hash = '#/onboarding';
    return;
  }
  
  // Clear root but preserve nav if we add it back later
  appRoot.innerHTML = '';
  const contentEl = document.createElement('div');
  contentEl.className = 'route-content';
  contentEl.style.flex = '1';
  appRoot.appendChild(contentEl);

  const baseRoute = hash.split('?')[0];
  const params = hash.split('/')[2]; // e.g. "USD" in "#/detail/USD"

  let showNav = true;

  if (baseRoute === '#/onboarding') {
    showNav = false;
    renderOnboarding(contentEl);
  } else if (baseRoute === '#/home') {
    renderHome(contentEl);
  } else if (baseRoute.startsWith('#/detail/')) {
    showNav = false;
    await renderDetail(contentEl, params);
  } else if (baseRoute === '#/converter') {
    renderConverter(contentEl);
  } else if (baseRoute === '#/favorites') {
    renderFavorites(contentEl);
  } else if (baseRoute.startsWith('#/history/')) {
    showNav = false;
    await renderHistory(contentEl, params);
  } else if (baseRoute === '#/about') {
    showNav = false;
    renderAbout(contentEl);
  } else if (['#/tos', '#/privacy', '#/legal', '#/dev'].includes(baseRoute)) {
    showNav = false;
    renderTextPage(contentEl, baseRoute);
  } else if (baseRoute === '#/settings') {
    renderSettings(contentEl);
  } else {
    window.location.hash = '#/home';
    return;
  }

  if (showNav) {
    if (!document.querySelector('.bottom-nav')) {
      appRoot.appendChild(buildBottomNav());
    }
    updateNavHighlight(hash);
  } else {
    const nav = document.querySelector('.bottom-nav');
    if (nav) nav.remove();
  }

  setState({ currentRoute: hash });
  window.scrollTo(0, 0);
}

// Global state re-render logic (simplistic React-like flow for specific routes)
subscribe((state) => {
  if (isInitialLoad) return;
  const hash = state.currentRoute;
  if (hash.startsWith('#/home') || hash.startsWith('#/favorites') || hash.startsWith('#/settings')) {
    // Re-render currently mounted view if data changes
    handleRoute();
  }
});

async function boot() {
  renderSplash(appRoot);
  
  // PWA setup
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(err => {
        console.error('ServiceWorker registration failed: ', err);
      });
    });
  }

  // Handle install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
    setState({ canInstall: true });
  });

  initStore();
  
  // Start data fetch
  const fetchPromise = fetchAllData();
  
  // Force splash to show for at least 600ms, max 800ms
  await new Promise(r => setTimeout(r, 600));

  window.addEventListener('hashchange', handleRoute);
  isInitialLoad = false;
  handleRoute(); // first render
}

boot();
