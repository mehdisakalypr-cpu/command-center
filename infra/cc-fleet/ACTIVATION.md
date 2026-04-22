# CC Fleet — Activation Playbook

Blueprint : `memory/project_cc_dual_account_architecture.md` (v2 N-ready).
Statut par défaut : **DORMANT** — rien ne tourne. Ce document décrit l'activation pas-à-pas, de `dormant` → `live`.

## Philosophie

- **0 risk** : dashboard, dispatcher et templates sont prêts mais no-op tant que `CC_FLEET_ENABLED=false`.
- **Scale swiftly** : ajouter un worker = `./register-worker.sh N` + `systemctl enable --now cc-worker@N`.
- **Rollback 1 commande** : `systemctl stop cc-worker@*` + `touch /srv/shared/PAUSE_ALL`.

## Inventaire livré

| Fichier | Rôle |
|---|---|
| `supabase/migrations/20260422080000_cc_fleet_v1.sql` | Tables `cc_workers` + `minato_tickets` + `minato_audit` + vues + RLS + seed `main` |
| `lib/cc-fleet/` | Dispatcher (claim, scope-overlap, score MRR-aware, anti-loop). No-op si flag off. |
| `app/admin/cc-fleet/` | Dashboard read-only (workers grid, queue stats, aggregate metrics) |
| `infra/cc-fleet/cc-worker@.service` | systemd template (1 fichier = N workers) |
| `infra/cc-fleet/setup-cc-worker.sh` | Provisionne user Linux + worktrees + unit |
| `infra/cc-fleet/register-worker.sh` | Upsert row `cc_workers` via Supabase Management API |
| `infra/cc-fleet/CLAUDE.md.tmpl` | CLAUDE.md contextualisé par worker (substitué à l'install) |
| `infra/cc-fleet/firewall.conf` | Whitelist outbound (à appliquer host-level) |
| `infra/cc-fleet/protect-main.sh` | GitHub branch protection sur les 5 repos |

## Séquence d'activation

### Phase A — SAFE (aucun worker autonome, tu peux tout tester)

1. **Appliquer la migration** sur le Supabase CC :
   ```sh
   # Via Supabase CLI si linké
   supabase db push
   # Ou via Management API (cf. reference_supabase_migration_bypass)
   ```
   Vérif : `select * from cc_workers;` → 1 row `main`.

2. **Déployer command-center** (sans flag) :
   ```sh
   cd /root/command-center && git push origin <branch> && vercel --prod
   ```
   Le dashboard `/admin/cc-fleet` affiche la bannière **DORMANT**.

3. **Smoke test dashboard** : ouvre `cc-dashboard.vercel.app/admin/cc-fleet`, vérifie la row `main`.

4. **Activer la flag** :
   ```sh
   vercel env add CC_FLEET_ENABLED production
   # Valeur: true
   vercel --prod
   ```
   La bannière DORMANT disparaît. Dispatcher reste inoffensif : aucun worker autonome n'existe.

5. **(Optionnel) Enqueuer 1 ticket de test** via SQL ou UI admin (à coder séparément) pour valider le schéma.

### Phase B — RISK (introduction du 1er worker autonome)

> Pré-requis : Phase A complète, 2e compte Claude Code Max 20× provisionné, token disponible.

6. **Remplir les secrets** :
   ```sh
   sudo mkdir -p /srv/shared/secrets
   sudo tee /srv/shared/secrets/cc-fleet.env >/dev/null <<'ENV'
   SUPABASE_URL=https://jebuagyeapkltyjitosm.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sk_****
   ENV
   sudo chmod 0600 /srv/shared/secrets/cc-fleet.env
   ```

7. **Provision du user Linux + worktrees + systemd unit** :
   ```sh
   sudo /root/command-center/infra/cc-fleet/setup-cc-worker.sh 1
   ```

8. **Remplir les secrets worker-1** (token CC, gh token) :
   ```sh
   sudo tee /srv/shared/secrets/cc-worker-1.env >/dev/null <<'ENV'
   ANTHROPIC_API_KEY=sk-ant-****   # ou token CC Max 20×
   GH_TOKEN=ghp_****
   ENV
   ```

9. **Enregistrer la row** :
   ```sh
   sudo /root/command-center/infra/cc-fleet/register-worker.sh 1
   ```
   Vérif dashboard : la card `worker-1` apparaît (state=offline).

10. **GitHub branch protection** (si pas déjà actif) :
    ```sh
    bash /root/command-center/infra/cc-fleet/protect-main.sh
    ```

11. **Démarrage du worker** (point de non-retour ⚠) :
    ```sh
    sudo systemctl enable --now cc-worker@1
    sudo journalctl -u cc-worker@1 -f
    ```

12. **Observe 30 min** sur le dashboard. Tickets ? heartbeat ? coût ?

### Phase C — Scale to N (après validation worker-1, 72h)

Pour chaque N supplémentaire :
```sh
sudo /root/command-center/infra/cc-fleet/setup-cc-worker.sh <N>
sudo tee /srv/shared/secrets/cc-worker-<N>.env >/dev/null <<'ENV'
ANTHROPIC_API_KEY=sk-ant-****
GH_TOKEN=ghp_****
ENV
sudo /root/command-center/infra/cc-fleet/register-worker.sh <N>
sudo systemctl enable --now cc-worker@<N>
```

## Rollback

### Stop tous les workers (garde les données)
```sh
touch /srv/shared/PAUSE_ALL                  # soft stop (workers check à chaque tick)
sudo systemctl stop 'cc-worker@*'            # hard stop
```

### Stop un seul worker
```sh
touch /srv/shared/PAUSE_WORKER_1
sudo systemctl stop cc-worker@1
```

### Désactiver la flag (dashboard passe DORMANT mais data reste)
```sh
vercel env rm CC_FLEET_ENABLED production
vercel --prod
```

### Purger complètement (nuke option)
```sh
sudo systemctl disable --now 'cc-worker@*'
sudo rm -rf /home/cc-worker-*
# Supabase: truncate table cc_workers cascade; (keep audit)
```

## Monitoring à surveiller les 72h

- `minato_audit` : flood d'actions `abort` ou `kill` → guardrails qui déclenchent
- `cc_workers.cost_week_usd` : si dépasse 250$/worker → auto-killswitch (v2 §9)
- `minato_tickets` avec `oversized=true` → budget blown, ticket raté
- Heartbeat > 15 min → dispatcher considère le worker zombie, requeue ses tickets
- PR mergées vs revert : drift silencieux détecté via `review_sampled`

## Incidents connus à anticiper

| Symptôme | Diagnostic | Fix |
|---|---|---|
| Worker boucle infinie, burn tokens | Anti-loop pas déclenché (bug ou désactivé) | Set `PAUSE_WORKER_N`, inspecte logs, enrichir `antiLoopCheck` |
| PR auto-mergée fausse | Scope mal déclaré, tests insuffisants | Revert PR, ajouter test reproducer, re-enqueue ticket |
| Quota explode (tous workers) | Spike tickets lourds simultanés | Freeze claims via flag (CC_FLEET_ENABLED=false), finir in_progress à la main |
| Worker user corrompu | FS plein, secrets leakés | `rm -rf /home/cc-worker-N` + setup + register (perd juste le worktree local) |

## Liens

- Blueprint complet : `memory/project_cc_dual_account_architecture.md`
- Sécurité : `project_security_stack` (cockpit `/admin/security`)
- MRR impact : `project_mrr_max_blockers`
