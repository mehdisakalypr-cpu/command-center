# Optimus — Trading Bot Stack V2 — Research Exhaustif
> Data: 2026-04-23 — remplace v1 (optimus-research.md) — analyse vs exécution séparées
> Scope: crypto-first (perps+spot), multi-asset v2 (stocks/options US), horizon 1m/5m/1h bars
> Contraintes: FREE/FIXED/HYBRID only (cf. `feedback_cost_min_fixed`), zéro usage-based
> Gate LLC: pas de KYC institutionnel live avant expat PT/MA (data ingestion sans gate)

---

## TL;DR exécutif
- **Analyse (ingestion+storage+compute)**: primary = **WS direct exchanges (Binance/Bybit/Hyperliquid/Kraken/Coinbase) + CCXT v4** vers **QuestDB** sur VPS. Secondary payant = **Polygon Starter 29 €/mo** (stocks) + **Kaiko on-demand** si institutional needed. Budget phase 1 = **0 €/mo**, phase 2 = **~50 €/mo** (VPS + optional Polygon).
- **Exécution (orders+risk)**: primary = **NautilusTrader** (Rust core, Python API, perps natif Binance/Bybit/Hyperliquid/dYdX). Secondary = **Freqtrade** pour signal-driven + FreqAI. Budget = **0 €/mo** (open-source) + frais exchange.
- **Stack MVP phases**: Phase 1 paper = **~20 €/mo** (VPS Hetzner CX22). Phase 2 live crypto 1 venue = **~50 €/mo**. Phase 3 scale multi-venue + stocks = **~250 €/mo** (Hetzner AX42 dedicated + Polygon Developer + Alpaca Unlimited).
- **Risque #1**: "100% bougies" est un problème d'**ingénierie** (reconnect+gap-fill+dedup), pas de budget — ajouter 500 €/mo à Kaiko ne résout pas un WS qui drop 3s.
- **Chiffre-clé**: QuestDB ingère 1.4M rows/s sur VPS modeste ; 100% couverture 1m sur 200 paires × 5 venues = ~1.44M rows/jour — deux ordres de grandeur sous la capacité matérielle.

---

## Partie A — Layer ANALYSE (ingestion + compute + stockage)

### A.1 Cahier des charges "100% des bougies temps réel"

**Définition précise** : capture sans gap des bougies fermées (is_final=true) aux granularités 1m, 5m, 15m, 1h, 4h, 1d, pour un univers cible progressif :
- Phase 1 : top 50 perps Binance USDT-M = 50 paires × 6 TFs = 300 streams
- Phase 2 : + Bybit/Hyperliquid top 50 chacun = 150 paires × 6 TFs × 3 venues = 2 700 streams
- Phase 3 : + Kraken/Coinbase spot + stocks US (Alpaca/Polygon) ≈ 500 tickers × 6 TFs

**Volume estimé** (1m bars uniquement, le pire) :
- 1 440 bars/jour × 200 paires × 5 venues = **1.44M rows/jour** (1m)
- + trades tick (~50M events/jour sur top 50 pairs)
- Storage 1 an (1m + metadata) ≈ **80-150 GB** compressé QuestDB
- Compute : 1 core suffit à l'ingestion ; 4-8 cores pour TA indicators + pattern scan multi-pair

**Exigences critiques** :
1. **Reconnect auto** exponential backoff (Binance WS disconnect ≥ 24h, ping 20s / pong 1min)
2. **Gap-filling** : au reconnect, appel REST `GET /klines` pour combler les bars manqués (Binance limite 1000 bars/call, dedupe par `open_time`)
3. **Deduplication** par (venue, symbol, timeframe, open_time) — PRIMARY KEY
4. **Time-sync** NTP chronyd ; horodatage exchange > local
5. **Monitoring** par heartbeat : si aucune kline reçue pour symbol X pendant 2×interval, alerte + backfill REST

### A.2 Solutions FREE évaluées

