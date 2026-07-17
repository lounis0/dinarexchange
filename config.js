export const APP_VERSION = localStorage.getItem('dx_installed_version') || "0.9.9";
export const UNIRATE_API_KEY = "YOUR_UNIRATE_API_KEY"; // Replace with your real API key
export const UNIRATE_BASE_URL = "https://api.unirateapi.com/api";

export const TRACKED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AED', 'SAR', 'CNY', 'TRY', 'TND', 'MAD', 'JPY'
];

export const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes

export const STORAGE_KEYS = {
  OFFICIAL_CACHE: 'dx_official_cache',
  PARALLEL_HISTORY: 'dx_parallel_history',
  FAVORITES: 'dx_favorites',
  SETTINGS: 'dx_settings',
  ONBOARDED: 'dx_onboarded',
};

// French strings as requested (default and only language for v1)
export const STRINGS = {
  app_name: "DinarExchange",
  greeting_morning: "Bonjour",
  greeting_afternoon: "Bon après-midi",
  greeting_evening: "Bonsoir",
  search_placeholder: "Rechercher une devise...",
  all_rates: "Taux de change",
  favorites: "Favoris",
  nav_home: "Accueil",
  nav_converter: "Convertisseur",
  nav_favorites: "Favoris",
  nav_settings: "Paramètres",
  official: "OFFICIEL",
  parallel: "PARALLÈLE",
  updated: "Mis à jour",
  offline_showing_last: "Hors ligne — derniers taux connus",
  convert: "Convertir",
  buy: "Achat",
  sell: "Vente",
  last_7_days: "7 derniers jours",
  range_7d: "7J",
  range_30d: "30J",
  range_90d: "90J",
  parallel_history_since: "Historique parallèle depuis",
  added_favorite: "Ajouté aux favoris",
  removed_favorite: "Retiré des favoris",
  no_favorites: "Aucun favori pour le moment",
  browse_rates: "Parcourir les taux",
  no_results: "Aucun résultat trouvé",
  settings_theme: "Thème",
  settings_theme_light: "Clair",
  settings_theme_dark_coming: "Sombre — Bientôt disponible",
  settings_reset: "Réinitialiser l'application",
  settings_language: "Langue",
  settings_language_fr: "Français",
  settings_language_en_coming: "English — Bientôt",
  settings_language_ar_coming: "العربية — Bientôt",
  settings_notifications: "Notifications",
  settings_about: "À propos",
  settings_version: "Version 1.1.0",
  settings_built_by: "Construit par LOUNIS",
  settings_install: "Installer l'application",
  onboarding_slide1_title: "Taux réels, en temps réel",
  onboarding_slide1_desc: "Consultez les taux de change officiels et du marché parallèle (square) au même endroit.",
  onboarding_slide2_title: "Convertisseur instantané",
  onboarding_slide2_desc: "Calculez vos échanges avec précision sans quitter l'application.",
  onboarding_slide3_title: "Restez informé",
  onboarding_slide3_desc: "Ajoutez vos devises aux favoris pour un accès rapide.",
  get_started: "Commencer"
};
