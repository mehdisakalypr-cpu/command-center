# Optimus — ML Feature Engineering & Pattern Recognition Stack (2026)

> Angle complémentaire à `optimus-research.md` / `optimus-research-v2.md`.
> Focus : **quoi empiler** (libs, modèles, frameworks) pour transformer 100 % des bougies multi-venues ingérées en features, signaux, pattern scores, backtests robustes, régimes et tailles de position.
> Horizon : prod 2026, coût mini, open-source first, payant ciblé.

---

## TL;DR (reco express)

| Couche | Reco MVP | Upgrade payant/pro |
|---|---|---|
| **Feature engineering** | `pandas-ta` (Numba/Numpy, 150+ indics + 60 candlestick CDL) + `tsfresh` (780+ features stat) + `stumpy` (matrix profile / motif mining) | TA-Lib (C natif, ~200 indics) en fallback si indice manquant |
| **Pattern recognition** | CDL\* TA-Lib + `HarmonicPatterns` (ABCD/Gartley/Bat/Butterfly/Crab/Shark/Cypher) + CNN maison sur images candle 64×64 | Vision Transformer (TF-ViTNet style) fine-tuné + foundation model **Chronos-2** (Amazon, oct. 2025, zero-shot multivariate) |
| **Backtest** | `vectorbt` OSS (millions de trades/sec, Numba) pour grid-search + `backtesting.py` pour event-driven simple | `vectorbt.pro` (license) si >50 M barres ou grid >100 k combos, sinon **LEAN / QuantConnect** pour live paper |
| **Validation** | **Combinatorial Purged Cross-Validation** (`skfolio.model_selection.CombinatorialPurgedCV`) + walk-forward | Deflated Sharpe Ratio + Probability of Backtest Overfitting (PBO) |
| **Regime detection** | `hmmlearn` (HMM gaussien 2-3 états) + `arch` (GARCH / MS-GARCH) + Hurst maison (`hurst` pkg) | Bayesian change-point (`ruptures`) + Markov-switching multifractal |
| **Risk / sizing** | `Riskfolio-Lib` (24 risk measures, CVaR, EVaR, CDaR, Kelly log-mean) + `empyrical-reloaded` (metrics) + `quantstats` (tearsheet) | `skfolio` (scikit-learn-native, HRP + CPCV intégré) |

**Coût licences MVP** : 0 € (tout OSS). Seuls GPU (CNN/ViT) et API Chronos/TimeGPT sont payants si on passe aux foundation models.

---

## 1. Feature Engineering — au-delà des 200 indics classiques

### 1.1 Indicateurs techniques (TA classique)

| Lib | Indics | Perf | Notes |
|---|---|---|---|
| **TA-Lib** | ~200 (C natif) + 61 `CDL*` candlestick patterns | Très rapide (C), wheel wrapper Python | Ref historique, install parfois pénible (libta-lib C). Toujours gold-standard. |
| **pandas-ta** | 150+ indics, 60 candlestick si TA-Lib installé | Numba + NumPy, intégré DataFrame | Dev communauté actif, facile à étendre. Bench plus lent que TA-Lib brut sur DataFrames volumineux. |
| **finta** | ~80 indics pandas pure | Moyen | Plus simple, moins complet — bon pour prototypes. |
| **tulipy** | ~100 indics (C via tulip-indicators) | Rapide | Moins maintenu, alternative TA-Lib. |
| **ta** (bukosabino) | ~40 indics, pure pandas | Lent | À éviter en prod temps réel multi-venues. |

**Reco Optimus** : pipeline = `TA-Lib` en primaire (C speed) + `pandas-ta` en fallback/extension (indicateurs custom type `supertrend`, `squeeze_pro`, `fisher`, `kvo`). Tout wrappé en un `FeatureRegistry` Numba-compilé pour passe unique sur la barre.

### 1.2 Features statistiques / automatiques

- **tsfresh** — 780+ features automatiques (entropy, CID_CE, FFT coeffs, autocorrélations, Fourier, wavelet). Sélection via scalable hypothesis tests. Pipeline : rolling window 64-256 bars → extraction → filter par p-value. Attention coût CPU (parallèle Dask).
- **tsfeatures** (Nixtla) — portage Python des features R `tsfeatures` de Hyndman. Complémentaire tsfresh (stl_features, stability, lumpiness, hurst, nonlinearity).
- **Feature-engine** — transformers sklearn pour cyclic encoders (hour/day), lag, rolling, datetime splits. Utile pour features "contexte" (heure UTC, jour semaine, liquidity session EU/US/Asia).
- **Featuretools (Deep Feature Synthesis)** — moins adapté séries temporelles haute fréquence (pensé relationnel), mais utile si on joint order-book + trades + funding.
- **stumpy** — matrix profile (motif discovery, anomaly, chain mining). GPU + Dask. Permet de détecter *motifs récurrents* (ex : pattern pre-breakout) sans templates hardcodés. Stand-out vs TA-Lib.
- **QuantStats** — pas une feature lib mais extrait metrics (Sharpe/Sortino/Calmar/Omega) pour labeling supervisé.