| Solution | Coverage | Latence WS | Limites free | Gap-filling | Note /10 |
|---|---|---|---|---|---|
| **Binance WS direct** | spot+futures, 1000+ pairs, 7 TFs natifs | ~50-100ms | 5 msg/s in, 1024 streams/conn, 300 conn/5min/IP | REST `/klines` 6000 weight/min | **10** |
| **Bybit WS** | perps USDT/inverse, options | ~80ms | 500 topics/conn | REST `/v5/market/kline` 600 req/5s | **9** |
| **Hyperliquid WS** | perps natif L1 chain, sub-1s orderbook | ~200-500ms | no IP rate cap documented | REST `/info` candleSnapshot | **8** (jeune mais critique) |
| **Kraken WS** | spot + futures | ~150ms | 100 subs/conn | REST OHLC (since param) | **8** |
| **Coinbase WS** | spot US, matching engine | ~100ms | 8 subs/conn recommandé | REST `/candles` 6 months max | **7** |
| **CCXT v4 (ex-Pro)** | wrapper 100+ exchanges, WS unifié | +10-30ms overhead | hérite de l'exchange | `watchOHLCV` + `fetchOHLCV` REST fallback | **9** (MIT, plus de sub depuis v1.95+) |
| **Alpaca free tier** | IEX feed only (pas SIP), limite 200/min | ~500ms | IEX partial (~3% volume US) | REST bars | **5** (inutilisable prod) |
| **Finnhub free** | crypto+stock, 60/min | ~500ms | 1 yr history | REST `/candle` | **6** |
| **Twelve Data free** | crypto+stock, 800/jour | N/A | 8 req/min | REST only | **4** |
| **Polygon.io free** | stocks 15-min delayed, 5/min | N/A | pas de WS real-time | REST delayed | **3** |
| **CoinGecko Demo** | 30 req/min, 30d history | N/A | pas de WS | REST only | **3** (prix agrégé, unusable exec) |

### A.3 Solutions PAYANTES évaluées (tarif FIXED)

| Solution | Coverage | Latence | €/mo | Historique | KYC | Note /10 |
|---|---|---|---|---|---|---|
| **Polygon Starter** | stocks unlimited REST | N/A | 29 $ | 5 yrs | aucun | 7 (pas WS) |
| **Polygon Developer** | stocks WS real-time | ~100ms | 79 $ | 5 yrs | aucun | 8 |
| **Polygon Advanced** | stocks + options + crypto WS | ~100ms | 199 $ | 20 yrs | aucun | **9** |
| **Polygon Business** | tout + SLA | <50ms | 2000 $ | 20 yrs | aucun | 7 (overkill) |
| **Alpaca Unlimited** | SIP CTA+UTP 100% vol US + crypto | ~100ms | 99 $ | 5 yrs | US account | **9** (exécution intégrée) |
| **Alpaca Business** | SIP + options | ~100ms | 999 $ | 5 yrs | US account | 7 |
| **CoinAPI Pro** | 400+ exchanges, unified | ~200ms | ~129 $ (tiered) | 8 yrs tick | aucun | 7 |
| **CoinAPI Enterprise** | full historique tick | <100ms | 499-999 $ | 10 yrs | contract | 8 |
| **Kaiko Essentials** | 100 exchanges, L1/L2 | ~150ms | ~800-2500 $ (non publié, Vendr $9.5k-55k/yr) | 10 yrs | institutional contract | 8 (KYC lourd) |
| **Kaiko Enterprise** | L2, reference rates, BBO | ~100ms | 2000-5000 $+ | 10 yrs | institutional | 9 (overkill MVP) |
| **Databento Standard** | ~200+ venues, équities/futures | flat tier | 199 $ | full L1 | aucun | 8 |
| **Databento Pro** | + options, L2 | low latency | ~500 $+ | full L2 | aucun | 9 (crypto NOT YET natif — seulement CME BTC futures) |
| **Tiingo Power** | stocks IEX, 1 yr | ~500ms | 10 $ | 30 yrs EoD | aucun | 6 |
| **Tiingo Commercial** | + crypto WS | ~300ms | 50-95 $ | 30 yrs | aucun | 7 |
| **IEX Cloud** (retired Aug 2024) | — | — | — | — | — | **N/A** (discontinué) |
| **CryptoCompare Pro** | 300+ exchanges agrégé | ~500ms | 79-599 $ | 10 yrs | aucun | 6 (retail-grade) |
| **CoinGecko Analyst** | 250+ networks | N/A | 129 $ | 15 yrs EoD | aucun | 5 (pas de WS low-latency) |
| **CoinGecko Pro** | + 2M calls | N/A | 499 $ | 15 yrs | aucun | 6 |
| **Tardis.dev** | historique tick raw 25+ venues, WS replay | ~100ms | variable (par venue/mois, ~50-200 $/venue) | 2017+ | aucun | **8** (gold standard historique) |
| **Refinitiv Real-Time** | multi-asset institutional | <50ms | 2000+ $ | 30+ yrs | institutional | 7 (overkill, expat-only) |
| **Bloomberg B-PIPE** | 35M instruments 330 exchanges | <50ms | 50k-200k $/an | 30+ yrs | institutional | 6 (hors scope) |
| **Nasdaq Data Link Basic** | EoD + fundamentals | N/A | 49-499 $ | 20 yrs | aucun | 5 |
| **TradingView Premium** | charts + data, pas de brut API | N/A | 60 $ | — | aucun | 3 (inadapté bot) |

