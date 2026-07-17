import { getState, toggleFavorite, setOnboarded, updateSettings, formatDZD, formatDiff } from './store.js';
import { getMergedCurrencies, getHistoricalRates } from './api.js';
import { icon } from './icons.js';
import { STRINGS, TRACKED_CURRENCIES, APP_VERSION } from './config.js';
import { drawSparkline, drawHistoryChart } from './charts.js';
import { showDialog, showToast } from './dialog.js';

// --- Shared Components ---

function el(tag, className, innerHTML = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (innerHTML) element.innerHTML = innerHTML;
  return element;
}

function buildDiffBadge(diffPct, suffix = '') {
  if (diffPct == null) return '';
  const isPositive = diffPct >= 0;
  const cls = isPositive ? 'badge-positive' : 'badge-negative';
  return `<span class="diff-badge ${cls}">${formatDiff(diffPct)}${suffix}</span>`;
}

function buildCurrencyCard(currency) {
  const { favorites } = getState();
  const isFav = favorites.includes(currency.code);
  const card = el('div', 'currency-card');
  card.innerHTML = `
    <div class="card-left">
      ${currency.flag}
      <div class="currency-info">
        <span class="code">${currency.code}</span>
        <span class="name">${currency.name}</span>
      </div>
    </div>
    <div class="card-right">
      <div class="rates-stack">
        <div class="rate-row"><span class="rate-official">${formatDZD(currency.official)}</span> <span class="dzd">DZD</span></div>
        ${currency.parallel ? `<div class="rate-row"><span class="rate-parallel">${formatDZD(currency.parallel.mid)}</span> <span class="dzd">DZD</span></div>` : ''}
      </div>
      ${buildDiffBadge(currency.diffPct)}
      <button class="icon-btn fav-btn" aria-label="Favorite">
        ${isFav ? icon('star-filled', 20, 'fav-active') : icon('star')}
      </button>
    </div>
  `;

  // Entire card is clickable to detail, EXCEPT the fav button
  card.addEventListener('click', (e) => {
    if (e.target.closest('.fav-btn')) {
      toggleFavorite(currency.code);
      e.stopPropagation();
    } else {
      window.location.hash = `#/detail/${currency.code}`;
    }
  });

  return card;
}

function renderEmptyState(container, iconName, message, actionText, actionHash) {
  container.innerHTML = `
    <div class="empty-state">
      ${icon(iconName, 48)}
      <p>${message}</p>
      ${actionText ? `<a href="${actionHash}" class="btn btn-secondary">${actionText}</a>` : ''}
    </div>
  `;
}

// --- Screens ---

export function renderSplash(container) {
  container.innerHTML = `
    <div class="splash-screen">
      <div class="logo-mark">
        <img src="icons/icon-maskable.png" alt="DinarExchange Logo" style="width: 160px; height: 160px; object-fit: contain; border-radius: 32px;">
      </div>
    </div>
  `;
}