**Reco MVP** : pipeline trois passes — (1) `TA-Lib+pandas-ta` pour 200 features OHLCV → (2) `tsfresh` rolling 64 bars pour 100 features stat sélectionnées (filter MinimalFCParameters + top-50 par chi²) → (3) `stumpy` matrix profile en async pour motif-score. Vectorisé Numba, ~3-5 ms / symbole / barre 1 min sur CPU.

---

## 2. Pattern Recognition sur bougies

### 2.1 Règles symboliques (rapide, explicable)

- **Candlestick patterns** : `TA-Lib CDL*` = 61 patterns (Doji, Engulfing, Hammer, Three Crows…). Sortie ternaire -100/0/+100.
- **Chart patterns** (head-and-shoulders, triangles, flags, wedges, double top/bottom) : pas de lib Python référence stable. Options :
  - Implémenter via détection de swings (ZigZag) + règles Fibonacci.
  - `tradingpatterns` (GitHub, basique, ~5 patterns).
  - `autochartist`-like : payant, API closed.
- **Harmoniques** : **`HarmonicPatterns`** (djoffrey) — ABCD, Gartley, Bat, AltBat, Butterfly, Crab, DeepCrab, Shark, Cypher. Basé ZigZag + ratios Fib. Dépend TA-Lib.
- **Elliott waves** : pas de lib mature, heuristiques custom (`pyti`, `trendet`).

### 2.2 ML supervisé sur OHLC images

- **CNN sur images candle** : encoder N bougies en image 64×64 (Kusuma & al. 2020, repris 2024-2025 PeerJ EUR/USD 15 min). OHLC + 4 canaux (open/high/low/close) ou CULR (close/upper-shadow/lower-shadow/real-body). Pipeline : `mplfinance` render → `torchvision` ResNet18/EfficientNet-B0 → label = direction H+N.
- **Vision Transformer** : Stanford CS231n 2025 a publié "Learning Predictive Candlestick Patterns: Vision Transformers for Technical Analysis". ViT fine-tuné bat CNN sur fenêtres longues (>128 bars).
- **TF-ViTNet** (2025) — dual-path : Continuous Wavelet Transform scalogram → ViT branch + technical indicators → LSTM branch. Bon pour volatilité.
- **D2CTNet** (CODS-COMAD 2025) — CNN sur candles + technical indicators channels (MACD, RSI stackés comme canaux).

### 2.3 Foundation models time-series (zero/few-shot)

| Modèle | Vendor | Licence | Particularité |
|---|---|---|---|
| **Chronos-2** (oct. 2025) | Amazon | Apache 2.0 (weights HF) | Zero-shot univariate + multivariate + covariate. T5 backbone. Bat statistical tuned. |
| **TimeGPT-1** | Nixtla | API payante (~30 $/mo starter) | 100B pts pré-train, finance inclus. API REST. |
| **Moirai 2.0** (nov. 2025) | Salesforce | Open weights | Mixture distribution (4 distrib), intervalles flexibles. LOTSA corpus 27B pts. |
| **Lag-Llama** | ServiceNow | Open | Univariate probabiliste (quantiles). Léger (~200M params). |
| **TimesFM** | Google | Open (Apache) | 200M params, strong zero-shot. |
| **Timer-XL** | THUML | Open | Context 96k, long-range. |

**Reco Optimus** : au MVP **skip les foundation models** (latence + coût). Brancher **Chronos-2 zero-shot** uniquement pour (a) prévisions multi-horizon sur top-20 pairs et (b) détection d'anomalies (forecast vs realized). Lag-Llama pour quantile bands (stop-loss adaptatifs).

### 2.4 Pipeline Optimus recommandé

```
OHLCV barre → TA-Lib CDL* (61 signaux)
            → HarmonicPatterns scan (ZigZag 5-pivot)
            → CNN ResNet18 (fenêtre 64×64, inférence 2 ms/batch-64 GPU)
            → [Chronos-2 API, 5 min cadence max]
            → score composite pondéré → signal {long/flat/short, confidence}
```