**Observation clé** : le tier "unlock la couverture" pour crypto spot+perps est actuellement *free via WS direct*. Les payants (Kaiko/CoinAPI) n'améliorent la couverture qu'au-delà de 10 venues ou pour L2 full book historique — pas nécessaire phase 1/2.

### A.4 Compute/stockage time-series

| DB | Ingestion rows/s | Query 5m OHLCV | License | Fit Optimus |
|---|---|---|---|---|
| **QuestDB** 8.x | 1.4M+ rows/s single-node | **25 ms** (plus rapide que KDB+) | Apache 2.0 | **Pick #1** — SQL familier, ASOF JOIN natif, Grafana ready, prod chez Tier 1 banks et gros crypto exchanges |
| **ClickHouse** 24.x | 500k-1M rows/s | 547 ms | Apache 2.0 | Alternative analytics lourde, mais ingestion inférieure à QuestDB pour tick |
| **TimescaleDB** | 100-500k rows/s | 1021 ms | Apache 2.0 (core) | Bon si on veut rester full Postgres ; 6-13× plus lent que QuestDB |
| **InfluxDB 3 Core** | 50-100k rows/s | — | MIT | 12-36× plus lent que QuestDB en ingestion |
| **ArcticDB** (Man Group + Bloomberg) | very high | N/A (Python DataFrame query) | BSL 1.1 — **prod use needs paid license** | Excellent recherche Python, mais license bloque prod autonome |
| **kdb+/q** | 3M+ rows/s | 109 ms | commercial 20k-100k $+/an | Référence institutional, hors budget |

**Stack recommandé** : QuestDB comme source de vérité bars+trades + Redis Stream (optionnel) comme bus pub/sub entre ingester → strategy → executor. Pas besoin de Kafka pour phase 1-2 (Kafka utile >10k msg/s sustained, on est 10-100× sous).

### A.5 Recommandation analyse

**Phase 1 (MVP paper, 0-2 mois)** :
- 1 VPS Hetzner CX22 (4 vCPU/8 GB, ~10 €/mo) ou AX42 dedicated si lourd backtest (~60 €/mo)
- Python 3.12 + CCXT v4 (gratuit) ingestion Binance/Bybit/Hyperliquid WS
- QuestDB self-hosted via Docker
- Schéma : `candles(venue, symbol, tf, open_time PK, o, h, l, c, v, trades_count)` partitioned BY DAY
- Gap-filler: cron 1 min → diff WS received vs expected, REST backfill
- **Coût : 10-60 €/mo** (VPS seul)

