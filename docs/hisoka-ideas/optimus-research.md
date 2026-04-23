# Optimus — Trading Bot Stack Research (2026-04-23)

> Deep research : market-data layer + execution layer pour bot autonome.
> Contraintes : zéro KYC (gate expat PT/MA), cost FIXED ou FREE, VPS Linux existant, latence ms prioritaire.

---

## TL;DR

- **Data** : Binance WS (primary, gratuit, 25 ms push) + Hyperliquid WS (fallback crypto + feed exec unique).
- **Execution** : Hyperliquid (primary, no-KYC, 0.2 s finality, 0.015/0.045 %) + paper-trading NautilusTrader en amont.
- **Framework** : NautilusTrader (Rust core + Python) déployé sur VPS Linux systemd — PAS Vercel (cold start + zéro WS natif).

---

## 1. Data layer (market data temps réel)

### Reco primary : Binance WebSocket (public streams)

| Critère | Valeur |
|---|---|
| Latence push | **25 ms** sur SBE streams à partir du 2026-05-05 (avant : 50 ms) |
| Coût | **0 € / mois** — WS ne consomme pas de request-weight |
| Rate limit | 300 connexions / 5 min / IP, 10 msgs/s entrants, 1024 streams / connexion |
| Auth | Anonyme pour public streams (pas de KYC pour lecture marché) |
| Coverage | ~600 paires spot + ~400 perpétuels USDⓈ-M |
| Historique backtest | REST klines 1m → 5 ans (gratuit) |

**Pourquoi primary** : latence imbattable sur le gratuit, infra éprouvée, intégré nativement dans CCXT / NautilusTrader / Freqtrade. Le streaming public **n'exige pas de KYC** (seul le trading réel l'exige) — compatible avec le gate `feedback_llc_gate_expat`.

**Risque** : Binance bloque certains pays (Maroc greylist FATF 2024 — Binance a coupé en 2024). Si user passe par MA, il faudra passer sur **Bybit WS** ou **Hyperliquid WS** pour la data aussi.

### Fallback : Hyperliquid WebSocket

| Critère | Valeur |
|---|---|
| Latence push | sub-ms possible via gateway privé, ~100 ms API publique |
| Coût | **0 €** |
| Rate limit | 100 msgs/s par connexion WS, 1200 req/min REST |
| Auth | Wallet-based, zéro KYC |
| Coverage | ~150 perps crypto (BTC/ETH/SOL + alts) |
| Bonus | Même feed que l'exécution → cohérence parfaite slippage |

Avantage systémique : si on exécute sur Hyperliquid, **utiliser la même WS** élimine le drift entre price-feed et order-book réel. Évite les arbitrages de latence entre 2 exchanges.

### Alternatives évaluées (écartées pour MVP)

| Solution | Pourquoi écartée |
|---|---|
| **Bybit WS v5** | 50 ms spot / 100 ms derivs. Backup viable, mais KYC obligatoire côté exec donc moins strat quand on trade PT/MA avant expat. |
| **CCXT Pro** | Abstraction sympa mais **payant** (≥ $90/mo), signing overhead, use-case = multi-exchange. Pour MVP 1 venue = overkill. |
| **Polygon.io (ex-Massive)** | <10 ms sur stocks/US equities, mais **$29/mo** min pour WS, pas de crypto pertinent. À ressortir si pivot vers stocks. |
| **Finnhub** | Free 60 req/min, ~100 ms WS stocks. OK pour watchlist US mais payant pour temps réel sérieux. |
| **Twelve Data** | WS payant (free = REST 200-500 ms). Trop lent pour intraday. |
| **TAAPI.io** | Indicateurs pré-calculés. Pratique mais **1 connexion WS max** + 5 sub/s. Latence = latence exchange + TAAPI. Pas pour scalping. |
| **Alpaca** | Stocks/crypto US, 30-50 ms, gratuit. À garder pour une v2 "stocks" — pas pertinent pour Optimus crypto MVP. |