export function renderOnboarding(container) {
  const slides = [
    {
      icon: icon('trending-up', 48),
      title: "Bienvenue sur DinarExchange",
      desc: "Suivez les taux de change du Dinar Algérien en temps réel avec précision et élégance."
    },
    {
      icon: icon('arrow-left-right', 48),
      title: "Le Square Central",
      desc: "Comparez instantanément les taux bancaires officiels et les taux du marché parallèle (Square Port-Saïd)."
    },
    {
      icon: icon('globe', 48),
      title: "Toujours avec vous",
      desc: "Convertisseur intelligent, graphiques historiques interactifs et mode hors-ligne. Prêt à commencer ?"
    }
  ];

  container.innerHTML = `
    <div class="onboarding-wrapper">
      <div class="onboarding-carousel" id="ob-carousel">
        ${slides.map((s, i) => `
          <div class="onboarding-slide" id="ob-slide-${i}">
            <div class="slide-icon-wrapper">${s.icon}</div>
            <h1 class="slide-title">${s.title}</h1>
            <p class="slide-text">${s.desc}</p>
          </div>
        `).join('')}
      </div>
      
      <div class="onboarding-bottom">
        <div class="onboarding-dots" id="ob-dots">
          ${slides.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}"></div>`).join('')}
        </div>
        <button class="btn btn-primary btn-full" id="btn-next">Continuer</button>
      </div>
    </div>
  `;

  const carousel = document.getElementById('ob-carousel');
  const dots = document.getElementById('ob-dots').children;
  const btnNext = document.getElementById('btn-next');
  let currentSlide = 0;

  // Reveal animations via IntersectionObserver
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.5 });

  container.querySelectorAll('.onboarding-slide').forEach(slide => observer.observe(slide));

  // Handle native scroll gestures
  carousel.addEventListener('scroll', () => {
    const slideWidth = carousel.clientWidth;
    currentSlide = Math.floor((carousel.scrollLeft + slideWidth / 2) / slideWidth);

    Array.from(dots).forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSlide);
    });

    btnNext.innerText = currentSlide === slides.length - 1 ? "Commencer l'expérience" : "Continuer";
  });

  btnNext.onclick = () => {
    if (currentSlide < slides.length - 1) {
      carousel.scrollBy({ left: carousel.clientWidth, behavior: 'smooth' });
    } else {
      setOnboarded();
      window.location.hash = '#/home';
    }
  };
}

export function renderHome(container) {
  const state = getState();
  const merged = getMergedCurrencies(state.officialRates || {}, state.parallelRates || {});

  const hour = new Date().getHours();
  let greeting = STRINGS.greeting_morning;
  if (hour >= 12 && hour < 18) greeting = STRINGS.greeting_afternoon;
  if (hour >= 18) greeting = STRINGS.greeting_evening;

  const isOffline = !navigator.onLine;

  container.innerHTML = `
      <header class="home-header">
        <div>
          <h1 class="display">${greeting}</h1>
          ${isOffline
      ? `<div class="status-offline">${icon('wifi-off', 14)} Hors ligne — derniers taux connus</div>`
      : `<div class="status-updated">Mise à jour: ${new Date(state.lastUpdated).toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })}</div>`
    }
        </div>
        <button class="icon-btn" aria-label="Notifications">${icon('bell', 24)}</button>
      </header>
    
    <div class="search-bar">
      ${icon('search', 20)}
      <input type="text" id="search-input" placeholder="${STRINGS.search_placeholder}">
    </div>

    ${state.favorites.length > 0 ? `
    <section class="favorites-section">
      <h2 class="h2">${STRINGS.favorites}</h2>
      <div class="favorites-scroll" id="fav-container"></div>
    </section>` : ''}

    <section class="all-rates-section">
      <h2 class="h2">${STRINGS.all_rates}</h2>
      <div class="list-container" id="all-container"></div>
    </section>
  `;

  const allContainer = document.getElementById('all-container');
  const favContainer = document.getElementById('fav-container');
  const searchInput = document.getElementById('search-input');

  const renderList = (filter = '') => {
    allContainer.innerHTML = '';
    const filtered = merged.filter(c =>
      c.code.toLowerCase().includes(filter) || c.name.toLowerCase().includes(filter)
    );

    if (state.isLoading) {
      for (let i = 0; i < 6; i++) allContainer.appendChild(el('div', 'currency-card skeleton'));
    } else if (filtered.length === 0) {
      renderEmptyState(allContainer, 'search', STRINGS.no_results);
    } else {
      filtered.forEach(c => allContainer.appendChild(buildCurrencyCard(c)));
    }
  };

  if (state.favorites.length > 0 && favContainer && !state.isLoading) {
    const favs = merged.filter(c => state.favorites.includes(c.code));
    favs.forEach(c => {
      const chip = el('div', 'fav-chip');
      chip.innerHTML = `<span class="flag">${c.flag}</span> <span class="code">${c.code}</span> <div class="rate">${formatDZD(c.official)}</div>`;
      chip.onclick = () => window.location.hash = `#/detail/${c.code}`;
      favContainer.appendChild(chip);
    });
  }

  searchInput.addEventListener('input', (e) => renderList(e.target.value.toLowerCase()));
  renderList();
}