---

## 3. Backtest — latence, walk-forward, stress

| Framework | Style | Perf 1M bars | Walk-fwd | Live trading | Commentaire |
|---|---|---|---|---|---|
| **vectorbt (OSS)** | Vectorisé Numba | <1 s / M trades simulés (Numba) | Oui, natif | Non (research) | Gold-standard grid-search / param sweep. Millions combos en minutes. |
| **vectorbt.pro** | Idem + Rust hot-path | 3-5× vectorbt OSS | Oui + CPCV hooks | Bridge IB/CCXT | Licence commerciale. Justifié >50 M barres ou research team. |
| **backtesting.py** | Event-driven léger | Moyenne (1 strat à la fois) | Partiel | Non | Idéal pour sanity-check 1 stratégie, API simple. |
| **backtrader** | Event-driven complet | Lent >1 M bars | Oui | IB/Oanda | API mature, multi-timeframe natif. Moins maintenu depuis 2023. |
| **zipline-reloaded** | Event-driven factor | Lent mais factor-native | Oui (Pipeline) | Via zipline-live | Daily stocks long/short. Peu adapté crypto tick. |
| **LEAN / QuantConnect** | Event-driven C# + Python | Bon (tick-level) | Oui | Oui natif (IB, Binance, Coinbase…) | Meilleur pour multi-asset prod. Cloud ou self-host. |
| **bt** (pmorissette) | Strategy tree | Moyen | Limité | Non | Allocation-centric, bien pour portefeuille assets. |
| **nautilus-trader** (Rust+Py) | Event-driven HFT | Très rapide (Rust core) | Oui | Oui | Émergent 2025, alternative LEAN sans C#. |

**Reco Optimus** :
- **Research / grid** : `vectorbt` OSS → 10 000 combos paramètres en <10 min sur 1 an tick 1 min.
- **Validation** : `skfolio.model_selection.CombinatorialPurgedCV` (N=10, K=2) → produit distribution Sharpe + PBO + Deflated SR. Walk-forward en doublon pour réalisme.
- **Paper/live** : `nautilus-trader` (Rust, gratuit, MIT) ou LEAN si équipe C# ok. CCXT pour broker crypto.

### Stress-test obligatoire
- Monte-Carlo bootstrap trades (10 000 chemins) → distribution max drawdown.
- Regime shuffle (permuter ordre régimes HMM) pour tester robustness hors-régime.
- Transaction cost sensitivity : sweep fees 0-30 bps + slippage 0-50 bps.
- Lookahead audit : purger `t+0` features + embargo 10 bars (de Prado).

---

## 4. Regime Detection

| Technique | Lib | Use-case |
|---|---|---|
| **HMM gaussien 2-3 états** | `hmmlearn` | Détection low/high vol regime, transition probabilities. Classification 85-92 % sur BTC 2024. |
| **Markov-Switching GARCH (TV-MSGARCH)** | `arch` + custom / `mfe-toolbox` | Volatility forecasting +15-25 % accuracy vs GARCH single regime (2024 Bitcoin study). |
| **GARCH family** | `arch` (Sheppard) | Vol clustering, leverage effects (EGARCH, GJR-GARCH). Fondation du risk sizing. |
| **Hurst exponent** | `hurst`, `nolds` | Mean-reverting (H<0.5) vs trending (H>0.5) vs random-walk (H=0.5). Signal simple mais robuste. |
| **Structural break tests** | `ruptures` (PELT, Binseg, Window), `arch.unitroot` (ADF, KPSS) | Détection changements moyens/variance non-supervisée. |
| **Bayesian change-point** | `bayesian-changepoint-detection`, `bocpd` | Online detection régime switch temps réel. |
| **Clustering latent** | `sklearn.cluster` + features tsfresh | K-means / GMM sur features volatilité, volume, autocorr → régimes émergents. |

**Reco Optimus** : stack régime = (1) HMM 3 états sur log-returns + ATR normalisé → label bull/bear/chop, (2) GARCH(1,1) pour vol forecast 24h, (3) Hurst rolling 100 bars pour mean-rev/trend scoring, (4) BOCPD online pour alertes structural break (discord Aria). Réévaluation toutes les 15 min.

---

## 5. Risk / Portfolio Sizing

