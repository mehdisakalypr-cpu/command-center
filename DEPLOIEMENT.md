# THE ESTATE — Feuille de route Déploiement

> Fichier de suivi inter-sessions. Mettre à jour le statut à chaque intervention.
> Dernière mise à jour : 2026-04-02

---

## Fichiers de config serveur (créés ✅)

| Fichier | Plateforme | Statut |
|---------|-----------|--------|
| `netlify.toml` | Netlify | ✅ Prêt |
| `_redirects` | Netlify (fallback) | ✅ Prêt |
| `vercel.json` | Vercel | ✅ Prêt |
| `.htaccess` | Apache / OVH / cPanel | ✅ Prêt |
| `nginx.conf` | VPS Nginx | ✅ Prêt (adapter le domaine) |
| `robots.txt` | Tous | ✅ Prêt |

Tous incluent : redirect HTTP→HTTPS 301, HSTS, X-Frame-Options, nosniff,
Referrer-Policy, Permissions-Policy, cache HTML/JS/CSS.

---

## Checklist avant mise en production

### 🔴 Critique — Sécurité

- [x] **Indice credentials retiré de l'écran de login**
  Ligne `Accès demo — g.dupont@… / Estate2026!` supprimée du HTML visible.
  Les credentials restent dans le JS (inévitable sans backend).

- [ ] **Migrer l'authentification vers un vrai backend**
  Actuellement : login 100% JS côté client, contournable par la console.
  Options recommandées :
  - **Netlify Identity** (gratuit, zero-config, compatible site statique)
  - **Supabase Auth** (gratuit tier, PostgreSQL inclus, idéal quand l'API Booking sera branchée)
  - **Firebase Auth** (Google, gratuit tier généreux)
  Priorité : à faire avant ouverture à des utilisateurs extérieurs.

- [ ] **Proxy pour les clés API Booking.com / Amadeus**
  Quand les vraies API seront connectées, les clés ne doivent PAS être
  dans le JS front (visibles dans le source).
  Solution : fonction serverless (Netlify Functions / Vercel Edge Functions)
  qui fait le relais entre le front et les API.

### 🟡 Important — Contenu & Licences

- [ ] **Remplacer les images Unsplash par les vraies photos des hôtels**
  Usage commercial d'Unsplash nécessite une licence payante (Unsplash+).
  Alternative : demander les photos officielles aux hôtels partenaires,
  ou utiliser un service de stock photos sous licence (Getty, Shutterstock).

- [x] **Auto-héberger les dépendances CDN critiques**
  Toutes les dépendances sont désormais locales dans `/assets/` :
  - `assets/fonts/fonts.css` + 25 fichiers woff2 (Playfair Display, Cormorant Garamond, Inter)
  - `assets/css/font-awesome.min.css` + `assets/webfonts/` (3 woff2)
  - `assets/css/maplibre-gl.css` + `assets/js/maplibre-gl.js`
  - `assets/css/leaflet.css` + `assets/js/leaflet.js`
  - `assets/js/chart.umd.min.js`
  Note : les tuiles de carte Carto restent externes (normal — données cartographiques).

### 🟢 Confort — UX & SEO

- [x] **Favicon** — fichier `favicon.svg` créé, lien ajouté dans tous les HTML.

- [x] **Meta description** — ajoutée dans tous les HTML (index, dashboard,
  map, faq, concierge, reservations, vouchers).

- [x] **Open Graph / Twitter Card**
  Ajout sur les 7 pages HTML avec domaine `the-estate.app` (à adapter).
  Image `og-cover.svg` fournie (à exporter en JPG 1200×630 et uploader).
  Domaine dans les URLs OG : remplacer `the-estate.app` par le vrai domaine.

- [x] **PWA complète**
  `manifest.json` avec raccourcis Dashboard / Carte / Aria.
  `sw.js` : Service Worker stale-while-revalidate, cache offline pour les 7 pages + assets locaux.
  Enregistrement SW intégré dans les 7 HTML.

- [ ] **Domaine personnalisé + certificat SSL**
  1. Acheter le domaine (ex: the-estate.app, the-estate.io)
  2. Pointer les DNS vers l'hébergeur
  3. SSL auto : Netlify/Vercel le génèrent seuls
     VPS : `certbot --nginx -d the-estate.com`
  Renouvellement Let's Encrypt : automatique tous les 90 jours.

- [ ] **Mettre à jour les URLs Open Graph** avec le vrai domaine
  Chercher `the-estate.app` dans les 7 HTML et remplacer par le domaine réel.
  Exporter `og-cover.svg` en JPG 1200×630 et uploader comme `og-cover.jpg`.

---

## Infrastructure cible recommandée

```
Netlify (statique)          ← option la plus simple, zero-config
  + Netlify Identity        ← auth
  + Netlify Functions       ← proxy API Booking/Amadeus

OU

Vercel (statique)
  + Supabase Auth + DB      ← auth + données persistantes
  + Vercel Edge Functions   ← proxy API
```

---

## Historique des sessions

| Date | Travaux effectués |
|------|------------------|
| Session 1-3 | map.html (21 hôtels), dashboard.html (tous onglets), Revenue Intelligence |
| Session 4 | Auth login/2FA/biométrie, membres & partage voyages, ADR corrigés, 12 hôtels Marrakech, Explorer Booking city filter, Concierge IA FAB |
| Session 5 | faq.html, concierge.html (App Companion Aria, flows PURCHASE/BOOK/TRIPS/VOUCHER/GUEST) |
| Session 6 | map.html : 33 hôtels, clustering MapLibre, cercles couleur groupe, recherche ville+pays, fitBounds, filtre 5★ défaut, renderWorldCopies:false, i18n FR/EN/ES, sélecteur langue ; dashboard : fix cloche alertes ; déploiement : netlify.toml, .htaccess, vercel.json, nginx.conf, robots.txt, favicon, meta descriptions |
| Session 7 | PWA : manifest.json + sw.js (offline cache) ; Open Graph + Twitter Card sur 7 pages ; og-cover.svg ; auto-hébergement complet CDN (Google Fonts 25 woff2, Font Awesome, MapLibre, Leaflet, Chart.js) ; DEPLOIEMENT.md mis à jour |