**Phase 2 (live crypto 1 venue, mois 3-6)** :
- Ajouter 5 venues via CCXT watchOHLCV
- QuestDB + Redis pour cache hot strategies
- Polygon Starter 29 $ si extension stocks US paper
- **Coût : ~50 €/mo**

**Phase 3 (scale multi-venue + stocks, M7+)** :
- Hetzner AX52 (Ryzen 7700/64GB NVMe, ~70 €/mo)
- Alpaca Unlimited 99 $ (SIP + crypto + exec intégrée)
- Polygon Advanced 199 $ (options historiques + indicators)
- Optionnel Tardis.dev pour historique tick (~100-300 $/mo)
- **Coût : 250-400 €/mo**

*Note* : Kaiko/CoinAPI Enterprise (500-5000 €/mo) seulement si Optimus devient market-maker institutionnel avec exigence L2 full historique reconstitué — pas MVP.

---

## Partie B — Layer EXÉCUTION (placement d'ordres + risk management)

### B.1 Cahier des charges exécution

- **Latence cible** : <500ms ordre→ack pour swing trading crypto, <100ms pour scalping (alors VPS Hetzner Falkenstein → Binance Tokyo = ~250ms RTT, borderline : colocation AWS ap-northeast-1 nécessaire pour scalping pur)
- **Reliability** : heartbeat / private WS signed / order reconciliation 5s
- **Paper mode** : indispensable avant live
- **Position sizing** : Kelly / fixed-fractional / vol-targeting natif
- **Stop-loss natif** : OCO/bracket orders ou émulés côté bot
- **Risk engine** : max daily loss, max position, funding rate guard

### B.2 Frameworks évalués

| Framework | Langage | Paper | Live crypto | Live stocks | License | Note |
|---|---|---|---|---|---|---|
| **NautilusTrader** | Rust+Python | oui | Binance/Bybit/Hyperliquid/dYdX/OKX adapters (v1.224 mars 2026) | via IB adapter | LGPL-3.0 | **10** — event-driven, ultra-low latency, production Tier 1 funds, TP/SL natif |
| **Freqtrade** | Python | oui (dry-run) | Binance/Bybit/Kraken/Hyperliquid + 20 ex via CCXT | non natif | GPL-3.0 | **8** — signal-driven + FreqAI ML, grosse communauté (NostalgiaForInfinity), monthly releases |
| **Hummingbot** | C++/Python | oui | CEX+DEX 50+ (Gateway pour DEX on-chain) | non | Apache 2.0 | **8** — spécialiste market-making, Strategy V2 framework, refactor 2026 |
| **Jesse** | Python | oui | Binance/Bybit/Coinbase/FTX-legacy | non | MIT | **7** — clean research API, JesseGPT, pas d'étude look-ahead bias |
| **QuantConnect LEAN** | C#/Python | oui | Multi-broker | Multi-broker | Apache 2.0 | **8** — cloud-first 20-60 $/mo tiers, local LEAN gratuit mais setup lourd |
| **Backtrader** | Python | oui | limité | IB oui | GPL-3.0 | **5** — dev arrêté ~2018, slow iter |
| **VectorBT** | Python | non (backtest only) | — | — | Apache 2.0 | **7** recherche (1000× plus rapide Backtrader) — **pas exécution** |
| **Lumibot** | Python | oui | basique | Alpaca/IB/Tradier | Apache 2.0 | **6** — scaffold retail, transition recherche→live facile |
| **MT5/MetaTrader** | MQL5 | oui | brokers CFD | CFDs | proprietary | 3 (écosystème obsolète, pas crypto natif) |

**Pick** : NautilusTrader pour le core exécution (Rust = pas de GC pauses, event-driven déterministe). Freqtrade en backup pour strategies signal/ML rapides.

### B.3 Venue APIs / brokers évaluées