export async function renderDetail(container, code) {
  const state = getState();
  const merged = getMergedCurrencies(state.officialRates || {}, state.parallelRates || {});
  const currency = merged.find(c => c.code === code);

  if (!currency) {
    window.location.hash = '#/home';
    return;
  }

  const isFav = state.favorites.includes(code);

  container.innerHTML = `
    <header class="detail-header">
      <button class="icon-btn" onclick="history.back()">${icon('chevron-left', 24)}</button>
      <div class="detail-title">
        <span class="flag">${currency.flag}</span>
        <h1 class="h1">${currency.code}</h1>
      </div>
      <button class="icon-btn fav-btn-detail">${isFav ? icon('star-filled', 24, 'fav-active') : icon('star', 24)}</button>
    </header>

    <div class="detail-hero">
      <div class="caption">${STRINGS.official}</div>
      <div class="hero-rate numeric-hero">${formatDZD(currency.official)} <span class="dzd">DZD</span></div>
      <div id="detail-hero-badge"></div>
    </div>

    ${currency.parallel ? `
    <div class="parallel-breakdown card">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div class="caption">${STRINGS.parallel} (SQUARE)</div>
        ${buildDiffBadge(currency.diffPct, ' vs Officiel')}
      </div>
      <div class="breakdown-row" style="display:flex; justify-content:space-between; margin-top:var(--space-2);">
        <div class="stat">
          <span class="label">${STRINGS.buy}</span>
          <span class="value numeric-lg">${formatDZD(currency.parallel.buy)}</span>
        </div>
        <div class="stat" style="text-align:right;">
          <span class="label">${STRINGS.sell}</span>
          <span class="value numeric-lg">${formatDZD(currency.parallel.sell)}</span>
        </div>
      </div>
    </div>` : ''}

    <section class="chart-section">
      <div class="chart-header">
        <h3 class="h3">${STRINGS.last_7_days}</h3>
        <button class="icon-btn" onclick="window.location.hash='#/history/${code}'">${icon('chevron-right', 20)}</button>
      </div>
      <canvas id="sparkline" class="sparkline-canvas"></canvas>
    </section>

    <div class="action-dock">
      <button class="btn btn-primary btn-full" onclick="window.location.hash='#/converter?code=${code}'">
        ${icon('arrow-left-right')} ${STRINGS.convert}
      </button>
    </div>
  `;

  container.querySelector('.fav-btn-detail').onclick = () => {
    toggleFavorite(code);
    renderDetail(container, code);
  };

  // Render sparkline
  const canvas = document.getElementById('sparkline');
  const history = await getHistoricalRates(code, 7);
  let trend7d = null;
  if (history.length >= 2) {
    const oldest = history[0].rate;
    const newest = history[history.length - 1].rate;
    trend7d = ((newest - oldest) / oldest) * 100;
  }

  const heroBadge = document.getElementById('detail-hero-badge');
  if (heroBadge) {
    heroBadge.innerHTML = buildDiffBadge(trend7d, ' sur 7J');
  }

  if (history.length > 0) {
    drawSparkline(canvas, history.map(h => ({ rate: h.rate })));
  }
}