| Lib | Usage | Spécificités 2025/26 |
|---|---|---|
| **Riskfolio-Lib** (7.2+) | Optimisation convex 24 risk measures | CVaR, EVaR, CDaR, EDaR, Kelly log-mean, HRP, Black-Litterman. Basé cvxpy. Gold standard OSS. |
| **skfolio** | Scikit-learn-native portfolio | HRP, NCO, mean-var, CPCV intégré. Paper arxiv 2507.04176 (juil. 2025). Pipeline-compatible. |
| **PyPortfolioOpt** | Efficient frontier + HRP + BL | Plus pédagogique, moins de risk measures que Riskfolio. |
| **empyrical-reloaded** | Metrics (Sharpe, Sortino, Omega, tail ratio, VaR, CVaR) | Fork maintenu post-Quantopian. |
| **pyfolio-reloaded** | Tearsheets | Fork OSS. Visualisation drawdowns, expositions, attribution. |
| **quantstats** | Tearsheets + HTML reports | Plus moderne que pyfolio, export HTML auto. |
| **arch** (Sheppard) | VaR via GARCH | Complément Riskfolio pour VaR conditionnel paramétrique. |

**Reco Optimus** :
- **Sizing par trade** : fractional Kelly (0.25-0.5 × Kelly) calculé via `Riskfolio-Lib` log-mean optimization ou formule analytique `f* = (p·b − q) / b` avec p,b dérivés du win-rate + payoff-ratio walk-forward.
- **Allocation portfolio** : HRP (de Prado) via `skfolio.cluster.HierarchicalRiskParity` — robuste sans inversion de covariance. Rebal quotidien.
- **Garde-fous** : drawdown cap 15 % → flat-all, CVaR 95 % contrainte dans l'optim, vol targeting 10 % annualisé.
- **Reporting** : `quantstats.reports.html()` quotidien pushé au dashboard CC + screenshot tearsheet dans `/admin/optimus`.

---

## 6. Stack ML recommandé MVP Optimus (budget 0 €)

```
┌─────────────────── Ingestion temps réel (autre doc) ───────────────────┐
│  CCXT Pro / websockets → Parquet / TimescaleDB / DuckDB                │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ OHLCV barres 1 s / 1 min / 5 min
                                  ▼
┌──── FeatureRegistry (Numba) ────────────────────────────────────────────┐
│  TA-Lib 200 indics  +  pandas-ta 60 candlestick CDL                     │
│  tsfresh rolling-64 (MinimalFCParameters, ~50 features sélectionnées)   │
│  stumpy matrix profile async (motif score)                              │
│  Feature-engine: cyclic hour/day, session flags EU/US/Asia              │
└──────────────────────────────┬──────────────────────────────────────────┘
                               ▼
┌──── Pattern layer ──────────────────────────────────────────────────────┐
│  CDL* TA-Lib (61 flags)                                                 │
│  HarmonicPatterns (ZigZag + Fib)                                        │
│  CNN ResNet18 PyTorch (fenêtre 64 bars → image 64×64, ONNX runtime CPU) │
│  [opt. Chronos-2 5 min tick, anomaly + forecast bands]                  │
└──────────────────────────────┬──────────────────────────────────────────┘
                               ▼
┌──── Regime + label ─────────────────────────────────────────────────────┐
│  hmmlearn HMM 3-state (bull/bear/chop)                                  │
│  arch GARCH(1,1) vol 24h                                                │
│  Hurst rolling 100                                                      │
│  ruptures BOCPD online                                                  │
└──────────────────────────────┬──────────────────────────────────────────┘
                               ▼
┌──── Decision model ─────────────────────────────────────────────────────┐
│  LightGBM / XGBoost classifier (direction H+N)                          │
│  Meta-labeling de Prado (primary signal → secondary size)               │
│  Calibration: isotonic + Platt                                          │
└──────────────────────────────┬──────────────────────────────────────────┘
                               ▼
┌──── Backtest + validation ──────────────────────────────────────────────┐
│  vectorbt OSS grid sweep + walk-forward                                 │
│  skfolio.CombinatorialPurgedCV (N=10, K=2) → PBO + Deflated SR          │
│  Monte-Carlo bootstrap 10 000 chemins → DD distribution                 │
└──────────────────────────────┬──────────────────────────────────────────┘
                               ▼
┌──── Sizing + exec ──────────────────────────────────────────────────────┐
│  Riskfolio-Lib (Kelly log-mean, CVaR constraint, vol-target 10 %)       │
│  skfolio HRP allocation portefeuille                                    │
│  nautilus-trader ou LEAN → broker CCXT                                  │
│  quantstats tearsheet quotidien → /admin/optimus                        │
└─────────────────────────────────────────────────────────────────────────┘
```

