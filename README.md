# DinarExchange 🇩🇿

> Taux de change officiels et parallèles du Dinar algérien — en temps réel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/DinarExchange)

## ✨ Fonctionnalités

- **Double marché** — Taux officiels (Banque d'Algérie / BCE) et taux du marché parallèle (Square Port-Saïd) côte à côte
- **Convertisseur** — Conversion instantanée entre devises avec choix du taux officiel ou parallèle
- **Graphiques historiques** — Visualisez l'évolution des taux sur 7, 30 ou 90 jours
- **Favoris** — Épinglez vos devises pour un accès rapide
- **Hors-ligne** — Fonctionne sans connexion grâce au Service Worker (PWA)
- **Installable** — Ajoutez l'app à votre écran d'accueil comme une app native
- **Mises à jour automatiques** — Détection et installation de nouvelles versions sans perdre vos données

## 📱 Devises suivies

`USD` `EUR` `GBP` `CHF` `CAD` `AED` `SAR` `CNY` `TRY` `TND` `MAD` `JPY`

## 🛠️ Stack technique

| Technologie | Usage |
|---|---|
| Vanilla JS (ES Modules) | Logique applicative |
| CSS Custom Properties | Design system complet |
| Canvas API | Graphiques historiques |
| Service Worker | Cache offline & mises à jour |
| LocalStorage | Préférences utilisateur |

> **Aucun framework, aucun bundler, aucune dépendance npm.** Le projet est 100% statique et prêt à déployer.

## 🚀 Déploiement

### Vercel (recommandé)

1. Forkez ce dépôt
2. Connectez-le à [Vercel](https://vercel.com)
3. Déployez — c'est tout ! Aucune configuration requise.

Le fichier `vercel.json` gère automatiquement :
- Le routage SPA (toutes les routes → `index.html`)
- Les types MIME corrects (pas de mismatch CSS/JS)
- Les headers du Service Worker

### Hébergement statique

Le projet est un site statique pur. Copiez tous les fichiers dans n'importe quel serveur web.

## 📁 Structure du projet

```
DinarExchange/
├── index.html          # Point d'entrée
├── app.js              # Routeur SPA & bootstrap
├── render.js           # Composants UI (toutes les vues)
├── store.js            # State management (LocalStorage)
├── api.js              # Appels API Frankfurter
├── config.js           # Configuration & chaînes i18n
├── charts.js           # Rendu Canvas des graphiques
├── icons.js            # Bibliothèque d'icônes SVG
├── dialog.js           # Système de boîtes de dialogue
├── style.css           # Design system complet
├── fonts.css           # @font-face declarations
├── service-worker.js   # Cache offline PWA
├── manifest.json       # PWA manifest
├── version.json        # Versioning pour les mises à jour
├── parallel.json       # Taux du marché parallèle
├── official-cache.json # Cache des taux officiels
├── vercel.json         # Configuration Vercel
├── robots.txt          # Directives SEO
├── sitemap.xml         # Plan du site
├── llms.txt            # Description pour les IA
├── icons/              # Icônes PWA (192, 512, maskable)
├── assets/             # Logo & drapeaux
│   ├── logo.svg
│   ├── logo.png
│   └── flags/          # Drapeaux SVG par devise
└── fonts/              # Polices (Inter) en local
```

## 🔗 Sources de données

- **Taux officiels** : [Frankfurter API](https://www.frankfurter.app/) — données de la Banque Centrale Européenne
- **Taux parallèles** : Estimations basées sur le Square Port-Saïd d'Alger

## 📄 Licence

Tous droits réservés. © LOUNIS NAIT BELKACEM

---

*Fait avec ❤️ en Algérie*