export function renderConverter(container) {
  const state = getState();
  // Simple implementation, expects a URL param ?code=USD for pre-filling
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  let code1 = urlParams.get('code') || 'USD';
  let code2 = 'DZD';

  let val1 = '1';
  let useParallel = false;

  let pickerOpen = false;
  let pickerTarget = 1;

  const render = () => {
    const merged = getMergedCurrencies(state.officialRates || {}, state.parallelRates || {});
    const c1 = merged.find(c => c.code === code1) || { code: code1, official: 1, parallel: { mid: 1 } };
    const rate = code1 === 'DZD' ? 1 : (useParallel && c1.parallel ? c1.parallel.mid : c1.official);

    const getRate = (cCode) => {
      if (cCode === 'DZD') return 1;
      const cObj = merged.find(c => c.code === cCode);
      if (!cObj) return 1;
      return (useParallel && cObj.parallel) ? cObj.parallel.mid : cObj.official;
    };

    const r1 = getRate(code1);
    const r2 = getRate(code2);

    // Calculate any-to-any conversion
    const result = (parseFloat(val1) || 0) * r1 / r2;

    let sheetHtml = '';
    if (pickerOpen) {
      sheetHtml = `
        <div class="sheet-overlay open" id="sheet-overlay"></div>
        <div class="bottom-sheet open">
          <div class="sheet-header">
            <h3 class="h3">Sélectionner une devise</h3>
            <button class="icon-btn" id="close-sheet">${icon('x', 24)}</button>
          </div>
          <div class="sheet-content">
            <div class="sheet-row" data-code="DZD">
              <span class="flag">🇩🇿</span>
              <span class="code" style="font-weight: 700; width: 40px;">DZD</span>
              <span class="name" style="color: var(--color-text-secondary);">Dinar algérien</span>
            </div>
            ${merged.map(c => `
              <div class="sheet-row" data-code="${c.code}">
                <span class="flag">${c.flag}</span>
                <span class="code" style="font-weight: 700; width: 40px;">${c.code}</span>
                <span class="name" style="color: var(--color-text-secondary);">${c.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <header class="page-header" style="display:flex; justify-content:space-between; align-items:center;">
        <h1 class="h1">${STRINGS.nav_converter}</h1>
        <button class="icon-btn" id="share-conv" style="background:var(--color-surface); box-shadow:0 4px 12px rgba(0,0,0,0.05); border-radius:50%; width:44px; height:44px;">
          ${icon('share', 20)}
        </button>
      </header>

      <div class="converter-toggle">
        <button class="toggle-btn ${!useParallel ? 'active' : ''}" id="t-off">${STRINGS.official}</button>
        <button class="toggle-btn ${useParallel ? 'active' : ''}" id="t-par">${STRINGS.parallel}</button>
      </div>

      <div class="converter-box">
        <div class="input-group">
          <div class="currency-selector" id="sel1">
            ${code1} ${icon('chevron-down', 16)}
          </div>
          <input type="number" id="inp1" class="conv-input" value="${val1}">
        </div>

        <button class="swap-btn icon-btn" id="swap">${icon('arrow-left-right', 24)}</button>

        <div class="input-group">
          <div class="currency-selector" id="sel2">
            ${code2} ${icon('chevron-down', 16)}
          </div>
          <div class="conv-result numeric-hero">${formatDZD(result)}</div>
        </div>
      </div>
      ${sheetHtml}
    `;

    document.getElementById('t-off').onclick = () => { useParallel = false; render(); };
    document.getElementById('t-par').onclick = () => { useParallel = true; render(); };
    document.getElementById('swap').onclick = () => {
      const t = code1; code1 = code2; code2 = t;
      render();
    };

    document.getElementById('sel1').onclick = () => { pickerOpen = true; pickerTarget = 1; render(); };
    document.getElementById('sel2').onclick = () => { pickerOpen = true; pickerTarget = 2; render(); };

    if (pickerOpen) {
      document.getElementById('close-sheet').onclick = () => { pickerOpen = false; render(); };
      document.getElementById('sheet-overlay').onclick = () => { pickerOpen = false; render(); };
      container.querySelectorAll('.sheet-row').forEach(row => {
        row.onclick = () => {
          const selected = row.getAttribute('data-code');
          if (pickerTarget === 1) code1 = selected;
          else code2 = selected;
          pickerOpen = false;
          render();
        };
      });
    }

    const inp1 = document.getElementById('inp1');
    if (inp1) {
      inp1.addEventListener('input', (e) => {
        val1 = e.target.value;
        const newResult = (parseFloat(val1) || 0) * r1 / r2;
        const resEl = container.querySelector('.conv-result');
        if (resEl) {
          resEl.innerHTML = formatDZD(newResult);
        }
      });
    }

    const shareBtn = document.getElementById('share-conv');
    if (shareBtn) {
      shareBtn.onclick = async () => {
        const shareData = {
          title: 'DinarExchange Convertisseur',
          text: `${val1} ${code1} = ${formatDZD(result)} ${code2} (Taux ${useParallel ? 'Parallèle' : 'Officiel'})`,
          url: window.location.origin + window.location.pathname + `#/converter?code=${code1}`
        };
        try {
          if (navigator.share) {
            await navigator.share(shareData);
          } else {
            await navigator.clipboard.writeText(`${shareData.text}\\n${shareData.url}`);
            showToast('Lien copié !');
          }
        } catch (err) {
          console.error(err);
        }
      };
    }
  };

  render();
}

