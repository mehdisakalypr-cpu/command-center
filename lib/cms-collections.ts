// Copy of Feel The Gap's CMS collection registry — shared across Command Center admin
// This file mirrors /var/www/feel-the-gap/lib/cms-collections.ts

export interface SlotDef {
  slug: string;
  label: string;
  field_type: "text" | "richtext" | "number" | "image" | "video" | "json";
  default_en: string;
  default_fr: string;
}

export interface CollectionDef {
  key: string;
  label: string;
  slots: SlotDef[];
}

export interface SiteDef {
  key: string;
  label: string;
  icon: string;
  color: string;
  collections: CollectionDef[];
}

export const CMS_SITES: SiteDef[] = [
  {
    key: "ftg", label: "Feel The Gap", icon: "🌍", color: "#3B82F6",
    collections: [
      {
        key: "landing", label: "Page d'accueil",
        slots: [
          { slug: "badge", label: "Badge hero", field_type: "text", default_fr: "Plateforme SaaS · Données mondiales import/export", default_en: "SaaS Platform · Global import/export data" },
          { slug: "hero_title", label: "Titre hero", field_type: "text", default_fr: "Trouvez où vendre", default_en: "Find where to sell" },
          { slug: "hero_title_accent", label: "Titre hero (accent)", field_type: "text", default_fr: "avant tout le monde", default_en: "before everyone else" },
          { slug: "hero_desc", label: "Description hero", field_type: "richtext", default_fr: "Feel The Gap analyse les flux commerciaux mondiaux pour identifier les marchés sous-approvisionnés.", default_en: "Feel The Gap analyses global trade flows to identify under-supplied markets." },
          { slug: "stat_1_value", label: "Stat 1 — Valeur", field_type: "text", default_fr: "195", default_en: "195" },
          { slug: "stat_1_label", label: "Stat 1 — Label", field_type: "text", default_fr: "Pays couverts", default_en: "Countries covered" },
          { slug: "stat_2_value", label: "Stat 2 — Valeur", field_type: "text", default_fr: "500+", default_en: "500+" },
          { slug: "stat_2_label", label: "Stat 2 — Label", field_type: "text", default_fr: "Catégories de produits", default_en: "Product categories" },
          { slug: "stat_3_value", label: "Stat 3 — Valeur", field_type: "text", default_fr: "AI", default_en: "AI" },
          { slug: "stat_3_label", label: "Stat 3 — Label", field_type: "text", default_fr: "Propulsé par Gemini", default_en: "Powered by Gemini" },
          { slug: "features_title", label: "Titre features", field_type: "text", default_fr: "De la data brute aux opportunités actionnables", default_en: "From raw data to actionable opportunities" },
          { slug: "f1_title", label: "Feature 1 — Titre", field_type: "text", default_fr: "Carte mondiale des flux", default_en: "Global trade flow map" },
          { slug: "f1_desc", label: "Feature 1 — Desc", field_type: "richtext", default_fr: "Visualisez les gaps d'import/export pays par pays.", default_en: "Visualise import/export gaps country by country." },
          { slug: "f2_title", label: "Feature 2 — Titre", field_type: "text", default_fr: "Opportunity Farming", default_en: "Opportunity Farming" },
          { slug: "f2_desc", label: "Feature 2 — Desc", field_type: "richtext", default_fr: "Scannez votre produit. L'IA identifie les typologies de clients.", default_en: "Scan your product. AI identifies customer profiles." },
          { slug: "f3_title", label: "Feature 3 — Titre", field_type: "text", default_fr: "Business plans IA", default_en: "AI business plans" },
          { slug: "f3_desc", label: "Feature 3 — Desc", field_type: "richtext", default_fr: "De l'idée au plan d'action. Capex, Opex, ROI.", default_en: "From idea to action plan. Capex, Opex, ROI." },
          { slug: "f4_title", label: "Feature 4 — Titre", field_type: "text", default_fr: "Réseau d'influence", default_en: "Influencer network" },
          { slug: "f4_desc", label: "Feature 4 — Desc", field_type: "richtext", default_fr: "Connectez vos produits à des influenceurs qualifiés.", default_en: "Connect your products to qualified influencers." },
          { slug: "cta_final_title", label: "CTA final — Titre", field_type: "text", default_fr: "Prêt à identifier votre prochain marché ?", default_en: "Ready to identify your next market?" },
          { slug: "cta_final_desc", label: "CTA final — Desc", field_type: "text", default_fr: "Inscription gratuite. Aucune carte bancaire requise.", default_en: "Free registration. No credit card required." },
          { slug: "cta_final_btn", label: "CTA final — Bouton", field_type: "text", default_fr: "Créer mon compte →", default_en: "Create my account →" },
        ],
      },
      {
        key: "pricing", label: "Page tarifs",
        slots: [
          { slug: "plan_explorer_name", label: "Explorer — Nom", field_type: "text", default_fr: "Explorer", default_en: "Explorer" },
          { slug: "plan_explorer_price", label: "Explorer — Prix", field_type: "text", default_fr: "Gratuit", default_en: "Free" },
          { slug: "plan_explorer_features", label: "Explorer — Features", field_type: "json", default_fr: '["Carte interactive","Scores basiques","1 rapport/mois"]', default_en: '["Interactive map","Basic scores","1 report/month"]' },
          { slug: "plan_data_name", label: "Data — Nom", field_type: "text", default_fr: "Data", default_en: "Data" },
          { slug: "plan_data_price", label: "Data — Prix", field_type: "text", default_fr: "29 €/mois", default_en: "€29/month" },
          { slug: "plan_data_features", label: "Data — Features", field_type: "json", default_fr: '["Recherches sauvegardées","Export CSV","Alertes email"]', default_en: '["Saved searches","CSV export","Email alerts"]' },
          { slug: "plan_strategy_name", label: "Strategy — Nom", field_type: "text", default_fr: "Strategy", default_en: "Strategy" },
          { slug: "plan_strategy_price", label: "Strategy — Prix", field_type: "text", default_fr: "99 €/mois", default_en: "€99/month" },
          { slug: "plan_strategy_features", label: "Strategy — Features", field_type: "json", default_fr: '["Business plans IA","AI Advisor","Farming scanner"]', default_en: '["AI business plans","AI Advisor","Farming scanner"]' },
          { slug: "plan_premium_name", label: "Premium — Nom", field_type: "text", default_fr: "Premium", default_en: "Premium" },
          { slug: "plan_premium_price", label: "Premium — Prix", field_type: "text", default_fr: "149 €/mois", default_en: "€149/month" },
          { slug: "plan_premium_features", label: "Premium — Features", field_type: "json", default_fr: '["Réseau influenceurs","Geo-matching","Dashboard affiliation"]', default_en: '["Influencer network","Geo-matching","Affiliate dashboard"]' },
        ],
      },
    ],
  },
  {
    key: "shift", label: "Shift Dynamics", icon: "⚡", color: "#8B5CF6",
    collections: [
      {
        key: "home", label: "Page d'accueil",
        slots: [
          { slug: "hero_badge", label: "Badge hero", field_type: "text", default_fr: "Conseil stratégique & technologique", default_en: "Strategic & Technology Consulting" },
          { slug: "hero_title", label: "Titre hero", field_type: "text", default_fr: "Transformez vos marchés", default_en: "Transform your markets" },
          { slug: "hero_subtitle", label: "Sous-titre", field_type: "richtext", default_fr: "22 ans d'expertise en deep tech, gaming et expansion internationale.", default_en: "22 years of expertise in deep tech, gaming and international expansion." },
          { slug: "stat_revenue", label: "Stat — Revenue", field_type: "text", default_fr: ">100M€", default_en: ">€100M" },
          { slug: "stat_countries", label: "Stat — Pays", field_type: "text", default_fr: "44", default_en: "44" },
          { slug: "stat_markets", label: "Stat — Marchés", field_type: "text", default_fr: "17", default_en: "17" },
        ],
      },
      {
        key: "about", label: "Page À propos",
        slots: [
          { slug: "experience_years", label: "Années d'expérience", field_type: "number", default_fr: "22", default_en: "22" },
          { slug: "countries_covered", label: "Pays couverts", field_type: "number", default_fr: "44", default_en: "44" },
          { slug: "gaming_markets", label: "Marchés gaming", field_type: "number", default_fr: "17", default_en: "17" },
          { slug: "players_euro", label: "Players EURO 2016", field_type: "text", default_fr: "70K+", default_en: "70K+" },
          { slug: "quote", label: "Citation", field_type: "richtext", default_fr: "La technologie n'a de valeur que lorsqu'elle génère du revenu mesurable.", default_en: "Technology is only as valuable as the measurable revenue it generates." },
        ],
      },
    ],
  },
  {
    key: "estate", label: "The Estate", icon: "🏨", color: "#C9A84C",
    collections: [
      {
        key: "dashboard", label: "Dashboard",
        slots: [
          { slug: "services", label: "Services monitorés", field_type: "json", default_fr: '[{"name":"The Estate","icon":"🏨","color":"#C9A84C"},{"name":"Shift Dynamics","icon":"⚡","color":"#8B5CF6"},{"name":"Feel The Gap","icon":"🌍","color":"#3B82F6"},{"name":"Command Center","icon":"🎙️","color":"#10B981"}]', default_en: '[{"name":"The Estate","icon":"🏨","color":"#C9A84C"},{"name":"Shift Dynamics","icon":"⚡","color":"#8B5CF6"},{"name":"Feel The Gap","icon":"🌍","color":"#3B82F6"},{"name":"Command Center","icon":"🎙️","color":"#10B981"}]' },
          { slug: "tier_labels", label: "Labels des tiers", field_type: "json", default_fr: '{"explorer":"Explorer","data":"Data","strategy":"Strategy","premium":"Premium","enterprise":"Enterprise"}', default_en: '{"explorer":"Explorer","data":"Data","strategy":"Strategy","premium":"Premium","enterprise":"Enterprise"}' },
          { slug: "tier_colors", label: "Couleurs des tiers", field_type: "json", default_fr: '{"explorer":"#5A6A7A","data":"#3B82F6","strategy":"#8B5CF6","premium":"#C9A84C","enterprise":"#10B981"}', default_en: '{"explorer":"#5A6A7A","data":"#3B82F6","strategy":"#8B5CF6","premium":"#C9A84C","enterprise":"#10B981"}' },
        ],
      },
    ],
  },
];

export function findSlot(siteKey: string, collectionKey: string, slug: string) {
  const site = CMS_SITES.find(s => s.key === siteKey);
  const coll = site?.collections.find(c => c.key === collectionKey);
  return coll?.slots.find(s => s.slug === slug);
}