**Environnement** : Python 3.11, Numba 0.60+, PyTorch 2.5 + ONNX Runtime, Polars 1.x pour ingestion rapide (10× pandas), DuckDB pour queries ad-hoc, Ray 2.40 pour parallélisme grid.

**Coût infra MVP** : 1 VPS 8 vCPU + 32 Go (50-80 €/mo) — suffisant pour 50 symboles × 1 min bars + 10 symboles × 1 s + inférences CNN ONNX CPU. GPU optionnel si ViT ou fine-tuning Chronos (~50 €/mo spot A10).

---

## Sources (2025/2026)

1. [vectorbt.pro — Performance](https://vectorbt.pro/features/performance/) — benchmarks simulations millions trades.
2. [vectorbt OSS GitHub](https://github.com/polakowo/vectorbt) — core Numba.
3. [pandas-ta documentation](https://www.pandas-ta.dev/) — 150+ indics + 60 candlestick.
4. [TA-Lib officiel](https://ta-lib.org/) — C native, ~200 indics.
5. [tsfresh GitHub](https://github.com/blue-yonder/tsfresh) — 780+ features auto.
6. [STUMPY matrix profile](https://stumpy.readthedocs.io/) — motif/anomaly mining.
7. [HarmonicPatterns GitHub](https://github.com/djoffrey/HarmonicPatterns) — Gartley/Bat/Butterfly/Crab/Shark/Cypher.
8. [The 2026 Time Series Toolkit: 5 Foundation Models](https://machinelearningmastery.com/the-2026-time-series-toolkit-5-foundation-models-for-autonomous-forecasting/) — Chronos-2, TimesFM, Moirai 2, Lag-Llama, TimeGPT.
9. [Moirai 2.0 paper (arxiv 2511.11698)](https://arxiv.org/html/2511.11698v3) — Salesforce nov. 2025.
10. [Chronos — foundation model time series (ZAAI)](https://zaai.ai/chronos-the-rise-of-foundation-models-for-time-series-forecasting/) — Amazon T5 backbone.
11. [Nixtla neuralforecast](https://github.com/Nixtla/neuralforecast) — N-HiTS, NBEATSx, TFT, PatchTST.
12. [Learning Predictive Candlestick Patterns — ViT (Stanford CS231n 2025)](https://cs231n.stanford.edu/2025/papers/text_file_840597081-LaTeXAuthor_Guidelines_for_CVPR_Proceedings__1_-2.pdf).
13. [PeerJ CS 2025 — CNN on Japanese candlesticks EUR/USD](https://peerj.com/articles/cs-2719/).
14. [D2CTNet CODS-COMAD 2025](https://dl.acm.org/doi/10.1145/3703323.3703717) — candle dynamics + TI detection.
15. [Riskfolio-Lib 7.2 docs](https://riskfolio-lib.readthedocs.io/) — 24 risk measures, Kelly, CVaR, HRP.
16. [skfolio (arxiv 2507.04176, juil. 2025)](https://arxiv.org/pdf/2507.04176) — scikit-learn-native portfolio.
17. [skfolio.CombinatorialPurgedCV](https://skfolio.org/generated/skfolio.model_selection.CombinatorialPurgedCV.html) — CPCV de Prado.
18. [Combinatorial Purged CV vs Walk-Forward (quantinsti)](https://blog.quantinsti.com/cross-validation-embargo-purging-combinatorial/).
19. [Interpretable Hypothesis-Driven Trading (arxiv 2512.12924, dec. 2025)](https://arxiv.org/html/2512.12924v1) — walk-forward framework.
20. [HMM regime detection crypto (preprints 2026.03.0831)](https://www.preprints.org/manuscript/202603.0831) — Bitcoin 2024-2026.
21. [Volatility Regime Detection — Volatility Box](https://volatilitybox.com/research/volatility-regime-detection/) — simple rules to ML.
22. [ChartsWatcher — Top Backtesting Software 2025](https://chartswatcher.com/pages/blog/top-backtesting-software-comparison-for-2025).
23. [Python Backtesting Landscape 2026](https://python.financial/).
24. [LEAN / QuantConnect vs Zipline-reloaded (ML4T)](https://exchange.ml4trading.io/t/lean-quant-connect-vs-zipline-reloaded/200).

---

*Fichier non commité — main thread gère. Ne pas toucher `optimus-research.md` / `optimus-research-v2.md`.*