export function renderFavorites(container) {
  const state = getState();
  const merged = getMergedCurrencies(state.officialRates || {}, state.parallelRates || {});
  const favs = merged.filter(c => state.favorites.includes(c.code));

  container.innerHTML = `
    <header class="page-header">
      <h1 class="h1">${STRINGS.nav_favorites}</h1>
    </header>
    <div class="list-container" id="fav-list"></div>
  `;

  const list = document.getElementById('fav-list');
  if (favs.length === 0) {
    renderEmptyState(list, 'star', STRINGS.no_favorites, STRINGS.browse_rates, '#/home');
  } else {
    favs.forEach(c => list.appendChild(buildCurrencyCard(c)));
  }
}

export async function renderHistory(container, code) {
  const state = getState();
  const merged = getMergedCurrencies(state.officialRates || {}, state.parallelRates || {});
  const currency = merged.find(c => c.code === code);

  if (!currency) {
    window.location.hash = '#/home';
    return;
  }

  let range = 30; // default range

  const render = async () => {
    container.innerHTML = `
      <header class="detail-header">
        <button class="icon-btn" onclick="history.back()">${icon('chevron-left', 24)}</button>
        <div class="detail-title">
          <h1 class="h1">${currency.code} History</h1>
        </div>
        <div style="width:44px"></div>
      </header>

      <div class="range-selector">
        <button class="chip ${range === 7 ? 'active' : ''}" data-r="7">${STRINGS.range_7d}</button>
        <button class="chip ${range === 30 ? 'active' : ''}" data-r="30">${STRINGS.range_30d}</button>
        <button class="chip ${range === 90 ? 'active' : ''}" data-r="90">${STRINGS.range_90d}</button>
      </div>

      <div class="chart-container" style="margin: var(--space-4) 0; height: 300px;">
        <canvas id="history-chart" width="400" height="300" style="width:100%; height:100%;"></canvas>
      </div>

      <div id="stats-row" style="display:flex; justify-content:space-around; margin-top:var(--space-4); text-align:center;">
      </div>

      <div class="caption history-caption" style="text-align:center; margin-top:var(--space-4); color:var(--color-text-secondary); font-size:12px; text-transform:uppercase;"></div>
    `;

    container.querySelectorAll('.range-selector .chip').forEach(btn => {
      btn.onclick = (e) => {
        range = parseInt(e.target.getAttribute('data-r'));
        render();
      };
    });

    const canvas = document.getElementById('history-chart');
    const offPoints = await getHistoricalRates(code, range);

    if (offPoints.length > 0) {
      const rates = offPoints.map(p => p.rate);
      const min = Math.min(...rates);
      const max = Math.max(...rates);
      const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
      const statsRow = document.getElementById('stats-row');
      if (statsRow) {
        statsRow.innerHTML = `
          <div><div class="caption">Min</div><div class="numeric-large">${formatDZD(min)}</div></div>
          <div><div class="caption">Moy</div><div class="numeric-large">${formatDZD(avg)}</div></div>
          <div><div class="caption">Max</div><div class="numeric-large">${formatDZD(max)}</div></div>
        `;
      }
    }

    // Extract parallel history from state
    const parHist = state.parallelHistory[code] || [];
    // filter parallel history by range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - range);
    const parPoints = parHist.filter(h => new Date(h.date) >= cutoffDate).map(h => ({ date: h.date, rate: h.mid }));

    drawHistoryChart(canvas, offPoints, parPoints);

    if (parHist.length > 0) {
      container.querySelector('.history-caption').innerText = `${STRINGS.parallel_history_since} ${parHist[0].date}`;
    }
  };

  await render();
}