### Sources data layer

- https://developers.binance.com/docs/binance-spot-api-docs/websocket-api/rate-limits
- https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/websocket
- https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/optimizing-latency
- https://bybit-exchange.github.io/docs/v5/websocket/public/ticker
- https://polygon.io/pricing
- https://taapi.io/documentation/rate-limits/
- https://docs.alpaca.markets/docs/streaming-market-data
- https://www.datawallet.com/crypto/binance-restricted-countries

---

## 2. Execution layer (placement d'ordres)

### Reco primary : Hyperliquid

| Critère | Valeur |
|---|---|
| KYC | **Aucun** — wallet seulement (MetaMask / Keplr) |
| Latence order-match | ~0.2 s finality (HyperBFT consensus) ; sub-ms via private gateway si besoin |
| Throughput | 200k orders/s théoriques, 1200 req/min par user |
| Fees | Taker 0.045 % / Maker 0.015 % ; -40 % possible via staking HYPE + referral |
| Paper trading | Testnet Hyperliquid (Arbitrum Sepolia) — symétrique prod |
| Markets | ~150 perps crypto + vaults |
| Custody | Non-custodial — fonds dans wallet, pas chez l'exchange |

**Pourquoi primary** : c'est la **seule venue sérieuse no-KYC avec latence sub-seconde** en 2026. Compatible gate expat (zéro lien LLC/institutionnel). On-chain settlement = pas de risque "exchange fermé comme FTX". Fees compétitifs vs Binance perp (0.02/0.05 %).

**Risque #1** : on-chain ≠ instant fill comme Binance (1.1 s vs ~50 ms). Pour scalping HFT c'est disqualifiant ; **pour Optimus (MVP swing/trend-following)** ça passe. À noter sur la roadmap : si stratégie devient high-freq, il faudra déployer un node privé Hyperliquid (HypeRPC / Dwellir) pour récupérer la sub-ms.

### Fallback : Paper trading NautilusTrader local (puis Bybit après expat)

Avant que l'user soit expat PT/MA : **uniquement paper trading** (simulateur NautilusTrader contre feed Binance live). Zéro ordre réel = zéro exposition KYC/fiscale.

Après expat :
- **Bybit** : KYC Level 1 OK (passeport + justif PT ou MA), fees perp 0.02/0.055 %, API stable, CCXT-ready.
- **dYdX v4** : no-KYC mais latence ~1.1 s (1 block), throughput 1500 ord/s — moins réactif qu'Hyperliquid.
- **Alpaca** : si pivot vers stocks US (paper trading gratuit, live nécessite US account).

### Framework trading : NautilusTrader

| Critère | Valeur |
|---|---|
| Licence | LGPL v3 (private IP OK) |
| Perf | Rust core + Python strat = nanosecond resolution, async tokio |
| Paper + live | Oui, mêmes adapters |
| Hyperliquid adapter | **Officiel, à jour mars 2026** (order modify support) |
| Backtest | Event-driven, pas de look-ahead bias |
| Multi-venue | Oui (Binance + Hyperliquid + Bybit + Alpaca dans le même process) |

### Frameworks alternatifs (écartés)

| Framework | Verdict |
|---|---|
| **Freqtrade** | 25k stars, FreqAI (ML), mais **spot only** historiquement, perps support limité, pas d'adapter Hyperliquid natif. Bon pour stratégies signal crypto classic. |
| **Jesse** | MIT, clean API, bon backtest, mais **crypto spot/perp limité** à Binance/Bybit/Bitfinex. Pas d'Hyperliquid. |
| **Hummingbot** | Excellent pour **market-making** (pas le use-case Optimus), C++/Python lourd à setup. |
| **Custom Python + CCXT Pro** | Flexible mais CCXT Pro payant, on réinvente la roue de NautilusTrader. |

### Sources execution layer