| Venue | KYC | Latence order | Fees maker/taker | Paper | API style |
|---|---|---|---|---|---|
| **Hyperliquid** | none (wallet signer) | ~800ms on-chain finality, <200ms orderbook | 0.015% / 0.045% | testnet public | REST+WS, ed25519 signature |
| **dYdX v4** | none | <50ms API, ~2s on-chain | 0% rebate / 0.05% | testnet | gRPC+REST+WS, Cosmos SDK |
| **GMX** (v2) | none | block time ARB ~300ms | 0.05-0.08% | non | on-chain RPC |
| **Binance Futures** | full KYC | <50ms | 0.02% / 0.05% | testnet.binancefuture.com | REST+WS+FIX (VIP) |
| **Bybit** | KYC ✓ | <50ms | 0.01% / 0.06% | testnet.bybit.com | REST+WS v5 |
| **Kraken Futures** | KYC ✓ | ~100ms | 0.02% / 0.05% | demo-futures.kraken.com | REST+WS |
| **OKX** | KYC ✓ | <80ms | 0.02% / 0.05% | demo-trading | REST+WS |
| **Alpaca Trading** | US account | ~100ms | 0$ stock, 0.15-0.25% crypto | paper.alpaca.markets | REST+WS unifié |
| **IBKR TWS Gateway** | full KYC | ~100-200ms, 50 msg/s cap | low commission | paper | socket API, 170 markets |
| **Tradier** | US account | ~100ms | $0.35/opt contract | sandbox | REST |
| **Tastytrade** | US account | ~150ms | $1.00/opt | sandbox | REST, 60 RPM |
| **MT5 generic** | variable | 100-500ms | broker-dependent | yes | MQL5 only |

**Choix MVP (pré-expat)** : Hyperliquid (no KYC + sub-1s) pour live crypto ; dYdX v4 en secondary.
**Post-expat PT/MA** : ajouter Binance/Bybit pour CEX liquidity + Alpaca pour stocks/options US.

### B.4 Solutions SaaS "no-code" — utile ou trap ?

| Outil | €/mo | Verdict |
|---|---|---|
| **TradersPost** | 30-100 $ | **Utile** comme pont TradingView alert → broker (Alpaca/IBKR/Tradier). Mais on écrit notre propre strategy, donc no-op pour nous. |
| **3Commas** | 15-50 $ | **Trap** : closed-source, custody clés API, track record discutable, grille ad-hoc vs strategy custom. |
| **Cryptohopper** | 15-99 $ | **Trap** : marketplace stratégies "scam-prone", lock-in propriétaire. |
| **Coinrule** | 0-60 $ | Entry-level seulement, zéro ML. |
| **HaasOnline** | 1250 $/an | Advanced scripting HaasScript mais écosystème fermé, cher. |
| **Gunbot** | 250 $ one-time | Lifetime pricing atypique, support communauté. |
| **Bitsgap** | 29-149 $ | Grid bots préconfigurés, pas custom strategy. |
| **Katoshi.ai** | 99-499 $ | Niche Hyperliquid, récent 2026. |

**Verdict global** : tous ces SaaS sont des **traps** pour Optimus car ils imposent leur moteur ; Optimus a besoin de strategy custom + data lake souverain, donc on reste open-source (Nautilus/Freqtrade).

### B.5 Recommandation exécution

- **Phase 1 (paper MVP)** : NautilusTrader paper + Binance testnet + Hyperliquid testnet. Coût = 0.
- **Phase 2 (live crypto small size, pré-expat)** : Hyperliquid mainnet (pas de KYC), position max 1-5k €, NautilusTrader + custom risk guardrails (max DD 5%/day, kill switch). Coût = frais trading uniquement.
- **Phase 3 (post-expat + stocks)** : ajouter Alpaca Trading (US LLC) + Binance/Bybit (entité appropriée). NautilusTrader multi-adapter.

---

## Partie C — Stack MVP recommandé

**Coût phase 1 paper** : **~20 €/mo** (VPS Hetzner CX22 + domaine) + 0 data + 0 execution.
**Coût phase 2 live crypto 1 venue (Hyperliquid)** : **~50 €/mo** (VPS + Polygon Starter 29 $ optionnel stocks paper).
**Coût phase 3 scale multi-venue + stocks** : **~250-400 €/mo** (Hetzner AX52 70 € + Alpaca Unlimited 99 $ + Polygon Advanced 199 $).

