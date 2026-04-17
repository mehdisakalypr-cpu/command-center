# Incident — Backdoor reset-password HMAC (2026-04-15)

## Classification
- **Sévérité** : HIGH
- **Statut** : Résolu (code supprimé et déployé)
- **Sites affectés** : Feel The Gap (FTG), Command Center (CC)
- **Vecteur** : endpoint reset-password acceptait un HMAC signé par un secret partagé, permettant la réinitialisation d'un password sans possession du compte email

## Timeline
- **T0** : découverte pendant audit auth cohérence (commit FTG `aff1152`)
- **T0+1h** : patch FTG (`fde1501 security(ftg/auth): 🚨 remove reset-password HMAC backdoor`)
- **T0+2h** : patch CC (`eefbfec security(cc/auth): 🚨 remove reset-password HMAC backdoor`)
- **T0+24h** : créé cockpit `/admin/security` pour suivi permanent (CC `0d08861`)

## Impact évalué
- Pas d'exploitation confirmée dans les logs Supabase auth
- Base users à la date : < 10 comptes réels (démo + admin)
- Exposition théorique : toute personne connaissant l'algorithme HMAC et le secret partagé
- **Réduction risque** : le secret n'a jamais été public, ni commit, ni env prod publique

## Remédiation code
- Suppression de l'endpoint HMAC reset-password sur FTG + CC
- Le flow canonique passe désormais par `supabase.auth.resetPasswordForEmail` + OTP/PKCE recovery session
- Audit : `grep -r "reset.*hmac\|constantTimeEqual.*password" app/api/` → 0 résultat sur les 2 repos

## Remédiation détection
- `/admin/security` dashboard CC recense tous les items open/in_progress avec severity
- `security_items` table Supabase = source de vérité (pas de fichier éphémère)
- Tout nouveau endpoint auth doit passer par la review checklist OWASP ASVS (section V2)

## Leçons apprises
1. **Jamais de backdoor auth**, même pour admin/debug. Les besoins d'accès d'urgence passent par le service_role Supabase (off-band, audité)
2. Les flows password doivent suivre EXCLUSIVEMENT les primitives Supabase Auth (`resetPasswordForEmail`, `verifyOtp`, `updateUser`)
3. Code review obligatoire sur tout changement dans `app/api/auth/**` avant merge

## Vérification future (à rejouer 2026-05-15)
```bash
# Les 2 commands doivent retourner 0 résultat
cd /var/www/feel-the-gap && grep -rE "hmac|constantTimeEqual|secret_admin" app/api/auth/ | grep -v "// audit:"
cd /root/command-center && grep -rE "hmac|constantTimeEqual|secret_admin" app/api/auth/ | grep -v "// audit:"
```

## Références
- OWASP ASVS 4.0 — V2.1 Password Security
- OWASP Top 10 2021 — A07 Identification and Authentication Failures
- Commits : FTG `fde1501`, CC `eefbfec`
- Fix cockpit : CC `0d08861`