- https://hyperliquid.gitbook.io/hyperliquid-docs/trading/fees
- https://nautilustrader.io/docs/latest/integrations/hyperliquid/
- https://github.com/nautechsystems/nautilus_trader
- https://docs.dydx.exchange/introduction-onboarding_faqs
- https://whaleportal.com/blog/bybit-kyc-verification-guide/
- https://alexbobes.com/crypto/best-freqtrade-alternatives/

---

## 3. Stack MVP suggéré

```
┌─ VPS Linux existant (PAS Vercel) ────────────────────────────┐
│                                                               │
│  ┌─ NautilusTrader (systemd service, Python 3.12) ─────────┐ │
│  │                                                          │ │
│  │   DataClient ← WS Binance (25 ms push)                   │ │
│  │   DataClient ← WS Hyperliquid (redondance + exec feed)   │ │
│  │   Strategy (Python) → Risk Engine → ExecutionClient      │ │
│  │   ExecutionClient → Hyperliquid REST/WS (no-KYC)         │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─ Supabase (existant CC) ─┐   ┌─ CC dashboard ──────────┐  │
│  │ trades, positions, PnL   │←──│ /admin/hisoka/optimus   │  │
│  └──────────────────────────┘   │ Aria voice + metrics    │  │
│                                 └─────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

**Pourquoi pas Vercel** : serverless functions **ne supportent pas les WebSockets persistants**, et cold-start 2-3 s = mort pour un bot. Fluid Compute améliore (99.37 % zero cold-start) mais toujours stateless. Le seul rôle pertinent pour Vercel = **dashboard** (/admin/hisoka/optimus dans CC) + webhook entrant (TradingView alerts si besoin).

**Budget MVP** :

| Option | Setup | Mensuel |
|---|---|---|
| **FREE** | VPS existant + Binance WS public + paper trading NautilusTrader | **0 €** |
| **FIXED** | + node Hyperliquid privé (Dwellir/HypeRPC ~€29/mo) quand live | **~30 €** |
| **HYBRID** | FIXED + TAAPI.io Pro ($99/mo) si indicateurs pré-calculés | **~120 €** |

Reco : **FREE pendant les 2-3 premiers mois** (stratégie + backtest + paper). **FIXED quand on passe live post-expat**.

---

## 4. Prochaines étapes concrètes

1. **Scaffolder le service VPS** : créer `/root/optimus/` avec NautilusTrader venv Python 3.12, systemd unit `optimus.service` (auto-restart, logs journald). Binance + Hyperliquid adapters installés. Cible : service `active (running)` en ≤ 2 h.
2. **Brancher data feed Binance** : DataClient sur 5-10 paires prioritaires (BTC/USDT, ETH/USDT, SOL/USDT + 2-3 alts). Persister ticks dans table `optimus_ticks` Supabase. Mesurer latence p50/p99 pendant 24 h pour valider < 100 ms bout-en-bout.
3. **Écrire stratégie #1 en mode paper** : trend-following simple (EMA 20/50 crossover + ATR stop) sur NautilusTrader. Backtest 2 ans puis paper 7 jours live. Gate : Sharpe > 1.0 en paper avant tout ordre réel.
4. **Dashboard CC** : page `/admin/hisoka/optimus` dans cc-dashboard — PnL live, open positions, latence feed, kill-switch. Réutilise briques CC (shadcn + Supabase realtime).
5. **Gate LLC/expat** : poser un flag env `OPTIMUS_LIVE_ALLOWED=false` par défaut. NautilusTrader refuse les ordres réels tant que `false`. Flip à `true` **uniquement après** expat PT ou MA effective + wallet funded. Respecte `feedback_llc_gate_expat`.

---

## Risque #1

**Hyperliquid on-chain latency (~1.1 s)** tue toute stratégie HFT/scalping. Mitigation : cibler d'abord stratégies **swing/trend sur timeframe 15 min–4 h** où 1 s de latence est négligeable. Si l'user veut du scalping, il faudra soit node privé Hyperliquid (infra lourde), soit accepter Bybit + KYC post-expat.