### Diagramme ASCII flux

```
┌─────────────────────────────────────────────────────────────┐
│ VENUES (Binance/Bybit/Hyperliquid/Kraken/Coinbase/Alpaca)   │
└────────┬────────────────────────────────────────────────────┘
         │ WebSocket + REST fallback
         ▼
┌─────────────────────────────────────────────────────────────┐
│ INGESTION LAYER (Python CCXT v4 + venue SDKs)               │
│  - watchOHLCV / subscribe kline topics                      │
│  - reconnect exponential backoff                            │
│  - REST gap-filler (cron 60s)                               │
│  - NTP time-sync                                            │
└────────┬────────────────────────────────────────────────────┘
         │ ILP protocol (Influx Line)
         ▼
┌──────────────┐      ┌──────────────────────┐
│   QuestDB    │──┬──▶│  Redis Stream (opt.) │
│ (bars+trades)│  │   │  hot pub/sub          │
└──────────────┘  │   └──────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ COMPUTE LAYER (Python + Polars + TA-Lib + scikit/PyTorch)   │
│  - TA indicators / pattern recognition                      │
│  - VectorBT backtest research                               │
│  - FreqAI or custom ML retrain                              │
└────────┬────────────────────────────────────────────────────┘
         │ signals
         ▼
┌─────────────────────────────────────────────────────────────┐
│ STRATEGY + EXECUTION (NautilusTrader)                       │
│  - event-driven engine                                      │
│  - risk manager (max DD, max pos, kill switch)              │
│  - venue adapter (Hyperliquid / Binance / Alpaca)           │
└────────┬────────────────────────────────────────────────────┘
         │ orders
         ▼
┌─────────────────┐      ┌─────────────────────────────────┐
│ Exchange / DEX  │─────▶│ Dashboard (Next.js/Vercel)      │
│ (live orders)   │      │ read-only PnL + fills + health  │
└─────────────────┘      └─────────────────────────────────┘
```

---

## Partie D — Risques & mitigations

| # | Risque | Impact | Probabilité | Mitigation |
|---|---|---|---|---|
| 1 | **Gap bougies non détecté** → strategy trade sur données incomplètes → pertes | Haut | Moyenne | Gap-filler cron 60s + heartbeat monitoring + alerte Telegram, CHECKSUM quotidien vs Kaiko free sample |
| 2 | **Flash crash / exchange outage** (Hyperliquid JELLY oct 2025, dYdX) | Haut | Basse | Multi-venue diversification, circuit breakers stop-all, cold wallet séparation |
| 3 | **Overfitting backtest** (data snooping) | Moyen | Haute | Walk-forward validation, out-of-sample holdout 20%, purged K-fold, MCPT |
| 4 | **Regulation** (MiCA EU entré en force juin 2024 ; CLARITY Act US 2025) | Haut | Haute | Trading perso via Hyperliquid DEX avant expat ; post-expat Saga Ventures LLC + Mercury + compliance tracker |
| 5 | **Clé API leak** / custody perte | Haut | Basse | Vault (CC security stack) + IP whitelisting côté exchange + retrait-disabled keys + hardware wallet pour Hyperliquid signer |

---

## Partie E — Prochaines étapes concrètes

1. **Provisionner VPS Hetzner CX22** (10 €/mo) + Docker + QuestDB 8.x + domaine `hisoka-data.internal`.
2. **Implémenter `ingester.py`** Python : 5 venues WS + kline subscribe 1m/5m/1h top 20 USDT perps chacun.
3. **Écrire `gap_filler.py`** cron 60s : diff bars reçus vs attendus par (venue, sym, tf), REST backfill, dedupe UPSERT QuestDB.
4. **Ajouter `heartbeat_monitor.py`** → alerte si symbol sans bar depuis 2×interval, push Telegram.
5. **Installer NautilusTrader 1.224** + Hyperliquid testnet adapter + strategy skeleton EMA cross.
6. **Dashboard read-only Next.js** sur Vercel : PnL testnet, uptime ingestion, lag WS, coverage %.
7. **Backtest VectorBT** sur bars QuestDB (1 an crypto top 20) : grid search paramètres, walk-forward.
8. **Graduation criteria** paper→live : Sharpe >1.0 / maxDD <15% / 90 jours testnet sans gap >2 bars.
9. **Phase 2 switch** : Hyperliquid mainnet, ENV `OPTIMUS_MODE=live`, position max 500 € initial, kill switch manuel.
10. **Phase 3 post-expat** : ouvrir Alpaca LLC account, adapter NautilusTrader stocks, ajouter Polygon Advanced 199 $.