export function renderSettings(container) {
  const state = getState();
  const s = state.settings;

  container.innerHTML = `
    <header class="page-header">
      <h1 class="h1">${STRINGS.nav_settings}</h1>
    </header>

    <div class="settings-list">
      <div class="settings-group">
        <div class="settings-row disabled">
          <div class="row-left">
            ${icon('moon', 20)}
            <span>${STRINGS.settings_theme}</span>
          </div>
          <span class="value">${STRINGS.settings_theme_light} (Active)</span>
        </div>
        
        <div class="settings-row disabled">
          <div class="row-left">
            ${icon('globe', 20)}
            <span>${STRINGS.settings_language}</span>
          </div>
          <span class="value">${STRINGS.settings_language_fr} (Active)</span>
        </div>

        <div class="settings-row">
          <div class="row-left">
            ${icon('bell', 20)}
            <span>${STRINGS.settings_notifications}</span>
          </div>
          <label class="switch">
            <input type="checkbox" id="notif-toggle" ${s.notificationsEnabled ? 'checked' : ''}>
            <span class="slider round"></span>
          </label>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-row" id="btn-about" style="cursor: pointer;">
          <div class="row-left">
            ${icon('info', 20)}
            <span>${STRINGS.settings_about}</span>
          </div>
          ${icon('chevron-right', 18)}
        </div>
      </div>
      
      <div class="settings-group" style="margin-top: var(--space-2);">
        <div class="settings-row" id="btn-update" style="cursor: pointer; background: rgba(16, 185, 129, 0.1); color: var(--color-accent);">
          <div class="row-left">
            ${icon('refresh-cw', 20, 'update-icon')}
            <span style="font-weight: 700;">Vérifier les mises à jour</span>
          </div>
        </div>
        ${state.canInstall || window.deferredPrompt ? `
        <div class="settings-row" id="btn-install" style="cursor: pointer; background: rgba(16, 185, 129, 0.1); color: var(--color-accent);">
          <div class="row-left">
            ${icon('download', 20)}
            <span style="font-weight: 700;">Installer l'application</span>
          </div>
        </div>
        ` : `<div id="btn-install" style="display:none;"></div>`}
      </div>

      <div class="settings-group" style="margin-top: var(--space-4);">
        <div class="settings-row" id="btn-reset" style="cursor: pointer; background: rgba(239, 68, 68, 0.1); color: var(--color-negative);">
          <div class="row-left">
            ${icon('trash-2', 20)}
            <span style="font-weight: 700;">Réinitialiser l'application</span>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-reset').onclick = async () => {
    const confirmed = await showDialog({
      type: 'danger',
      icon: 'trash-2',
      title: 'Réinitialiser l\'application ?',
      message: 'Toutes vos données, favoris et paramètres seront supprimés. Cette action est irréversible.',
      confirmText: 'Tout effacer',
      cancelText: 'Annuler',
      confirmStyle: 'danger'
    });
    if (confirmed) {
      localStorage.clear();
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let reg of registrations) {
          await reg.unregister();
        }
      }
      window.location.href = window.location.pathname;
    }
  };

  document.getElementById('notif-toggle').onchange = (e) => {
    updateSettings({ notificationsEnabled: e.target.checked });
  };

  document.getElementById('btn-about').onclick = () => {
    window.location.hash = '#/about';
  };

  document.getElementById('btn-update').onclick = async (e) => {
    const btn = e.currentTarget;
    const iconEl = btn.querySelector('.update-icon');
    const textEl = btn.querySelector('span');
    const originalText = textEl.innerText;

    // Start cooler animation
    btn.classList.add('pulse');
    textEl.innerText = "Recherche...";
    if (iconEl) iconEl.classList.add('spin');

    try {
      // Artificial delay for UX "checking" feel
      await new Promise(r => setTimeout(r, 1200));
      const res = await fetch(`version.json?t=${Date.now()}`);
      const data = await res.json();

      // Stop animation early if we show dialog
      btn.classList.remove('pulse');
      textEl.innerText = originalText;
      if (iconEl) iconEl.classList.remove('spin');

      // Compare versions
      if (data.version && data.version !== APP_VERSION) {
        const confirmed = await showDialog({
          type: 'info',
          icon: 'star',
          title: 'Mise à jour disponible !',
          message: `<div style="text-align:left; font-size:14px; margin-bottom:12px;">Une nouvelle version (<strong>${data.version}</strong>) est prête à être installée.<br><br><strong>Nouveautés :</strong><br>• ${data.changes.join('<br>• ')}</div>`,
          confirmText: 'Mettre à jour',
          cancelText: 'Plus tard',
          confirmStyle: 'confirm'
        });

        if (confirmed) {
          showToast('Installation de la mise à jour...');
          // SIMULATE UPDATE PERSISTENCE FOR OUR LOCAL DEMO
          localStorage.setItem('dx_installed_version', data.version);

          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let reg of registrations) {
              await reg.unregister();
            }
          }
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
          }
          // Force reload bypasses cache and installs new SW/assets, keeping localStorage intact
          setTimeout(() => window.location.reload(true), 800);
        }
      } else {
        showToast("L'application est à jour.");
      }
    } catch (err) {
      console.error(err);
      btn.classList.remove('pulse');
      textEl.innerText = originalText;
      if (iconEl) iconEl.classList.remove('spin');
      showToast('Impossible de vérifier les mises à jour.');
    }
  };

  // Check if installable
  if (window.deferredPrompt || state.canInstall) {
    const btn = document.getElementById('btn-install');
    if (btn) {
      btn.style.display = 'flex';
      btn.onclick = async () => {
        if (window.deferredPrompt) {
          window.deferredPrompt.prompt();
          const { outcome } = await window.deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            window.deferredPrompt = null;
            btn.style.display = 'none';
          }
        }
      };
    }
  }
}

export function renderAbout(container) {
  container.innerHTML = `
    <header class="page-header" style="display: flex; align-items: center; justify-content: space-between;">
      <h1 class="h1" style="margin:0;">À propos</h1>
      <div id="btn-back" style="cursor: pointer; padding: 4px; border-radius: 50%; background: var(--color-surface); display: flex; align-items: center; justify-content: center;">
        ${icon('x', 24)}
      </div>
    </header>

    <div class="settings-list" style="padding-bottom: var(--space-4);">
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; margin: var(--space-4) 0;">
        <div style="width: 80px; height: 80px; background: var(--color-surface); border-radius: 20px; display: flex; justify-content: center; align-items: center; color: var(--color-accent); box-shadow: var(--shadow-card);">
          ${icon('trending-up', 40)}
        </div>
        <h2 class="h2" style="margin-top: 8px;">DinarExchange</h2>
        <span style="color: var(--color-text-secondary); font-size: 14px; font-weight: 600;">Version ${APP_VERSION}</span>
      </div>

      <div class="settings-group">
        <div class="settings-row" style="cursor:pointer;" onclick="window.location.hash='#/tos'">
          <div class="row-left">
            ${icon('file-text', 20)}
            <span>Conditions d'utilisation</span>
          </div>
          ${icon('chevron-right', 18)}
        </div>
        <div class="settings-row" style="cursor:pointer;" onclick="window.location.hash='#/privacy'">
          <div class="row-left">
            ${icon('shield', 20)}
            <span>Politique de confidentialité</span>
          </div>
          ${icon('chevron-right', 18)}
        </div>
        <div class="settings-row" style="cursor:pointer;" onclick="window.location.hash='#/legal'">
          <div class="row-left">
            ${icon('info', 20)}
            <span>Mentions légales</span>
          </div>
          ${icon('chevron-right', 18)}
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-row" style="cursor:pointer; flex-direction:column; align-items:flex-start; gap: 6px;" onclick="window.location.hash='#/dev'">
          <div style="display:flex; justify-content:space-between; width:100%;">
            <div class="row-left">
              ${icon('code', 20)}
              <span>Développeur</span>
            </div>
            ${icon('chevron-right', 18)}
          </div>
          <div style="padding-left: 28px;">
            <span class="value" style="font-weight:700; font-size: 14px; color: var(--color-accent); letter-spacing: 0.5px;">LOUNIS</span>
          </div>
        </div>
        <div class="settings-row">
          <div class="row-left">
            ${icon('database', 20)}
            <span>Données Officielles</span>
          </div>
          <span class="value" style="font-weight:600;">Frankfurter API</span>
        </div>
        <div class="settings-row">
          <div class="row-left">
            ${icon('refresh-cw', 20)}
            <span>Données Parallèles</span>
          </div>
          <span class="value" style="font-weight:600;">Square Port-Saïd</span>
        </div>
      </div>

      <p style="text-align: center; color: var(--color-text-secondary); font-size: 13px; margin-top: var(--space-4);">
        Fait avec ❤️ en Algérie
      </p>
    </div>
  `;

  document.getElementById('btn-back').onclick = () => {
    window.history.back();
  };
}

export function renderTextPage(container, route) {
  let title = '';
  let content = '';

  if (route === '#/tos') {
    title = "Conditions d'utilisation";
    content = `
      <div style="display:flex; justify-content:center; margin-bottom: var(--space-4); color: var(--color-accent);">${icon('file-text', 48)}</div>
      <p style="margin-bottom: 16px;"><strong>Bienvenue sur DinarExchange.</strong> En utilisant cette application, vous acceptez les présentes conditions d'utilisation.</p>
      <p style="margin-bottom: 16px;">Les taux de change affichés proviennent de l'API Frankfurter pour le marché officiel, et de sources estimatives (Square Port-Saïd) pour le marché parallèle.</p>
      <p style="margin-bottom: 16px;"><strong>Avertissement :</strong> DinarExchange est fourni à titre strictement informatif. Les taux peuvent varier et ne constituent en aucun cas un conseil financier, une incitation à l'achat ou à la vente de devises.</p>
      <p>L'éditeur décline toute responsabilité quant à l'exactitude absolue des taux parallèles affichés, ceux-ci étant soumis à une forte volatilité.</p>
    `;
  } else if (route === '#/privacy') {
    title = "Politique de confidentialité";
    content = `
      <div style="display:flex; justify-content:center; margin-bottom: var(--space-4); color: var(--color-accent);">${icon('shield', 48)}</div>
      <p style="margin-bottom: 16px;">Votre confidentialité est notre priorité absolue.</p>
      <p style="margin-bottom: 16px;"><strong>Aucune collecte de données :</strong> DinarExchange ne collecte, ne stocke ni ne partage aucune donnée personnelle vous concernant.</p>
      <p style="margin-bottom: 16px;"><strong>Stockage local :</strong> Toutes vos préférences, y compris vos favoris, la langue et le thème, sont stockées localement sur votre appareil (via LocalStorage).</p>
      <p><strong>Réseau :</strong> Les requêtes vers les API de taux de change sont totalement anonymes.</p>
    `;
  } else if (route === '#/legal') {
    title = "Mentions légales";
    content = `
      <div style="display:flex; justify-content:center; margin-bottom: var(--space-4); color: var(--color-accent);">${icon('info', 48)}</div>
      <p style="margin-bottom: 16px;"><strong>Éditeur de l'application :</strong> LOUNIS NAIT BELKACEM</p>
      <p style="margin-bottom: 16px;"><strong>Hébergement et API :</strong> L'application est un projet web statique (PWA). Les données du marché officiel sont fournies gracieusement par <em>Frankfurter API</em> (Projet Open Source).</p>
      <p style="margin-bottom: 16px;"><strong>Licence :</strong> DinarExchange est un outil à usage personnel. Toute reproduction partielle ou totale du design ou du code à des fins commerciales sans autorisation est strictement interdite.</p>
    `;
  } else if (route === '#/dev') {
    title = "Développeur";
    content = `
      <div style="display:flex; justify-content:center; margin-bottom: var(--space-4); color: var(--color-accent);">${icon('code', 48)}</div>
      <h3 class="h3" style="text-align: center; margin-bottom: 8px;">LOUNIS NAIT BELKACEM</h3>
      <p style="text-align: center; margin-bottom: 24px; color: var(--color-text-secondary);">Créateur & Développeur</p>
      <p style="margin-bottom: 16px;">Passionné par la création d'outils numériques modernes et intuitifs pour les Algériens.</p>
      <p style="margin-bottom: 16px;">DinarExchange a été conçu avec une attention particulière portée à l'expérience utilisateur, l'esthétique et la performance (PWA hors-ligne).</p>
      <div style="text-align: center; margin-top: 32px; padding: 16px; background: var(--color-surface); border-radius: var(--radius-card);">
        <p style="font-weight: 600; margin-bottom: 8px;">Un problème ou une suggestion ?</p>
        <p style="font-size: 14px; color: var(--color-text-secondary);">Merci de soutenir le projet !</p>
      </div>
    `;
  }

  container.innerHTML = `
    <header class="page-header" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--color-border); margin-bottom: var(--space-4);">
      <div id="btn-back" style="cursor: pointer; padding: 4px; border-radius: 50%; background: var(--color-surface); display: flex; align-items: center; justify-content: center;">
        ${icon('chevron-left', 24)}
      </div>
      <h1 class="h2" style="margin:0;">${title}</h1>
      <div style="width: 32px;"></div> <!-- Spacer for center alignment -->
    </header>
    
    <div style="padding: 0 var(--space-4) calc(100px + env(safe-area-inset-bottom)); color: var(--color-text-primary); line-height: 1.7; font-size: 15px;">
      ${content}
    </div>
  `;

  document.getElementById('btn-back').onclick = () => {
    window.history.back();
  };
}