---

## Sources (19 références 2025-2026)

1. [Kaiko Pricing — Vendr buyer guide (avg $28.5k/yr)](https://www.vendr.com/buyer-guides/kaiko) — 2025
2. [Kaiko Pricing 2025 Compare Plans — TrustRadius](https://www.trustradius.com/products/kaikodata/pricing) — 2025
3. [CoinAPI Market Data API Pricing](https://www.coinapi.io/products/market-data-api/pricing) — 2026
4. [CoinAPI — Best Institutional Crypto Market Data API 2026](https://www.coinapi.io/blog/best-institutional-crypto-market-data-api) — 2026
5. [Polygon.io Pricing (rebranded "Massive")](https://polygon.io/pricing) — 2026
6. [Databento Pricing plan changes Jan 2025 — blog](https://databento.com/blog/upcoming-changes-to-pricing-plans-in-january-2025) — 2025-01
7. [Alpaca Market Data — Unlimited $99/mo](https://alpaca.markets/data) — 2026
8. [Alpaca forum — Price of unlimited plan](https://forum.alpaca.markets/t/price-of-unlimited-plan/9957) — 2025
9. [QuantConnect Pricing — Researcher/Team/Institutional](https://www.quantconnect.com/pricing/) — 2026
10. [QuestDB — Benchmark vs InfluxDB 3 Core / TimescaleDB / ClickHouse](https://questdb.com/blog/comparing-influxdb-timescaledb-questdb-time-series-databases/) — 2025
11. [KX Systems — KDB-X vs QuestDB / ClickHouse / TimescaleDB / InfluxDB TSBS benchmark](https://medium.com/kx-systems/benchmarking-kdb-x-vs-questdb-clickhouse-timescaledb-and-influxdb-with-tsbs-2090f4533be0) — 2025
12. [QuestDB — 5-min OHLCV benchmark (25ms vs KDB+ 109ms)](https://www.timestored.com/data/questdb-for-tick-data-2025) — 2025
13. [NautilusTrader v1.224.0 Beta release notes — Bybit/Binance adapters 2026](https://github.com/nautechsystems/nautilus_trader/releases/tag/v1.224.0) — 2026-03
14. [Hyperliquid Python SDK — official GitHub](https://github.com/hyperliquid-dex/hyperliquid-python-sdk) — 2026
15. [Hyperliquid vs Other Exchanges — Honest Comparisons](https://hyperliquidguide.com/compare) — 2025
16. [Freqtrade FreqAI docs — ML strategy module 2026.3](https://www.freqtrade.io/en/stable/freqai/) — 2026
17. [Hummingbot Newsletter April 2026 — Condor UI + Strategy V2](https://hummingbot.substack.com/p/hummingbot-newsletter-april-2026) — 2026-04
18. [Binance Kline WebSocket streams docs](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams) — 2025
19. [ArcticDB — Man Group + Bloomberg collaboration](https://www.man.com/arctic-datascience-database) — 2025
20. [Tardis.dev — granular crypto tick data](https://tardis.dev/) — 2026
21. [CCXT Pro merged into free CCXT v1.95+ — no sub needed](https://github.com/ccxt/ccxt/issues/15171) — 2025
22. [Python Backtesting Landscape 2026 — framework comparison](https://python.financial/) — 2026

---
*Fin V2 — ce rapport remplace v1 optimus-research.md mais garde le fichier source intact pour historique.*
